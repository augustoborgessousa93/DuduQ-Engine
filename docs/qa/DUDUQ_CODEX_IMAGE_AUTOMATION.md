# DUDUQ English — contrato de execução do Codex para imagens oficiais

**Prioridade do proprietário (29/10/2026):** o Codex assume integralmente a produção, integração, substituição e QA das imagens do DUDUQ English, sem solicitar ao usuário comandos "CONTINUE", baixar imagens no chat, transferir manualmente PNGs, escolher cada lote ou repetir autorizações já dadas. Este contrato especifica trabalho para o agente Codex **quando ele estiver realmente executando no workspace**; o arquivo não inicia uma sessão do Codex nem concede credenciais ou serviços indisponíveis.

## Autoridade e escopo

- Repositório: `augustoborgessousa93/DuduQ-Engine`.
- Trabalho de revisão: `automation/duduq-media-source-only-fix-20261029`, PR #118. Não realizar merge, deploy produtivo ou alterações em Gold Masters/release imutável sem validação de todos os gates aplicáveis.
- 30 módulos, anos 1–5, seis módulos por ano, 20 atividades por módulo, total **600**; sem mudar questões, gabaritos ou contratos pedagógicos. Respeitar `AGENTS.md`, `DUDUQ_PROJECT_STATE.json`, Penpot como autoridade visual e Gold Masters homologados.
- Baseline auditada em 29/10/2026: **1.133 media IDs referenciados**, **1.115 provisórios**, **18 não temporários sem homologação**, **zero novas imagens integradas**, **nove arquivos órfãos elegíveis a análise de retirada**. Números não são garantia de estado atual; reexecutar auditorias.
- Uma mesma arte pode atender várias referências apenas com equivalência semântica exata, todas as questões afetadas conhecidas e evidência visual/pedagógica. Nunca usar nomes ou traduções superficiais como único critério. Bloquear homônimos como `orange` (fruta versus cor).

## Primeiro: procurar e aproveitar o que já foi produzido

1. Ler `qa/audit-media-completion.mjs`, `qa/audit-cross-context-media.mjs`, `qa/media-binding-usage-guard.mjs`, `qa/media-safe-retirement.mjs` e workflows de `duduq-native-chatgpt-batch-qa` e `duduq-media-closure-safety`. Descobrir scripts/fluxo existentes antes de criar outro.
2. Conferir autenticação, permissões e branch. Nunca presumir que o próprio Codex consegue abrir anexos privados do chat nem buscar arquivos no Drive sem conector oficial.
3. Verificar primeiro os arquivos locais e pacotes aprovados existentes, incluindo, quando acessíveis legitimamente, `DUDUQ_ChatGPT_Lote_Escolar_10_20261029.zip` (SHA-256 `0a3d71d2b7ee127d702326d437dc13b8145ab58d1333b15819ebe8cb3b5ba280`) e lote de cabeça `DUDUQ_ChatGPT_Lote_Head_7_20261029.zip` (SHA-256 `8d08dce1881e10906f4604f6a6f24609f1980913eb6e1850a11947d27880090d`).
4. Importar pacotes somente por caminhos autorizados, com hashes, manifesto, canal alfa e validação de cada imagem. Se não puder acessar um pacote por restrição de segurança, registrar `SOURCE_UNAVAILABLE`, prosseguir com os demais conceitos e nunca contornar controles de acesso.

## Codex deve gerar as imagens restantes — não pedir ao usuário que use o ChatGPT

1. Verificar se a **geração de imagens dentro do Codex** está disponível na sessão, com gravação local de PNG original. O produto Codex tem capacidade de gerar/editar imagens, mas a ferramenta precisa estar habilitada no ambiente efetivo. Não confundir esta possibilidade com autorização automática de API paga, serviços de terceiros ou acesso ilimitado.
2. Usar o gerador nativo da OpenAI acessível oficialmente ao Codex, preferindo o caminho incluído na assinatura/configuração ativa; **não contratar API, habilitar serviços pagos ou assumir custos sem autorização específica**.
3. Gerar **uma imagem por arquivo**, sem pranchas/mosaicos e sem conteúdo adicional; aparência premium 3D infantil de alta qualidade, objeto pedagógico inequívoco, perspectiva amigável, cores limpas, luz suave, enquadramento fechado o suficiente para leitura na tela pequena; sem textos/legendas/ícones/marca d'água.
4. Preferir PNG com transparência alfa verdadeira e dimensões mínimas de 1024 px, mantendo pelo menos uma margem segura para o objeto, mas fazendo-o ocupar a maior área útil. Desenhar rosto/torso quando corpo inteiro reduziria excessivamente o conceito.
5. O **prompt deve vir da questão real**, conceito e contexto, não do ID isolado. Guardar prompt, modelo/ferramenta utilizada, origem, hash SHA-256, resolução, canal alfa, ID(s) de destino, QA e log de geração por ativo. Evitar duplicidade de geração por checkpoint e hash.
6. Criar lotes limitados e reversíveis (8–12 conceitos ou menor se houver limitações) com priorização por quantidade de questões recuperadas, respeitando ambiguidade, variedade de público e limites de uso. Gerar novamente apenas quando QA indicar erro efetivo. Nunca chamar imagens simuladas ou provisórias de oficiais.
7. Se geração não estiver disponível, registrar exatamente `GATE_CODEX_IMAGE_GENERATION_UNAVAILABLE` e executar todas as etapas independentes, sem delegar a geração ao usuário ou substituir por imagens de baixo valor.

## Pipeline automático e seguro

Implementar ou completar um orquestrador **persistente, idempotente e reentrante** no projeto, usando infraestrutura já existente:

`INVENTORY → SOURCE_FOUND / NEED_GENERATION → GENERATED → PNG_QA_PASS → SEMANTIC_QA_PASS → BINDING_SAFETY_PASS → QA_BUILD_PASS → BROWSER_QA_PASS → RELEASE_REVIEW → DEPLOY_VERIFIED → TEMPORARY_RETIREMENT`

- Para cada substituição: provar que o media ID está referenciado no conjunto de questões correto; não alterar enunciado, alternativas ou gabarito; evitar colisões; gerar novo path oficial; validar os metadados do registro; só mudar referência aprovada para o arquivo existente e validado.
- Verificar PNG real com assinatura, tamanho, RGBA/transparência, alpha não totalmente opaco, bounding box e hash. Vistoriar visualmente tamanho e coerência. Executar checagens semânticas em todas as questões onde se reutiliza o arquivo.
- Rodar QA de build, referências, 600/600 boot, renders e interação por mecânica em desktop 1440px+, tablet 768×1024 e mobile 390×844; feedback, `TENTAR DE NOVO`, `CONTINUAR`, fullscreen e mídia. Não aprovar apenas com HTTP 200 ou alteração de flag.
- Resolver os problemas sistêmicos de maneira independente: Target Shooter 768×1024 com overflow horizontal de 308px no HUD; teste histórico de foundation Year 3 incompatível com presença atual dos anos 3–5. Nenhuma correção por ocultação de overflow, enfraquecimento de teste ou edição de release imutável.
- Guardar logs e relatório legível por máquina por lote: `generated`, `integrated`, `verified`, `blocked`, `tempReferenced`, `unverified`, `retired`, `lastSuccessfulBuild`, `deploymentVerified`.
- GitHub Actions deve detectar novas fontes e executar QA automaticamente. **Não fingir que GitHub Actions oferece geração nativa de imagens do Codex sozinho**: a etapa geradora depende de execução/serviço oficialmente configurado. Não criar cron que apenas dispara falhas caras ou repete relatórios.
- Se o Codex for interrompido, retomar de checkpoints; não exigir comandos repetidos. Não gravar segredo em repo e não ignorar erros de autenticação.

## Retirada das provisórias e publicação

- O inventário canônico é `qa/audit-media-completion.mjs`; o planejamento de descarte é `qa/media-safe-retirement.mjs`; a suíte é `qa/tests/duduq-media-safe-retirement.test.mjs`.
- Só retirar arquivos órfãos **após zero imagens provisórias referenciadas, zero referências sem QA, prova da versão publicada, testes das 30 rotas, revisão pedagógica efetiva, rollback e backup hash-verificado**. Preserve mídia ainda usada, mesmo quando o caminho parece provisório.
- Nunca declarar conclusão porque uma flag mudou ou porque arquivos foram colocados em inbox. Sem ativos PNG reais, a contagem de substituições integradas é **zero**.
- Não publicar com testes pendentes. Ao final, verificar as 30 URLs oficiais, produção e embed e manter caminho de rollback.

## Definição de concluído

O projeto só está completo quando `30/30` módulos e `600/600` atividades passam, `tempReferenced=0`, `unverified=0`, todos os PNGs são oficiais e semanticamente corretos, o áudio e as mecânicas passam, a publicação é comprovada e existe rollback. Caso contrário, registrar a ação útil seguinte e continuar quando a ferramenta estiver disponível. Não exigir do usuário que seja transportador de arquivos.

**Primeira ação do Codex ao ler este arquivo:** checar as fontes e os relatórios reais, descobrir se consegue criar e salvar PNGs nativamente, implementar o menor lote ponta a ponta no próprio workspace, subir somente o commit de revisão e executar QA. Só expandir para os demais lotes depois do primeiro fluxo demonstravelmente funcional.

Referências oficiais: https://help.openai.com/pt-br/articles/11084440-images-in-chatgpt e https://developers.openai.com/api/docs/guides/tools-image-generation .


## Estado recuperado do Codex local (29/10/2026) — avançar sem Google Drive

Um relatório do **Codex Windows**, emitido após 21m40s de execução, confirmou:

- O checkout local ativo é `feat/design-sync-primary-button-v1` **com alterações não relacionadas**. Não mudar de branch nesse checkout, não descartar alterações e não fazer `git reset --hard`, `git clean` ou `stash` sem escopo explícito.
- Existem **11 PNGs RGBA candidatos** fora do runtime, na pasta `Downloads/workspace/artifacts/generated-image-candidates/20261029/`, com `CANDIDATE_BATCH_MANIFEST.json` e `EXECUTION_REPORT.json` em sua própria pasta. Esses arquivos não dependem do Drive. O Codex deve localizá-los no disco sem solicitar que o usuário os transfira.
- A qualidade do **estojo** exige revisão de elementos decorativos (foguete/planetas/estrelas); o **peixe** exige revisão de margem. Os demais candidatos continuam com QA técnico apenas. Não atribuir equivalência semântica ou origem de gerador nativo por inferência; inspecionar metadados e imagens reais.
- Testes locais `duduq-image-pipeline` e `openai-image-provider` passaram (16 verificações) sem chamadas externas; isso **não prova** que a geração nativa de OpenAI ocorreu, nem que os candidatos estão integrados, homologados ou publicados.
- Google Drive não tinha conector oficial naquela sessão Codex; **isso não deve bloquear o início com os 11 PNGs locais**. Trate os ZIPs antigos como uma fila paralela opcional, não pré-requisito universal.

### Próxima ação automática obrigatória do Codex

1. Descobrir o caminho real do repositório Git local e o diretório dos 11 PNGs. Inspecionar `git status` e `git worktree list` **sem escrever** na branch de design suja.
2. Criar **um Git worktree separado e limpo** numa nova pasta, associado à branch de revisão `automation/duduq-media-source-only-fix-20261029` e origin correto. Se essa branch já estiver ativa em outro worktree, reutilizar o worktree limpo ou criar uma branch de QA derivada dela — jamais tomar controle ou resetar o checkout sujo. Fazer fetch somente por caminho autorizado; não forçar sobrescrita.
3. Nesse worktree executar `node qa/ingest-local-codex-candidates.mjs --source="<caminho absoluto da pasta de candidatos>"`. O script recusa a branch errada, verifica PNG/transparência/tamanho, copia apenas para `qa/media-inbox/codex-local-20261029/` e gera `codex-local-candidates.json` com SHA-256. Se estiver numa branch de QA derivada, trazer as alterações para a branch de revisão via PR de integração **antes** de rodar este script; não desativar o guard da branch.
4. Revisar as **11 imagens e o manifesto local** visualmente. O arquivo `codex-local-candidates.json` marca `originalImageGenerationProvenanceVerified=false` e `semanticQA=PENDING` por definição: é quarentena e não aprovação. Verificar se a origem da geração corresponde à política antes de oficializar.
5. Relacionar cada conceito seguro às questões, executar os guards de semântica/cross-context, construir overlay isolado e rodar QA real em desktop/tablet/mobile. **Nunca substituir todas as referências só porque os PNGs foram importados.**
6. Integrar a primeira substituição **realmente segura** ao PR de revisão somente após provas. Executar novo inventário e comunicar apenas progresso mensurável: número exato de media IDs antes/depois. Não fazer deploy e não retirar as provisórias enquanto houver bloqueios.

### Dependências e responsabilidade

- O Codex deve preferir seus **11 arquivos locais já disponíveis** antes de pedir transferência de ZIP, geração de imagem adicional ou autenticação no Drive.
- Não exigir do responsável nenhum `git`, PowerShell, download, upload, "CONTINUE" ou troca manual de branch.
- A ferramenta de ingestão é uma etapa de QA técnica (e não um gerador nem um importador para produção).
- Se a sessão do Codex terminar, as instruções acima ficam no GitHub; **nenhum arquivo local é movido por esta documentação**. É preciso uma execução real do Codex ou outro agente com acesso ao Windows para operar aqueles arquivos.



## Regra final de execução contínua — todos os 30 módulos

**Determinação do proprietário (29/10/2026):** o Codex deve prosseguir por lotes, com retomada automática autorizada, **até remover/substituir todas as imagens provisórias REFERENCIADAS de todos os 30 módulos**. A conclusão de um lote, ano, QA técnico ou geração de PNGs não encerra a missão.

**Protocolo de progresso por módulo:** em cada execução, gerar inventário canônico novo e apresentar `Y1M01` a `Y5M06` individualmente com `atividadeCount=20`, `provisionalReferencedCount`, `unverifiedReferencedCount`, `brokenReferencedCount`, `officialApprovedCount`. Um módulo só é `DONE` se as imagens referenciadas em suas 20 questões estiverem substituídas/validadas com evidência; IDs reutilizados devem ser auditados em todas as questões. Registrar alteração real de contagem antes/depois por lote, hashes e screenshots.

**Estado global:** use `IN_PROGRESS` enquanto houver substituições executáveis; `BLOCKED` com diagnóstico e checkpoint somente quando não houver nenhuma ação segura possível com os acessos existentes; `PROJECT_COMPLETE` **somente** com 30/30 módulos `DONE`, 600/600 atividades válidas, 0 referências provisórias ou pendentes, 0 imagens sem QA, 0 caminhos quebrados, QA visual/pedagógica real, regressões e deploy verificados, rollback e limpeza segura documentados. Nunca transformar `BLOCKED` em `PROJECT_COMPLETE`.

**Retomada:** antes de cada saída de sessão por orçamento de tempo, limite do agente ou interrupção, salvar checkpoint persistente, SHA da branch, último lote validado, próximo conceito/ID, contagens por módulo, logs, hashes, bloqueios precisos e comando interno do orquestrador. Implementar continuação pelas ferramentas e infraestrutura com permissão, sem loops infinitos, sem quedas silenciosas e **sem pedir ao usuário "CONTINUE" ou comandos manuais**. Uma sessão do Codex não pode permanecer rodando indefinidamente por simples instrução; a continuidade depende de agendamento/serviço real e deve ser evidenciada.

**Priorização operacional:** aproveitar primeiro os 11 PNGs locais existentes, depois gerar novos conceitos seguros com ferramenta nativa de imagens disponível, integrar e validar por lote, atualizar todos os registros afetados, repetir até zerar. A ausência de conector do Drive não deve bloquear a produção dos demais conceitos. Nunca apagar provisórias ainda referenciadas, inventar QA, contornar autenticação ou publicar regressões.

## Próximo desbloqueio — desmembrar mediaIds compartilhados sem alterar gabaritos

**Evidência Codex Windows em 29/10/2026, 22:47 BRT:** V26 compilado com 2.674 arquivos, 2.673 entradas, manifesto SHA-256 `5993AACEAFF272626C863AEF07E1B33A909CA7F9FCC41D2D40890BAA6C08B822`; 30/600; 1.133 mediaIds únicos, 1.115 provisórios, 18 sem homologação; 17 PNGs candidatos em quarentena QA e quatro candidatos de maçãs. O Codex demonstrou que IDs pretendidos para maçãs também são usados em questões de animais, brinquedos, aritmética e esportes. Logo **NÃO sobrescrever o mesmo mediaId globalmente com maçãs**. Nenhum PNG foi integrado; não alegar redução das 1.115 referências provisórias.

**Próxima ação executável, mesmo sem Drive:**

1. Utilize o recém-criado `qa/plan-shared-media-splits.mjs` sobre o compilado `dist-pages`. O script é *read-only* e cria `qa/results/shared-media-split-plan.json`, com hashes das 30 perguntas, IDs candidatos por questão/contexto e lista de casos bloqueados por falta de `semanticTarget`. Consulte também `qa/audit-cross-context-media.mjs` e `qa/media-binding-usage-guard.mjs`.
2. **Analise os 17 PNGs locais já produzidos** e o checkpoint existente `qa/results/image-closure-session-checkpoint-20261030.json` do worktree local. Não recrie conteúdos já gerados. Identifique os usos de maçãs, animais, brinquedos, esporte etc. um a um, com semântica explícita e alternativa correta preservada.
3. Aplicar os desmembramentos **somente onde comprovadamente necessários**, criando mediaIds exclusivos para cada uso contextualmente distinto e ajustando cada referência exata no JSON de origem autorizado ou em overlay QA isolado. A mesma questão pode conter várias imagens; nunca fazer `replaceAll` global nem inferir apenas pelo `mediaId`. Se faltar semântica em um nó, marcar revisão específica em vez de inventar.
4. Duplicar/registrar metadados de mídia coerentes no registro QA para cada novo ID e fornecer assets próprios depois; nunca inventar aprovação, associar maçã a animal ou introduzir links quebrados. Validar invariantes dos contratos (ID da questão, número de alternativas, gabarito, mecânica, texto, áudio, quantidades), além de hashing/manifests e build. Não editar Gold Masters.
5. Quando provado o desmembramento, executar fluxo de importação de PNGs legítimos para **candidata QA apenas**, rodar todas as 600 questões e as interações pertinentes em navegador. Registrar contagens reais antes e depois de pendências — **desmembrar ID sem integrar imagem aprovada não significa redução de provisórias**.
6. O PowerShell Windows impediu instalação de Playwright/Wrangler no worktree; não afrouxar política para contornar. O GitHub já dispõe de **runner Linux** via `Systemic Foundation Audit` e outros workflows. Reutilizar a suite browser existente `test/systemic/canary-r147-core-1.0.12-smoke.mjs` no Linux autorizado, ou um workflow isolado específico, para reproduzir e corrigir overflow 768×1024. Requer validação real e evidências; não marcar PASS sem execução.
7. Continuar em checkpoint persistente, revisando primeiro o PR #118, e prosseguir com lote seguinte até 30/30 módulos sem mídia provisória nem sem homologação. Sem publicação ou limpeza antes dos gates finais.

**Limite importante:** `qa/plan-shared-media-splits.mjs` é apenas um planejador; não modifica questões nem transfere PNGs, e não substitui a revisão semântica. Os arquivos locais da sessão Codex não estão automaticamente acessíveis ao executor do GitHub.


## Atualização do Codex — Y1M04/Y1M05 e QA Chromium em Linux

Relatório mais recente do executor Codex (29/10/2026): **17 PNGs candidatos apenas em QA**, incluindo 11 PNGs originais efetivamente copiados ao inbox local; 15 candidatos/78 vínculos de Y1M04 passaram apenas no *preflight* do importador (7 imagens/62 IDs; 8 imagens/16 IDs), sem integração ao runtime ou validação pedagógica. Y1M04 tem cinco usos ainda pendentes: `blue` Q002 e Q012, `white` Q012 e Q014, `pencil case` Q003; rejeitar `blue`/`white` com pixels soltos e não forçar associação de estojo que falhou no guard. Y1M05 tem 101 referências pendentes e quatro rascunhos de anatomia rejeitados, que não devem ser promovidos. A verificação V26 foi 2.673/2.673 entradas com SHA de manifesto `5993AACEAFF272626C863AEF07E1B33A909CA7F9FCC41D2D40890BAA6C08B822`; não confundir 2.674 arquivos físicos com erro de manifesto.

**Novo runner Linux oficial na branch de revisão:**
- `.github/workflows/duduq-media-browser-qa.yml` instala Playwright/Chromium de maneira autorizada, compila V26, inicializa preview HTTP isolado e realiza smoke de navegador nos módulos Y1M04 e Y1M05 em 1366×768, 768×1024 e 390×844.
- `qa/browser-media-candidate-smoke.mjs` captura screenshots, erros JavaScript, HTTP/404 e estado visual inicial em `qa/results/media-browser-qa/`. **Não certifica gameplay completo, não examina PNGs locais ainda não transferidos, não muda runtime e nunca publica**.
- O Codex deve usar esse padrão de CI para testar o **overlay QA efetivamente integrado** em um commit futuro: imagens precisam estar no artefato de preview antes do browser QA; executar a baseline isolada não conta como imagem substituída.
- A saída de sessão Codex não inicia outro Codex sozinha. Configurar retomada real com executor autorizado e checkpoint quando for possível, sem usar cron apenas para repetir relatórios ou chamar ferramentas pagas sem autorização.
- Prioridade operacional: resolver os cinco vínculos Y1M04 com PNG correto e sem artefatos, executar uma integração QA completa com semântica segura e registro+manifesto consistente, comprovar browser QA e registrar redução efetiva do backlog. Em seguida Y1M05 e restantes até 30/30.
