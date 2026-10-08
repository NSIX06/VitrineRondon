// Formatação dos planos e assinaturas, num lugar só para a página de planos,
// o painel do empreendedor e o painel da administração falarem igual.
import { formatarPreco } from './formatos'

const formatadorData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })

export const precoEmReais = (centavos) => formatarPreco((centavos ?? 0) / 100)

export const dataLonga = (valor) => (valor ? formatadorData.format(new Date(valor)) : '—')

const CICLOS = { WEEKLY: 'semana', MONTHLY: 'mês', QUARTERLY: 'trimestre', SEMIANNUALLY: 'semestre', ANNUALLY: 'ano' }
export const porCiclo = (ciclo) => `por ${CICLOS[ciclo] ?? 'mês'}`

/** Status da assinatura: texto e variante de tag */
export const STATUS_ASSINATURA = {
  PENDENTE: { rotulo: 'Aguardando pagamento', variante: 'neutra' },
  ATIVA: { rotulo: 'Ativa', variante: 'ouro' },
  INADIMPLENTE: { rotulo: 'Pagamento recusado', variante: 'alerta' },
  CANCELADA: { rotulo: 'Cancelada', variante: 'neutra' },
}

/**
 * Situação do negócio (calculada pela API). Só ATIVO aparece na vitrine:
 * navegar é gratuito, divulgar exige conta + plano em vigor.
 */
export const SITUACAO_NEGOCIO = {
  RASCUNHO: {
    rotulo: 'Rascunho',
    variante: 'neutra',
    titulo: 'Seu negócio ainda não está publicado',
    texto: 'Escolha o plano Essencial ou Destaque para publicar seu negócio no VitrineRondon.',
  },
  AGUARDANDO_PAGAMENTO: {
    rotulo: 'Aguardando pagamento',
    variante: 'neutra',
    titulo: 'Falta concluir o pagamento',
    texto: 'Seu negócio será publicado assim que o pagamento do plano for confirmado.',
  },
  ATIVO: {
    rotulo: 'Publicado',
    variante: 'ouro',
    titulo: 'Seu negócio está na vitrine',
    texto: 'Ele fica publicado enquanto a assinatura estiver em dia.',
  },
  ASSINATURA_EXPIRADA: {
    rotulo: 'Plano inativo',
    variante: 'alerta',
    titulo: 'Seu plano está inativo',
    texto: 'Renove sua assinatura para voltar a divulgar seu negócio no VitrineRondon. Seus dados, produtos e fotos continuam guardados.',
  },
  SUSPENSO: {
    rotulo: 'Suspenso',
    variante: 'alerta',
    titulo: 'Seu negócio foi retirado da vitrine pela administração',
    texto: 'Fale com a equipe pela página de contato para entender o motivo e regularizar.',
  },
}
