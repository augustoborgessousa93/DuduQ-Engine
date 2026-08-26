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

## Compatibilidade com o Router R143

As transformações preservam o conteúdo pedagógico e removem apenas campos de apresentação herdados que não pertencem à nova interação. No Bubble Pop áudio → numeral, o áudio correto permanece como estímulo da questão e os numerais permanecem como alternativas visuais; imagem principal e áudio individual de alternativa não são enviados ao Router. No Target Shooter áudio → imagem, o áudio permanece como estímulo e os alvos permanecem visuais, sem áudio individual herdado nas alternativas.

Essa normalização é restrita às questões explicitamente transformadas pela camada de diversidade e não altera IDs, respostas, vocabulário, dificuldade, habilidade, sequência ou scripts de áudio oficiais.

## Gates automatizados permanentes

O teste `test/year2/gamification-diversity-rc1.mjs` executa os seis módulos reais e valida os 90 itens:

- 15 questões por módulo;
- IDs e ordem intactos;
- respostas iguais ao `sourceAnswerV23`;
- nenhuma transformação marcada como mudança de conteúdo;
- nenhuma exigência de leitura autônoma em inglês;
- 53 transformações seguras;
- somente os dois fallbacks intencionais de M5;
- estrutura das novas mecânicas e patch restrito do Matching.

A homologação permanente em Chromium/Playwright mantém quatro camadas complementares:

- `gamification-diversity-browser-rc1.mjs`: casos representativos de Matching, Bubble Pop e Target Shooter em desktop e mobile, incluindo erro → feedback → segunda tentativa → acerto no Matching e ausência de overflow horizontal;
- `gamification-diversity-dynamic-visibility-rc1.mjs`: auditoria visual de todos os itens transformados por mecânicas dinâmicas;
- `gamification-diversity-matching-render-rc1.mjs`: renderização exaustiva de todos os itens Matching transformados;
- `gamification-diversity-public-entry-rc1.mjs`: smoke dos entrypoints reais M01–M06 em desktop e mobile, distinguindo corretamente 15 questões pedagógicas da quantidade de atividades/etapas agrupadas pelo Host.

O diagnóstico exploratório temporário de Matching foi removido depois que os gates permanentes passaram a cobrir o comportamento necessário.

## Evidência de homologação da RC limpa

Head homologado após a retirada do diagnóstico temporário: `2db8bf4759fdb20b440336b567d3dabcf2091bd3`.

Workflow `Year 2 Gamification Diversity RC1`, run `33010456265`: **sucesso integral**.

Nesse run passaram:

- integridade dos 90 itens reais;
- homologação representativa em Chromium;
- auditoria de visibilidade de todos os itens dinâmicos transformados;
- renderização exaustiva de Matching;
- smoke dos seis módulos públicos em desktop e mobile, totalizando 12 cenários de entrypoint;
- upload das evidências visuais da homologação.

O smoke público valida separadamente que cada módulo mantém 15 questões, que nenhuma atividade está vazia e que `session.totalSteps` corresponde à quantidade real de atividades agrupadas pelo Player.

## Homologação antes de promoção

A baseline Drag & Drop R143 e o repositório Assets-DuduQ não fazem parte desta promoção. A RC permanece em Draft até a revisão final e autorização explícita para promoção/merge.

> Revalidação: o workflow faz checkout explícito do head da PR durante a homologação, evitando re-runs presos a um merge ref antigo. Após esta atualização documental, deve existir um último run verde no head exato da branch antes de qualquer promoção.
