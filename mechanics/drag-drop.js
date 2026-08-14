ARQUIVO OFICIAL: mechanics/drag-drop.js
==============================================================================
Faça estas duas alterações:

1)
DE:
Versão 1.0.2

PARA:
Versão 1.0.3

2)
DE:
const VERSION = "1.0.2";

PARA:
const VERSION = "1.0.3";

MANTENHA:
const RUNTIME_VERSION = "1.2.0";
const BRIDGE_VERSION = "1.0.0";

Não altere o contrato/payload da mecânica.
A mudança de VERSION serve para o Engine solicitar novamente o runtime corrigido.
