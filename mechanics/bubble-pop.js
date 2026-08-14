ARQUIVO OFICIAL: mechanics/bubble-pop.js
==============================================================================
Faça estas duas alterações:

1)
DE:
Versão 1.2.2

PARA:
Versão 1.2.3

2)
DE:
const VERSION = "1.2.2";

PARA:
const VERSION = "1.2.3";

Não altere o contrato/payload da mecânica.
A mudança de versão serve para o Engine buscar o runtime corrigido sem reutilizar
a versão anterior em cache.
