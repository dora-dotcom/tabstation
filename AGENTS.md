# AGENTS.md — Tabstation: install guide for coding agents

You're installing **Tabstation** for the user. Your job is not just to set it up — get them excited about using it.

> **Editing the code instead?** This file is install-flow only. The codebase is vanilla HTML / CSS / JS at `src/tabstation.{html,css,js}` — section headers (`// ===`) in `tabstation.js` mark the major subsystems, and non-obvious gotchas are inline comments at their site. No build step, no framework, no TypeScript.

---

## Step 0 — Introduce the product

Before doing anything technical, tell the user what they're about to get:

> **Tabstation** is a keyboard-first 8-bit pixel workspace tab manager for Chrome. Pin one tab, and run everything from there — without ever reaching for the mouse.
>
> What makes it great:
> - **Workspaces** — save a group of URLs once, press Enter to open them all as a colour-coded Chrome tab group
> - **`Shift+Enter` switches workspaces** — stash the old tabs (recoverable) and open the new ones
> - **Keyboard-first** — Vim-style `hjkl` or arrows; every action has a single-key shortcut
> - **Recently closed panel** — restore any of the last 15 closed tabs/windows
> - **Three views** — by window, by site, by recency, with full-page search
> - **Duplicate collapse** — same URL open twice gets grouped with one-click close-all
> - **Orphan cleanup** — one click closes every tab not in any workspace
> - **8-bit pixel aesthetic** with light / dark / auto themes (auto follows your OS in real time)
> - **100% local** — `chrome.storage.local`, no server, no account, no telemetry
> - Konami code easter egg 🦖 with chiptune sound
>
> Setup takes about 1 minute.

---

## Step 1 — Clone the repo

The extension doesn't need the demo GIFs in `screenshots/` (they're README-only, ~120 MB). Skip them with a blob-size filter:

```bash
git clone --filter=blob:limit=2m https://github.com/dora-dotcom/tabstation.git
cd tabstation
```

---

## Step 2 — Load the Chrome extension

This is the one step that requires manual action from the user. Make it as easy as possible.

**Print the full path to the repo folder**:

```bash
echo "Extension folder: $(pwd)"
```

**Copy it to the clipboard**:
- macOS: `pwd | pbcopy && echo "Path copied to clipboard"`
- Linux: `pwd | xclip -selection clipboard && echo "Path copied to clipboard"`
- Windows: `echo %CD% | clip && echo Path copied`

**Open the extensions page**:

```bash
open "chrome://extensions"
```

**Walk the user through it**:

> I've copied the extension folder path to your clipboard. Now:
>
> 1. In the **top-right corner**, toggle on **Developer mode**.
> 2. A **Load unpacked** button appears top-left. Click it.
> 3. In the file picker, press **Cmd+Shift+G** (Mac) or **Ctrl+L** (Windows/Linux) to open "Go to folder", paste the path (Cmd+V / Ctrl+V), and press Enter.
> 4. Click **Select** / **Open**.
>
> You should see "Tabstation" appear in your extensions list, and a pinned Tabstation tab opens automatically.

**Fallback**, open the folder in a file browser so the user can drag it onto the extensions page:
- macOS: `open .`
- Linux: `xdg-open .`
- Windows: `explorer .`

---

## Step 3 — Show them around

> You're in. A first-launch wizard appears and offers to turn each of your Chrome bookmark folders into a workspace — accept and you've got a complete control center in 5 seconds.
>
> Things to try right away:
> 1. Press **`?`** to see all keyboard shortcuts
> 2. Use **`h/j/k/l`** (or arrows) to navigate; **Tab** to switch panel
> 3. Press **Enter** on a workspace to open all its URLs as a Chrome tab group
> 4. Press **Shift+Enter** to *switch* workspaces — stashes current tabs, opens new
> 5. Press **`/`** to filter workspaces by name
> 6. Press **`v`** to cycle tab views (by window / site / recency)
> 7. The default hotkey is **MacCtrl+W** (Mac) or **Alt+Shift+W** (others) to jump to the Tabstation tab from anywhere — customise it at `chrome://extensions/shortcuts`
> 8. Click the **Tabstation logo** 5 times in a row… 🦖

---

## Key facts

- Pure Chrome extension. No server, no Node.js, no npm, no build step.
- Persistence: `chrome.storage.local`, per-machine.
- 100% local, no external service.
- To update: `cd tabstation && git pull`, then reload at `chrome://extensions`.
- Full feature tour and screenshots: see `README.md`.
