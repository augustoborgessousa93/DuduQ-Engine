# Fase 2 — revisão dirigida do subconjunto 37 (04/11/2026)

Fonte: artifact 13253876328, `phase2-batch-source-integration.json`. Esta revisão é **triagem**, não homologação de mídia ou autorização de deploy.

## Descoberta que altera a prioridade
O subconjunto de 37 mediaIds com `missingLeafSemantics=0` e uma única `questionId` **não equivale a 37 novas imagens**. Oito IDs referem-se à cor orange (fonte `color orange-cor laranja.png`), já relacionada ao hotfix posterior de laranja; antes de qualquer integração, confrontar com o deployment atual para evitar reintrodução de mídia anterior. Outros 23 IDs de animais (fish, bird, hamster) reutilizam apenas três fontes: `pet-fish-peixe.png`, `pet-bird-passaro.png`, `pet-hamster.png`. Os seis restantes são: fourteen (1), twenty (1), play (2), bed (2). Assim, a triagem de 37 vínculos corresponde a apenas **8 fontes PNG distintas** (orange, fish, bird, hamster, fourteen, twenty, play, bed).

## Exceções e gates
- `IMG-V11-2B-8440AA1CAD4E4933` mapeia conceito `twenty` para arquivo `Imagens Ilustrativa/wenty-vinte.png` (nome sem T inicial). Confirmar conteúdo visual, hash e uso real; não rejeitar nem aprovar só pelo nome.
- Os 8 vínculos orange precisam ser comparados com o deployment de 03/11/2026 e com a distinção semântica **cor versus fruta**. Não sobrescrever binding publicado por candidato mais antigo.
- `questionIds.length===1` não comprova uso único: o inventário também fornece `occurrences`; confrontar cada ocorrência real antes de substituir.
- Nenhum vínculo deve ser promovido com base apenas em `missingLeafSemantics=0`. Validar alvo da alternativa, hash do PNG, legibilidade real e a presença no registro de produção.
- Manter bloqueados white (contraste), banana (campo temporary), black compartilhado (divergência de usos), estações rejeitadas e os 105 vínculos com semântica incompleta.
- Não alterar 600 contratos, gabaritos, áudios, mecânicas, runtime, Gold Masters, responsividade ou embed. Não executar deploy de produção sem autorização explícita.

## Próximo lote realmente incremental
Começar pelas três fontes de animais, **somente se ainda provisórias na produção atual**, fazendo comparação de todos os IDs/ocorrências e QA visual dirigido; depois play/bed/fourteen/twenty. Não integrar orange até reconciliação com o hotfix publicado. Produzir candidata isolada apenas se houver diferença real, com rollback.
