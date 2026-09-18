# DUDUQ Matching — Gold Master Candidate v1

Candidate isolada de homologação. Abre diretamente em `index.html` por servidor HTTP local; não é referenciada por canal, módulo, release ou runtime publicado.

## Auditoria / baseline

- Repo HEAD: `52a32aa0a6cb7aa4b09278790047c1c914610580` (lido de `.git/refs/heads` em 2026-09-15).
- `git` CLI não está instalado/disponível no shell desta sessão; portanto não foi possível validar a lista integral de modificações já existentes no worktree. Nenhum arquivo preexistente foi editado nesta candidate.
- Runtime integrado canary: `engine/channels/canary-v1.json` aponta Matching `1.0.23` (`engine/releases/mechanics/matching/1.0.23/`).
- Runtime integrated stable: `engine/channels/stable-v1.json` ainda aponta Matching `1.0.0`.
- Adapter funcional de origem: `mechanics/matching.js` v`1.0.3`; transforma questões em conteúdos do motor universal, preserva shuffle/pairs/audio e monta o runtime em iframe. O bundle do runtime `1.0.23` contém o renderer React/Matching e o motor de relações.
- Host e assets compartilhados: `core/duduq-host.js`, `core/duduq-schema.js`, `core/duduq-assets.js`, `core/duduq-progress-ui.js`, `core/duduq-sound.js`, além dos estilos/transição do core.
- Conteúdo dos módulos está em `content/english/year-{1..5}/module-*/`; os JSON/configs de canal definem as versões servidas. Não foi feita nenhuma alteração nessa árvore.
- Assets oficiais vêm do catálogo compartilhado em `core/duduq-assets.js` (Whispering Woods, mascotes, imagens semânticas de pets e áudio); não há pacote local `assets/` no workspace.
- Candidate específica `test/matching/` não existia. As capturas `artifacts/matching-phase1/` e `matching-phase2/after/` e o teste `test/visual/matching-phase1-viewports.mjs` preexistentes testam o runtime standalone, mas não são uma candidate isolada baseada no Penpot.
- SHA-256 no início desta alteração (baseline dos arquivos reaproveitados, não editados): `mechanics/matching.js` `8E2B8BE20A075BB4553A8A0773A27066BECDED38F90B4C78AC9D15D36FA1D1B4`; canary `1156EFC26D2DA50E302043DA4C89076D1E6CB1473010FC3318D05465621D4248`; stable `390B8E270CF2F53F534BAD2C03322B27D01BE4C3D4973C688BB755C39C795543`; matching 1.0.23 adapter `6542EA8551782A13B17DF936E3CB12DE41E9A8B5EB18207D49DFA4AE20F97B8D`; matching 1.0.23 HTML `0831BCAC950D4F1281047F0CC924C995F0453402C779880C58E65FE6ED45EB84`; assets core `FFE9DEE40C6CB8F7DD54933D02D601DDE20049169639EF802CA8D55C8AFE2AA2`; host core `D2B9B8D9163C75B47C13C99CCA7D167DC02CDFF8364D4C6606CED6F4F3E4B898`.
- Referência Penpot somente leitura: arquivo `DuduQ Core UI Kit — Gold Master`; boards Matching 4.1 Correct (`2258249c-3ca6-8006-8008-a39fc1484d32`) e Incorrect (`2258249c-3ca6-8006-8008-a3ae753195c7`), ambos em 1366×768. A renderização do estado Idle nesta candidate remove apenas os indicadores/feedback de resposta já mostrados nas pranchas de feedback.
- A barra mostrada na prancha ocupa aproximadamente 91% com rótulo `4 / 10`; esta candidate preserva a aparência observada no Penpot e anuncia programaticamente o valor 4 de 10. Essa diferença entre o progresso visual e o contador fica registrada para a revisão de design, sem reinterpretar o Gold Master.

## Escopo da Fase 1 (registro histórico)

Implementados shell visual, camada de cenário/legibilidade, HUD, painel de questão e Matching no estado Idle. Os dados de demonstração ficam no fixture separado; o renderer recebe apenas o contrato de pares e não codifica animais. Esta é uma fundação técnica visual, não substitui o adapter nem declara o Gold Master completo. Nesta etapa os cards ainda não executam seleção, validação interativa, desenho de linhas, estados/feedbacks, transição ou avanço; esses comportamentos permanecem no runtime funcional 1.0.23 até a integração planejada.

Em `480×320` o CTA desabilitado fica oculto para preservar os quatro pares e hit areas de 44 px; em `640×360` ele permanece. Essa exceção responsiva está isolada por container query e deve ser revisitada ao conectar seleção/confirmar.

## Fase 2 — Matching interativo

A implementação desta fase atualiza o registro histórico acima: a candidate já inclui seleção por mouse/toque, troca de seleção, conexões dinâmicas em SVG ancoradas nos cards, validação explícita por `CONFIRMAR`, estados correct/incorrect, faixa de feedback com assets oficiais DuduQ, retry, transition/loading e contrato de avanço via `window.DUDUQ_MATCHING_HOST.nextRound({ completed, total })`. Sem próxima questão fornecida pelo host, a preview termina em estado concluído; nenhum conteúdo pedagógico novo é inventado.

A barra usa `calculateProgress(completed,total)`. O HUD em 4/10 agora exibe 40%, conforme a regra funcional definida nesta fase, divergindo intencionalmente do preenchimento ~91% visto no frame Penpot. A faixa `CONFIRMAR` agora permanece visível em 480×320; cards, fullscreen e áudio mantêm hit areas mínimas de 44px, sem overflow. O fluxo host-next foi validado com payload de QA temporário; o fixture pedagógico oficial da candidate permanece separado e inalterado.

Motion tokens incluem `--motion-fast`, `--motion-normal`, `--motion-feedback`, `--ease-ui` e `--ease-game`, com suporte a `prefers-reduced-motion`. As funções do motor de interação são independentes do renderer/dos rótulos e cobrem seleção, reconnect, confirmação, retry e estado de loading.

## Validação Fase 2

- `node --test test/matching/gold-master-candidate-v1/matching-engine.test.mjs`: 7 testes de domínio/progresso.
- `node test/matching/gold-master-candidate-v1/verify.mjs`: estados Idle/Selected/Connected/Correct/Incorrect/Loading, mouse, touch, resize do SVG, host next, 40% de progresso, zero overflow e zero exceções JS nos tamanhos `1920×1080`, `1366×768`, `1280×720`, `640×360`, `480×320`, `390×844`.
- Capturas em `artifacts/matching-gold-master-candidate-v1/`: seis tamanhos Idle e screenshots 1366×768 Selected, Selected+Connected, Correct, Incorrect, Loading. A fonte visual Penpot foi consultada somente em leitura; a candidate preserva estrutura/composição base. Restam diferenças inerentes ao fixture/estado Idle em relação às pranchas Penpot de feedback e a regra do progresso (91% na imagem aprovada versus 40% funcional).
- Nenhum runtime, release, módulo pedagógico, outro mecanismo, remote ou Cloudflare foi alterado.

## Execução e verificação

Sirva a raiz do workspace em localhost e abra `/test/matching/gold-master-candidate-v1/`. Exemplo: `python -m http.server 4173` na raiz. O harness `verify.mjs` captura os seis tamanhos alvo e valida composição/overflow/sem erros de página. A validação de domínio independente roda com `node --test test/matching/gold-master-candidate-v1/matching-engine.test.mjs`.
