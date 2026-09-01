# Y1 M05/M06 — readiness de modalidade v2.3

Preparação somente. Este documento **não altera mechanics, conteúdo, alternativas, respostas ou assets**. A seleção abaixo é uma hipótese técnica forte para reduzir o tempo da futura FILA A; a homologação de cada item continua sendo a autoridade final.

Critério transversal para Year 1 R0:
- `imagem/contexto → áudio`: candidato principal a Drag & Drop 2.0.24 `single-choice` com cards auditivos e um contexto visual;
- `áudio → imagem/cena`: candidato principal a Target Shooter `audio-to-image` sem timer/punição;
- leitura escrita não é condição de sucesso;
- grafia pode aparecer somente como reforço pós-resposta;
- feedback: pista + segunda tentativa.

## M05 — Pets, Colors & Size

| ID | fonte v2.3 | representação | mechanic provável | asset status |
|---|---|---|---|---|
| EN1-M5-01 | dog + opções áudio cat/dog/fish | imagem → áudio | DD 2.0.24 single-choice | dog CANONICAL_DIRECT |
| EN1-M5-02 | cat + opções áudio | imagem → áudio | DD single-choice | cat CANONICAL_DIRECT |
| EN1-M5-03 | fish + opções áudio | imagem → áudio | DD single-choice | fish CANONICAL_DIRECT |
| EN1-M5-04 | rabbit + opções áudio | imagem → áudio | DD single-choice | rabbit CANONICAL_DIRECT |
| EN1-M5-05 | hamster + opções áudio | imagem → áudio | DD single-choice | hamster CANONICAL_DIRECT |
| EN1-M5-06 | bird + opções áudio | imagem → áudio | DD single-choice | bird CANONICAL_DIRECT |
| EN1-M5-07 | contraste de dois dogs, escolher `big dog` por áudio | contexto visual → áudio | DD single-choice | big dog + small dog CANONICAL_DIRECT |
| EN1-M5-08 | contraste de dois cats, escolher `small cat` por áudio | contexto visual → áudio | DD single-choice | big cat + small cat CANONICAL_DIRECT |
| EN1-M5-09 | brown dog + expressões em áudio | imagem → áudio | DD single-choice | REAL_ASSET_GAP |
| EN1-M5-10 | turtle + chunk `It’s a ___` + opções áudio | contexto → áudio / escolha guiada | DD single-choice provável; não usar Smart Sentence por leitura | turtle CANONICAL_DIRECT |
| EN1-M5-11 | áudio `I have a cat.` + 3 cenas personagem+pet | áudio → imagem | Target Shooter provável | REAL_ASSET_GAP para conjunto exato de 3 cenas |
| EN1-M5-12 | small white cat + 3 descrições em áudio | imagem → áudio | DD single-choice | REAL_ASSET_GAP |

### Perfil provável M05

- DD single-choice: 11/12 itens.
- Target Shooter audio-to-image: 1/12 item (Q11).
- Smart Sentence: **não presumido**, porque a v2.3 exige resposta sem leitura autônoma e Q10 pode ser entregue como escolha auditiva guiada.
- Nenhum preview procedural deve sobreviver.

## M06 — My English World Review

| ID | fonte v2.3 | representação | mechanic provável | asset status |
|---|---|---|---|---|
| EN1-M6-01 | cena de manhã + cartão Leo + 3 falas áudio | cena → áudio | DD single-choice | composição/cena canônica a auditar no detalhe |
| EN1-M6-02 | áudio `six blue pencils` + 3 imagens | áudio → imagem | Target Shooter | quantidade/composição local provável |
| EN1-M6-03 | red backpack + expressões áudio | imagem → áudio | DD single-choice | REAL_ASSET_GAP |
| EN1-M6-04 | 3 orange crayons + expressões áudio | imagem → áudio | DD single-choice | LOCAL_COMPOSITION_PROVEN por quantidade |
| EN1-M6-05 | áudio `Sit down` + 3 cenas de ação | áudio → imagem | Target Shooter | cenas canônicas existentes |
| EN1-M6-06 | áudio `Touch your hands` + 3 ações/partes do corpo | áudio → imagem/contexto | Target Shooter provável | body/action assets canônicos a resolver |
| EN1-M6-07 | small turtle + expressões áudio | imagem → áudio | DD single-choice | REAL_ASSET_GAP |
| EN1-M6-08 | red pencil + expressões áudio | imagem → áudio | DD single-choice | red pencil CANONICAL_DIRECT |
| EN1-M6-09 | áudio `five rulers` + 4/5/6 rulers | áudio → imagem | Target Shooter | LOCAL_COMPOSITION_PROVEN por quantidade |
| EN1-M6-10 | áudio `Touch your arms` + 3 ações | áudio → imagem/contexto | Target Shooter provável | body/action assets canônicos a resolver |
| EN1-M6-11 | big brown dog + expressões áudio | imagem → áudio | DD single-choice | REAL_ASSET_GAP |
| EN1-M6-12 | chegada → apresentação → despedida + sequências áudio | sequência visual/contexto → áudio | DD single-choice provável | LOCAL_COMPOSITION_PROVEN por ordem de cenas canônicas |

### Perfil provável M06

- DD single-choice: 7/12 itens.
- Target Shooter: 5/12 itens.
- A seleção permanece hipótese de preparação até a inspeção funcional de cada payload na futura branch de homologação.

## Migração de infraestrutura comum M05/M06

Quando cada módulo entrar na FILA A, reaproveitar o mesmo padrão já preparado para:

1. atualizar o entrypoint legado `systemic-loader-v1` para o padrão real da Foundation vigente;
2. retirar `data:image`/SVG procedural/gap-preview;
3. resolver canonical assets fail-closed;
4. carregar apenas bridges comprovadamente necessárias à mechanic efetiva;
5. usar `spokenText` + `speechLocale` e fallback controlado — nunca transformar `plannedSrc` em URL inexistente;
6. validar wrong→retry→released→correct→success e Progress/Completion;
7. preservar IDs, alternativas, respostas, habilidade e intenção v2.3.

A homologação futura pode alterar uma escolha de mechanic desta matriz se a evidência pedagógica/funcional do item exigir, sem tratar isso como regressão da preparação.
