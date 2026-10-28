# CODEX — Reativar o painel de imagens DUDUQ / EduQ Play

**Status:** tarefa de desenvolvimento, não implementação nem autorização de deploy.
**Branch obrigatória:** `feat/duduq-media-studio-smart-replace-20261028`.
**Base homologada:** V20 (navegação direta em tela cheia) sobre a V19 dos 30 módulos, 600 atividades e 2.670 arquivos.
**Proibido:** alterar Gold Masters, mecânicas, layouts, textos, alternativas, respostas, áudio ou URLs de produção fora das referências de imagens aprovadas.

## 1. Reutilizar, não reinventar

1. Inspecionar `scripts/duduq-content-studio.mjs`, `scripts/lib/content-studio-sync.mjs` e procurar/reconstituir a interface histórica `tools/content-studio/index.html`, se estiver ausente nesta branch.
2. O Content Studio anterior possui importação de mídia, deduplicação por SHA-256, galeria, rascunhos, validação e staging local. Hoje há o bloqueio `editableModules = new Set(['Y1M01'])` e `productionWrites:false`: **não tratar isso como suporte aos 30 módulos, nem afirmar que já grava no GitHub**.
3. Há também o Worker histórico `duduq-image-factory` no Cloudflare, com KV/AI. Usá-lo como referência para galeria e inventário somente se necessário. Não publicar as credenciais, não reutilizar senha fixa, não habilitar escrita pública e não tornar a produção dependente de IA on-line.
4. O contrato real da V19 reside na distribuição imutável aprovada do projeto de QA; `DuduQ-Engine` em sua release atual **não possui todos os arquivos estáticos originais**. O build oficial importa a V19 por `qa/import-v19-immutable-cdn.mjs` e `qa/build-v20-pinned-v19-content.sh`. Uma alteração em arquivos locais do GitHub sozinha **NÃO altera o site publicado**. É obrigatório criar um **overlay editorial versionado** e aplicá-lo ao final da importação da distribuição base, com hash e QA novos.

## 2. Experiência visual do painel

Painel independente dos jogos, em português, profissional, claro e fácil de usar, pensado para uma pessoa sem conhecimentos de programação.

- Filtros `1º–5º ano → módulo 01–06 → atividade Q001–Q020 → imagem/posição`.
- Exibir miniatura da imagem atual, enunciado ou contexto pedagógico, prévia da nova imagem, `mediaId`, caminho, SHA-256, proporção, dimensões, tamanho e status (provisória, candidata, aprovada).
- Mostrar a atividade como ficará no jogo, sem editar o Gold Master. Preferir sandbox/preview de QA com a mecânica original.
- Upload com arrastar/soltar e seletor de arquivos; PNG ou WebP transparente, preservar resolução/alpha, nunca reduzir qualidade silenciosamente. Validar assinatura, MIME, dimensões e transparência; permitir reprovação clara de arte fora do padrão; ter opção de zoom e comparação lado a lado. O painel nunca gera imagens automaticamente.
- Ação primária `SUBSTITUIR IMAGEM` seguida de modal obrigatório com duas escolhas simples e resumo de impacto:

  **(A) SUBSTITUIR EM TODAS AS ATIVIDADES QUE USAM ESTA IMAGEM** — lista exata de questões, módulos e posições afetadas antes da confirmação.

  **(B) SUBSTITUIR SOMENTE NESTA QUESTÃO** — criar referência individual, manter todas as demais questões exatamente iguais.

- A confirmação mostra `N questões / M módulos / P posições` e miniaturas ANTES/DEPOIS. Nenhuma substituição silenciosa em outras questões.
- Exibir fila de alterações, status GitHub/PR/QA/deploy, histórico com links de commit e botão de reversão por edição, sem precisar do terminal.

## 2A. Gabarito visível no painel editorial — requisito obrigatório

**O editor precisa saber qual alternativa está correta ANTES de decidir se a imagem deve ser trocada.** Na tela da atividade, exibir em destaque um painel permanente **GABARITO / RESPOSTA CORRETA**, exclusivo do administrativo, sem depender do upload:

- Mostrar o **enunciado**, todas as **alternativas com seus textos e imagens**, e destacar visualmente a alternativa correta (por exemplo, ✅ CORRETA) e as distratoras (❌ INCORRETA), junto com o `mediaId/assetId`, papel, significado/objetivo semântico e a imagem atualmente utilizada.
- Para questões com uma resposta única, exibir claramente `Resposta correta: [texto/valor]` e destacar a imagem/opção correta no contexto das demais.
- Para jogos **sem alternativa única**, mostrar o **gabarito estruturado da mecânica**: Drag & Drop Grouping → cada item e seu grupo correto; Matching e Memory Quest → pares corretos; Drag & Drop Multimídia → associação áudio/item ↔ destino; Smart Sentence Complete/Order → palavra(s) ou sequência esperada; Bubble Pop → bolha-alvo correta; Target Shooter → alvo correto e os demais alvos/distratores.
- **Fonte única da verdade:** ler `answerKey`, `targetsToFind`, `options`, `items`, `groups`, `pairs`, `mappings` e contratos existentes da questão, conforme a mecânica. Importante: `options[*].answerKey` pode ser o valor semântico da opção, **não** uma indicação booleana de acerto. Comparar com a chave de resposta no nível correto ou com o mapa oficial da mecânica. Não inferir o gabarito pelo nome da imagem ou por IA.
- Sempre mostrar **a imagem selecionada e sua relação com a resposta**: `Imagem da alternativa correta`, `Imagem de alternativa incorreta (distrator)`, `Imagem de apoio/estímulo`, `Imagem de par` ou `Imagem de destino`. Assim o editor sabe se o arquivo condiz com o gabarito e evita trocar imagens que já estão boas.
- Mostrar **comparação ANTES/DEPOIS no contexto da resposta correta**. Antes de confirmar qualquer troca, reexibir a opção correta, a imagem correspondente e o mapa de impacto nos dois escopos `ALL_USAGES` e `QUESTION_ONLY`.
- Quando o asset for reutilizado em questões nas quais aparece com papéis pedagógicos diferentes (correta vs distratora, mesmo `assetId` com `semanticTarget` conflitante), apresentar os gabaritos de **todas** as questões afetadas; solicitar revisão explícita para cada conflito e bloquear substituição global perigosa.
- Gabarito somente em **interface/admin autenticado**; nunca acrescentá-lo ao HTML do aluno, URLs públicas, embeds, metadados de imagens nem aos feedbacks do game. A consulta é **somente leitura**, não altera gabaritos, respostas, alternativas ou validação curricular.
- Caso não seja possível resolver um gabarito a partir dos contratos oficiais, mostrar `GABARITO NÃO IDENTIFICADO — REVISÃO NECESSÁRIA`, bloquear o commit para aquela troca e oferecer o JSON da questão para diagnóstico. Nunca afirmar uma opção correta por suposição.

**Teste de aceite adicional:** escolher `Y1M03-Q007` (Target Shooter, gabarito `purple`), destacar somente a opção `purple`, exibindo os demais distratores; escolher `Y1M03-Q002` (Grouping) e exibir as oito associações `item → grupo`. Verificar Matching/Memory em amostras; em todos os casos, o `answerKey` permanece byte a byte intacto após uma troca global e após uma troca individual.

## 3. Identidade, busca de usos e duas operações diferentes

Construir um **índice determinístico de usos** que examine TODAS as 600 questões/30 módulos da distribuição aprovada, suas opções e contratos por mecânica; localizar `image_ref`, `imageRef`, `mediaBindings[*].mediaId`, `options[*].mediaId`, `dragDropContract.mapping[*].mediaId`, demais campos conhecidos de mídias e referências indiretas do asset resolver, evitando alterar `audioId` e dados não relacionados.

**Identificar reutilização por dois níveis:**
1. Mesma referência lógica (`mediaId`) — substituição global troca o destino da referência no registro canônico, afetando todos os usos.
2. Referências distintas que apontam para o MESMO arquivo SHA-256 — mostrar como `outras referências da mesma imagem`; a opção `em todas` inclui essas ocorrências **após exibir sua lista e o usuário confirmar**. Não confundir similaridade visual com identidade exata: imagens parecidas, mas arquivos diferentes, não são a mesma imagem.

**Escopo global**: criar um arquivo novo imutável, atualizar no overlay as referências/entradas de catálogo que mapeiam para o mesmo asset aprovado e registrar todas as ocorrências. Só o arquivo/asset selecionado e suas identidades exatas podem mudar; não modificar nenhum conteúdo pedagógico.

**Escopo questão única**: criar **novo mediaId individual** e novo asset imutável; alterar apenas a(s) referência(s) específica(s) da questão escolhida. **Nunca sobrescrever a entrada compartilhada**, jamais modificar outra questão. Quando uma imagem aparece em várias posições na própria questão, indicar precisamente quais posições serão trocadas, para evitar mudar uma alternativa correta ou incorreta por acidente.

Tentar editar uma imagem usada em papel semântico distinto (ex.: opção correta e incorreta), sem resolução explícita do papel, deve causar erro de impacto e bloquear staging. Deduplicar arquivo por SHA-256 sem colapsar identidades de questão.

## 4. Fluxo GitHub sem riscos

O painel deve realizar automaticamente, **após o usuário confirmar**:

1. Validar arquivo, coletar SHA-256 e gerar nome novo, nunca sobrescrever arquivo antigo; p.ex. `content/english/assets/images/approved/Y1M03/Q002/<conceito>-<sha12>.png`.
2. Criar branch editorial a partir da release aprovada (ou branch editorial atual), com checagem otimista de HEAD para impedir sobrescrita concorrente.
3. Gravar arquivo novo no **repositório GitHub `augustoborgessousa93/DuduQ-Engine`** e arquivos de overlay editorial imutáveis, um manifesto com `revisionId`, autor, data, escopo, before/after, affectedQuestions, roles, mediaIds, oldSha, newSha.
4. Commitar e abrir/atualizar um PR editorial de forma automática, com link visível no painel. Não colocar token GitHub em JS do navegador, nem gravar credenciais em fonte. Para painel local, usar sessão GitHub CLI já autenticada (via backend). Caso remoto, usar GitHub App/Cloudflare Access e tokens de curta duração mantidos somente no servidor.
5. No build QA, reconstruir **exatamente a V19/V20 aprovada**, aplicar os overlays de conteúdo/mídias depois da importação, gerar novo registro de mídia e novo hash de manifesto, rodar verificações. Garantir que as novas imagens sejam servidas pela URL real do jogo, não por `raw.githubusercontent.com` temporário.
6. Publicar em QA isolado; comparar imagem e atividades afetadas. Só permitir promoção do pacote para os 30 links oficiais **depois de PASS técnico e aprovação visual humana**, mantendo rollback completo. Não dar `push` direto na branch de produção em resposta ao upload.
7. Ao finalizar, o painel exibe `Arquivo congelado no GitHub`, `Atividades atualizadas no PR`, `QA aprovado` e `Publicado` como **estados separados** e reais; nunca usar um único sucesso que esconda etapas pendentes.

Sem banco de dados obrigatório: Git, manifestos e histórico de PR/commit são fonte de verdade; persistência local pode servir como cache. Nenhuma dependência de IA on-line.

## 5. Contratos de API propostos (adaptar ao Content Studio existente)

- `GET /api/media/image-usage?mediaId=...` → todos os usos (ano/módulo/questão/papel/caminho) + aliases de mesmo SHA.
- `POST /api/media/image-replacement/preview` → `{sourceMediaId, scope:"ALL_USAGES"|"QUESTION_ONLY", moduleId?, itemId?, roles?, assetUploadId}` → impacto, diff de JSON/registry, arquivos candidatos e alertas sem escrita.
- `POST /api/media/image-replacement/stage` → exige token local/sessão autenticada, revisão atual, aprovação explícita do plano; retorna commit, PR e novo manifesto.
- `GET /api/media/image-replacement/:revisionId` → estado verdadeiro `STAGED`, `QA_FAILED`, `QA_PASSED`, `APPROVED`, `PUBLISHED` ou `ROLLED_BACK`.
- `POST /api/media/image-replacement/:revisionId/rollback` → restaura referência anterior via novo commit/PR, sem apagar histórico físico. Restringir acesso e confirmação.
- Não reutilizar endpoints de aprovação de questões para burlar seus critérios curriculares; edição de imagem é um fluxo próprio e estritamente limitado à mídia.

## 6. Testes obrigatórios antes de afirmar que está pronto

- Indexar 600/600 questões dos 30 módulos; identificar ocorrências por `mediaId`, SHA e papel visual; inventário e contagem reproduzíveis.
- **Caso compartilhado**: nova imagem em `ALL_USAGES` atualiza absolutamente todos os usos listados e nenhuma referência fora da lista.
- **Caso individual**: atualizar somente Y1M03-Q002 preserva byte a byte as outras 599 questões (exceto arquivos de registro/overlay necessários); o mediaId original não muda de destino.
- **Mesmo arquivo com mediaIds distintos**: apresentar aliases de mesmo SHA, listá-los e apenas alterá-los depois da confirmação global explícita.
- **Imagem que representa acerto/erro**: demonstrar que o usuário vê papel e impacto antes de confirmar; não trocar conceito por engano.
- Verificação de alpha, dimensões, formato real vs extensão, limites de arquivo e deduplicação por SHA.
- GitHub: branch isolada, commit hash verificável, PR, rollback, tentativa duplicada e detecção de conflitos; não expor credenciais.
- QA: 30/30 módulos e 600/600 boots; imagens novas carregam sem 404; pelo menos as mecânicas que usam imagens nas 13 variantes testadas, com acerto/erro/feedback/continuação. Validar embed e abertura direta; preservar responsividade, áudios e o fullscreen V20.
- Gate de diff rígido: apenas overlays de mídia/questões e novos assets; zero alterações nos Gold Masters ou mecânicas. Hash base aprovado preservado; release nova tem hash próprio e rollback.
- Capturas de antes/depois, logs de browser e PR revisável por humano. Não publicar na produção sem PASS.

## 7. Entrega para o usuário

- Executar localmente pelo Codex e **abrir o painel no Chrome**; apresentar o endereço real, não apenas print ou documentação.
- Mostrar piloto real com uma imagem compartilhada, inclusive o modal `TODAS AS ATIVIDADES` vs `SOMENTE ESTA QUESTÃO`; efetuar estágio de QA sem tocar no site oficial.
- Entregar botões e fluxos reais de upload, preview, commit/PR e rollback; não botões simulados.
- Incluir README objetivo: abrir painel, escolher ano/módulo/questão, subir arquivo, escolher escopo, confirmar, revisar no QA, publicar versão aprovada.
- Dizer explicitamente o que não foi possível certificar. Não repetir ciclos de relatórios sem efeito; priorizar produto funcionando.

**Primeira instrução ao Codex:** inspecione o código e o histórico, recupere a interface anterior se possível, implemente a versão funcional na branch atual e valide as duas formas de troca com dados reais. Pare antes de deploy na produção: primeiro mostre o painel funcional e a publicação em QA.
