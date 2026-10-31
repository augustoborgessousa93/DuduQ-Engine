# DUDUQ — Codex autônomo no Windows ligado (2026-10-30)

## Objetivo operacional

O proprietário permanecerá vários dias longe do computador, mas deixará o **Windows ligado e a sessão de usuário conectada**. O Codex deve tentar concluir **todas as imagens oficiais de 30 módulos/600 atividades, módulo por módulo**, sem pedir comandos repetidos, usando os PNGs locais já criados, o próprio gerador de imagens oficialmente disponível, checkpoints, GitHub e CI Linux para QA.

**Uma janela de Codex aberta não é um executor permanente.** Foi criado `qa/duduq-codex-unattended.mjs` para instalar uma tarefa do **Agendador de Tarefas do Windows** que relança tentativas não interativas a cada 15 minutos, com lock exclusivo, logs persistentes e verificação de estado. Essa frequência não força conclusão nem supera quotas/limites.

## Bootstrap ÚNICO — o próprio Codex deve executar agora

1. Confirme a branch de revisão `automation/duduq-media-source-only-fix-20261029`, fetch do PR #118 e um **worktree isolado**. Proteja integralmente os arquivos modificados no workspace original. Não mude a branch do checkout principal.
2. Atualize o worktree **sem sobrescrever alterações locais**. Veja os dois arquivos: `qa/duduq-codex-unattended.mjs` e este documento.
3. Verifique a presença da **Codex CLI** no Windows, autenticação real em `codex login status`, permissão de `codex exec` para editar o worktree e geração nativa de PNGs realmente disponível. Nunca suponha que só o aplicativo aberto forneça a CLI. Não use tokens em scripts nem crie novos custos/API keys sem autorização.
4. Sem mudar a política do PowerShell, use **Node.js** para executar `node qa/duduq-codex-unattended.mjs --doctor` e leia o resultado. Caso bloqueie, resolva o que puder dentro das permissões existentes. Não declare pronto.
5. Execute `node qa/duduq-codex-unattended.mjs --install`. Isso cria/atualiza a tarefa **DUDUQ-Codex-Image-Closure** no Task Scheduler, para a conta do Windows conectada, com periodicidade de 15 minutos. Esta é uma **ação de instalação persistente**, não uma simulação.
6. Inicie a primeira execução pelo próprio Task Scheduler (`schtasks /Run /TN DUDUQ-Codex-Image-Closure`) ou `node qa/duduq-codex-unattended.mjs --once`, desde que não haja outra sessão do runner executando ao mesmo tempo.
7. Verifique a existência da tarefa e a execução REAL: `schtasks /Query /TN DUDUQ-Codex-Image-Closure /FO LIST`, `node qa/duduq-codex-unattended.mjs --status`, logs JSONL e stderr em `%LOCALAPPDATA%\DUDUQ-Codex-Watchdog\logs`. Confirme ao menos uma invocação efetiva de Codex autenticado e nenhum erro permanente de CLI. Se imagem nativa estiver bloqueada, reporte esse bloqueio claramente, sem fingir 100%.
8. Faça um teste de geração de **um PNG original real** com ferramenta oficialmente disponível no ambiente do Codex, valide PNG com alfa/transparência e prossiga à integração QA num módulo. Não considere os 11/17 PNGs previamente gerados ou os 15 candidatos Y1M04 automaticamente homologados.
9. Confirme energia sem suspensão automática e conexão de Internet. O computador ligado, mas **hibernando**, perde a execução. A tarefa usa o contexto do usuário Windows conectado; não presumir execução após logout, mesmo que o PC continue ligado.

## Contrato de cada execução

`CHECKPOINT → MÓDULO MAIS URGENTE → CONCEITOS → PNGS ORIGINAIS → SEMÂNTICA → REGISTRO/MANIFESTO → JOGO QA → TESTES REAIS → CHECKPOINT/COMMIT → PRÓXIMA INVOCAÇÃO`.

- Primeiro terminar Y1M04 com cinco vínculos bloqueados: azul Q002/Q012, branco Q012/Q014, estojo Q003; conferir pixels soltos e segurança semântica. Depois Y1M05 (101 vínculos pendentes), e os demais até Y5M06.
- Não rodar uma geração geral sem primeiro associar conceitos a questões e verificar ID compartilhado. Usar `qa/plan-shared-media-splits.mjs`, guardas de conteúdo/semântica e imagens existentes. Não substituir um ID globalmente por maçã se outros usos são animal, brinquedo ou esporte.
- `qa/results/media-module-closure.json` é a fonte do status de módulos, mas o Codex precisa atualizá-lo com auditoria canônica fresca após alterações. A redução real de provisórias requer imagem **presente no jogo**, referência corrigida e QA.
- Apenas os módulos com todas as questões, mídias e testes verificados podem ser marcados `DONE`. Checkpoint por módulo, hashes, evidências, commit e push somente na branch de revisão.
- GitHub Actions `.github/workflows/duduq-media-browser-qa.yml` tem Playwright/Chromium Linux para QA real de entrada. Para certificar os PNGs, os arquivos precisam estar **no overlay efetivamente compilado no runner**, e o QA de alternativas/interação deve ser expandido. O teste atual 6/6 não certifica PNGs.
- Se houver bloqueio semântico, autenticação, limite de geração, disco, política ou rede, registrar `BLOCKED` e tentar outra questão ou módulo. Não remover a segurança nem trocar por serviço pago.
- Para finalizar: `30/30`, `600/600`, zero provisórias, zero não homologadas, browser/gameplay/semantic QA, backup, rollback, release final autorizado e URLs verificadas. **Nunca publicar, fazer merge ou limpeza destrutiva com gates falhos.**

## Regras de segurança do agendador

- Usa `codex exec --approve-for-me` com rede habilitada **apenas no sandbox `workspace-write` escolhido por essa opção**. O CLI instalado nesta máquina não aceita mais `--ask-for-approval never` e rejeita combinar `--approve-for-me` com `--sandbox`; `--approve-for-me` já configura `workspace-write` e encaminha solicitações elegíveis à revisão automática. Não usa `--yolo`, `danger-full-access`, alteração da política do PowerShell ou credenciais exportadas.
- O launcher cria um lock por PID e evita que duas execuções concorram pela mesma branch/arquivos.
- Logs e estado de host ficam no perfil local do Windows, não no GitHub nem na pasta de produção.
- Se a execução acabar com falha, há backoff registrado. Se um módulo estagnar, o agendador pode tentar outros módulos; a falha não vira conclusão.
- GitHub e o Agendador do Windows são mecanismos separados: **um commit no GitHub não ativa tarefas no PC**. A etapa de instalação real acima é obrigatória.
- Não é garantida autonomia plena caso a Codex CLI não tenha gerador de imagens habilitado, a autenticação expire sem renovação, os limites de uso sejam atingidos ou uma aprovação indispensável não possa ser obtida. Relatar corretamente, não inventar conclusão.

## Evidência mínima antes de o responsável se ausentar

Afirmar **AUTOMAÇÃO LOCAL ATIVA** apenas quando a tarefa existir no Task Scheduler, a CLI estiver autenticada, um ciclo `codex exec` tiver sido realmente lançado, o log correspondente existir e os testes iniciais forem executáveis. Afirmar **IMAGENS 100% AUTÔNOMAS** apenas depois de um módulo demonstrar **geração real → integração real → build → browser QA → checkpoint/commit**, sem intervenção manual.

Estado anterior à instalação local: **HOST PREPARADO NO REPOSITÓRIO, AUTOMAÇÃO LOCAL NÃO VERIFICADA**.


## Falha real no Windows: tarefa enfileirada, sem retomada (30/10/2026)

**Relatório factual do Codex local, 09:27 BRT:** agendador foi instalado e já executou Codex/gerador nativo, gerou os pacotes Y1M04 e Y1M05 no worktree isolado, checkpoint 2/30 módulos e 954 mídias pendentes, mas a tarefa ficou **`Enfileirados` sem nova execução real** após reinstalação e acionamento manual. HEAD do worktree local permaneceu `58bac8c0`, **anterior à arquitetura de duas filas**. Um conserto local do lock de PID reutilizado passou apenas em sintaxe; ainda não foi validado em reinício real. Y1M02 tem overlay somente em QA e navegador bloqueado por `spawn EPERM`. Não publicar nem tratar agendamento como ativo.

**Diagnóstico seguro obrigatório antes de mexer na tarefa:**

1. Trabalhe no Windows via CLI Codex autenticada e proteja os checkpoints/arquivos não versionados e o checkout original. Não dar `git reset --hard`, `git clean`, `taskkill` global, `schtasks /End` às cegas, nem desabilitar política de segurança.
2. No **worktree isolado**, verificar `git status`, `git rev-parse --short HEAD`, `git worktree list` e se o Agendador realmente aponta para o script **daquele** worktree. Não presumir que o GitHub atualizou o Windows quando um commit foi feito.
3. Incorporar sem sobrepor as alterações locais a versão atual da branch, incluindo `qa/duduq-windows-scheduler-diagnostics.mjs`, `qa/validate-duduq-png.mjs`, `qa/duduq-two-lane-plan.mjs`. Validar as seis regressões no runner Linux; não contar PNG só por assinatura+hash, exigir PNG RGBA decodificável, transparente, IHDR/IDAT/IEND/CRC válidos.
4. Executar localmente `node qa/duduq-windows-scheduler-diagnostics.mjs --doctor`. Ler a evidência gravada em `%LOCALAPPDATA%\DUDUQ-Codex-Watchdog\scheduler-diagnostics.json`: XML da tarefa, `MultipleInstancesPolicy`, Task Scheduler `/V`, processos Windows com linha de comando e data de criação, lock, state.json, logs recentes e possível backoff. **Este diagnóstico é read-only.**
5. A Microsoft documenta a política `Queue` como iniciar outra instância **somente depois** que as anteriores terminarem; `IgnoreNew` não empilha novas instâncias. Entretanto, `Enfileirados` por si só não comprova a causa. Exigir evidência de instância anterior ativa e de sua identidade, inclusive guardando o ajuste local do lock por PID reutilizado, antes de escolher uma recuperação.
6. Caso uma instância legítima do Codex **esteja rodando**, não interrompê-la. Se nenhum processo ou tarefa real estiver ativo e estiver provada uma instância enfileirada, restaurar configuração de instância única segura no Scheduler (`IgnoreNew` quando apropriado) e iniciar um único teste de retomada. Preserve/exporte o XML antes de qualquer alteração; não mexa na conta, credenciais, direitos, outras tarefas, serviços ou limites de sandbox.
7. Confirmar **duas invocações reais e distintas**, com `lane=generation` e `lane=integration` registrados nos logs e PNGs efetivamente gerados/ligados ou blocker específico. Apenas o comando `schtasks /Run` ter retornado sucesso não prova execução. Registrar um novo checkpoint sem alterar produção.
8. Se não houver acesso/permissão para reconfigurar, registrar `BLOCKED_SCHEDULER` com diagnóstico e aguardar intervenção autorizada; não declarar autonomia permanente.

**Gate Linux:** Playwright/Chromium no Windows pode apresentar `spawn EPERM`; isso não autoriza redução de QA ou mudança de política. Use o runner Linux já conectado no PR para QA da candidata Y1M02; registre evidência e mantenha a filial de geração independente do bloqueio.
