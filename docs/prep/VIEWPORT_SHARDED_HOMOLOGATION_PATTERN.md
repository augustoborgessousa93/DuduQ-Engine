# DuduQ — padrão de homologação shardada por viewport

Escopo: preparação de QA/CI para M05–M30. Este documento não promove mecânicas, não altera conteúdo, não altera releases e não reduz a cobertura oficial dos 10 critérios.

## Origem do padrão

O M04 comprovou que executar quatro viewports sequencialmente em um único job torna falhas de sincronização caras de localizar e pode consumir o timeout do workflow sem produzir uma assertion útil. O padrão para os próximos módulos passa a ser **um shard por viewport**, mantendo exatamente o mesmo contrato funcional em cada shard.

## Viewports oficiais

- `desktop-1366x768`
- `fullhd-1920x1080`
- `tablet-768x1024`
- `mobile-390x844`

A matrix deve usar `fail-fast: false` para preservar evidência dos quatro shards mesmo quando um deles falhar.

## Contrato de cada shard

Cada viewport executa os mesmos 10 critérios:

1. CONTENT
2. PEDAGOGY
3. MECHANIC
4. ASSETS
5. AUDIO
6. VISUAL
7. RESPONSIVENESS
8. ACCESSIBILITY
9. INTEGRATION
10. REGRESSION

O teste deve aceitar uma seleção explícita por ambiente, preferencialmente `VIEWPORT_NAME`, e rejeitar nomes fora da lista oficial.

O estado forte antes de qualquer interação deve exigir, conforme a mecânica:

- `DuduQ.getSession()` existente;
- `session.transitioning === false`;
- `session.completed === false` durante o percurso;
- `DuduQTransition.getState() === "idle"`;
- iframe montado e `contentDocument.readyState` utilizável;
- root da mecânica e controles efetivamente ativos;
- ausência de áudio ativo quando a interação exigir estado livre.

## Esperas e diagnóstico

Toda espera relevante deve ser finita. Falha de contrato deve registrar no mínimo:

- questionId;
- ação/await;
- `stepIndex`;
- `transitioning`;
- `completed`;
- `progress`;
- Transition state;
- iframe mounted/readyState;
- mecânica ativa;
- feedback state;
- estado de áudio;
- targets/cards enabled/disabled;
- `pageerror`;
- `critical404`.

Não aumentar timeout como substituto de diagnóstico.

## Artifacts

Cada shard deve publicar artifact próprio, por exemplo:

`yearX-mYY-official-${viewport}`

O artifact deve preservar, quando aplicável:

- `report.json` do shard;
- screenshots de representações especiais;
- screenshot de Completion;
- captura diagnóstica de falha.

## Agregação

Um job final deve depender da matrix e declarar sucesso somente quando o resultado agregado dos quatro shards for `success`.

Saída conceitual obrigatória:

`MYY PASS 4/4 10/10`

`3/4` nunca é homologação oficial.

## Reexecução proporcional

Se um shard falhar:

1. ler apenas o shard falho;
2. classificar `TEST_BUG`, `PRODUCT_BUG LOCAL` ou `BLOCKER GLOBAL`;
3. corrigir somente o necessário;
4. reexecutar proporcionalmente quando o CI permitir;
5. nunca usar paralelização para esconder falha funcional.

## Áudio Year 1 enquanto o pin atual permanecer

O pin canônico auditado possui áudio real apenas em `Audios/1_ANO/M01`. Para M02–M06, manter `spokenText + speechLocale + fallback controlado`; `plannedSrc` não é mídia existente.

## Aplicação

M05–M30 devem nascer com este padrão sempre que não houver motivo técnico concreto para um gate diferente. A homologação continua sendo 4/4 e 10/10; apenas a arquitetura de CI deixa de ser monolítica.
