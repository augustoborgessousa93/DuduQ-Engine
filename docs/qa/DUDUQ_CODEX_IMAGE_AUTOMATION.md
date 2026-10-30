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
