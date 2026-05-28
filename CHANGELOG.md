# Changelog

All notable changes to Tabstation are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-05-29

### Added
- **🪄 ORGANIZE button** (and `o` key) — one-click tidy that:
  - Snaps open tabs into their workspace's Chrome tab group (reusing the
    existing group if the workspace is already "active")
  - Closes duplicate tabs (keeps the active one, else the oldest)
  - Ejects "misplaced" tabs — orphan tabs stuck inside a workspace group
    (e.g. a link you clicked from inside the group that doesn't belong)
  - Slides every workspace group to the front of its window in workspace
    order, pushing orphan tabs to the right
  - Consolidates a workspace's scattered tabs to a single window (existing
    group's window > most matches > current window)
  - When a URL belongs to multiple workspaces, picks the one with the
    currently-open Chrome group, else the workspace with the most matched
    open tabs (workspace order is the tiebreak)
- **BY WINDOW now sub-groups by Chrome tab group**: each workspace group
  becomes a colour-coded sub-header in workspace order, then non-Tabstation
  Chrome groups, then a `· UNGROUPED` section. Every sub-header has
  `× ALL` to batch-close the section, and is keyboard-navigable.

## [0.3.0] - 2026-05-28

### Added
- **Add a tab to a brand-new workspace** from the ADD TO WORKSPACE picker. When
  no workspaces exist yet, the picker is skipped and the create flow opens
  directly — seeded with the tab's URL and its domain as the default name.
- **`Space` peeks inside the selected workspace** — expands/collapses its URL
  list (the same as clicking it) without opening any tabs. `Enter` still opens
  the whole workspace.

### Fixed
- Workspace tags on open tabs now show the **full workspace name** (previously
  truncated to 8 characters, e.g. "ESSENTIA") and render **one tag per
  workspace** when a tab belongs to several (previously only the first showed).
- **Up/Down arrows** now reliably navigate pick-list modals (ADD TO WORKSPACE,
  bookmark import) even when focus has drifted onto a button.
- Tightened ADD TO WORKSPACE modal keyboard navigation.

## [0.2.0] - 2026-05-24

### Added
- `Backspace` works as an alias for `x` (close tab) and `d` (delete workspace).
- Konami-code easter egg gained chiptune sound effects and background music.

### Changed
- Renamed internals from "workstation" to "tabstation".
- `AGENTS.md` pivoted to an install guide for coding agents; dev gotchas now
  live as inline comments in the code.
- README: keyboard-first pitch, day/night hero banner, per-feature demo GIFs,
  first-launch section, and a partial-clone tip.

## [0.1.0] - 2026-05-24

### Added
- Initial release: 8-bit pixel, keyboard-first workspace tab manager for Chrome.
  Workspaces as colour-coded tab groups, three tab views (window / site /
  recency), duplicate collapse, orphan cleanup, recently-closed restore,
  first-launch bookmark import wizard, and light / dark / auto themes.

[0.4.0]: https://github.com/dora-dotcom/tabstation/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/dora-dotcom/tabstation/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/dora-dotcom/tabstation/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/dora-dotcom/tabstation/releases/tag/v0.1.0
