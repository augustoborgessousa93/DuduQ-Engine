# DUDUQ Native ChatGPT image pack — authenticated Library handoff

The browser host policy explicitly blocks automated observation of `https://chatgpt.com` (even with a signed-in tab in the same account). **Never bypass this restriction**, scrape credentials/cookies, use DevTools/CDP, or use another browser surface to obtain page content.

## Authorized source, independent of browsing the chat

The **original** 10-PNG ZIP was saved directly to the account's ChatGPT Library:

- Library folder: `/DUDUQ - Imagens Oficiais/`
- Library file: `DUDUQ_ChatGPT_Lote_Escolar_10_20261029.zip`
- Library file ID: `libfile_d9be741e434c81919ef5eb3e882417da`
- ChatGPT Library backing file ID: `file_000000002ff8820e85d4ee68a631dfc7`
- Raw ZIP SHA-256: `0a3d71d2b7ee127d702326d437dc13b8145ab58d1333b15819ebe8cb3b5ba280`
- Size: 12,391,419 bytes.
- Contains: 10 native individual ChatGPT PNG assets, `batch-manifest.json`, visual evidence, preview and readme.

## Codex execution policy

1. If the **Files/Library connector** is available to the Codex execution context, use its **official authenticated file API** to locate and materialize the exact Library file by library_file_id or path. This is authorized source retrieval and **does not browse `chatgpt.com`**, so it is not a workaround for blocked browser host access.
2. Never assume that a ChatGPT login grants Codex CLI direct access to Library. If Codex lacks this connector/capability, report `CODEX_LIBRARY_CONNECTOR_UNAVAILABLE` and stop. No cookies, raw browser commands, browser-origin hacks or login token copying.
3. On successfully receiving bytes, verify SHA-256 and do one atomic upload to `qa/media-inbox/chatgpt-batch-10-20261029/DUDUQ_ChatGPT_Lote_Escolar_10_20261029.zip` **on this review branch only**. The existing workflow `.github/workflows/duduq-native-chatgpt-batch-qa.yml` then unpacks, verifies hashes, imports 12 exact game-option references into a QA build, and tests all 30 modules.
4. No production deployment or permanent removal of temporary images before real rendered pedagogical QA. Preserve Gold Masters.
5. If upload cannot be performed using an official connector in the execution environment, do not claim completion; a ChatGPT **Work** workflow with direct Library access and GitHub web access is a potential sanctioned alternative requiring the user's separate invocation.

This handoff intentionally does not publish or embed an externally readable ZIP URL.
