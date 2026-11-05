# DUDUQ: duas filas independentes para produção e integração de imagens (30/10/2026)

## Decisão operacional

O responsável aprovou duas filas de trabalho **independentes quanto a prioridades e bloqueios**. O código está na branch de revisão `automation/duduq-media-source-only-fix-20261029`, PR #118. Não foi feito merge nem deploy na produção.

**Fila A — `generation`:** inventariar os 20 exercícios do próximo módulo, gerar os PNGs originais com ferramenta nativa oficialmente disponível, validar transparência/semântica, guardar cada imagem, prompt, hash e vínculo exato em `qa/media-candidates/<modulo>-official-<data>/`, mantendo `productionApproved:false`. **Não modifica runtime, questões, registro ou respostas.** Jamais reivindicar progresso de fechamento de módulos apenas por ter gerado arquivos.

**Fila B — `integration`:** consumir os candidatos hash-verificados, corrigir referências e conflitos de IDs **por ocorrência/contexto**, aplicar overlays ao compilado de QA, executar navegador Playwright e feedback real, validar hashes/contratos e registrar evidências. **Não gerar mais imagens nesta fila.** Nunca forçar `APPROVED` por mudança de flag, ignorar falha de Q002/feedback, falsificar hash ou publicar sem gates finais.

**Independentes NÃO significa concorrência irresponsável.** A primeira implementação usa o mesmo Agendador Windows existente e **alterna as filas entre invocações**, sob o lock global `DUDUQ-Codex-Watchdog`: enquanto uma fila está bloqueada, a outra continua recebendo turnos. Evita que dois Codex alterem o mesmo worktree/registro ao mesmo tempo. Execução verdadeiramente simultânea exigiria dois worktrees/branches, fila de artefatos com publicação atômica e capacidade/licença verificada; não está alegada nem habilitada.

## Arquivos efetivos

- `qa/duduq-two-lane-plan.mjs` — inventário read-only das duas filas, valida SHA dos PNGs existentes, escopo dos IDs por questão e cobertura de bindings, atualiza somente o **relatório** `qa/results/media-two-lane-plan.json`. Nunca mexe em mídia, questões ou produção.
- `qa/duduq-codex-unattended.mjs` — mantém a tarefa já definida `DUDUQ-Codex-Image-Closure`; agora escolhe alternadamente `generation` e `integration`, cria comandos distintos para o Codex, preserva lock e backups/checkpoints, verifica progresso da geração por hashes dos arquivos e progresso da integração por auditoria canônica. **Nenhuma nova tarefa Windows é instalada a partir de um commit.**
- `qa/tests/duduq-two-lane-plan.test.mjs` + `.github/workflows/duduq-codex-host-static.yml` — testes de independência, hashes, módulo parcial e integridade 30×600.

## Primeiro ciclo previsto ao atualizar o worktree

- **Fila B primeiro caso:** Y1M04 e depois Y1M05, onde já existem candidatos reais mas a reprodução independente Linux ainda tem gates de feedback/hash; QA desse estágio não deve bloquear a geração dos próximos módulos.
- **Fila A primeiro caso:** Y1M06 se ainda existir pendência no inventário e se não houver bundle completo de PNGs. Depois outros módulos pendentes automaticamente. Uma imagem pode atender a vários IDs apenas quando o significado é exatamente o mesmo.
- Se a fila B falhar, registrar `BLOCKED_QA`; não dar aprovação fictícia. A próxima rodada da fila A continuará normalmente, desde que o Codex/gerador não esteja globalmente bloqueado.
- Se a fila A atingir limites do gerador, registrar `BLOCKED_GENERATOR` e deixar a B consumir o que já existe; manter retry/backoff e não comprar API ou contornar limites.

## Ativação REAL no Windows pelo próprio Codex

Antes de alterar qualquer rotina em execução:

1. Inspecione `git status`, `git worktree list`, `schtasks /Query /TN DUDUQ-Codex-Image-Closure /FO LIST` e `node qa/duduq-codex-unattended.mjs --status`; preserve arquivos locais/PNG e checkpoints.
2. Atualize somente o worktree de revisão de forma segura, sem sobrescrever trabalho não comitado. Se o agente anterior ainda estiver escrevendo, aguarde o lock e não inicie um segundo Codex no mesmo worktree.
3. Valide `node qa/duduq-two-lane-plan.mjs` e `node --test qa/tests/duduq-two-lane-plan.test.mjs`. A saída deverá exibir as próximas escolhas de cada fila. Não tomar o estado `PROJECT_COMPLETE` de relatório local sem replay independente.
4. Se a tarefa Windows já existe e é válida, **não recrie**; ela buscará o novo script na próxima invocação, quando o worktree tiver sido atualizado. Se não existe, usar o bootstrap documentado em `docs/qa/DUDUQ_CODEX_UNATTENDED_WINDOWS.md`.
5. Exija evidência nos logs de alternância `generation` e `integration` e verifique **PNG novo real com hash e vinculando uma questão** antes de declarar a automação operacional. O commit do GitHub por si só não comprova que o Windows incorporou o código.

## Critério final

- `30/30` módulos, `600/600` exercícios, zero referências provisórias, não homologadas e quebradas;
- candidatas realmente integradas, QA semântico e funcional completo, pipelines independentes de build/browser sem falha, cobertura e rollback;
- publicação somente pelo fluxo autorizado, com integridade e URLs verificadas.

Não chamar candidatos de imagens oficiais publicadas enquanto estiverem em `qa/media-candidates` ou em preview isolado. A fila A continua trabalhando mesmo quando a B estiver bloqueada, mas **nenhuma fila pode mascarar regressão, remover segurança ou inventar evidência**.
