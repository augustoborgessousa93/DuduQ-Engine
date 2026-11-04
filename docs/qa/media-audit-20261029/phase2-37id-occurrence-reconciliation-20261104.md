# Fase 2 — gate de ocorrências verificáveis (04/11/2026)

Fonte: artifact GitHub 13253876328, `phase2-batch-source-integration.json`; filtro `missingLeafSemantics===0 && questionIds.length===1`. **Não é autorização de integração ou deploy.**

| Conceito | IDs | Ocorrências declaradas | Fonte |
|---|---:|---:|---|
| fish | 7 | 7 | pet-fish-peixe.png |
| bird | 7 | 7 | pet-bird-passaro.png |
| hamster | 9 | 9 | pet-hamster.png |
| orange (cor) | 8 | 8 | color orange-cor laranja.png |
| fourteen | 1 | 5 | Fourteen-quatorze.png |
| twenty | 1 | 5 | wenty-vinte.png |
| play | 2 | 8 | routine-play-brincar.png |
| bed | 2 | 8 | Bed.png |
| **Total** | **37** | **63** | **8 PNGs** |

**Correção de interpretação:** os 37 IDs classificados como de questão única não correspondem a 37 ocorrências. Há **63 ocorrências declaradas**; especificamente, os seis IDs de fourteen/twenty/play/bed somam **26 ocorrências** embora cada binding liste apenas uma questionId. Isto é um sinal concreto de divergência entre `questionIds` e `occurrences`; NÃO considerar esses seis IDs seguros para substituição antes de reconciliar cada ocorrência real nas 600 questões.

Os 23 IDs de fish/bird/hamster somam 23 ocorrências declaradas e são o primeiro lote candidato à verificação, não à publicação automática. Os 8 orange devem ser confrontados com o hotfix de 03/11 para não regredir a distinção cor/fruta.

Gates obrigatórios: confirmar HEAD de origem, SHA-256 da fonte, caminho/estado de registro publicado, todos os consumidores reais do ID, semântica de cada alternativa e contraste visual no preview; preservar white/banana/black e as 105 semânticas incompletas em quarentena. Nenhuma alteração de gabaritos, 600 contratos, áudios, mecânicas ou Gold Masters. Criar candidata isolada apenas se houver delta real; produção somente com autorização explícita.
