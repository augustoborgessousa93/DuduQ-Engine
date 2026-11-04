# Fase 2 — lote de animais Y1M06: matriz de execução (04/11/2026)

Origem: artefato 13253876328, `phase2-batch-source-integration.json`. **Esta é uma matriz de inspeção, não uma aprovação de substituição.** A fonte de imagens foi comparada contra `main` em 04/11: `a62c07c075a4a744f81dee2eea3a6b93108f9d08` continua o HEAD (0 commits adicionais).

## Resultado novo

Os 23 IDs candidatos de fish/bird/hamster estão **todos no módulo Y1M06**, abrangendo 14 questões distintas (Q002, Q005, Q006, Q007, Q009, Q010, Q011, Q012, Q013, Q014, Q015, Q016, Q017, Q020). Há 7 fish, 7 bird e 9 hamster, com `occurrences=1`, `questionIds.length=1`, `missingLeafSemantics=0` em cada binding. Esta consistência interna NÃO demonstra que o registro atual de produção ainda esteja provisório nem que todos os consumidores reais tenham sido identificados.

| Conceito | SHA-256 da fonte (prefixo) | IDs e questões |
|---|---|---|
| fish | `1fc64569b170` | IMG-Y1M06-Q002-FISH (Q002); IMG-Y1M06-Q005-FISH (Q005); IMG-Y1M06-Q006-FISH (Q006); IMG-Y1M06-Q010-FISH (Q010); IMG-Q013-FISH (Q013); IMG-Y1M06-Q016-FISH (Q016); IMG-Y1M06-Q020-FISH (Q020) |
| bird | `046b76b9215c` | IMG-Q005-BIRD (Q005); IMG-Y1M06-Q006-BIRD (Q006); IMG-Y1M06-Q007-BIRD (Q007); IMG-Y1M06-Q009-BIRD (Q009); IMG-Y1M06-Q010-BIRD (Q010); IMG-Q010-BIRD (Q010); IMG-Q015-BIRD (Q015) |
| hamster | `8185260c47c0` | IMG-Y1M06-Q007-HAMSTER (Q007); IMG-Q007-HAMSTER (Q007); IMG-Y1M06-Q009-HAMSTER (Q009); IMG-Y1M06-Q010-HAMSTER (Q010); IMG-Y1M06-Q011-HAMSTER (Q011); IMG-Y1M06-Q012-HAMSTER (Q012); IMG-Y1M06-Q014-HAMSTER (Q014); IMG-Y1M06-Q016-HAMSTER (Q016); IMG-Q017-HAMSTER (Q017) |

## Gate de alteração real

1. Resolver **todos os consumidores atuais** de cada mediaId na árvore de 600 questões do commit efetivamente publicado, não só os `questionIds` do artefato antigo; atenção especial aos IDs genéricos `IMG-Q005-BIRD`, `IMG-Q007-HAMSTER`, `IMG-Q010-BIRD`, `IMG-Q013-FISH`, `IMG-Q015-BIRD`, `IMG-Q017-HAMSTER`.
2. Comparar o caminho, o estado `temporary` e o hash de cada mediaId com o registro e o manifesto do deployment atual. **Excluir IDs já oficiais**; não gerar candidata vazia.
3. Conferir a semântica em cada alternativa e contexto (animal/pet, singular, opções corretas e distratores), sem alterar contratos ou gabaritos.
4. Validar SHA-256 integral das três fontes, transparência/contraste e captura real no preview do Y1M06. Só então preparar delta isolado com rollback; QA dirigido ao delta, não repetir o QA de SHA anterior.
5. Não tocar nos bloqueios white/banana/black, nem nos oito orange ligados ao hotfix, nem em áudio, mecânicas, Gold Masters ou runtime. **Não publicar em produção sem autorização explícita.**

**Estado:** matriz verificável de 23 bindings pronta; reconciliação com produção, QA visual e integração ainda pendentes.