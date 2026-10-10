import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

// A pasta de uploads é lida quando o módulo carrega: aponta para uma pasta
// temporária antes de importar, para os testes nunca tocarem em backend/uploads
let pasta
let imagens
beforeAll(async () => {
  pasta = await mkdtemp(path.join(tmpdir(), 'vitrine-uploads-'))
  process.env.UPLOADS_DIR = pasta
  imagens = await import('../../backend/src/services/imagens.js')
})
afterAll(async () => {
  delete process.env.UPLOADS_DIR
  await rm(pasta, { recursive: true, force: true })
})

const CAMINHO_VALIDO = '/uploads/3f2b8c1e-9a4d-4e7f-8b2a-1c5d6e7f8a9b.webp'

/** Imagem de teste gerada na hora, sem depender de arquivo no repositório */
const gerarImagem = (largura, altura, formato = 'png') =>
  sharp({ create: { width: largura, height: altura, channels: 3, background: '#17346e' } })
    .toFormat(formato)
    .toBuffer()

/** Metadados do arquivo gravado. Lê para a memória antes: aberto por caminho,
 *  o sharp segura o arquivo em cache e, no Windows, a pasta não pode ser apagada */
const lerGravado = async (caminho) => sharp(await readFile(path.join(pasta, path.basename(caminho)))).metadata()

/** Prisma falso: cada contagem devolve o número pedido */
const prismaComUsos = (usos = 0) => ({
  produto: { count: vi.fn().mockResolvedValue(usos) },
  empreendedor: { count: vi.fn().mockResolvedValue(0) },
})

describe('ehUpload', () => {
  it('reconhece o caminho que o próprio servidor gera', () => {
    expect(imagens.ehUpload(CAMINHO_VALIDO)).toBe(true)
  })

  it.each([
    ['link externo', 'https://exemplo.com/foto.jpg'],
    ['subida de pasta', '/uploads/../.env'],
    ['outra extensão', '/uploads/3f2b8c1e-9a4d-4e7f-8b2a-1c5d6e7f8a9b.png'],
    ['nome escolhido por quem chama', '/uploads/minha-foto.webp'],
    ['caminho fora da pasta', '/fotos/3f2b8c1e-9a4d-4e7f-8b2a-1c5d6e7f8a9b.webp'],
    ['valor vazio', ''],
    ['nulo', null],
  ])('recusa %s', (_, valor) => {
    expect(imagens.ehUpload(valor)).toBe(false)
  })
})

describe('campoImagem', () => {
  const campo = () => imagens.campoImagem('Imagem inválida')

  it.each(['https://exemplo.com/bolo.jpg', CAMINHO_VALIDO])(
    'aceita %s',
    (valor) => {
      expect(campo().safeParse(valor).success).toBe(true)
    }
  )

  it('recusa http:// (sem criptografia) com mensagem própria', () => {
    const resultado = campo().safeParse('http://exemplo.com/bolo.jpg')
    expect(resultado.success).toBe(false)
    expect(resultado.error.issues[0].message).toMatch(/https:\/\//)
  })

  it.each(['javascript:alert(1)', 'ftp://exemplo.com/a.jpg', 'foto.png', '/uploads/qualquer.webp'])(
    'recusa %s com a mensagem do campo',
    (valor) => {
      const resultado = campo().safeParse(valor)
      expect(resultado.success).toBe(false)
      expect(resultado.error.issues[0].message).toBe('Imagem inválida')
    }
  )
})

describe('salvarImagem', () => {
  it('grava um WebP com nome gerado e devolve o caminho público', async () => {
    const caminho = await imagens.salvarImagem(await gerarImagem(300, 200))
    expect(imagens.ehUpload(caminho)).toBe(true)
    const gravado = await lerGravado(caminho)
    expect(gravado.format).toBe('webp')
    expect([gravado.width, gravado.height]).toEqual([300, 200])
  })

  it('reduz foto grande para no máximo 1600 px no lado maior, sem distorcer', async () => {
    const caminho = await imagens.salvarImagem(await gerarImagem(3200, 1600, 'jpeg'))
    const gravado = await lerGravado(caminho)
    expect([gravado.width, gravado.height]).toEqual([1600, 800])
  })

  it('não aumenta imagem pequena', async () => {
    const caminho = await imagens.salvarImagem(await gerarImagem(40, 40))
    const gravado = await lerGravado(caminho)
    expect(gravado.width).toBe(40)
  })

  it('descarta os metadados da foto original (EXIF, como local e câmera)', async () => {
    const comExif = await sharp(await gerarImagem(100, 100, 'jpeg'))
      .withExif({ IFD0: { Make: 'Celular', Copyright: 'Fulano' } })
      .jpeg()
      .toBuffer()
    expect((await sharp(comExif).metadata()).exif).toBeDefined()
    const caminho = await imagens.salvarImagem(comExif)
    expect((await lerGravado(caminho)).exif).toBeUndefined()
  })

  it('recusa arquivo que não é imagem, mesmo com cara de imagem', async () => {
    const falso = Buffer.from('MZ isto é um executável renomeado para .jpg')
    await expect(imagens.salvarImagem(falso)).rejects.toMatchObject({ status: 415, publico: true })
  })

  it('pede uma imagem quando o corpo vem vazio', async () => {
    await expect(imagens.salvarImagem(Buffer.alloc(0))).rejects.toMatchObject({ status: 400 })
    await expect(imagens.salvarImagem(undefined)).rejects.toMatchObject({ status: 400 })
  })
})

describe('apagarSeOrfa', () => {
  const criarArquivo = async () => {
    const caminho = await imagens.salvarImagem(await gerarImagem(10, 10))
    return { caminho, arquivo: path.join(pasta, path.basename(caminho)) }
  }

  it('apaga o arquivo que nenhum cadastro usa mais', async () => {
    const { caminho, arquivo } = await criarArquivo()
    await imagens.apagarSeOrfa(prismaComUsos(0), caminho)
    await expect(stat(arquivo)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('mantém o arquivo que outro cadastro ainda usa', async () => {
    const { caminho, arquivo } = await criarArquivo()
    await imagens.apagarSeOrfa(prismaComUsos(1), caminho)
    await expect(stat(arquivo)).resolves.toBeDefined()
  })

  it('nunca mexe em link externo nem em caminho que não foi gerado aqui', async () => {
    const prisma = prismaComUsos(0)
    await writeFile(path.join(pasta, 'importante.txt'), 'não apagar')
    await imagens.apagarSeOrfa(prisma, 'https://exemplo.com/foto.jpg')
    await imagens.apagarSeOrfa(prisma, '/uploads/../importante.txt')
    expect(prisma.produto.count).not.toHaveBeenCalled()
    expect(await readdir(pasta)).toContain('importante.txt')
  })

  it('arquivo que já sumiu não vira erro', async () => {
    await expect(imagens.apagarSeOrfa(prismaComUsos(0), CAMINHO_VALIDO)).resolves.toBeUndefined()
  })

  it('apagarSeTrocou só age quando a imagem mudou', async () => {
    const { caminho, arquivo } = await criarArquivo()
    await imagens.apagarSeTrocou(prismaComUsos(0), caminho, caminho)
    await expect(stat(arquivo)).resolves.toBeDefined()
    await imagens.apagarSeTrocou(prismaComUsos(0), caminho, null)
    await expect(stat(arquivo)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

describe('Cloudinary (produção)', () => {
  const CONTA = 'minhaconta'
  const ID = '3f2b8c1e-9a4d-4e7f-8b2a-1c5d6e7f8a9b'
  const NA_NUVEM = `https://res.cloudinary.com/${CONTA}/image/upload/v1712345678/vitrinelocal/${ID}.webp`

  const comNuvem = () => {
    process.env.CLOUDINARY_URL = `cloudinary://123456:segredo@${CONTA}`
  }
  afterEach(() => {
    delete process.env.CLOUDINARY_URL
    delete process.env.CLOUDINARY_PASTA
    vi.unstubAllGlobals()
  })

  /** fetch falso que responde como a API do Cloudinary e guarda o que recebeu */
  const nuvemFalsa = (resposta = { secure_url: NA_NUVEM, public_id: `vitrinelocal/${ID}` }, status = 200) => {
    const chamada = vi.fn().mockResolvedValue(new Response(JSON.stringify(resposta), { status }))
    vi.stubGlobal('fetch', chamada)
    return chamada
  }

  it('assina como a documentação do Cloudinary manda (exemplo oficial)', () => {
    const assinatura = imagens.assinarNuvem(
      { public_id: 'sample_image', timestamp: 1315060510, eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' },
      'abcd'
    )
    expect(assinatura).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e')
  })

  it('lê as credenciais de CLOUDINARY_URL e recusa formato errado', () => {
    comNuvem()
    expect(imagens.configuracaoNuvem()).toMatchObject({ conta: CONTA, chave: '123456', pasta: 'vitrinelocal' })
    process.env.CLOUDINARY_URL = 'https://123456:segredo@minhaconta'
    expect(imagens.configuracaoNuvem()).toBeNull()
  })

  it('envia o WebP já convertido, assinado, e devolve o endereço https', async () => {
    comNuvem()
    const chamada = nuvemFalsa()
    const endereco = await imagens.salvarImagem(await gerarImagem(300, 200))

    expect(endereco).toBe(NA_NUVEM)
    const [url, opcoes] = chamada.mock.calls[0]
    expect(url).toBe(`https://api.cloudinary.com/v1_1/${CONTA}/image/upload`)
    const corpo = opcoes.body
    expect(corpo.get('api_key')).toBe('123456')
    expect(corpo.get('public_id')).toMatch(/^vitrinelocal\/[0-9a-f-]{36}$/)
    expect(corpo.get('file').type).toBe('image/webp')
    const esperada = imagens.assinarNuvem(
      { public_id: corpo.get('public_id'), timestamp: corpo.get('timestamp') },
      'segredo'
    )
    expect(corpo.get('signature')).toBe(esperada)
    // Nada foi gravado na pasta local
    expect((await readdir(pasta)).some((nome) => nome.includes(corpo.get('public_id').split('/')[1]))).toBe(false)
  })

  it('falha do Cloudinary vira erro sem detalhe para o cliente', async () => {
    comNuvem()
    nuvemFalsa({ error: { message: 'Invalid Signature' } }, 401)
    const erro = await imagens.salvarImagem(await gerarImagem(10, 10)).catch((e) => e)
    expect(erro.publico).toBeUndefined()
    expect(erro.message).toContain('Cloudinary')
  })

  it('reconhece só imagens da nossa conta e da nossa pasta', () => {
    comNuvem()
    expect(imagens.idNaNuvem(NA_NUVEM)).toBe(`vitrinelocal/${ID}`)
    expect(imagens.idNaNuvem(NA_NUVEM.replace(CONTA, 'outraconta'))).toBeNull()
    expect(imagens.idNaNuvem(NA_NUVEM.replace('/vitrinelocal/', '/outra-pasta/'))).toBeNull()
    expect(imagens.idNaNuvem(NA_NUVEM.replace(ID, 'qualquer-nome'))).toBeNull()
    expect(imagens.idNaNuvem('https://exemplo.com/foto.webp')).toBeNull()
  })

  it('apaga da nuvem a imagem órfã, com o identificador certo', async () => {
    comNuvem()
    const chamada = nuvemFalsa({ result: 'ok' })
    await imagens.apagarSeOrfa(prismaComUsos(0), NA_NUVEM)
    const [url, opcoes] = chamada.mock.calls[0]
    expect(url).toBe(`https://api.cloudinary.com/v1_1/${CONTA}/image/destroy`)
    expect(opcoes.body.get('public_id')).toBe(`vitrinelocal/${ID}`)
  })

  it('não apaga da nuvem imagem que outro cadastro ainda usa', async () => {
    comNuvem()
    const chamada = nuvemFalsa({ result: 'ok' })
    await imagens.apagarSeOrfa(prismaComUsos(1), NA_NUVEM)
    expect(chamada).not.toHaveBeenCalled()
  })

  it('o schema aceita o endereço do Cloudinary', () => {
    expect(imagens.campoImagem('inválida').safeParse(NA_NUVEM).success).toBe(true)
  })
})
