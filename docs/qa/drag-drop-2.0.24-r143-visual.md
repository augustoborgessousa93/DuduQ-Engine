# Drag & Drop 2.0.24 — Homologação R143 Visual

## Objetivo

Criar a próxima iteração do `SINGLE_TARGET_CHOICE` combinando:

- comportamento pedagógico/funcional validado no 2.0.23;
- aparência e composição visual da baseline oficial R143 / Drag & Drop 2.0.22.

## Regra principal

**Nenhuma melhoria funcional autoriza mudança automática do visual aprovado.**

A nova candidata deve parecer uma evolução da R143, não uma repetição da composição R144 rejeitada.

## Baseline obrigatória

Referência: `docs/qa/r143-visual-baseline.md`.

Características a preservar:

- composição centralizada;
- card principal compacto;
- estímulo e zona de soltura visualmente associados;
- alternativas próximas ao estímulo;
- alternativas predominantemente horizontais no desktop/notebook;
- reorganização responsiva no mobile;
- ausência de overflow horizontal;
- cabeçalho/progresso/instrução preservados.

## Comportamentos a reaproveitar do 2.0.23

- uma única escolha posicionada por vez;
- toque/clique equivalente ao arraste;
- nova escolha substitui a anterior antes da confirmação;
- `CONFIRMAR` habilita após qualquer alternativa válida ser selecionada;
- seleção não revela o gabarito;
- erro somente após confirmação;
- feedback de erro breve e retorno do card à origem;
- acerto somente após confirmação;
- gabarito ligado ao `correctChoiceId`, preservando IDs estáveis;
- sem regressão para `sequence`, multi-target, classification ou ordering.

## O que NÃO deve voltar do R144

- grande painel ocupando a metade esquerda da tela;
- coluna vertical dominante de alternativas à direita;
- aumento excessivo da área vazia entre estímulo e respostas;
- mudança de composição que faça o jogo parecer uma interface diferente da baseline R143.

## Estratégia de implementação

1. Não alterar `canary-v1` durante a homologação.
2. Não modificar releases imutáveis 2.0.22 ou 2.0.23.
3. Criar a candidata 2.0.24 em camada isolada.
4. Separar comportamento de layout sempre que possível.
5. Comparar screenshots lado a lado contra o artifact oficial da R143.
6. Só criar promoção após aprovação humana dos quatro breakpoints.

## Gates obrigatórios

- desktop 1366×768;
- notebook 1280×650;
- tablet 1024×768;
- mobile 390×844;
- drag real;
- tap/click;
- troca de escolha;
- erro + retorno;
- acerto;
- sequence parity;
- generic multi-target parity;
- zero overflow horizontal;
- comparação visual contra baseline R143.

## Estado inicial

Branch: `homolog/drag-drop-2.0.24-r143-visual`

Produção permanece em:

- Canary R143;
- Drag & Drop 2.0.22;
- M03 público sem `SINGLE_TARGET_CHOICE`.

Nenhuma promoção está autorizada nesta fase.
