# Year 4 / Year 5 — matriz de candidatos M19–M30

Preparação FILA B. Esta matriz localiza material técnico; não promove a branch histórica nem substitui a autoridade editorial v2.3.

Fonte técnica candidata observada:

`scale/shared-engine-year3-bootstrap`

Head de referência da linhagem localizada:

`f33f1a2a2d8d3fdc4b0f89cc388b1e0c86cc8a08`

Classificação comum:

`SOURCE_CANDIDATE_LOCATED → RECONCILE BEFORE FILA A`

## Year 4 — M19–M24

| Fila global | Ano/Módulo | Entrypoint candidato | Conteúdo candidato | Estado |
|---|---|---|---|---|
| M19 | Year 4 / M01 | `content/english/year-4/module-01/index.html` | `module-01-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M20 | Year 4 / M02 | `content/english/year-4/module-02/index.html` | `module-02-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M21 | Year 4 / M03 | `content/english/year-4/module-03/index.html` | `module-03-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M22 | Year 4 / M04 | `content/english/year-4/module-04/index.html` | `module-04-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M23 | Year 4 / M05 | `content/english/year-4/module-05/index.html` | `module-05-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M24 | Year 4 / M06 | `content/english/year-4/module-06/index.html` | `module-06-v1.js` | SOURCE_CANDIDATE_LOCATED |

Shared candidate factory:

`content/english/year-4/year4-content-factory-v1.js`

Todos os seis diretórios foram verificados como materializados, e cada módulo possui `index.html` + `module-XX-v1.js` na candidata.

## Year 5 — M25–M30

| Fila global | Ano/Módulo | Entrypoint candidato | Conteúdo candidato | Estado |
|---|---|---|---|---|
| M25 | Year 5 / M01 | `content/english/year-5/module-01/index.html` | `module-01-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M26 | Year 5 / M02 | `content/english/year-5/module-02/index.html` | `module-02-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M27 | Year 5 / M03 | `content/english/year-5/module-03/index.html` | `module-03-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M28 | Year 5 / M04 | `content/english/year-5/module-04/index.html` | `module-04-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M29 | Year 5 / M05 | `content/english/year-5/module-05/index.html` | `module-05-v1.js` | SOURCE_CANDIDATE_LOCATED |
| M30 | Year 5 / M06 | `content/english/year-5/module-06/index.html` | `module-06-v1.js` | SOURCE_CANDIDATE_LOCATED |

Shared candidate factory:

`content/english/year-5/year5-content-factory-v1.js`

Todos os seis diretórios foram verificados como materializados, e cada módulo possui `index.html` + `module-XX-v1.js` na candidata.

## Reconciliação obrigatória antes de homologação

Para cada M19–M30:

1. extrair IDs, ordem, alternativas e gabaritos da revisão oficial v2.3;
2. comparar 100% contra `module-XX-v1.js`;
3. classificar a demanda de leitura e multimodalidade pelo perfil pedagógico do ano;
4. mapear mechanics históricas para releases oficiais então vigentes, sem copiar infraestrutura `scale-v1` por conveniência;
5. classificar cada representação visual como `CANONICAL_DIRECT`, `LOCAL_COMPOSITION_PROVEN` ou `REAL_ASSET_GAP`;
6. mapear áudio real versus `spokenText + speechLocale + fallback` sem fabricar URLs;
7. inventariar factories, aliases, bridges e fallbacks históricos como `ACTIVE`, `DORMANT`, `REDUNDANT` ou `REQUIRED` antes de remoção;
8. homologar em shards independentes para desktop, Full HD, tablet e mobile, com os mesmos 10 critérios e agregação 4/4.

## Dependência compartilhada atualmente aberta

A reconciliação pode continuar, mas homologações compactas não devem considerar a surface atual confiável enquanto permanecer o `BLOCKER_GLOBAL — SHARED_COMPACT_MECHANIC_SURFACE` documentado em `GLOBAL_COMPACT_SURFACE_BLOCKER_R146.md`.

Isso não reclassifica M19–M30 como gaps de fonte. A fonte técnica existe; o bloqueio é de infraestrutura de execução/homologação compacta.
