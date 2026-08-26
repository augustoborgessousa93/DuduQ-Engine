# DuduQ — Baseline Visual Oficial R143

## Status

**Baseline visual aprovada para o fluxo público do M03 — 2º ano / English / TOYS.**

Esta baseline existe para impedir que melhorias técnicas futuras alterem silenciosamente a qualidade visual já aprovada.

## Referência técnica

- Canal público: `canary-v1`
- Revision: `143`
- Drag & Drop: `2.0.22`
- Entry público do M03: versão anterior ao piloto `SINGLE_TARGET_CHOICE`
- `interactionPilot`: ausente
- `dragDropCandidate`: ausente
- runtime patch `2.0.23/dd2-single-target-runtime-patch.js`: não carregado pelo M03 público
- URL primária de validação: `https://duduq-engine.pages.dev/content/english/year-2/module-03/`

## Referência visual obrigatória

O pacote de evidência deve conter screenshots integrais nos seguintes viewports:

- Desktop: 1366 × 768
- Notebook: 1280 × 650
- Tablet: 1024 × 768
- Mobile: 390 × 844

O workflow `R143 Visual Baseline` gera também arquivos JSON com medidas do host, iframe, card principal e controles visíveis para comparação posterior.

## Regras para qualquer nova versão

Uma nova implementação de Drag & Drop pode melhorar comportamento, acessibilidade, scoring, retry, toque, arraste e responsividade, mas **não pode substituir o visual aprovado sem nova homologação visual explícita**.

Critérios mínimos:

1. Preservar a hierarquia visual e a sensação de composição da R143.
2. Não reduzir de forma relevante a presença do estímulo principal ou transformar a tela em uma composição excessivamente vazia.
3. Manter alternativas e ações com dimensões confortáveis para alunos dos anos iniciais.
4. Não introduzir clipping, overflow horizontal ou botão principal parcialmente oculto.
5. Não exibir instrumentação técnica, badges de capacidade ou marcadores de homologação ao aluno.
6. Mudanças funcionais não equivalem automaticamente a aprovação visual.
7. A comparação final deve ser feita lado a lado contra os screenshots desta baseline antes de qualquer promoção do Canary.

## Histórico

O Canary R144 / Drag & Drop 2.0.23 foi tecnicamente funcional, porém sua apresentação visual pública foi rejeitada na revisão humana. O rollback restaurou exatamente o manifest R143 e o entry público anterior do M03. O código 2.0.23 permanece preservado no repositório para evolução futura em homologação isolada.

## Gate de promoção futuro

Uma futura release só poderá substituir esta baseline quando, simultaneamente:

- regressões funcionais estiverem verdes;
- regressões de outras estratégias do Drag & Drop estiverem verdes;
- os quatro breakpoints visuais estiverem aprovados;
- houver revisão humana lado a lado contra esta baseline;
- o rollback da nova promoção estiver preparado antes do merge.

Até essa aprovação, **R143 / Drag & Drop 2.0.22 é a referência visual oficial do M03 público**.
