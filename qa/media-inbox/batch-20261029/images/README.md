# Entrada de imagens ChatGPT — lote V27

**Este diretório é somente para receber arquivos originais. Nunca execute o instalador .cmd bloqueado, nem desative as proteções do Windows.**

## Arquivos esperados

- `BASE-Y1-003.png` — cabeça em close-up — SHA-256 `3c00647e61d7b7c8ee365454b1a349088254352988a0538e4cec348366db6401`
- `BASE-Y1-007.png` — mochila escolar individual — SHA-256 `1b20ee60ea996463a9dccb811e284b184d51cade24b3237ad7eeccfabd20a511`

Esses são os PNGs *já extraídos* de `DUDUQ_Imagens_AutoIntegracao_V27.zip`, dentro de `DUDUQ_Imagens_AutoIntegracao_20261029/images/`. **Não envie o ZIP inteiro, outros arquivos ou scripts.**

Os dois arquivos devem ser carregados pelo site do GitHub em **qa/media-inbox/batch-20261029/images/**, exclusivamente na branch **automation/duduq-media-source-only-fix-20261029**. O upload dos dois juntos dispara automaticamente o workflow de QA em Linux (`duduq-v27-media-linux-qa.yml`).

O workflow confere SHA-256, PNG RGBA com transparência, IDs pedagógicos, build V26 e overlay V27, valida 30 módulos e oferece relatórios. Não faz merge, deploy ou push à produção.

**Status atual:** apenas manifesto e diretório preparados. A integração depende da presença verificável dos dois PNGs e do PASS no workflow.
