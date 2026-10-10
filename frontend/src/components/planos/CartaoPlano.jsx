import Icone from '../ui/Icone/Icone'
import { economiaAnual, nomeDoPlano, porCiclo, precoEmReais } from '../../services/planos'
import './CartaoPlano.css'

// Ícone de cada benefício do Destaque, pelo assunto do texto (os textos vêm
// do servidor, em backend/prisma/planos.js)
const ICONES_BENEFICIO = [
  [/selo/i, 'verified'],
  [/ordem das listas/i, 'trending_up'],
  [/vitrine animada|página inicial/i, 'view_carousel'],
  [/campanhas|redes/i, 'campaign'],
  [/estatísticas/i, 'monitoring'],
]
const iconeDoBeneficio = (texto) => ICONES_BENEFICIO.find(([regra]) => regra.test(texto))?.[1] ?? 'check'

/**
 * Cartão de um plano, igual em todo o site: página de planos, última etapa do
 * cadastro e aba Plano do "Meu negócio". Sete linhas sempre na mesma ordem
 * (topo, nome, chamada, preço, "o que inclui", benefícios, ação), alinhadas
 * com o cartão vizinho dentro de uma <ul className="planos__lista">.
 * - `plano`, `todosOsPlanos`: o plano e a lista (para a economia do anual)
 * - `acao`: o botão do rodapé, que muda conforme a tela
 * - `nota`: texto curto opcional abaixo do botão
 */
function CartaoPlano({ plano, todosOsPlanos = [], acao, nota }) {
  const economia = economiaAnual(plano, todosOsPlanos)
  return (
    <li className={`planos__cartao reflexo-ao-passar ${plano.destaque ? 'planos__cartao--destaque' : ''}`}>
      {plano.destaque && (
        <span className="planos__fita">
          <Icone nome="workspace_premium" tamanho={16} />
          Mais popular
        </span>
      )}

      <div className="planos__topo">
        <span className="planos__chip">
          {plano.destaque && <Icone nome="star" tamanho={14} />}
          {plano.destaque ? 'Negócio em destaque' : 'Para quem está começando'}
        </span>
        <span className="planos__icone" aria-hidden="true">
          <Icone nome={plano.destaque ? 'campaign' : 'storefront'} tamanho={22} />
        </span>
      </div>

      <div className="planos__nome">
        <h2 className="planos__titulo">{nomeDoPlano(plano)}</h2>
        <span className="planos__etiqueta">{plano.destaque ? 'Prioridade nas listas' : 'Presença local'}</span>
      </div>
      <p className="planos__chamada">{plano.chamada}</p>

      <div className="planos__preco-caixa">
        <p className="planos__preco">
          <strong>{precoEmReais(plano.precoCentavos)}</strong>
          <span>{porCiclo(plano.ciclo)}</span>
        </p>
        {economia && (
          <span className="planos__preco-equivale">
            Equivale a {precoEmReais(Math.round(plano.precoCentavos / 12))} por mês ·{' '}
            <strong>economia de {precoEmReais(economia.centavos)}</strong>
          </span>
        )}
        {/* As mesmas duas linhas nos dois planos: cobrança e diferencial */}
        <span className="planos__preco-nota">
          <Icone nome="event_available" tamanho={16} />
          Cobrança {plano.ciclo === 'ANNUALLY' ? 'anual' : 'mensal'}, sem fidelidade
        </span>
        <span className="planos__preco-nota">
          <Icone nome={plano.destaque ? 'star' : 'storefront'} tamanho={16} />
          {plano.destaque ? 'Tudo do Essencial, com mais exposição' : 'Seu negócio na vitrine, na busca e no mapa'}
        </span>
      </div>

      {/* Faixa "o que inclui" nos dois, para as listas começarem na mesma altura */}
      <p className="planos__inclui">
        <Icone nome={plano.destaque ? 'done_all' : 'checklist'} tamanho={18} />
        {plano.destaque && plano.beneficios[0]?.startsWith('Tudo')
          ? `${plano.beneficios[0]}, e mais:`
          : 'O essencial para vender pelo bairro:'}
      </p>
      <ul className="planos__beneficios">
        {plano.beneficios
          .filter((beneficio, i) => !(plano.destaque && i === 0 && beneficio.startsWith('Tudo')))
          .map((beneficio) => (
            <li key={beneficio}>
              <span className="planos__beneficio-icone" aria-hidden="true">
                <Icone nome={plano.destaque ? iconeDoBeneficio(beneficio) : 'check'} tamanho={16} />
              </span>
              <span>{beneficio}</span>
            </li>
          ))}
      </ul>

      {/* A nota fica dentro da linha da ação: o cartão tem sempre 7 linhas */}
      <div className="planos__acao">
        {acao}
        {nota && <p className="planos__nota">{nota}</p>}
      </div>
    </li>
  )
}

export default CartaoPlano
