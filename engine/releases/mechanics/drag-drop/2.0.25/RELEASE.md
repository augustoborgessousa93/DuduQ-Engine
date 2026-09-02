# Drag & Drop 2.0.25 — Smart Confirm

Release imutável candidata composta sobre 2.0.24.

Escopo exclusivo da região interna da mecânica Drag & Drop:

- confirmação explícita antes de qualquer avaliação, inclusive `single-choice`;
- smart snap neutro por geometria e capacidade, sem usar o gabarito;
- drag por pointer/touch, tap-to-move e teclado preservados;
- Escape cancela seleção/arraste;
- retry bloqueia acertos e devolve somente itens incorretos;
- drop fora de destino não contabiliza resposta;
- mídia preserva proporção com `object-fit: contain`;
- reflow interno para desktop, tablet, mobile, mobile compacto e viewport equivalente a zoom 200%;
- áudio/TTS e contratos atuais preservados.

Base imutável: `drag-drop@2.0.24`.

Não altera Host, Core, Loader, Player, Router, Progress, Completion, backgrounds, conteúdos ou outras mecânicas.
