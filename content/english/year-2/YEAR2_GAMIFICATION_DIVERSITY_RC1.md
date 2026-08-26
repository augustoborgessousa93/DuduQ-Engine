# Year 2 Gamification Diversity RC1

## Escopo

Esta RC altera somente a camada de gamificação do Inglês — 2º ano. O banco pedagógico v2.3 permanece congelado: IDs, ordem, vocabulário, alternativas, respostas, habilidade/objetivo e a regra de não exigir leitura autônoma em inglês continuam preservados.

## Resultado da seleção

A camada registra 55 candidatos à diversificação. Destes, 53 recebem transformação segura de mecânica e 2 permanecem na mecânica anterior por falta de representação visual segura para as quatro alternativas:

- `EN2-M5-08`
- `EN2-M5-12`

Esses dois casos são fallbacks intencionais e auditados; não devem ser forçados apenas para equilibrar contagens de mecânicas.

## Mecânicas adicionadas ao sorteio editorial

- Matching imagem → áudio
- Matching áudio → imagem
- Matching áudio → áudio, apenas onde a relação continua clara
- Bubble Pop áudio → numeral
- Target Shooter áudio → imagem
- Drag & Drop preservado quando continua sendo a relação mais adequada

## Matching com distratores

O runtime Matching normalmente exige que todos os itens da coluna direita façam parte de pares corretos. Nesta RC, apenas questões marcadas com `behavior.allowUnpairedDistractors: true` podem apresentar um par correto e três distratores visuais. A validação legada permanece inalterada para qualquer outro conteúdo.

O browser gate também valida a segunda tentativa de forma comportamental: após um erro, a questão deve permanecer incompleta, apresentar feedback de retry, remover o par incorreto e devolver os cards à interação. O teste não exige que o marcador visual interno volte para `idle`; `retry` pode permanecer enquanto a segunda tentativa já estiver disponível.

## Gates automatizados

O teste `test/year2/gamification-diversity-rc1.mjs` executa os seis módulos reais e valida os 90 itens:

- 15 questões por módulo;
- IDs e ordem intactos;
- respostas iguais ao `sourceAnswerV23`;
- nenhuma transformação marcada como mudança de conteúdo;
- nenhuma exigência de leitura autônoma em inglês;
- 53 transformações seguras;
- somente os dois fallbacks intencionais de M5;
- estrutura das novas mecânicas e patch restrito do Matching.

O browser gate `test/year2/gamification-diversity-browser-rc1.mjs` usa Chromium/Playwright para verificar casos representativos de Matching, Bubble Pop e Target Shooter em desktop e mobile, incluindo erro → feedback → segunda tentativa → acerto no Matching e ausência de overflow horizontal.

## Homologação antes de promoção

A RC só pode sair de Draft quando os gates de integridade e Chromium estiverem verdes e as evidências visuais forem revisadas. A baseline Drag & Drop R143 e o repositório Assets-DuduQ não fazem parte desta promoção.

> Revalidação: o workflow foi ajustado para sempre fazer checkout explícito da branch RC durante a homologação, evitando re-runs presos a um merge ref antigo do PR.
