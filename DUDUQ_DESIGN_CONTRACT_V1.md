# DUDUQ DESIGN CONTRACT — V1

## GOLDEN BASELINES
- Matching
- Target Shooter
- Canonical Header HUD
- Canonical Question HUD

## SHARED CORE

### Header HUD
- progress bar
- contador
- fullscreen
- slot de mascote
- identidade DuduQ

### Question HUD
- painel de pergunta
- instruction slot
- media slot
- action slot
- botão de áudio

### Typography
- Fredoka: UI e labels
- Nunito: títulos e textos fortes

### Visual System
- azul DuduQ
- verdes naturais
- creme/dourado
- branco para highlights
- verde = sucesso
- coral = erro

### Components
Botões premium seguem, quando aplicável:

Shadow
Depth
Surface
Highlight
Icon/Label

Painéis:
- superfície clara
- depth inferior
- stroke interno
- radius arredondado
- sombra suave

## MATCHING ONLY
- cards de associação
- pares
- conexões
- seleção
- confirmação
- validação

## TARGET SHOOTER ONLY
- arena
- alvos
- launcher/canhão
- projéteis
- seleção de alvo
- validação de tiro

## ARCHITECTURE

```text
DUDUQ GAME
├── SHARED CORE
└── MECHANIC LAYER
```

O Shared Core define a identidade visual.

A Mechanic Layer define a interação específica de cada jogo.

## REGRA PARA NOVAS MECÂNICAS

Toda nova mecânica deve primeiro herdar:

- Header HUD
- Question HUD
- tipografia
- botões
- profundidade
- radius
- feedback
- paleta
- estilo de painéis

Depois recebe somente os componentes específicos da nova mecânica.

## PRESERVAÇÃO

Matching e Target Shooter são GOLDEN BASELINES.

Não alterar suas versões aprovadas para construir o Design System.

O Design System é extraído das baselines.

As baselines não são reconstruídas a partir do Design System.
