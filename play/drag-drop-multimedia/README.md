# Drag & Drop Multimedia (experimental)

Route: `/play/drag-drop-multimedia/`

This route is an isolated experimental surface for future TEXT/AUDIO
combinations. Its current layout intentionally stops after the canonical
header and instruction HUD; the Drag & Drop gameplay region has been removed
from this route while the next multimedia layout is prepared. It does not load
the route-local CSS or JavaScript from `/play/drag-drop/`.

## Ownership

- **MULTIMEDIA ONLY:** `index.html`, `drag-drop-multimedia.js`, and
  `drag-drop-multimedia.css`. Make future experimental gameplay/rendering
  changes here first.
- **OFFICIAL ONLY:** `../drag-drop/index.html`, `../drag-drop/drag-drop.js`,
  and `../drag-drop/drag-drop.css`. They were not edited to create this route.
- **SHARED:** `core/duduq-fullscreen-mode.css`, the canonical HUD/UI and audio
  modules under `core/`, and existing shared assets under `core/assets/`.
  Changes to these shared owners can affect both routes and require checking
  both.

The official DND rendering and interaction engine remain owned by
`/play/drag-drop/`. This experimental route currently mounts only its retained
canonical header and instruction HUD. Route-local CSS keeps the existing HUD
progress treatment and gives the reduced page a content-height shell without
changing shared files.

## Official source state recorded at copy time

The official route files were already modified in the Git worktree before this
copy. These SHA-256 hashes record the exact source used for the experimental
snapshot; they are not claims that the official files match the last commit.

- `../drag-drop/index.html`: `5ED699037A7F8BE4E98BE2AAA6909428F3665B0990846C74E58F3C1A7F2ADA0C`
- `../drag-drop/drag-drop.js`: `B9318B0780692B5CE4288DC1D9042B78D930E5E90633D12DD5BCD0829046DDB3`
- `../drag-drop/drag-drop.css`: `103EC9A4C8FFD065D10DCCA73E7A6BF91AF851A72C434DADE9BC1BED0F64CF9E`

No multimedia-specific TEXT or AUDIO gameplay has been added yet.
