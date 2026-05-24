# Tabstation

> An 8-bit pixel, **keyboard-first** workspace tab manager for Chrome. Pin one tab, run everything from there — without ever reaching for the mouse.

![Tabstation hero](./screenshots/hero.png)

> **The flagship move** — `Shift+Enter` on a workspace stashes everything you don't need and pops the new tabs into a colour-coded Chrome group:

![Workspace switch in action](./screenshots/switch.gif)

---

## Why Tabstation?

If you live in Chrome and any of these sound familiar, this is for you:

| Pain | Tabstation's fix |
| --- | --- |
| ⌨️ I hate reaching for the mouse | **Keyboard-first** — every action has a single-key shortcut. Vim-style `hjkl` or arrow keys; modals support Tab / Enter / Esc properly. You can literally never touch the mouse. |
| 😩 30+ tabs and I can't find anything | **Live tab list** with three views (by window / by site / by recency), full-page search |
| 🤦 Accidentally closed a tab and `Cmd+Shift+T` only goes back one | **RECENTLY CLOSED** section — one click to restore any of the last 15 tabs/windows |
| 🔁 Switching between projects means opening the same 8 tabs every time | **Workspaces**: save a group of URLs once, press Enter to open them all as a colour-coded Chrome tab group |
| 🧹 Done with a project — close *those* tabs but keep the unrelated ones | `Shift+Enter` **switches** workspaces: stash the old tabs (recoverable) and open the new ones |
| 🪲 17 Notion tabs, want them all gone | **BY SITE × ALL** — close every tab from a domain in one click |
| 🌪️ Stray tabs that aren't part of any project pile up | **🗑️ Orphan cleanup** — top-bar button closes everything not in any workspace |

---

## Features

### 🎮 Workspaces
- Save groups of URLs by topic (BQ Research, Offer Calc, Morning Routine…)
- Each workspace has an emoji + colour that maps to a Chrome tab-group colour
- Press `Enter` to open them all; existing tabs are reused (no dupes)
- `Shift+Enter` to **switch** — closes everything else first
- Inline expand to see the URLs without opening them

![Creating a new workspace](./screenshots/new-workspace.gif)

### 🪟 Live tab list
- Three views: **BY WINDOW** / **BY SITE** / **RECENT** — toggle with `v` or `Tab`
- Duplicate URLs collapse into a group with `×N` close-all
- Each domain in BY SITE has `× ALL` to nuke all tabs from that site
- Each window in BY WINDOW has `× ALL` to close that window's tabs

![Batch-close all tabs in a view with × ALL](./screenshots/switch-close-by-view.gif)

### ⏪ Recently closed
- Last 15 closed tabs and windows live at the bottom of the right panel
- Click or `Enter` to restore
- Closed windows restore as full windows with all their tabs

![Restore a recently closed tab](./screenshots/recently-closed.gif)

### 🌅 Day / Night / Auto theme
- Light mode: SMB1 sky blue
- Dark mode: night desert — purple sky with stars, moon, cacti silhouettes on the horizon
- 🌗 **Auto** mode follows your macOS Display setting (light by day, dark by night)

![Theme toggle — light to dark](./screenshots/theme.gif)

### 🎵 Sound effects
- Coin sound when you add a tab, 1-UP on new workspace, pipe-slide on open, etc.
- Toggle with the 🔊 button (purely synthesised — no audio files)

### 🦖 Easter egg
- Click the **TABSTAT?ON** logo 5 times in a row, *or* type the Konami code (`↑↑↓↓←→←→BA`)
- Plays **Yoshi's Apple Garden** — catch 🍎 apples, avoid 💣 bombs, ⭐ stars give big points. High score saved.

![Yoshi's Apple Garden mini-game](./screenshots/yoshi.gif)

---

## Install with a coding agent

Send your coding agent (Claude Code, Codex, etc.) this repo URL and say **"install this"**:

```
https://github.com/dora-dotcom/tabstation
```

The agent will introduce you to Tabstation, walk you through loading the extension, and show you the keyboard shortcuts. Takes about 1 minute. See [AGENTS.md](./AGENTS.md) for the script it follows.

---

## Manual install

Tabstation isn't on the Chrome Web Store (yet). For now:

```bash
git clone https://github.com/dora-dotcom/tabstation.git
```

> 🪶 The repo includes a handful of demo GIFs (~120 MB) for the README.
> Want just the code? Add `--filter=blob:limit=2m` to skip the big assets:
> `git clone --filter=blob:limit=2m https://github.com/dora-dotcom/tabstation.git`

Then in Chrome:

1. Open `chrome://extensions/`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `tabstation` folder
5. A pinned tab opens — that's your home base. Right-click the toolbar icon → **Pin** to keep it handy.

### Open Tabstation quickly

- **`Ctrl+W`** (Mac) — global hotkey to jump to the Tabstation tab from anywhere
- **`Cmd+1`** — since the tab is pinned first, this also works
- Click the toolbar icon

Rebind the hotkey at `chrome://extensions/shortcuts`.

---

## First launch

A pinned Tabstation tab opens automatically. The first time it loads, a small wizard appears:

### 📚 Bookmark import wizard

> Found N bookmark folder(s). Pick which to import as workspaces.

Tabstation scans your Chrome bookmark folders and offers to turn each one into a workspace (the folder's URLs become the workspace's URLs, and each gets a random Mario emoji + colour). It's the fastest way to get started if you already organise tabs as bookmarks.

- **Use ↑↓ + Space** to pick a folder, **Tab** to the IMPORT button, **Enter** to confirm.
- Don't want any of them? Just press **Esc** (or click CANCEL) — nothing is imported and the wizard never bothers you again.
- After import you can rename / re-emoji / recolor any workspace with `r` (or right-click → edit).

If you have zero bookmark folders, the wizard skips silently and you start with an empty WORLD 1-1 — press `n` (or click `+ NEW`) to create your first workspace.

### Defaults you might want to change

All of these have a button in the top bar or a `chrome://extensions/shortcuts` entry:

| Default | What it means | Where to change |
| --- | --- | --- |
| 🌗 **Theme: Auto** | Follows your macOS Display setting (light by day, dark by night) | Click the 🌗 / 🌙 / ☀️ button to cycle |
| 🔊 **Sound: On** | Web-audio synth beeps on actions | Click the 🔊 button to mute |
| 🪟 **Tab view: BY WINDOW** | Right panel groups tabs per Chrome window | Click `BY WINDOW` / `BY SITE` / `RECENT`, or press `v` |
| ⌨️ **Hotkey: `Ctrl+W` (Mac)** | Jumps to Tabstation from anywhere in Chrome | `chrome://extensions/shortcuts` |

Press `?` any time to see the full keyboard cheatsheet inside the app.

---

## Keyboard cheatsheet

Open the in-app `?` help anytime. The essentials:

| Key | Action |
| --- | --- |
| `↑ ↓` (or `j k`) | Move selection up/down |
| `← →` (or `h l`) | Switch panel (workspaces ↔ tabs) |
| `Enter` | Open workspace / Jump to tab / Restore recently-closed |
| `⇧Enter` | **Switch** to workspace (close other tabs first) |
| `1 – 9` | Quick-open Nth visible workspace |
| `n` / `r` / `d` (or `⌫`) | New / Rename / Delete workspace |
| `a` | Add the selected tab to a workspace |
| `x` (or `⌫`) | Close selected tab (or all duplicates of a collapsed group) |
| `/` | Focus workspace search |
| `v` (or `Tab`) | Cycle BY WINDOW / BY SITE / RECENT |
| `Esc` | Close any modal / clear search |
| `?` | Show full help |

---

## Design choices

A few things that aren't accidents:

- **Pinned single-tab UX**: Tabstation lives in one Chrome tab. No new windows, no popup that closes when you click away. It's a workspace, not a sidebar.
- **8-bit aesthetic**: Press Start 2P + Pixelify Sans, NES-inspired palette, hard-edge borders, no rounded corners. The night mode has a starry sky with cacti silhouettes; the title's `?` block is the actual letter "I" in `TABSTAT?ON`.
- **Keyboard-first**: every action is reachable without the mouse, including modals (focus trap, arrow-key nav inside grids, single-key shortcuts).
- **No build step**: pure vanilla JS, HTML, CSS. Hack it with any editor, reload the extension, done.
- **Local-only**: workspaces persist via `chrome.storage.local`. Nothing is synced or sent anywhere.
- **Safety net for batch actions**: every close uses `chrome.tabs.remove`, so closed tabs land in Chrome's session history and show up in **RECENTLY CLOSED** for one-click restore.

---

## Hacking on it

Vanilla HTML / CSS / JS. No build step, no framework, no TypeScript. Section headers (`// ===`) in `tabstation.js` mark the major subsystems; non-obvious gotchas (Mac shortcut quirk, favicon permission, theme selector form, focus-trap filter, MV3 service-worker lifetime) live as inline comments at their site. File tree:

```
manifest.json           ← Chrome extension manifest (MV3)
background.js           ← Service worker: global hotkey + open-Tabstation logic
assets/                 ← Extension icons (16/48/128) + Python build script
src/
  tabstation.html      ← Single-page UI
  tabstation.css       ← All styles, including light/dark themes
  tabstation.js        ← All logic — state, rendering, keyboard, easter egg game
```

To iterate: change a file → `chrome://extensions/` reload (if `manifest.json` changed) → `Cmd+R` the Tabstation tab.

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Acknowledgments

- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) and [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) — Google Fonts, OFL licensed
- Visual inspiration: Super Mario Bros. 1 & 3 (Nintendo). Nothing is copied directly; the cacti, ? block, and palette are originals in the SMB tradition.
- Built collaboratively with Claude Code 🤖
