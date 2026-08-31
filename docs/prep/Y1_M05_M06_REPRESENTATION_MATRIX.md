# Y1 M05/M06 — matriz de representação fail-closed

Escopo: preparação técnica somente. Nenhum conteúdo editorial, gabarito, mecânica produtiva ou asset do repositório `Assets-DuduQ` é alterado por este documento.

Pin canônico auditado: `f0f8bed8e8c24fad4eae204bf4a5cc84a8d8263f`.

Estados permitidos:
- `CANONICAL_DIRECT`: existe asset canônico semanticamente direto no pin.
- `LOCAL_COMPOSITION_PROVEN`: a representação exata pode ser construída localmente apenas organizando/repetindo assets canônicos já existentes, sem gerar novo desenho, sem recolorir e sem usar `data:image`.
- `REAL_ASSET_GAP`: não existe asset direto e a composição local exata não está comprovada; tratar fail-closed até novo asset/pin ou prova de composição.

## M05 — Pets, Colors & Size

| necessidade | estado | base canônica / decisão |
|---|---|---|
| big dog | CANONICAL_DIRECT | `Imagens Ilustrativa/big dog -cachorro grande.png` |
| small dog | CANONICAL_DIRECT | `Imagens Ilustrativa/small dog -cachorro pequeno.png` |
| big cat | CANONICAL_DIRECT | `Imagens Ilustrativa/big cat - gato grande.png` |
| small cat | CANONICAL_DIRECT | `Imagens Ilustrativa/small cat -gato pequeno.png` |
| brown dog | REAL_ASSET_GAP | catálogo possui dog e cor brown separadamente, mas não `brown dog`; recoloração não é considerada composição comprovada |
| small white cat | REAL_ASSET_GAP | catálogo possui `small cat` e white separados, mas não `small white cat`; recoloração não é considerada composição comprovada |
| Q11 personagem + dog/rabbit/cat | REAL_ASSET_GAP | há personagens e pets individuais, mas o conjunto de três cenas personagem+pet exigido pelo item não possui equivalência direta; composição de pose/posse ainda não foi homologada |

### Consequência de preparação M05

1. Q07/Q08 podem usar diretamente os assets de tamanho já existentes quando o item exigir big/small.
2. Q09 (`brown dog`) e Q12 (`small white cat`) permanecem fail-closed de asset, não devem receber preview procedural.
3. Q11 não deve ser resolvido por emoji, SVG procedural, `data:image` ou montagem não comprovada.
4. Os pets simples (`dog`, `cat`, `fish`, `rabbit`, `hamster`, `bird`, `turtle`) têm representação canônica conhecida e devem ser resolvidos pelo catálogo no momento da homologação.

## M06 — My English World Review

| necessidade | estado | base canônica / decisão |
|---|---|---|
| 3 orange crayons | LOCAL_COMPOSITION_PROVEN | repetir exatamente 3 vezes o mesmo asset canônico `school-object-orange-crayon-giz-laranja.png` em um container local; sem recolorir/gerar novo desenho |
| 4 rulers | LOCAL_COMPOSITION_PROVEN | repetir 4 vezes `school-object-ruler-regua.png` |
| 5 rulers | LOCAL_COMPOSITION_PROVEN | repetir 5 vezes `school-object-ruler-regua.png` |
| 6 rulers | LOCAL_COMPOSITION_PROVEN | repetir 6 vezes `school-object-ruler-regua.png` |
| arrival / greeting / farewell sequence | LOCAL_COMPOSITION_PROVEN | combinar em sequência visual assets canônicos de chegada/cumprimento/despedida já existentes, preservando cada cena como asset independente e a ordem como informação do layout |
| red backpack | REAL_ASSET_GAP | existe backpack simples e variante red+yellow, mas não foi localizado `red backpack` exato; não recolorir |
| small turtle | REAL_ASSET_GAP | existe turtle simples, mas não `small turtle` exato; escala sem contrato visual homologado não é assumida como semântica de `small` |
| big brown dog | REAL_ASSET_GAP | existem big dog e brown separados, mas não `big brown dog`; recoloração não é considerada composição comprovada |

### Regra de composição local comprovada

A composição é aceita nesta matriz somente quando a semântica adicional é puramente de **quantidade ou sequência**:
- quantidade: repetir N instâncias do mesmo asset canônico;
- sequência: ordenar duas ou mais cenas canônicas já semanticamente completas.

Não é aceita como prova nesta fase:
- recoloração CSS/canvas;
- deformação para criar `big/small` quando não existe asset semanticamente correspondente;
- montagem personagem+pet que implique pose, posse ou relação espacial não existente na imagem-fonte;
- SVG procedural;
- `data:image`;
- preview textual como substituto visual.

## Áudio

O pin auditado continua com áudio real somente em `Audios/1_ANO/M01`. M05/M06 devem permanecer em preparação com `spokenText` + `speechLocale` + fallback controlado. `plannedSrc` não pode ser promovido a URL real sem novo pin oficial.
