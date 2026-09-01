# Year 4 / Year 5 — fonte técnica localizada

Preparação FILA B. Nenhuma implementação histórica é promovida por este registro.

## Descoberta

A busca por nome de branch era insuficiente. A implementação técnica de Year 4 e Year 5 está materializada dentro de:

`scale/shared-engine-year3-bootstrap`

Head observado:

`f33f1a2a2d8d3fdc4b0f89cc388b1e0c86cc8a08`

Apesar do nome da branch mencionar Year 3, a árvore contém Years 3–5.

## Year 4

Localização:

`content/english/year-4/`

Contém:
- `module-01` … `module-06`;
- `year4-content-factory-v1.js`;
- entrypoints reais em módulos;
- conteúdo que declara como fonte `DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3`;
- preservação declarada de source IDs/prompts/options/answers.

QA já existente na mesma árvore:
- `test/scale/year4-v23-functional-reading-contract.mjs`;
- `test/scale/year4-all-modules-smoke.mjs`.

Classificação:

`SOURCE_CANDIDATE_LOCATED — RECONCILE BEFORE FILA A`

Não é `SOURCE_NOT_LOCATED` e também não é ainda a Foundation oficial.

## Year 5

Localização:

`content/english/year-5/`

Contém:
- `module-01` … `module-06`;
- `year5-content-factory-v1.js`;
- entrypoints reais;
- arquivos de conteúdo que declaram a fonte v2.3;
- preservação declarada de IDs/prompts/options/answers.

QA já existente:
- `test/scale/year5-v23-integrated-functional-contract.mjs`;
- `test/scale/year5-all-modules-smoke.mjs`.

Classificação:

`SOURCE_CANDIDATE_LOCATED — RECONCILE BEFORE FILA A`

## Contrato para futura reconciliação

Antes de Year 4/5 entrar na FILA A:

1. Tratar a revisão pedagógica v2.3 como autoridade editorial, não o histórico da branch scale.
2. Extrair os IDs/ordem/gabaritos dos seis módulos e comparar 100% com a autoridade.
3. Mapear mechanics efetivas e suas dependências de `scale-v1`.
4. Mapear assets, aliases e qualquer fallback procedural/gerado.
5. Substituir apenas infraestrutura histórica incompatível com a Foundation/Canary então vigente.
6. Reaproveitar contracts/smokes como evidência de intenção, revalidando-os contra o runtime oficial atual.
7. Não fazer merge wholesale de `scale/shared-engine-year3-bootstrap`.

## Resultado da preparação

M19–M30 não precisam mais de busca de fonte do zero. A próxima etapa é **reconciliação técnica/editorial**, com fonte concreta e QA histórico já localizados.
