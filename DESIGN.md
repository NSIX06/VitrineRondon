---
name: VitrineRondon
description: Vitrine do comércio de bairro de Rondonópolis em traço de gibi, com anil, ouro e contorno de nanquim.
colors:
  anil: "#17346e"
  anil-escuro: "#0f2557"
  anil-medio: "#1e3a8a"
  anil-claro: "#dbe4ff"
  ceu: "#e4ebfb"
  ouro: "#fbbf24"
  mostarda: "#f59e0b"
  ouro-claro: "#fde68a"
  ouro-escuro: "#854d0e"
  whatsapp: "#10b981"
  whatsapp-hover: "#0ea371"
  whatsapp-tinta: "#062b1e"
  sucesso: "#15803d"
  sucesso-fundo: "#e3f5e8"
  lacre: "#c8322b"
  lacre-escuro: "#9b1c1c"
  lacre-fundo: "#fff1ef"
  contorno: "#111827"
  cinza: "#374151"
  cinza-claro: "#6b7280"
  branco: "#ffffff"
  papel: "#f8f6f0"
  superficie: "#faf8f2"
  superficie-baixa: "#f4f1e8"
  superficie-media: "#ece7da"
  superficie-alta: "#e2dccb"
  linha: "#cfc8b4"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', 'Arial Black', Impact, sans-serif"
    fontSize: "clamp(32px, 5vw, 58px)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Bricolage Grotesque', 'Arial Black', Impact, sans-serif"
    fontSize: "clamp(24px, 2.8vw, 32px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
  title:
    fontFamily: "'Bricolage Grotesque', 'Arial Black', Impact, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
  body:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  etiqueta: "4px"
  sm: "6px"
  md: "8px"
  cartao: "12px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "2.5rem"
  "8": "4rem"
components:
  botao-primario:
    backgroundColor: "{colors.anil}"
    textColor: "{colors.branco}"
    rounded: "{rounded.md}"
    padding: "0.8rem 1.5rem"
  botao-primario-hover:
    backgroundColor: "{colors.anil-escuro}"
  botao-destaque:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.contorno}"
    rounded: "{rounded.md}"
    padding: "0.8rem 1.5rem"
  botao-destaque-hover:
    backgroundColor: "{colors.mostarda}"
  botao-secundario:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.anil}"
    rounded: "{rounded.md}"
    padding: "0.8rem 1.5rem"
  botao-secundario-hover:
    backgroundColor: "{colors.ouro-claro}"
    textColor: "{colors.contorno}"
  botao-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.whatsapp-tinta}"
    rounded: "{rounded.md}"
    padding: "0.9rem 1.5rem"
  botao-whatsapp-hover:
    backgroundColor: "{colors.whatsapp-hover}"
  cartao:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.contorno}"
    rounded: "{rounded.cartao}"
  chip-categoria:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.contorno}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "44px"
  chip-categoria-ativo:
    backgroundColor: "{colors.ouro}"
    textColor: "{colors.contorno}"
  etiqueta:
    textColor: "{colors.contorno}"
    typography: "{typography.label}"
    rounded: "{rounded.etiqueta}"
    padding: "0.2rem 0.6rem"
  campo:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.contorno}"
    rounded: "{rounded.md}"
    height: "48px"
---

# Design System: VitrineRondon

## Overview

**Creative North Star: "O Gibi do Bairro"**

O VitrineRondon conta o comércio de bairro como uma história em quadrinhos de banca. Cada superfície é desenhada a nanquim: contorno preto grosso (3px), cores chapadas, sombra em bloco sem desfoque e cel-shading com uma faixa de sombra embaixo e um brilho no canto de cima, nunca com degradê suave. O azul anil é o céu e a noite dos quadros; o ouro é o toldo da logo, o adesivo e a chamada para agir. Tudo fica sobre papel creme, como página de revistinha.

O traço é expressivo, mas a interface trabalha para um morador com celular simples e internet fraca. Por isso a densidade é moderada, o texto é grande e contrastado, e os efeitos são feitos de CSS (sombras, máscaras e SVG inline), sem imagens decorativas pesadas. O gibi aparece nos detalhes: o letreiro de duas tonalidades nos títulos, o adesivo inclinado no filtro escolhido, a hachura de nanquim num canto e o reflexo diagonal da vitrine da logo.

**Key Characteristics:**
- Contorno de nanquim de 3px (`--borda`) em cartões, botões, campos e faixas; 2px (`--borda-fina`) em etiquetas.
- Sombra dura deslocada, sem desfoque; elementos clicáveis afundam em direção a ela.
- Cel-shading chapado (`--cel`, `--cel-sm`) em botões e etiquetas.
- Títulos em letreiro de duas tonalidades, com uma linha de contorno embaixo.
- Faixas de cor (anil, ouro, céu, branco) alternando com o papel, para dar ritmo à página.
- Texturas de linhas diagonais, hachuras e pontos só como fundo, sempre discretas.

## Colors

Duas cores de marca chapadas, anil e ouro, sobre papel creme, mais um verde reservado ao WhatsApp e cores de estado pontuais.

### Primary
- **Anil** (`anil`): cor de títulos, links, botões primários e das faixas de cabeçalho. O anil escuro é o hover e o fundo noturno; o anil médio aparece em detalhes de faixa; o anil claro e o céu são fundos claros azulados.

### Secondary
- **Ouro** (`ouro`): o toldo da logo. Chamadas para agir (`botao-destaque`), adesivo do filtro escolhido, foco do teclado (contorno de 3px) e selos. A mostarda é o hover dele; o ouro claro é o hover dos botões brancos e o fundo das faixas douradas; o ouro escuro é texto sobre fundos dourados claros.

### Tertiary
- **Verde WhatsApp** (`whatsapp`): exclusivo do botão que abre a conversa no WhatsApp, com texto `whatsapp-tinta` para contraste. É a ação mais importante do produto e é a única coisa verde de destaque na tela.

### Neutral
- **Nanquim** (`contorno`): contornos, sombras em bloco e o texto principal. É a mesma cor para os três usos, de propósito.
- **Cinza** (`cinza`): texto secundário e descrições (contraste de 10:1 sobre branco). O `cinza-claro` fica só em placeholder e notas pequenas.
- **Papel** (`papel`): fundo da página. As superfícies baixa, média e alta são os tons de papel para painéis e áreas internas; `linha` é o divisor sobre papel.
- **Branco** (`branco`): fundo de cartões, campos e botões claros.
- **Estados:** `sucesso` e `sucesso-fundo` para "Aberto agora" e confirmações; `lacre`, `lacre-escuro` e `lacre-fundo` para erro, "Fechado" e ações de perigo.

### Named Rules
**A Regra do Verde Só no WhatsApp.** O verde `whatsapp` aparece só no botão que abre a conversa. Assim, em qualquer tela, o caminho para falar com quem faz é a coisa mais fácil de achar. Os outros verdes são de estado e têm tom próprio: `sucesso` no "Aberto agora" e um verde-claro (#4ade80) no selo "Novo".

**A Regra do Ouro que Chama.** Ouro em fundo grande é faixa; ouro em botão é a ação principal da tela. Não use dois botões ouro competindo no mesmo bloco.

## Typography

**Display Font:** Bricolage Grotesque (com Arial Black e Impact de reserva)
**Body Font:** Inter (com system-ui de reserva)

**Character:** a Bricolage é a voz do letreiro, larga e pesada (700 a 800), em títulos, preços e números. A Inter carrega a interface e o texto corrido com peso 500 de base, para não sumir em tela de celular simples. As duas fontes são servidas pelo próprio site e recortadas (a Bricolage com tamanho óptico fixo).

### Hierarchy
- **Display** (800, clamp de 32px a 58px, altura de linha 1,05): o h1 de cada página e o título do topo da Home. Sempre em letreiro de duas tonalidades.
- **Headline** (700, clamp de 24px a 32px, 1,05): títulos de seção.
- **Title** (700, 20px, 1,05): nomes nos cartões e títulos de bloco. Nos cartões, quebra em no máximo 2 linhas.
- **Body** (500, 15px, 1,5): texto corrido e interface, com no máximo 70ch por linha.
- **Label** (700, 11px, 0,04em, maiúsculas): etiquetas e selos. É o menor tamanho permitido.
- **Preço** (Bricolage 800, 28px no cartão, 34px na página do item): o número que mais pesa depois do nome.

### Named Rules
**A Regra do Letreiro.** h1, h2 e os nomes dos cartões usam o letreiro: a parte de cima da letra mais clara (`--letra-luz`), a de baixo mais escura (`--letra-sombra`) e uma linha de contorno embaixo. Sobre anil, o letreiro fica branco e gelo, com contorno de nanquim. O efeito é da marca; não copie esse degradê em texto de interface nem em parágrafo.

**A Regra do Piso de 11px.** Nada abaixo de 11px, nem selo compacto. Campos de texto usam 16px, para o celular não dar zoom ao tocar.

## Layout

Conteúdo em uma coluna centralizada de até 1200px, com respiro lateral fluido de 1rem a 2,5rem (`--gutter`). A escala de espaçamento tem 8 passos, de 0,25rem a 4rem; grupos internos usam os passos 2 a 4, e seções usam 6 a 8.

As páginas alternam faixas de cor de largura total, com contorno em cima e embaixo, com áreas sobre o papel. Cada página abre com uma faixa (anil, ouro, céu ou branco).

A grade de cartões tem 3 colunas no computador, 2 em telas médias e 1 no celular. Os pontos de quebra usados de fato são **900px** (vira uma coluna, o herói empilha) e **600px** (celular: filtros empilham, as categorias viram uma linha que desliza para o lado). Formulários grandes usam consulta de contêiner, pela largura do próprio formulário.

No celular, a primeira tela de uma listagem precisa mostrar pelo menos o começo do primeiro item. O botão do WhatsApp precisa aparecer sem rolagem: no topo do perfil e preso ao pé da tela na página do item.

## Elevation & Depth

A profundidade é de gibi, não de material: não há sombra desfocada em lugar nenhum. Cada elemento elevado tem uma sombra em bloco de nanquim deslocada para baixo e para a direita, e a altura muda pelo deslocamento. Dentro do elemento, o cel-shading (faixa escura embaixo e brilho no canto de cima, ambos chapados) dá volume sem degradê.

### Shadow Vocabulary
- **Sombra dura** (`box-shadow: 5px 5px 0 0 #111827`): cartões, caixas de destaque e a chamada principal.
- **Sombra de botão** (`box-shadow: 4px 4px 0 0 #111827`): botões, campos e seletores em repouso.
- **Sombra pequena** (`box-shadow: 2px 2px 0 0 #111827`): etiquetas, e o estado "afundado" de botões e cartões no hover.
- **Cel** (`inset 0 -4px 0 0 rgba(17,24,39,.2), inset 3px 3px 0 0 rgba(255,255,255,.35)`): volume chapado nos botões; o `--cel-sm` é a versão das etiquetas.

### Named Rules
**A Regra da Tecla.** Elemento clicável afunda em direção à própria sombra: no hover, desloca 2px a 3px e a sombra encolhe; no clique, desloca 4px e a sombra some (0,12s). Nada sobe nem brilha no hover.

**A Regra do Zero Desfoque.** Nenhuma sombra tem desfoque. Se precisar de mais profundidade, aumente o deslocamento.

## Shapes

Cantos levemente arredondados, sempre com contorno: 12px em cartões e painéis, 8px em botões, campos e chips, 6px em peças pequenas e 4px em etiquetas. Etiquetas e selos ficam inclinados de -1,5° a 1° e alternam a inclinação quando há duas lado a lado, como adesivos colados à mão. O filtro escolhido também inclina (-1,5°) e ganha fundo ouro.

As fotos ficam recortadas em 4:3 dentro do cartão, com o ponto de foco escolhido pelo empreendedor. Os enfeites são SVG inline: reflexo diagonal branco (o vidro da vitrine da logo), hachura de nanquim num canto e listras de fita de obra na serrilha.

## Components

### Buttons
Teclas que afundam: sólidas, contornadas e com sombra em bloco.
- **Shape:** cantos de 8px, contorno de nanquim de 3px, sombra de botão mais cel.
- **Primário:** fundo anil e texto branco, para ações de interface.
- **Destaque:** fundo ouro e texto nanquim, para a chamada principal da tela. Há uma por bloco.
- **Secundário e claro:** fundo branco e texto anil; o "claro" é para fundos escuros.
- **WhatsApp:** fundo verde WhatsApp e texto verde-escuro, com ícone de conversa, sempre em largura total no celular.
- **Perigo:** fundo branco e texto lacre, que vira lacre cheio no hover.
- **Texto:** sem contorno nem sombra, sublinha no hover.
- **Hover / Focus:** afunda 2px no hover e 4px no clique; o foco é um contorno ouro de 3px com 2px de afastamento.

### Chips
- **Style:** branco, contorno de 3px, cantos de 8px, sombra de 3px, texto nanquim 700, com no mínimo 44px de altura.
- **State:** o escolhido vira um adesivo ouro inclinado (-1,5°) com cel-shading. No celular, os chips ficam numa só linha que desliza, nunca em várias fileiras.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** branco sobre papel; no plano Destaque, o fundo da página do negócio vira azul-noite com brilho laranja.
- **Shadow Strategy:** sombra dura; no hover ou foco, afunda 3px (Regra da Tecla).
- **Border:** nanquim de 3px.
- **Internal Padding:** passos 4 e 5 da escala.
- **Comportamento:** o cartão inteiro é o link (link estendido), e o foco do teclado contorna o cartão todo em ouro. Os links internos (o nome do negócio) ficam acima do link estendido e têm área de toque de 44px.

### Inputs / Fields
- **Style:** fundo branco, contorno de 3px, cantos de 8px, sombra de botão, no mínimo 48px de altura e 16px de texto.
- **Focus:** o fundo esquenta para creme e a sombra vira ouro (`4px 4px 0 0` ouro).
- **Error:** a mensagem fica junto do campo; ao enviar, a tela rola até o primeiro erro e mostra quantos faltam.
- **Seletores:** mesmo desenho, com seta própria (`appearance: none`).

### Navigation
- **Style:** barra branca com a logo, links em Inter 700 e o item da página atual como tecla ouro. A ação de cadastro é um botão ouro.
- **Mobile:** a logo à esquerda e um botão de menu ouro que abre o painel lateral.

### Etiquetas e selos
Adesivos de 11px em maiúsculas, com contorno de 2px, cantos de 4px, sombra pequena e inclinação. O selo "Negócio Destaque" é ouro com estrela; o selo "Novo" é verde. Etiqueta não é botão e não tem hover.

### Pilha de negócios (assinatura)
No topo da Home, os cartões de negócio ficam empilhados e inclinados, revezando sozinhos. A pilha pausa com o mouse em cima, fora da tela e com a aba escondida; com menos movimento pedido no sistema, fica parada. Só a foto da frente carrega na hora.

## Do's and Don'ts

### Do:
- **Do** contornar toda superfície interativa e todo cartão com nanquim de 3px (`--borda`) e dar a ela sombra em bloco sem desfoque.
- **Do** usar `--transicao-tecla` (0,12s) e fazer o elemento afundar em direção à sombra no hover e no clique.
- **Do** reservar o verde `whatsapp` para o botão de abrir a conversa e mantê-lo visível sem rolagem no celular.
- **Do** manter alvos de toque de pelo menos 44px. Em links de texto, aumente a área com padding e margem negativa, sem mudar o desenho.
- **Do** usar contorno ouro de 3px como foco do teclado em tudo.
- **Do** respeitar `prefers-reduced-motion`: pilhas, esqueletos e animações contínuas param.
- **Do** usar os tokens de `frontend/src/index.css` (`--cor-*`, `--esp-*`, `--raio*`, `--sombra-*`); nunca valores soltos.

### Don't:
- **Don't** usar sombra desfocada, brilho difuso ou vidro com desfoque em componentes. A profundidade é só a sombra em bloco.
- **Don't** usar texto abaixo de 11px, nem campo de texto abaixo de 16px.
- **Don't** aplicar o letreiro em degradê em parágrafos, rótulos ou botões. Ele é dos títulos e dos nomes.
- **Don't** pôr dois botões ouro competindo no mesmo bloco.
- **Don't** usar o verde `whatsapp` em nada que não abra a conversa no WhatsApp.
- **Don't** colocar as categorias em várias fileiras no celular.
