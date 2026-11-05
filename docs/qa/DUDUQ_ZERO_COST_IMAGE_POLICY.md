# DUDUQ — política de produção de imagens sem cobrança

Autorização do usuário: **zero despesa adicional**. A quantidade máxima por execução é **10 solicitações ao gerador**, incluindo tentativas repetidas. Dez imagens por execução **não** tornam a API da OpenAI gratuita: qualquer chamada à API pode gerar cobrança, mesmo com lote de 1.

- O pipeline do projeto vem com a API paga **bloqueada por padrão**, mesmo quando existir `OPENAI_API_KEY` ou `GEMINI_API_KEY`.
- O processo retorna `ZERO_COST_POLICY_API_BLOCKED`, sem tentar chamadas, quando não há autorização separada e explícita para utilizar uma API cobrada.
- `DUDUQ_IMAGE_MAX_PER_RUN` deve ser inteiro entre 1 e 10 (padrão 10). Configurar 11 ou mais resulta em erro.
- Para segurança contra custos inesperados, **as novas chamadas ao provedor contam como tentativas**, inclusive quando há erro, e não apenas como arquivos efetivamente entregues.
- Somente no futuro, mediante **nova autorização do usuário para pagamento, com teto definido**, um operador poderá liberar `DUDUQ_ENABLE_BILLABLE_IMAGE_API=I_ACCEPT_API_CHARGES`. Não habilitar essa opção com a autorização atual.
- O gerador de imagens integrado à conversa do ChatGPT pode produzir imagens dentro dos limites do produto, mas atualmente não pode ser invocado automaticamente por este workflow GitHub Actions. O plano sem cobranças não promete um loop de geração 100% automático sem um backend gratuito disponível e validado.
- Continue a usar a auditoria, deduplicação semântica, organização de lotes de até dez assets individuais, QA e importação por `mediaId`; não altere Gold Masters, respostas, mecânicas ou produção antes de validar.
- Critério de encerramento: zero imagens provisórias **referenciadas** nas 600 atividades, QA das 30 rotas e revisão visual/pedagógica válida.
