# DUDUQ English — triagem dos últimos 60 vínculos SVG

Atualização: 2026-11-09. Este documento é **QA somente leitura**, não é um deploy.

## Fontes comprovadas
- Cloudflare Pages, projeto duduq-engine: deployment de produção c84a66a2-d311-4d2b-96ce-90165db4171c, SUCCESS em 2026-11-08, commit c250b1a942ecce5c27670411906550b7f06ec362.
- Registro compilado desse deployment: https://c84a66a2.duduq-engine-13a.pages.dev/content/english/media/media-registry.json
- Assets-DuduQ: commit 5d8a2e243eefaefaf403a0be838c529c6fe6ed64. Pasta Imagens Ilustrativa: 558 PNGs.
- Resultado real do registro publicado: **1.166 entradas; 60 SVGs ainda provisórios; 25 conceitos**.
- Nenhuma substituição foi autorizada apenas por nome de arquivo.

## Fila priorizada por quantidade de vínculos (não de questões)

| Conceito | IDs pendentes | Bloqueio pedagógico |
| --- | ---: | --- |
| spider | 8 | Precisa de aranha isolada, distinta de green spider |
| big | 7 | Não substituir genericamente por big dog ou big cat; depende do referente e do tamanho relativo |
| small | 4 | Depende da comparação e das alternativas |
| chicken | 4 | Galinha adulta inequívoca |
| wardrobe | 4 | Cenas disponíveis podem mostrar tapete/rug concorrendo com o gabarito |
| volleyball | 4 | Não confundir bola de vôlei com basquete ou bola genérica |
| shoe store | 4 | Cena com banco exige revisão da questão e distratores |
| six minus two equals four | 3 | A equação deve ser exatamente 6 − 2 = 4 |
| 52 | 2 | Precisa mostrar exatamente 52 |
| yellow fish | 2 | Peixe amarelo, não peixe genérico |
| plus | 2 | Símbolo + isolado |
| minus | 2 | Símbolo − isolado |
| equals | 2 | Símbolo = isolado |
| 50 | 1 | Precisa mostrar exatamente 50 |
| book | 1 | Inspecionar distratores e cena |
| objects | 1 | Inspecionar quantidades e elementos |
| thinking | 1 | Inspecionar a ação ilustrada |
| legs | 1 | Uma única perna não é validação automática de legs |
| green rabbit | 1 | Coelho efetivamente verde |
| red bird | 1 | Pássaro efetivamente vermelho |
| blue turtle | 1 | Tartaruga efetivamente azul |
| yellow hamster | 1 | Hamster efetivamente amarelo |
| green spider | 1 | Aranha efetivamente verde |
| red dog | 1 | Cachorro efetivamente vermelho |
| cloudy | 1 | Nublado não é necessariamente foggy/rainy |

**Soma:** 60 vínculos / 25 conceitos. Quantidade de questões beneficiadas ainda requer exame das 600 ocorrências compiladas; não estimar.

## Ferramenta de auditoria incluída nesta candidata

Executar no ambiente com Node.js e acesso à rede:

    node qa/audit-published-last60-svg.mjs --questions-root=dist-pages

O script confere o deployment de produção fixado e os 558 PNGs no inventário-fonte fixado, agrupa todos os IDs provisórios e, quando recebe dist-pages, verifica as 600 questões e as ocorrências dos IDs. Saída: qa/results/production-last60-audit-20261109.json.

## Gates obrigatórios de qualquer integração futura

1. Provar correspondência semântica por ocorrência e verificar cada gabarito/distrator visualmente.
2. Validar PNG, canal alfa, dimensões, blob Git e SHA-256 sem modificar imagens anteriores.
3. Manter 30 módulos, 600 questões, todos os conteúdos, Gold Masters, mecânicas e áudio.
4. Homologar gameplay real em Chromium nas três viewports 390×844, 844×390 e 1280×800, além de regressão das mecânicas.
5. Apenas com todos os gates PASS considerar deployment isolado com SHA, ID, rollback e conferência de 30 URLs.

**Status:** RELEASE_BLOCKED até haver correspondência visual e QA reais. Este PR não modifica conteúdo, PNGs, registro, runtime, CI ou produção.