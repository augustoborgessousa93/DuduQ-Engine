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

## Pacote de evidência aprovado

Workflow: `R143 Visual Baseline`

- Run: `32919122660`
- Head: `6a80b9f31aa8e9ea5a21682da4ab7f77bee8b364`
- Resultado: **SUCCESS**
- Artifact: `r143-approved-visual-baseline`
- Artifact ID: `9589222031`
- Digest: `sha256:4db852260a3ddeba58ab634fc86104d91b37f394dab3983d6958fd9ca25b6ca5`
- Retenção configurada: 30 dias

O pacote contém screenshots e métricas JSON para:

- Desktop: 1366 × 768
- Notebook: 1280 × 650
- Tablet: 1024 × 768
- Mobile: 390 × 844

Todos os quatro cenários foram capturados no site público com Canary R143 / Drag & Drop 2.0.22 e passaram sem overflow horizontal.

## Características visuais que definem esta baseline

A referência visual aprovada usa:

- composição centralizada;
- card principal compacto, sem ocupar desnecessariamente metade da tela;
- estímulo visual central com área de soltura imediatamente associada;
- alternativas organizadas horizontalmente no desktop/notebook, mantendo proximidade visual com o estímulo;
- reorganização responsiva no mobile, preservando alvos grandes e leitura clara;
- cabeçalho, progresso e instrução visualmente separados do espaço da atividade;
- amplo espaço de respiro sem transformar a atividade em dois grandes blocos laterais concorrentes.

A apresentação promovida no R144 — grande painel à esquerda + coluna vertical de respostas à direita — **não é referência visual aprovada** e não deve voltar ao fluxo público sem nova aprovação explícita.

## Regras para qualquer nova versão

Uma nova implementação de Drag & Drop pode melhorar comportamento, acessibilidade, scoring, retry, toque, arraste e responsividade, mas **não pode substituir o visual aprovado sem nova homologação visual explícita**.

Critérios mínimos:

1. Preservar a hierarquia visual e a sensação de composição da R143.
2. Não transformar o card principal em um painel excessivamente grande nem deslocar as alternativas para uma coluna lateral dominante sem aprovação visual específica.
3. Manter alternativas e ações com dimensões confortáveis para alunos dos anos iniciais.
4. Não introduzir clipping ou overflow horizontal.
5. Não exibir instrumentação técnica ou marcadores de homologação ao aluno.
6. Mudanças funcionais não equivalem automaticamente a aprovação visual.
7. A comparação final deve ser feita lado a lado contra os screenshots desta baseline antes de qualquer promoção do Canary.
8. Mudanças pequenas e úteis — por exemplo, remoção de informação redundante — podem ser propostas, mas devem ser validadas sem descaracterizar a composição aprovada.

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
