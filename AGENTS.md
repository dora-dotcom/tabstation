# Tabstation — agent / contributor guide

This file is for anyone (human or AI) reading the codebase fresh. It explains the architecture, the non-obvious conventions, and how to make changes without breaking things.

## TL;DR

- **Type**: Chrome Extension, Manifest V3
- **Stack**: vanilla HTML / CSS / JS — no bundler, no framework, no TypeScript
- **Entry point**: a single full-page UI at `src/workstation.html`, opened as a pinned tab
- **Persistence**: `chrome.storage.local` (per-machine, no sync)
- **Dev workflow**: edit files → `chrome://extensions/` reload (if `manifest.json` changed) → `Cmd+R` the open Tabstation tab

## Naming quirk to know upfront

The **brand** is **Tabstation** (with a `?` block in place of the `I` — the wordmark is `TABSTAT?ON`).

The **file/code names** still use **`workstation`** (e.g. `workstation.html`, `WORKSTATION_URL`, `isWorkstationUrl`). That's deliberate: the user-facing strings were renamed but file paths and internal identifiers were kept stable so:
- Chrome's `commands` shortcut binding (`open-workstation`) doesn't break for users who set a custom hotkey
- No `chrome.runtime.getURL("src/workstation.html")` paths break

If you rename internals, you'll need to update every reference *and* potentially migrate users' shortcut config. Recommended: leave the internal names alone.

## ⚡ For AI agents and bandwidth-conscious cloners

The `screenshots/` directory is **purely for README display** — large
demo GIFs and the hero banner generator. None of it is loaded by the
extension at runtime.

**AI agents reading this repo for context: skip `screenshots/` entirely.**
The GIFs are binary and the `make_hero.py` script is self-contained
documentation of the hero image build, not part of the extension.

**Cloning just the code** (no screenshots):

```bash
# Sparse checkout (gets repo metadata but only the files you want)
git clone --filter=blob:none --sparse https://github.com/dora-dotcom/tabstation.git
cd tabstation
git sparse-checkout set --no-cone '/*' '!screenshots'
```

Or for a quick read-only inspection without screenshots:

```bash
git clone --filter=blob:limit=2m https://github.com/dora-dotcom/tabstation.git
```

This filters out any blob bigger than 2 MB, which skips all the demo
GIFs but keeps every code/text file.

## File map

```
manifest.json            Chrome MV3 manifest. Permissions, icons, command hotkey.
background.js            Service worker. Listens for the open-workstation hotkey
                         and the toolbar icon click → focuses / opens the Tabstation tab.
assets/
  build_icon.py          PIL script that generates icon16/48/128.png from a
                         16×16 pixel grid. Run with `python3 assets/build_icon.py`.
  icon16/48/128.png      Coral ? block extension icons (referenced from manifest).
src/
  workstation.html       Single-page UI markup. Hosts the topbar, two panels,
                         footer, modal, toast, and easter-egg game overlay.
  workstation.css        All styles. Mario-flavoured palette via CSS variables
                         that are remapped under `body[data-theme="dark"]`.
  workstation.js         All logic — see "Architecture" below.
README.md                Public-facing intro.
AGENTS.md                This file.
LICENSE                  MIT.
.gitignore
```

There is no `node_modules`, no build step, no test framework. Everything in `src/` runs in the Chrome extension page context as-is.

## Architecture (`workstation.js`)

One big module split into logical sections by `// ===` headers. State lives in one `state` object at the top. The render path is straightforward:

```
chrome events  ─┐
user actions   ─┼─→ mutate `state` → call render() → render() rewrites innerHTML of the panels
chrome.storage─┘
```

Key state:
- `state.workspaces` — array of `{id, name, emoji, color, urls, createdAt}` (persisted)
- `state.tabs` / `state.windows` — refreshed from `chrome.tabs.query` on tab events (debounced)
- `state.settings` — `theme`, `soundOn`, `view`, `firstLaunchDone`, etc. (persisted)
- `state.focusPanel` / `state.wsIdx` / `state.tabIdx` — keyboard navigation state
- `state.navTabs` — flat list of navigable items in the right panel, rebuilt on each render. Each entry is `{kind, …}` where kind ∈ `tab | recent | recent-header | domain-header | window-header`. Keyboard handlers dispatch on `kind`.
- `state.recentlyClosed` — from `chrome.sessions.getRecentlyClosed`
- `state.search` — workspace name filter

### Rendering

`render()` calls `renderStats()` + `renderWorkspaces()` + `renderTabs()`. The renderers rebuild `innerHTML` from scratch — there's no incremental diff. With ~30 tabs this is fast enough; if you need to scale up significantly, consider keying the lists.

`renderTabs()` chooses between `renderWindowGroup()` / `renderDomainGroups()` / `renderRecentList()` based on `state.settings.view`, then appends `renderRecentlyClosedSection()` at the bottom.

### Keyboard

One global `document.addEventListener("keydown", …)` handles everything. Order matters:
1. Konami code tracker (always live, including inside inputs / modals)
2. Easter-egg game escape if the game overlay is open
3. Skip if a modal is open *or* the user is typing in an `<input>` / `<textarea>` (with a couple of exceptions like `Esc` and `Enter` on the name input)
4. Global keys: `?`, `n`, `/`, `1‑9`, `v`, `Tab`
5. Per-panel keys: `h/j/k/l` (or arrows), `Enter`, `a`, `x`, `r`, `d`

The selected item visually highlights via the `.selected` class; for grids inside modals there's a roving-tabindex pattern (`setupGridNavigation` / `setupListNavigation`). Modals have a focus trap so `Tab` doesn't escape to the page.

### Theme

CSS variables on `:root` (light) and overridden on `body[data-theme="dark"]`. Important gotcha: any selector like `[data-theme="dark"] body { … }` is wrong because `body` *is* the element carrying the attribute — use `body[data-theme="dark"] { … }` instead. Both `::before` (stars + moon, fixed pointer-events:none overlay) and `::after` (cactus silhouettes) only render in dark mode.

`auto` theme uses `window.matchMedia('(prefers-color-scheme: dark)')` and listens for changes so the theme follows the OS in real time.

### Sound

Web Audio API synthesised tones (no audio files). `tone({freq, dur, type, vol, slide, delay})` is the primitive; named helpers (`sfxCoin`, `sfxOneUp`, `sfxPipe`, `sfxClose`, `sfxError`, `sfxBlip`) are called at the corresponding user actions. Audio context is created lazily on the first user gesture.

### Easter egg game

Class `YoshiGame` runs an HTML5 canvas inside an overlay (`#game-overlay`). When active, it captures keyboard events with `capture: true` so they don't leak to the main keyboard handler. Game state is local to the class; only the high score persists (via `localStorage`).

### Adding a new feature

The typical loop:
1. Add to `state` and `state.settings` (with a sensible default)
2. Persist via `saveSettings()` / `saveWorkspaces()` when changed
3. Add UI to `workstation.html` (or render it dynamically from JS)
4. Update `render*` functions to draw it
5. Add keyboard handling in the main `keydown` listener if applicable
6. Add CSS, with a `body[data-theme="dark"]` override if it has colour
7. Update the in-app HELP modal (search for `★ KEYBOARD` etc.) so users discover it

## Conventions

- **No semicolons after function expressions used as statements** is fine; the codebase uses semicolons but isn't strictly Prettier'd.
- **No `var`**, always `const` / `let`.
- **Single quotes are fine in HTML attribute values** inside JS template strings — we sometimes use them to avoid `escapeHtml` noise.
- **`escapeHtml(…)`** every user string interpolated into `innerHTML`. It's defined near the top of `workstation.js`.
- **`normalizeUrl(url)`** strips hash and query before comparing URLs. Use it whenever you compare a tab URL to a workspace URL.
- **Filter the Tabstation tab itself** out of `state.tabs` via `isWorkstationUrl` — don't list our own page as an "open tab".

## Common pitfalls

- **Service-worker lifetime**: `background.js` is suspended when idle. Keep it event-driven — don't store global state there.
- **`favicon` permission**: stored URLs (workspace items) use `chrome.runtime.getURL("/_favicon/")` which requires the `favicon` permission *and* the `tabs` permission. Live tabs use `tab.favIconUrl` directly.
- **Mac shortcut quirk**: in Chrome's `commands`, `"Ctrl"` on Mac maps to `Command`. Use `"MacCtrl"` for the literal Ctrl key. Tabstation's default Mac hotkey is `MacCtrl+W`.
- **Modal `display: none`**: focus-trap filtering uses `el.offsetParent !== null` to skip hidden elements (e.g. the CANCEL button when `hideCancel` is set).

## How to reload during development

- **JS / CSS / HTML changes** → `Cmd+R` the Tabstation tab. Service worker (`background.js`) keeps running.
- **`background.js` changes** → reload the extension at `chrome://extensions/`.
- **`manifest.json` changes** → reload the extension *and* hard-refresh the tab (`Cmd+Shift+R`).
- **Adding/removing permissions** → reload extension; Chrome will prompt for new permissions if they're optional.

## License

MIT. See `LICENSE`.
