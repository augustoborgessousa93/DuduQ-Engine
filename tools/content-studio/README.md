# DUDUQ Image Studio (local QA)

The panel edits image references only through a reviewed editorial overlay. It does not change the learner-facing answer key, game mechanics, production links, or Cloudflare deployment. New image revisions remain `STAGED_FOR_HUMAN_REVIEW` until separately reviewed and promoted.

## Start

From the repository root, run:

```powershell
$env:DUDUQ_CONTENT_STUDIO_PORT = '4181'
npm run duduq:content-studio
```

Then open `http://127.0.0.1:4181/studio/`. Use the default `4180` only if that port is free. The server binds to loopback (`127.0.0.1`) and keeps the admin session token in the local browser session; never expose this server to a network interface.

## Replace an image

1. Choose year, module, question, and image position.
2. Review the **GABARITO DA ATIVIDADE**, alternatives, image roles, reuse count, and current asset details.
3. Upload a PNG or WebP. The server checks the signature, extension, dimensions, size, and SHA-256 without recompressing the file.
4. Choose all uses of the same `mediaId` or only selected positions in this question. Exact SHA-256 aliases are listed separately and are opt-in.
5. Review the affected questions, per-position role and official answer-key summary. Explicitly confirm same-concept preservation if a global asset spans correct and distractor roles.
6. Type `CRIAR BRANCH E PR` to create an isolated editorial branch, immutable asset, versioned overlay, commit and draft PR. No production deployment occurs.
7. Review the PR and QA status. The module preview link follows the normal learner curriculum flow; it does not bypass session/progression checks.
8. Use the history action to close an unmerged draft PR or create a compensating revert PR for a merged revision. No files or history are silently deleted.

## Safety notes

- The V19 `dist-pages` package is checked against its pinned manifest before the media index is used.
- The GitHub write path uses the local Git credential helper on the server. Credentials are never sent to browser JavaScript.
- Only the requested asset and image references are included in the editorial overlay. The standard release build applies only human-approved overlays; draft revisions do not silently become production media. An explicitly disposable `DUDUQ_MEDIA_OVERLAY_MODE=qa` build may mark staged entries `qaOnlyApproval` so the player can resolve them; this status exists only in that QA output and is not copied back into source or production.
- Full learner-runtime preview requires the local Pages QA preview to be available on port `8788`. If it is not running, the panel still provides the module route, but it cannot claim that the staged image has passed runtime QA.
