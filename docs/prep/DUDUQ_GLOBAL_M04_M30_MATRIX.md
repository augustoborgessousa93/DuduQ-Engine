# DuduQ — Matriz técnica global M04–M30

Branch de preparação: `prep/global-m04-m30`

Regra: esta matriz não altera conteúdo pedagógico, gabaritos, IDs ou respostas. Ela registra somente localização, legado técnico, contratos, assets/gaps e estado de preparação antecipada.

| ID | Ano | Módulo | Localização real | Versão conteúdo / pedagogy | Canary legado | Entrypoint | Mecânicas / contrato técnico observado | data:image / procedural | Áudio | Bridges / patches | Assets / gaps | Padrão transversal | Estado de preparação |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|
| M04 | 1 | 04 | `content/english/year-1/module-04` / branch `homolog-year1-m04-official` | v2.3 candidata / Factory 1.2 / R0 | R146 candidato | real, com guards/bridges homologados | TS + DD 2.0.24 single-choice | removido na candidata | multimodal + fallback auditado | runtime-surface-guard + router direct-payload compat + helper local M04 | canônicos; LEGS usa asset knees + highlight local | estado forte Transition; latch áudio; helper local fail-closed | FILA A em homologação |
| M05 | 1 | 05 | `content/english/year-1/module-05` | 1.1.0 / Pedagogy 1.0 / fonte v2.2 | R124 | `systemic-loader-v1` legado | pacote legado usa majoritariamente Smart Sentence; TS em itens pontuais | **SIM**: `svgAsset`, `countDots`, `colorBlock`, `bodyPreview`, `simplePet`, `pairSizePreview`, `simpleSchoolCount`; múltiplos `gap-preview` | catálogo planejado M05; vários `src` vazios + fallback | sem guards/bridges modernos no entrypoint | pets básicos resolvidos; vários compostos/tamanho/cor/contagem ainda `gap-preview` no pacote legado | migrar para v2.3/R0; assets canônicos primeiro; composição local só quando equivalente | MAPEADO — pronto para auditoria oficial |
| M06 | 1 | 06 | `content/english/year-1/module-06` | 1.1.0 / Pedagogy 1.0 / fonte v2.2 | R124 | `systemic-loader-v1` legado | pacote de revisão misto; precisa auditoria v2.3 por habilidade | **SIM**: mesmo gerador procedural de M05 + `gap-preview` | catálogo planejado M06; fallback legado | sem guards/bridges modernos no entrypoint | gaps de contagem, tamanho, cenas e body preview; vários assets simples resolvidos | mesmo padrão técnico obsoleto de M05; não copiar mecânica sem auditoria | MAPEADO — pronto para auditoria oficial |
| M07 | 2 | 01 | `content/english/year-2/module-01` | v2.3 multimodal + legado v2.2 coexistente | cadeia histórica R143/RCs | entrypoint público v2.3 | mixed: Matching, Bubble Pop, TS, DD e fallback controlado | política v2.3 proíbe fallback provisional; revisar payloads por módulo | `ttsProvisional:true`; first-listen gate local | cadeia longa de adapters/hotfixes/router-compat + DD visual patch; Player/Loader dinâmicos com `Date.now()` | Assets-DuduQ-first; revisar gaps reais | cadeia comum Year2; consolidar só com equivalência comprovada | MAPEAMENTO AVANÇADO |
| M08 | 2 | 02 | `content/english/year-2/module-02` | v2.3 multimodal + `module-02-v22-homolog.js` | cadeia histórica R143/RCs | entrypoint público v2.3 | mixed pela factory/diversity RC | revisar | `ttsProvisional:true` | mesma cadeia comum Year2; Player/Loader dinâmicos com cache-bust | Assets-DuduQ-first | padrão comum M07–M12 | MAPEAMENTO AVANÇADO |
| M09 | 2 | 03 | `content/english/year-2/module-03` | v2.3 multimodal + v2.2 homolog | cadeia histórica R143/RCs | entrypoint público v2.3 | mixed pela factory/diversity RC | revisar | `ttsProvisional:true` | mesma cadeia comum Year2 | Assets-DuduQ-first | padrão comum M07–M12 | MAPEAMENTO AVANÇADO |
| M10 | 2 | 04 | `content/english/year-2/module-04` | v2.3 multimodal + v2.2 homolog | cadeia histórica R143/RCs | entrypoint público v2.3 | mixed pela factory/diversity RC | revisar | `ttsProvisional:true` | mesma cadeia comum Year2 | Assets-DuduQ-first | padrão comum M07–M12 | MAPEAMENTO AVANÇADO |
| M11 | 2 | 05 | `content/english/year-2/module-05` | v2.3 multimodal + v2.2 homolog | cadeia histórica R143/RCs | entrypoint público v2.3 | mixed; dois fallbacks intencionais registrados na RC (`EN2-M5-08`, `EN2-M5-12`) | revisar | `ttsProvisional:true` | mesma cadeia comum Year2 | Assets-DuduQ-first | preservar fallbacks quando não houver representação visual segura | MAPEAMENTO AVANÇADO |
| M12 | 2 | 06 | `content/english/year-2/module-06` | v2.3 multimodal + v2.2 homolog | cadeia histórica R143/RCs | entrypoint público v2.3 | mixed pela factory/diversity RC | revisar | `ttsProvisional:true` | mesma cadeia comum Year2 | Assets-DuduQ-first | padrão comum M07–M12 | MAPEAMENTO AVANÇADO |
| M13 | 3 | 01 | fonte técnica localizada em branch `feat/year3-v23-multimodal`; implementação modular ainda não materializada | source of truth v2.3 | n/a | não materializado | política permite pool homologado por habilidade | não materializado | áudio repetível obrigatório para conteúdo verbal | nenhuma bridge definida ainda | Assets-DuduQ-first | Year3 transição: sem leitura autônoma obrigatória | FONTE LOCALIZADA |
| M14 | 3 | 02 | idem M13 | v2.3 | n/a | não materializado | por habilidade | não materializado | idem | pendente | Assets-DuduQ-first | idem | FONTE LOCALIZADA |
| M15 | 3 | 03 | idem M13 | v2.3 | n/a | não materializado | por habilidade | não materializado | idem | pendente | Assets-DuduQ-first | idem | FONTE LOCALIZADA |
| M16 | 3 | 04 | idem M13 | v2.3 | n/a | não materializado | por habilidade | não materializado | idem | pendente | Assets-DuduQ-first | idem | FONTE LOCALIZADA |
| M17 | 3 | 05 | idem M13 | v2.3 | n/a | não materializado | por habilidade | não materializado | idem | pendente | Assets-DuduQ-first | idem | FONTE LOCALIZADA |
| M18 | 3 | 06 | idem M13 | v2.3 | n/a | não materializado | por habilidade | não materializado | idem | pendente | Assets-DuduQ-first | idem | FONTE LOCALIZADA |
| M19 | 4 | 01 | **não localizado no repositório/branches atuais** | fonte pedagógica externa v2.3 a localizar na fase de materialização | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M20 | 4 | 02 | idem M19 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M21 | 4 | 03 | idem M19 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M22 | 4 | 04 | idem M19 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M23 | 4 | 05 | idem M19 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M24 | 4 | 06 | idem M19 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M25 | 5 | 01 | **não localizado no repositório/branches atuais** | fonte pedagógica externa v2.3 a localizar na fase de materialização | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M26 | 5 | 02 | idem M25 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M27 | 5 | 03 | idem M25 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M28 | 5 | 04 | idem M25 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M29 | 5 | 05 | idem M25 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |
| M30 | 5 | 06 | idem M25 | pendente | n/a | não materializado | pendente | pendente | pendente | pendente | pendente | não inventar conteúdo | LOCALIZAÇÃO GITHUB PENDENTE |

## Padrões transversais comprovados

1. **Year 1 M05/M06:** mesmo pacote legado R124/v2.2, mesmo entrypoint antigo e mesmo gerador procedural. A migração de infraestrutura pode seguir um padrão comum; mecânica e payload pedagógico continuam sujeitos à auditoria oficial individual.
2. **Year 2 M01–M06:** mesmos adapters/bridges de v2.3 e mesmo carregamento dinâmico de Player/Loader. `Date.now()` aparece como cache-busting do `src` dinâmico; não há evidência, por si só, de mudança de contrato.
3. **Year 2 router compatibility:** os guards atuais removem campos de apresentação que o Router rejeita e preservam source answers. Não remover por limpeza; consolidar apenas se os entrypoints homologados modernos cobrirem o mesmo contrato.
4. **Year 2 Word Slash:** existe quarentena explícita para runtime 1.0.17 com fallback TS; tratar como dívida técnica documentada, não remover até revalidar o runtime.
5. **Year 3:** fonte de produção/staging real localizada em `feat/year3-v23-multimodal`; atualmente contém política/README e não módulos materializados.
6. **Year 4–5:** nenhuma branch ou diretório correspondente foi localizado nas branches atuais do repositório; permanecer fail-closed e não inventar implementação.

## Próximas ações da FILA B

- mapear M05/M06 item a item: finalidade dos previews, asset canônico equivalente, composição local segura e gaps reais;
- confirmar, em todos os entrypoints Year 2, a identidade da cadeia comum e catalogar diferenças por módulo;
- classificar cada bridge Year 2 como necessária, substituível por padrão homologado ou pendente de evidência;
- localizar qualquer fonte GitHub adicional de Year 4/5 por commits/tags/PRs antes da futura materialização.
