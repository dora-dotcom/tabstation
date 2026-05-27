// ============================================================
// TABSTATION
// ============================================================

const WS_COLORS = [
  "red", "yellow", "green", "blue", "purple", "cyan", "pink", "orange",
];
const WS_EMOJIS = [
  "🍄", "⭐", "🪙", "🔥", "🌱", "🟨", "🐢", "🚩",
  "🏰", "🦖", "🌊", "🌙", "📊", "💰", "🌅", "🔬",
  "📝", "🎯", "🚀", "🎮", "🧪", "📚", "💡", "⚡",
];
const CHROME_TG_COLORS = {
  red: "red", yellow: "yellow", green: "green", blue: "blue",
  purple: "purple", cyan: "cyan", pink: "pink", orange: "orange",
};

const TABSTATION_URL = chrome.runtime.getURL("src/tabstation.html");

// ============================================================
// STATE
// ============================================================

const state = {
  workspaces: [],
  settings: { firstLaunchDone: false, view: "window", theme: "auto", soundOn: true },
  tabs: [],
  windows: [],
  focusPanel: "ws", // 'ws' | 'tabs'
  wsIdx: 0,
  tabIdx: 0,
  navTabs: [], // flat list of visible tab IDs in render order
  expandedWsIds: new Set(),
  expandedDupKeys: new Set(),
  search: "",
  recentlyClosed: [],
  recentExpanded: false,
};

// ============================================================
// SOUND (Web Audio synth — no audio files)
// ============================================================

let _audioCtx = null;
function getAudio() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
function tone({ freq = 800, dur = 0.1, type = "square", vol = 0.12, slide = null, delay = 0 }) {
  if (!state.settings.soundOn) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    if (slide != null) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {}
}
function sfxCoin() {
  tone({ freq: 988, dur: 0.07 });
  tone({ freq: 1318, dur: 0.13, delay: 0.07 });
}
function sfxOneUp() {
  [659, 784, 1047, 1319].forEach((f, i) =>
    tone({ freq: f, dur: 0.11, delay: i * 0.1, vol: 0.1 })
  );
}
function sfxPipe() {
  tone({ freq: 220, dur: 0.18, slide: 660, vol: 0.15 });
}
function sfxClose() {
  tone({ freq: 440, dur: 0.06, slide: 220, vol: 0.1 });
}
function sfxError() {
  tone({ freq: 196, dur: 0.22, type: "sawtooth", slide: 98, vol: 0.12 });
}
function sfxBlip() {
  tone({ freq: 600, dur: 0.04, vol: 0.06 });
}

// ============================================================
// THEME
// ============================================================

function effectiveTheme() {
  if (state.settings.theme === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return state.settings.theme;
}
function applyTheme() {
  document.body.setAttribute("data-theme", effectiveTheme());
  const btn = $("btn-theme");
  if (btn) {
    const icons = { light: "🌙", dark: "☀️", auto: "🌗" };
    const titles = {
      light: "Theme: Light · click for Dark",
      dark: "Theme: Dark · click for Auto",
      auto: "Theme: Auto (follow system) · click for Light",
    };
    btn.textContent = icons[state.settings.theme];
    btn.title = titles[state.settings.theme];
  }
  const sBtn = $("btn-sound");
  if (sBtn) sBtn.textContent = state.settings.soundOn ? "🔊" : "🔇";
}
function toggleTheme() {
  const order = ["light", "dark", "auto"];
  const cur = order.indexOf(state.settings.theme);
  state.settings.theme = order[(cur + 1) % order.length];
  saveSettings();
  applyTheme();
  sfxBlip();
  if (state.settings.theme === "auto") {
    toast("THEME: AUTO (FOLLOW SYSTEM)");
  }
}

// Listen for OS-level dark mode changes
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.settings.theme === "auto") applyTheme();
  });
}
function toggleSound() {
  state.settings.soundOn = !state.settings.soundOn;
  saveSettings();
  applyTheme();
  if (state.settings.soundOn) sfxCoin();
}

async function loadState() {
  const data = await chrome.storage.local.get(["workspaces", "settings"]);
  state.workspaces = data.workspaces || [];
  state.settings = { firstLaunchDone: false, view: "window", ...(data.settings || {}) };
}

async function saveWorkspaces() {
  await chrome.storage.local.set({ workspaces: state.workspaces });
}
async function saveSettings() {
  await chrome.storage.local.set({ settings: state.settings });
}

// ============================================================
// HELPERS
// ============================================================

function uid() {
  return "ws-" + Math.random().toString(36).slice(2, 9);
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

// For stored URLs (workspace), use Chrome's own favicon cache via _favicon API.
// Requires both `favicon` AND `tabs` permissions in manifest.json — having one
// without the other returns a blank image silently.
function faviconUrl(url) {
  try {
    const u = new URL(chrome.runtime.getURL("/_favicon/"));
    u.searchParams.set("pageUrl", url);
    u.searchParams.set("size", "32");
    return u.toString();
  } catch {
    return "";
  }
}
// For a live tab, prefer tab.favIconUrl; fall back to the _favicon endpoint.
function tabFaviconUrl(tab) {
  if (tab.favIconUrl && /^https?:/.test(tab.favIconUrl)) return tab.favIconUrl;
  return faviconUrl(tab.url);
}
function faviconImg(src) {
  if (!src) return `<span class="favicon-fallback">🌐</span>`;
  return `<img class="favicon" src="${escapeHtml(src)}" alt="">`;
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isTabstationUrl(url) {
  return url && url.startsWith(TABSTATION_URL.split("#")[0]);
}

function findWorkspaceForUrl(normalized) {
  return state.workspaces.find((ws) =>
    ws.urls.some((u) => normalizeUrl(u) === normalized)
  );
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// ============================================================
// TAB QUERYING
// ============================================================

async function refreshTabs() {
  const tabs = await chrome.tabs.query({});
  state.tabs = tabs.filter((t) => !isTabstationUrl(t.url));
  state.windows = [...new Set(state.tabs.map((t) => t.windowId))];
}

async function refreshRecentlyClosed() {
  if (!chrome.sessions) return;
  try {
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 15 });
    state.recentlyClosed = sessions.filter((s) => {
      const url = s.tab?.url || s.window?.tabs?.[0]?.url;
      return !isTabstationUrl(url);
    });
  } catch (err) {
    console.warn("sessions API failed", err);
    state.recentlyClosed = [];
  }
}

async function restoreSession(sessionId) {
  if (!chrome.sessions) return;
  try {
    await chrome.sessions.restore(sessionId);
    sfxPipe();
    toast("RESTORED ↻");
  } catch (err) {
    console.warn("restore failed", err);
    sfxError();
  }
}

// ============================================================
// RENDERING
// ============================================================

function $(id) { return document.getElementById(id); }

function render() {
  renderStats();
  renderWorkspaces();
  renderTabs();
}

function renderStats() {
  $("stat-ws").textContent = String(state.workspaces.length).padStart(2, "0");
  $("stat-tab").textContent = String(state.tabs.length).padStart(2, "0");
  $("tab-count").textContent = `(${state.tabs.length})`;
  // Update cleanup button visibility based on orphan count
  const orphanN = getOrphanTabs().length;
  const cleanupBtn = $("btn-cleanup");
  if (cleanupBtn) {
    cleanupBtn.style.display = orphanN > 0 ? "" : "none";
    $("orphan-count").textContent = orphanN;
    cleanupBtn.title = `Close ${orphanN} orphan tab(s) (not in any workspace)`;
  }
}

function isWsVisible(ws) {
  const q = (state.search || "").toLowerCase();
  return !q || ws.name.toLowerCase().includes(q);
}
function visibleWorkspaces() {
  return state.workspaces.filter(isWsVisible);
}
function nextVisibleWsIdx(curr, dir) {
  let i = curr;
  while (true) {
    i += dir;
    if (i < 0 || i >= state.workspaces.length) return curr;
    if (isWsVisible(state.workspaces[i])) return i;
  }
}

function renderWorkspaces() {
  const ul = $("workspace-list");
  if (state.workspaces.length === 0) {
    ul.innerHTML = `
      <li class="empty-state">
        <p>WORLD 1-1</p>
        <p class="hint">PRESS <kbd>N</kbd> TO START</p>
      </li>`;
    return;
  }
  // make sure wsIdx points to a visible workspace (or first visible)
  if (!state.workspaces[state.wsIdx] || !isWsVisible(state.workspaces[state.wsIdx])) {
    const firstVisible = state.workspaces.findIndex(isWsVisible);
    state.wsIdx = firstVisible >= 0 ? firstVisible : 0;
  }
  const q = (state.search || "").toLowerCase();
  const dragOk = !q;
  let visibleN = 0;
  ul.innerHTML = state.workspaces
    .map((ws, i) => ({ ws, i }))
    .filter(({ ws }) => isWsVisible(ws))
    .map(({ ws, i }) => {
      visibleN++;
      const isSelected = state.focusPanel === "ws" && i === state.wsIdx;
      const isExpanded = state.expandedWsIds.has(ws.id);
      const num = visibleN <= 9 ? visibleN : "·";
      const urlsHtml = isExpanded
        ? `<ul class="workspace-urls">${ws.urls
            .map((u) => {
              const open = state.tabs.find(
                (t) => normalizeUrl(t.url) === normalizeUrl(u)
              );
              const title = open ? open.title : domainOf(u);
              return `
                <li class="workspace-url ${open ? "open-now" : ""}" data-url="${escapeHtml(u)}" data-ws="${ws.id}">
                  ${faviconImg(open ? tabFaviconUrl(open) : faviconUrl(u))}
                  <span class="url-title">${escapeHtml(title)}</span>
                  <button class="url-remove" data-action="remove-url" data-ws="${ws.id}" data-url="${escapeHtml(u)}">×</button>
                </li>`;
            })
            .join("")}</ul>`
        : "";
      return `
        <li>
          <div class="workspace-item color-${ws.color} ${isSelected ? "selected" : ""}" data-ws="${ws.id}" data-idx="${i}" ${dragOk ? 'draggable="true"' : ""}>
            <span class="ws-num">${num}</span>
            <span class="ws-emoji">${escapeHtml(ws.emoji)}</span>
            <span class="ws-name">${escapeHtml(ws.name)}</span>
            <span class="ws-count">×${ws.urls.length}</span>
          </div>
          ${urlsHtml}
        </li>`;
    })
    .join("");
}

function renderTabs() {
  const ul = $("tab-list");
  let mainHtml;
  if (state.tabs.length === 0) {
    mainHtml = `<li class="empty-state"><p>NO TABS</p></li>`;
  } else {
    const view = state.settings.view;
    if (view === "window") {
      mainHtml = state.windows.map((winId, i) => renderWindowGroup(winId, i)).join("");
    } else if (view === "domain") {
      mainHtml = renderDomainGroups();
    } else {
      mainHtml = renderRecentList();
    }
  }
  ul.innerHTML = mainHtml + renderRecentlyClosedSection();
  // Collect navigable items: regular tabs → recent-section header → (if expanded) recent items
  state.navTabs = [];
  ul.querySelectorAll(".tab-item, .recent-header, .domain-header, .window-header").forEach((el) => {
    if (el.classList.contains("recent-header")) {
      state.navTabs.push({ kind: "recent-header" });
      return;
    }
    if (el.classList.contains("domain-header")) {
      state.navTabs.push({ kind: "domain-header", domain: el.dataset.domain });
      return;
    }
    if (el.classList.contains("window-header")) {
      state.navTabs.push({ kind: "window-header", windowId: parseInt(el.dataset.windowId) });
      return;
    }
    const dupChildren = el.closest(".dup-children");
    if (dupChildren) {
      const grp = dupChildren.parentElement;
      if (!grp.classList.contains("expanded")) return;
    }
    if (el.classList.contains("recent-closed-item")) {
      state.navTabs.push({ kind: "recent", id: el.dataset.sessionId });
    } else if (el.dataset.tabId) {
      state.navTabs.push({ kind: "tab", id: parseInt(el.dataset.tabId) });
    }
  });
  if (state.tabIdx >= state.navTabs.length)
    state.tabIdx = Math.max(0, state.navTabs.length - 1);
  // Apply selected highlight when this panel has focus
  if (state.focusPanel === "tabs" && state.navTabs[state.tabIdx] !== undefined) {
    const sel = state.navTabs[state.tabIdx];
    let selEl;
    if (sel.kind === "recent-header") selEl = ul.querySelector(".recent-header");
    else if (sel.kind === "domain-header") selEl = ul.querySelector(`.domain-header[data-domain="${CSS.escape(sel.domain)}"]`);
    else if (sel.kind === "window-header") selEl = ul.querySelector(`.window-header[data-window-id="${sel.windowId}"]`);
    else if (sel.kind === "recent") selEl = ul.querySelector(`.recent-closed-item[data-session-id="${CSS.escape(sel.id)}"]`);
    else selEl = ul.querySelector(`.tab-item[data-tab-id="${sel.id}"]:not(.recent-closed-item)`);
    if (selEl) {
      selEl.classList.add("selected");
      selEl.scrollIntoView({ block: "nearest" });
    }
  }
}

function renderWindowGroup(winId, i) {
  const tabs = state.tabs.filter((t) => t.windowId === winId);
  const closeAllBtn = tabs.length > 1
    ? `<button class="btn-close-domain" data-action="close-window" data-window-id="${winId}" title="Close all ${tabs.length} tabs in this window">× ALL</button>`
    : "";
  const groups = groupByNormalizedUrl(tabs);
  return `
    <li class="window-group">
      <div class="window-group-header window-header" data-nav="window-header" data-window-id="${winId}" tabindex="0">
        <span>WINDOW ${i + 1} (${tabs.length})</span>
        ${closeAllBtn}
      </div>
      ${groups.map((g) => renderTabGroup(g)).join("")}
    </li>`;
}

async function closeWindowTabs(windowId) {
  const ids = state.tabs
    .filter((t) => t.windowId === windowId && !t.pinned)
    .map((t) => t.id);
  if (ids.length === 0) return;
  await chrome.tabs.remove(ids);
  sfxClose();
  toast(`CLOSED ${ids.length} TABS`);
}

function renderDomainGroups() {
  const byDomain = {};
  for (const t of state.tabs) {
    const d = domainOf(t.url);
    (byDomain[d] = byDomain[d] || []).push(t);
  }
  const sorted = Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length);
  return sorted
    .map(([d, tabs]) => {
      const groups = groupByNormalizedUrl(tabs);
      const closeAllBtn = tabs.length > 1
        ? `<button class="btn-close-domain" data-action="close-domain" data-domain="${escapeHtml(d)}" title="Close all ${tabs.length} tabs from ${escapeHtml(d)}">× ALL</button>`
        : "";
      return `
        <li class="window-group">
          <div class="window-group-header domain-header" data-nav="domain-header" data-domain="${escapeHtml(d)}" tabindex="0">
            <span>${escapeHtml(d.toUpperCase())} (${tabs.length})</span>
            ${closeAllBtn}
          </div>
          ${groups.map((g) => renderTabGroup(g)).join("")}
        </li>`;
    })
    .join("");
}

function renderRecentList() {
  const tabs = [...state.tabs].sort(
    (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0)
  );
  const groups = groupByNormalizedUrl(tabs);
  // No redundant header — the view-toggle button already shows RECENT
  return groups.map((g) => renderTabGroup(g)).join("");
}

function groupByNormalizedUrl(tabs) {
  const map = new Map();
  for (const t of tabs) {
    const key = normalizeUrl(t.url);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return [...map.entries()].map(([key, tabs]) => ({ key, tabs }));
}

function renderTabGroup({ key, tabs }) {
  if (tabs.length === 1) {
    return renderTab(tabs[0], { isDupChild: false });
  }
  const expanded = state.expandedDupKeys.has(key);
  const head = tabs[0];
  return `
    <div class="dup-group ${expanded ? "expanded" : ""}" data-dup-key="${escapeHtml(key)}">
      <div class="tab-item dup-head" data-tab-id="${head.id}" data-dup-toggle="${escapeHtml(key)}">
        ${faviconImg(tabFaviconUrl(head))}
        <span class="tab-title">${escapeHtml(head.title || head.url)} (${tabs.length})</span>
        ${renderWsTag(head) || '<span class="ws-tag-spacer"></span>'}
        <button class="btn-add" data-action="add-tab" data-tab-id="${head.id}" title="Add to workspace">+</button>
        <button class="btn-close" data-action="close-dup" data-dup-key="${escapeHtml(key)}" title="Close all ${tabs.length} duplicates">×${tabs.length}</button>
      </div>
      <div class="dup-children">
        ${tabs.map((t) => renderTab(t, { isDupChild: true })).join("")}
      </div>
    </div>`;
}

function renderTab(t, { isDupChild }) {
  return `
    <div class="tab-item ${isDupChild ? "dup-child" : ""}" data-tab-id="${t.id}">
      ${faviconImg(tabFaviconUrl(t))}
      <span class="tab-title">${escapeHtml(t.title || t.url)}</span>
      ${renderWsTag(t) || '<span class="ws-tag-spacer"></span>'}
      <button class="btn-add" data-action="add-tab" data-tab-id="${t.id}" title="Add to workspace">+</button>
      <button class="btn-close" data-action="close-tab" data-tab-id="${t.id}" title="Close tab">×</button>
    </div>`;
}

function renderWsTag(tab) {
  const ws = findWorkspaceForUrl(normalizeUrl(tab.url));
  if (!ws) return "";
  return `<span class="ws-tag" style="background: var(--coin)" title="${escapeHtml(ws.name)}">${escapeHtml(ws.emoji)} ${escapeHtml(ws.name.slice(0, 8).toUpperCase())}</span>`;
}

function renderRecentlyClosedSection() {
  if (state.recentlyClosed.length === 0) return "";
  const arrow = state.recentExpanded ? "▼" : "▶";
  const items = state.recentExpanded
    ? state.recentlyClosed.map(renderRecentClosedItem).join("")
    : "";
  return `
    <li class="window-group recently-closed-group">
      <div class="window-group-header recent-header" data-action="toggle-recent" data-nav="recent-header" role="button" tabindex="0">
        ${arrow} RECENTLY CLOSED (${state.recentlyClosed.length})
      </div>
      ${items}
    </li>`;
}

function renderRecentClosedItem(session) {
  if (session.window) {
    const w = session.window;
    const firstTab = w.tabs?.[0];
    const title = firstTab?.title || "Window";
    const count = w.tabs?.length || 1;
    const fav = firstTab ? tabFaviconUrl(firstTab) : "";
    return `
      <div class="tab-item recent-closed-item" data-action="restore" data-session-id="${escapeHtml(w.sessionId)}">
        ${faviconImg(fav)}
        <span class="tab-title">🪟 ${escapeHtml(title)} <span class="recent-meta">(${count} tabs)</span></span>
        <span class="restore-icon">↻</span>
      </div>`;
  }
  const t = session.tab;
  if (!t) return "";
  return `
    <div class="tab-item recent-closed-item" data-action="restore" data-session-id="${escapeHtml(t.sessionId)}">
      ${faviconImg(tabFaviconUrl(t))}
      <span class="tab-title">${escapeHtml(t.title || t.url)}</span>
      <span class="restore-icon">↻</span>
    </div>`;
}

// ============================================================
// TOAST + MODAL
// ============================================================

let toastTimer = null;
function toast(msg, ms = 1800) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), ms);
}

function showModal({ title, bodyHtml, onConfirm, confirmText = "OK", hideCancel = false }) {
  $("modal-title").textContent = title;
  $("modal-body").innerHTML = bodyHtml;
  $("modal-confirm").textContent = confirmText;
  $("modal-cancel").style.display = hideCancel ? "none" : "";
  $("modal-backdrop").classList.remove("hidden");
  modalState.onConfirm = onConfirm;
  // Priority for initial focus: text input first (user starts typing), else nav-roving item, else CONFIRM
  // (CONFIRM as default so Enter immediately performs the action the user requested by opening the modal)
  setTimeout(() => {
    // Skip inputs explicitly opted out of tab focus (e.g. checkboxes inside
    // setupListNavigation rows) — otherwise focus lands on them instead of
    // the navigable row, and keyboard nav (arrows / Space / Enter) breaks.
    const input = $("modal-body").querySelector(
      'input:not([tabindex="-1"]), textarea:not([tabindex="-1"])'
    );
    if (input) { input.focus(); return; }
    const navTarget = $("modal-body").querySelector('[tabindex="0"]');
    if (navTarget) { navTarget.focus(); return; }
    $("modal-confirm").focus();
  }, 50);
}

// Focus trap: Tab key cycles within the open modal instead of escaping to the page.
// offsetParent !== null filters out display:none elements (e.g. CANCEL when
// hideCancel is set) — without it Tab would seem to "skip a step" past hidden items.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const backdrop = $("modal-backdrop");
  if (!backdrop || backdrop.classList.contains("hidden")) return;
  const focusables = [...backdrop.querySelectorAll(
    'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]'
  )].filter((el) => el.offsetParent !== null);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && active === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && active === last) {
    first.focus();
    e.preventDefault();
  }
});

function closeModal() {
  $("modal-backdrop").classList.add("hidden");
  modalState.onConfirm = null;
}

const modalState = { onConfirm: null };

$("modal-cancel").addEventListener("click", closeModal);
$("modal-backdrop").addEventListener("click", (e) => {
  if (e.target === $("modal-backdrop")) closeModal();
});
$("modal-confirm").addEventListener("click", () => {
  if (modalState.onConfirm) modalState.onConfirm();
});

// ============================================================
// WORKSPACE CRUD
// ============================================================

function workspaceFormHtml(ws = { name: "", emoji: "🍄", color: "red" }) {
  return `
    <div class="field">
      <label>NAME</label>
      <input type="text" id="ws-name-input" value="${escapeHtml(ws.name)}" maxlength="32" placeholder="e.g. BQ Research">
    </div>
    <div class="field">
      <label>EMOJI</label>
      <div class="emoji-grid" id="emoji-grid">
        ${WS_EMOJIS.map((e) => `<button type="button" data-emoji="${escapeHtml(e)}" class="${e === ws.emoji ? "selected" : ""}">${e}</button>`).join("")}
      </div>
    </div>
    <div class="field">
      <label>COLOR</label>
      <div class="color-grid" id="color-grid">
        ${WS_COLORS.map((c) => `<div class="color-swatch color-${c} ${c === ws.color ? "selected" : ""}" data-color="${c}"></div>`).join("")}
      </div>
    </div>
    <p style="font-size: 14px; color: var(--brick-dk); margin-top: -4px;">
      Tab between sections · ← → ↑ ↓ navigate · Space picks · Enter saves
    </p>
  `;
}

function attachWorkspaceFormHandlers(initial) {
  const sel = { ...initial };
  $("emoji-grid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-emoji]");
    if (!btn) return;
    $("emoji-grid").querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
    btn.classList.add("selected");
    sel.emoji = btn.dataset.emoji;
  });
  $("color-grid").addEventListener("click", (e) => {
    const sw = e.target.closest("[data-color]");
    if (!sw) return;
    $("color-grid").querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
    sw.classList.add("selected");
    sel.color = sw.dataset.color;
  });
  setupGridNavigation($("emoji-grid"), "[data-emoji]", 8);
  setupGridNavigation($("color-grid"), "[data-color]", 8);
  return sel;
}

// Roving-tabindex helper: arrow keys move focus within a grid container.
// Selector matches the navigable items. cols is how many per row.
function setupGridNavigation(container, itemSelector, cols) {
  if (!container) return;
  const items = [...container.querySelectorAll(itemSelector)];
  if (items.length === 0) return;
  let selectedIdx = items.findIndex((it) => it.classList.contains("selected"));
  if (selectedIdx < 0) selectedIdx = 0;
  items.forEach((item, i) => {
    item.tabIndex = i === selectedIdx ? 0 : -1;
  });
  container.addEventListener("keydown", (e) => {
    const cur = items.indexOf(document.activeElement);
    if (cur < 0) return;
    let next = cur;
    switch (e.key) {
      case "ArrowLeft":  next = Math.max(0, cur - 1); break;
      case "ArrowRight": next = Math.min(items.length - 1, cur + 1); break;
      case "ArrowUp":    next = Math.max(0, cur - cols); break;
      case "ArrowDown":  next = Math.min(items.length - 1, cur + cols); break;
      case " ":
        items[cur].click();
        e.preventDefault();
        e.stopPropagation();
        return;
      case "Enter":
        // Enter inside the grid submits the whole modal (Space is for selecting)
        e.preventDefault();
        e.stopPropagation();
        $("modal-confirm").click();
        return;
      default:
        return;
    }
    if (next !== cur) {
      items[cur].tabIndex = -1;
      items[next].tabIndex = 0;
      items[next].focus();
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

// Vertical list nav (for bookmark / workspace pick lists): up/down + space toggles
function setupListNavigation(container, itemSelector) {
  if (!container) return;
  const items = [...container.querySelectorAll(itemSelector)];
  if (items.length === 0) return;
  items.forEach((it, i) => {
    it.tabIndex = i === 0 ? 0 : -1;
    // children inside the row shouldn't steal keyboard focus
    it.querySelectorAll("input, button, select").forEach((c) => (c.tabIndex = -1));
  });
  container.addEventListener("keydown", (e) => {
    const cur = items.indexOf(document.activeElement);
    // 1-9 numeric accelerator: jump to + toggle the Nth row (matches the
    // visible row number rendered by ws-pick-list / bookmark wizard).
    if (/^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key) - 1;
      if (items[idx]) {
        items[idx].click();
        if (cur >= 0) items[cur].tabIndex = -1;
        items[idx].tabIndex = 0;
        items[idx].focus();
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (cur < 0) return;
    let next = cur;
    if (e.key === "ArrowDown") next = Math.min(items.length - 1, cur + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, cur - 1);
    else if (e.key === " ") {
      items[cur].click();
      e.preventDefault();
      e.stopPropagation();
      return;
    } else if (e.key === "Enter") {
      // Enter submits the modal (Space is for selecting/toggling)
      e.preventDefault();
      e.stopPropagation();
      $("modal-confirm").click();
      return;
    } else return;
    if (next !== cur) {
      items[cur].tabIndex = -1;
      items[next].tabIndex = 0;
      items[next].focus();
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

// seedUrls pre-fills the new workspace's URLs (e.g. "add this tab to a brand
// new workspace"); defaultName pre-fills the NAME field (still editable).
function openNewWorkspaceModal({ seedUrls = [], defaultName = "" } = {}) {
  const initial = { name: defaultName, emoji: "🍄", color: "red" };
  showModal({
    title: "NEW WORKSPACE",
    bodyHtml: workspaceFormHtml(initial),
    confirmText: "CREATE",
    onConfirm: async () => {
      const name = $("ws-name-input").value.trim();
      if (!name) { toast("NAME REQUIRED"); return; }
      const ws = {
        id: uid(),
        name,
        emoji: sel.emoji,
        color: sel.color,
        urls: [...seedUrls],
        createdAt: Date.now(),
      };
      state.workspaces.push(ws);
      await saveWorkspaces();
      closeModal();
      sfxOneUp();
      toast(seedUrls.length
        ? `1-UP! ${ws.emoji} ${ws.name} +${seedUrls.length} ★`
        : `1-UP! ${ws.emoji} ${ws.name}`);
      render();
    },
  });
  const sel = attachWorkspaceFormHandlers(initial);
}

function openEditWorkspaceModal(idx) {
  const ws = state.workspaces[idx];
  if (!ws) return;
  const initial = { name: ws.name, emoji: ws.emoji, color: ws.color };
  showModal({
    title: "EDIT WORKSPACE",
    bodyHtml: workspaceFormHtml(initial),
    confirmText: "SAVE",
    onConfirm: async () => {
      ws.name = $("ws-name-input").value.trim() || ws.name;
      ws.emoji = sel.emoji;
      ws.color = sel.color;
      await saveWorkspaces();
      closeModal();
      render();
    },
  });
  const sel = attachWorkspaceFormHandlers(initial);
}

function openDeleteWorkspaceModal(idx) {
  const ws = state.workspaces[idx];
  if (!ws) return;
  showModal({
    title: "GAME OVER?",
    bodyHtml: `<p style="text-align:center; padding: 20px; font-size: 20px;">
      DELETE <strong>${escapeHtml(ws.emoji)} ${escapeHtml(ws.name)}</strong>?
      <br><br>
      <span style="font-family: 'Press Start 2P', monospace; font-size: 10px; color: var(--red);">
        (${ws.urls.length} URLs)
      </span>
    </p>`,
    confirmText: "DELETE",
    onConfirm: async () => {
      state.workspaces.splice(idx, 1);
      if (state.wsIdx >= state.workspaces.length) state.wsIdx = Math.max(0, state.workspaces.length - 1);
      await saveWorkspaces();
      closeModal();
      sfxError();
      toast("DELETED");
      render();
    },
  });
}

// ============================================================
// TAB OPS
// ============================================================

async function addTabToWorkspace(tabId) {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return;
  // No workspaces yet → skip the picker and go straight to creating one,
  // seeded with this tab (name pre-filled with its domain, still editable).
  if (state.workspaces.length === 0) {
    openNewWorkspaceModal({ seedUrls: [tab.url], defaultName: domainOf(tab.url) });
    return;
  }
  showModal({
    title: "ADD TO WORKSPACE",
    bodyHtml: `
      <p style="margin-bottom:12px; font-size:18px;">${escapeHtml(tab.title || tab.url)}</p>
      <button type="button" class="btn-new-ws-inline" id="ws-pick-new">➕ NEW WORKSPACE…</button>
      <div class="field">
        <label>OR ADD TO EXISTING</label>
        <div id="ws-pick-list">
          ${state.workspaces
            .map((ws, i) => `
              <div class="bookmark-folder" data-ws-id="${ws.id}">
                <input type="checkbox">
                <span class="folder-name">${escapeHtml(ws.emoji)} ${escapeHtml(ws.name)}</span>
                <span class="folder-count">${i < 9 ? i + 1 : ""}</span>
              </div>`).join("")}
        </div>
      </div>`,
    confirmText: "ADD",
    onConfirm: async () => {
      const picks = [...$("ws-pick-list").querySelectorAll(".bookmark-folder.selected")];
      if (picks.length === 0) { toast("PICK ONE"); return; }
      const normUrl = normalizeUrl(tab.url);
      for (const el of picks) {
        const ws = state.workspaces.find((w) => w.id === el.dataset.wsId);
        if (ws && !ws.urls.some((u) => normalizeUrl(u) === normUrl)) {
          ws.urls.push(tab.url);
        }
      }
      await saveWorkspaces();
      closeModal();
      sfxCoin();
      toast(`+${picks.length} ★`);
      render();
    },
  });
  // "➕ NEW WORKSPACE" → swap to the create flow, seeded with this tab.
  $("ws-pick-new").addEventListener("click", () => {
    closeModal();
    openNewWorkspaceModal({ seedUrls: [tab.url], defaultName: domainOf(tab.url) });
  });
  // toggle selection on click
  $("ws-pick-list").addEventListener("click", (e) => {
    const row = e.target.closest(".bookmark-folder");
    if (!row) return;
    row.classList.toggle("selected");
    row.querySelector("input").checked = row.classList.contains("selected");
  });
  setupListNavigation($("ws-pick-list"), ".bookmark-folder");
}

function switchToWorkspace(wsId) {
  const ws = state.workspaces.find((w) => w.id === wsId);
  if (!ws) return;
  const wsUrls = new Set(ws.urls.map(normalizeUrl));
  const others = state.tabs.filter((t) => {
    if (t.pinned) return false;
    return !wsUrls.has(normalizeUrl(t.url));
  });
  if (others.length === 0) {
    openWorkspace(wsId);
    return;
  }
  showModal({
    title: `SWITCH TO ${ws.emoji} ${ws.name.toUpperCase()}?`,
    bodyHtml: `
      <p style="text-align:center; padding:10px 0; font-size:18px;">
        Close <strong>${others.length}</strong> other tab(s) and open this workspace?
      </p>
      <p style="text-align:center; font-size:14px; color: var(--brick-dk); margin-bottom:8px;">
        (Pinned tabs are kept · Restorable from RECENTLY CLOSED)
      </p>
      <div style="max-height:25vh; overflow-y:auto; font-size:14px; padding:4px 8px;">
        ${others.map((t) => `<div style="opacity:0.8;">· ${escapeHtml((t.title || t.url).slice(0, 70))}</div>`).join("")}
      </div>`,
    confirmText: `CLOSE & OPEN`,
    onConfirm: async () => {
      await chrome.tabs.remove(others.map((t) => t.id));
      closeModal();
      await openWorkspace(wsId);
    },
  });
}

async function openWorkspace(wsId) {
  const ws = state.workspaces.find((w) => w.id === wsId);
  if (!ws || ws.urls.length === 0) {
    toast("EMPTY WORKSPACE");
    return;
  }
  const win = await chrome.windows.getCurrent();
  const allTabs = await chrome.tabs.query({});
  const tabIds = [];
  for (const url of ws.urls) {
    const norm = normalizeUrl(url);
    const existing = allTabs.find((t) => normalizeUrl(t.url) === norm);
    if (existing) {
      tabIds.push(existing.id);
    } else {
      const newTab = await chrome.tabs.create({ url, windowId: win.id, active: false });
      tabIds.push(newTab.id);
    }
  }
  try {
    const groupId = await chrome.tabs.group({
      tabIds,
      createProperties: { windowId: win.id },
    });
    await chrome.tabGroups.update(groupId, {
      title: `${ws.emoji} ${ws.name}`,
      color: CHROME_TG_COLORS[ws.color] || "grey",
    });
  } catch (err) {
    console.warn("group failed", err);
  }
  sfxPipe();
  toast(`STARTED ${ws.emoji} ${ws.name}`);
}

async function openSingleUrl(url) {
  const norm = normalizeUrl(url);
  const allTabs = await chrome.tabs.query({});
  const existing = allTabs.find((t) => normalizeUrl(t.url) === norm);
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    const win = await chrome.windows.getCurrent();
    await chrome.tabs.create({ url, windowId: win.id });
  }
}

async function jumpToTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

async function closeTab(tabId) {
  await chrome.tabs.remove(tabId);
  sfxClose();
}

async function closeDupGroup(key) {
  const ids = state.tabs
    .filter((t) => normalizeUrl(t.url) === key)
    .map((t) => t.id);
  if (ids.length === 0) return;
  await chrome.tabs.remove(ids);
  sfxClose();
  toast(`CLOSED ${ids.length} TABS`);
}

async function closeDomainTabs(domain) {
  const ids = state.tabs
    .filter((t) => domainOf(t.url) === domain && !t.pinned)
    .map((t) => t.id);
  if (ids.length === 0) return;
  await chrome.tabs.remove(ids);
  sfxClose();
  toast(`CLOSED ${ids.length} TABS FROM ${domain.toUpperCase()}`);
}

function getOrphanTabs() {
  return state.tabs.filter((t) => {
    if (t.pinned) return false;
    const norm = normalizeUrl(t.url);
    return !state.workspaces.some((ws) =>
      ws.urls.some((u) => normalizeUrl(u) === norm)
    );
  });
}

async function closeOrphanTabs() {
  const orphans = getOrphanTabs();
  if (orphans.length === 0) {
    toast("NO ORPHAN TABS");
    return;
  }
  showModal({
    title: "CLEAN UP ORPHAN TABS?",
    bodyHtml: `
      <p style="text-align:center; padding: 12px; font-size:18px;">
        Close <strong>${orphans.length}</strong> tab(s) that aren't part of any workspace?
      </p>
      <p style="text-align:center; font-size:14px; color: var(--brick-dk);">
        (Pinned tabs are kept · You can restore them from RECENTLY CLOSED)
      </p>
      <div style="max-height: 30vh; overflow-y: auto; margin-top: 10px;">
        ${orphans.map((t) => `
          <div style="font-size:14px; padding: 2px 6px; opacity: 0.8;">
            • ${escapeHtml((t.title || t.url).slice(0, 60))}
          </div>
        `).join("")}
      </div>`,
    confirmText: `CLOSE ${orphans.length}`,
    onConfirm: async () => {
      await chrome.tabs.remove(orphans.map((t) => t.id));
      closeModal();
      sfxClose();
      toast(`CLOSED ${orphans.length} ORPHAN TABS`);
    },
  });
}

async function removeUrlFromWorkspace(wsId, url) {
  const ws = state.workspaces.find((w) => w.id === wsId);
  if (!ws) return;
  ws.urls = ws.urls.filter((u) => u !== url);
  await saveWorkspaces();
  render();
}

// ============================================================
// EVENT WIRING
// ============================================================

$("btn-new-workspace").addEventListener("click", () => openNewWorkspaceModal());
$("btn-help").addEventListener("click", openHelpModal);
$("btn-theme").addEventListener("click", toggleTheme);
$("btn-sound").addEventListener("click", toggleSound);
$("btn-cleanup").addEventListener("click", closeOrphanTabs);

// Workspace search
$("workspace-search").addEventListener("input", (e) => {
  state.search = e.target.value;
  render();
});
$("workspace-search").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.target.value = "";
    state.search = "";
    e.target.blur();
    render();
    e.stopPropagation();
  }
  if (e.key === "Enter") {
    // open first visible workspace
    const first = visibleWorkspaces()[0];
    if (first) {
      state.wsIdx = state.workspaces.findIndex((w) => w.id === first.id);
      openWorkspace(first.id);
    }
    e.target.blur();
    e.preventDefault();
  }
});

// Drag-and-drop reorder (delegated)
let _dragSrcIdx = null;
const wsListEl = $("workspace-list");
wsListEl.addEventListener("dragstart", (e) => {
  const item = e.target.closest(".workspace-item");
  if (!item || !item.draggable) return;
  _dragSrcIdx = parseInt(item.dataset.idx);
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(_dragSrcIdx));
  item.classList.add("dragging");
});
wsListEl.addEventListener("dragend", () => {
  wsListEl.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
  wsListEl.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
});
wsListEl.addEventListener("dragover", (e) => {
  const item = e.target.closest(".workspace-item");
  if (!item || _dragSrcIdx === null) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  wsListEl.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  item.classList.add("drag-over");
});
wsListEl.addEventListener("drop", async (e) => {
  e.preventDefault();
  const item = e.target.closest(".workspace-item");
  if (!item || _dragSrcIdx === null) return;
  const targetIdx = parseInt(item.dataset.idx);
  if (_dragSrcIdx !== targetIdx) {
    const [moved] = state.workspaces.splice(_dragSrcIdx, 1);
    state.workspaces.splice(targetIdx, 0, moved);
    // keep selection on the moved workspace
    state.wsIdx = targetIdx;
    await saveWorkspaces();
    sfxBlip();
    render();
  }
  _dragSrcIdx = null;
});

function openHelpModal() {
  showModal({
    title: "HOW TO PLAY",
    bodyHtml: `
      <div class="help-section">
        <h3>★ WORKSPACES (LEFT PANEL)</h3>
        <p>Save groups of URLs that belong together (project, mode, etc).
        Press <strong>Enter</strong> on one to open all its URLs at once as a Chrome tab group.</p>
      </div>

      <div class="help-section">
        <h3>★ TAB PANEL (RIGHT)</h3>
        <p>Live list of every tab you have open right now. Three views: by Chrome
        window, by website domain (all Notion tabs together), or sorted by recent use.
        Identical URLs collapse into a group you can expand. At the bottom there's
        a <strong>RECENTLY CLOSED ▶</strong> section — click the header to expand, then click any item
        to restore it (also reachable by arrow-down + Enter).</p>
      </div>

      <div class="help-section">
        <h3>★ KEYBOARD</h3>
        <div class="help-keys">
          <span class="k">↑ ↓</span><span>Move selection up/down</span>
          <span class="k">← →</span><span>Switch between panels</span>
          <span class="k">Enter</span><span>Open workspace / Jump to tab</span>
          <span class="k">⇧Enter</span><span>SWITCH to workspace (close other tabs first)</span>
          <span class="k">a</span><span>Add the selected tab to a workspace (or a brand-new one)</span>
          <span class="k">x / ⌫</span><span>Close the selected tab (or all duplicates if it's a group head)</span>
          <span class="k">1 – 9</span><span>Quick-open workspace #1–9</span>
          <span class="k">n</span><span>New workspace</span>
          <span class="k">r</span><span>Rename selected workspace</span>
          <span class="k">d / ⌫</span><span>Delete selected workspace</span>
          <span class="k">v</span><span>Cycle tab-list view (window / site / recent) · Tab also works</span>
          <span class="k">/</span><span>Focus workspace search</span>
          <span class="k">?</span><span>Show this help</span>
          <span class="k">Esc</span><span>Close any popup / clear search</span>
        </div>
        <p style="margin-top: 8px; font-size: 15px; color: var(--brick-dk);">
          Tip: <kbd style="font-size:8px">hjkl</kbd> (vim keys) also work if you're into that.
        </p>
      </div>

      <div class="help-section">
        <h3>★ MOUSE</h3>
        <ul>
          <li>· Click a workspace to expand its URL list</li>
          <li>· Double-click a workspace to open all its tabs</li>
          <li>· <strong>+</strong> button on a tab — add to workspace</li>
          <li>· <strong>×</strong> button on a tab — close it</li>
          <li>· <strong>×N</strong> on a duplicate group — close all duplicates at once</li>
          <li>· <strong>× ALL</strong> on a BY SITE domain header — close every tab from that site</li>
          <li>· <strong>🗑️ N</strong> button in top bar (only when N > 0) — close all orphan tabs not in any workspace</li>
        </ul>
      </div>

      <div class="help-section">
        <h3>★ TIPS &amp; TRICKS</h3>
        <ul>
          <li>· Closed a tab by mistake? <kbd style="font-size:8px">Cmd+Shift+T</kbd> restores it</li>
          <li>· Jump back here anytime: <kbd style="font-size:8px">Ctrl+W</kbd> (or <kbd style="font-size:8px">Cmd+1</kbd> since this tab is pinned)</li>
          <li>· Change the hotkey at <em>chrome://extensions/shortcuts</em></li>
          <li>· Opening a workspace re-uses tabs you already have open (no dupes)</li>
          <li>· URLs are matched ignoring <em>#hash</em> and <em>?query</em> params</li>
          <li>· Drag a workspace card to reorder (only when search is empty)</li>
          <li>· 🌙 / ☀️ / 🌗 cycles theme (light / dark / auto-follow-system) · 🔊 / 🔇 toggles sound</li>
        </ul>
      </div>

      <div class="help-section">
        <h3>★ EASTER EGGS</h3>
        <p>Click <strong>TABSTAT?ON</strong> logo 5 times in a row,
        or type the Konami code: <kbd style="font-size:8px">↑↑↓↓←→←→BA</kbd></p>
      </div>
    `,
    confirmText: "GOT IT",
    onConfirm: closeModal,
    hideCancel: true,
  });
}

// View toggle
document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.settings.view = btn.dataset.view;
    await saveSettings();
    render();
  });
});

// Workspace panel clicks (delegated)
$("workspace-list").addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-action='remove-url']");
  if (removeBtn) {
    removeUrlFromWorkspace(removeBtn.dataset.ws, removeBtn.dataset.url);
    e.stopPropagation();
    return;
  }
  const urlEl = e.target.closest(".workspace-url");
  if (urlEl) {
    openSingleUrl(urlEl.dataset.url);
    return;
  }
  const wsEl = e.target.closest(".workspace-item");
  if (wsEl) {
    const idx = parseInt(wsEl.dataset.idx);
    state.focusPanel = "ws";
    state.wsIdx = idx;
    // toggle expansion
    const ws = state.workspaces[idx];
    if (state.expandedWsIds.has(ws.id)) state.expandedWsIds.delete(ws.id);
    else state.expandedWsIds.add(ws.id);
    render();
  }
});

// Workspace double-click → open
$("workspace-list").addEventListener("dblclick", (e) => {
  const wsEl = e.target.closest(".workspace-item");
  if (wsEl) openWorkspace(wsEl.dataset.ws);
});

// Tab list clicks
$("tab-list").addEventListener("click", (e) => {
  // Toggle recently-closed section
  if (e.target.closest("[data-action='toggle-recent']")) {
    state.recentExpanded = !state.recentExpanded;
    render();
    return;
  }
  // Restore a recently-closed session
  const restoreEl = e.target.closest("[data-action='restore']");
  if (restoreEl) {
    restoreSession(restoreEl.dataset.sessionId);
    e.stopPropagation();
    return;
  }
  const addBtn = e.target.closest("[data-action='add-tab']");
  if (addBtn) {
    addTabToWorkspace(parseInt(addBtn.dataset.tabId));
    e.stopPropagation();
    return;
  }
  const closeDupBtn = e.target.closest("[data-action='close-dup']");
  if (closeDupBtn) {
    closeDupGroup(closeDupBtn.dataset.dupKey);
    e.stopPropagation();
    return;
  }
  const closeDomainBtn = e.target.closest("[data-action='close-domain']");
  if (closeDomainBtn) {
    closeDomainTabs(closeDomainBtn.dataset.domain);
    e.stopPropagation();
    return;
  }
  const closeWindowBtn = e.target.closest("[data-action='close-window']");
  if (closeWindowBtn) {
    closeWindowTabs(parseInt(closeWindowBtn.dataset.windowId));
    e.stopPropagation();
    return;
  }
  const closeBtn = e.target.closest("[data-action='close-tab']");
  if (closeBtn) {
    closeTab(parseInt(closeBtn.dataset.tabId));
    e.stopPropagation();
    return;
  }
  const dupToggle = e.target.closest("[data-dup-toggle]");
  if (dupToggle) {
    const key = dupToggle.dataset.dupToggle;
    if (state.expandedDupKeys.has(key)) state.expandedDupKeys.delete(key);
    else state.expandedDupKeys.add(key);
    render();
    return;
  }
  const tabEl = e.target.closest(".tab-item");
  if (tabEl) {
    jumpToTab(parseInt(tabEl.dataset.tabId));
  }
});

// Chrome tab events → refresh
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
const refreshAndRender = debounce(async () => {
  await refreshTabs();
  await refreshRecentlyClosed();
  render();
}, 150);

chrome.tabs.onCreated.addListener(refreshAndRender);
chrome.tabs.onRemoved.addListener(refreshAndRender);
chrome.tabs.onUpdated.addListener(refreshAndRender);
chrome.tabs.onMoved.addListener(refreshAndRender);
chrome.tabs.onActivated.addListener(refreshAndRender);
chrome.windows.onCreated?.addListener(refreshAndRender);
chrome.windows.onRemoved?.addListener(refreshAndRender);

// ============================================================
// KEYBOARD
// ============================================================

document.addEventListener("keydown", (e) => {
  // Konami tracking is always live (even when typing or in modals)
  if (checkKonami(e.key)) {
    launchYoshiGame();
    e.preventDefault();
    return;
  }
  // If easter egg game is open, let its own handler take over
  if (!$("game-overlay").classList.contains("hidden")) {
    return;
  }
  // ignore when typing in an input
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter" && e.target.id === "ws-name-input") {
      e.preventDefault();
      $("modal-confirm").click();
    }
    return;
  }
  // modal is open
  if (!$("modal-backdrop").classList.contains("hidden")) {
    if (e.key === "Escape") { closeModal(); e.preventDefault(); }
    return;
  }

  const k = e.key;

  // Global digit shortcut — opens Nth VISIBLE workspace (matters when searching)
  if (/^[1-9]$/.test(k)) {
    const idx = parseInt(k) - 1;
    const visible = visibleWorkspaces();
    if (visible[idx]) {
      const ws = visible[idx];
      state.wsIdx = state.workspaces.findIndex((w) => w.id === ws.id);
      openWorkspace(ws.id);
      render();
    }
    e.preventDefault();
    return;
  }

  // Global keys
  if (k === "?" || (k === "/" && e.shiftKey)) { openHelpModal(); e.preventDefault(); return; }
  if (k === "/" && !e.shiftKey) { $("workspace-search").focus(); $("workspace-search").select(); e.preventDefault(); return; }
  if (k === "n") { openNewWorkspaceModal(); e.preventDefault(); return; }
  if (k === "r" && state.focusPanel === "ws" && state.workspaces[state.wsIdx]) {
    openEditWorkspaceModal(state.wsIdx);
    e.preventDefault();
    return;
  }
  if ((k === "d" || k === "Backspace") && state.focusPanel === "ws" && state.workspaces[state.wsIdx]) {
    openDeleteWorkspaceModal(state.wsIdx);
    e.preventDefault();
    return;
  }

  // Navigation
  if (k === "h" || k === "ArrowLeft") {
    state.focusPanel = "ws";
    render();
    e.preventDefault();
    return;
  }
  if (k === "l" || k === "ArrowRight") {
    if (state.focusPanel !== "tabs") state.tabIdx = 0;
    state.focusPanel = "tabs";
    render();
    e.preventDefault();
    return;
  }
  if (k === "j" || k === "ArrowDown") {
    if (state.focusPanel === "ws") {
      state.wsIdx = nextVisibleWsIdx(state.wsIdx, +1);
    } else {
      state.tabIdx = Math.min(state.navTabs.length - 1, state.tabIdx + 1);
    }
    render();
    e.preventDefault();
    return;
  }
  if (k === "k" || k === "ArrowUp") {
    if (state.focusPanel === "ws") {
      state.wsIdx = nextVisibleWsIdx(state.wsIdx, -1);
    } else {
      state.tabIdx = Math.max(0, state.tabIdx - 1);
    }
    render();
    e.preventDefault();
    return;
  }
  if (k === "Enter") {
    if (state.focusPanel === "ws" && state.workspaces[state.wsIdx]) {
      const ws = state.workspaces[state.wsIdx];
      if (e.shiftKey) switchToWorkspace(ws.id);
      else openWorkspace(ws.id);
      e.preventDefault();
      return;
    }
    if (state.focusPanel === "tabs" && state.navTabs[state.tabIdx] !== undefined) {
      const sel = state.navTabs[state.tabIdx];
      if (sel.kind === "recent-header") {
        const wasCollapsed = !state.recentExpanded;
        state.recentExpanded = !state.recentExpanded;
        render();
        if (wasCollapsed) state.tabIdx++; // move into first recent item on expand
        render();
      } else if (sel.kind === "domain-header") {
        closeDomainTabs(sel.domain);
      } else if (sel.kind === "window-header") {
        closeWindowTabs(sel.windowId);
      } else if (sel.kind === "recent") {
        restoreSession(sel.id);
      } else {
        jumpToTab(sel.id);
      }
      e.preventDefault();
      return;
    }
  }
  if (k === "a" && state.focusPanel === "tabs" && state.navTabs[state.tabIdx] !== undefined) {
    const sel = state.navTabs[state.tabIdx];
    if (sel.kind === "tab") addTabToWorkspace(sel.id);
    e.preventDefault();
    return;
  }
  if ((k === "x" || k === "Backspace") && state.focusPanel === "tabs" && state.navTabs[state.tabIdx] !== undefined) {
    const sel = state.navTabs[state.tabIdx];
    if (sel.kind !== "tab") { e.preventDefault(); return; }
    const tabId = sel.id;
    // If this tab is a dup-head and the group is collapsed, close all duplicates
    const tabEl = $("tab-list").querySelector(`.tab-item[data-tab-id="${tabId}"]:not(.recent-closed-item)`);
    if (tabEl && tabEl.classList.contains("dup-head")) {
      const group = tabEl.closest(".dup-group");
      if (group && !group.classList.contains("expanded")) {
        closeDupGroup(group.dataset.dupKey);
        e.preventDefault();
        return;
      }
    }
    closeTab(tabId);
    e.preventDefault();
    return;
  }
  if ((k === "Tab" && !e.shiftKey) || k === "v" || k === "V") {
    // Cycle tab-list view: window → domain → recent → window
    const views = ["window", "domain", "recent"];
    const cur = views.indexOf(state.settings.view);
    const next = views[(cur + 1) % views.length];
    state.settings.view = next;
    document.querySelectorAll(".view-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === next);
    });
    saveSettings();
    render();
    e.preventDefault();
    return;
  }
});

// ============================================================
// FIRST-LAUNCH: BOOKMARK IMPORT WIZARD
// ============================================================

async function getBookmarkFolders() {
  const tree = await chrome.bookmarks.getTree();
  const folders = [];
  function walk(node, path) {
    if (!node.children) return;
    const urlChildren = node.children.filter((c) => c.url);
    if (urlChildren.length > 0 && node.title) {
      folders.push({
        id: node.id,
        path: path.join(" / "),
        name: node.title,
        urls: urlChildren.map((c) => ({ url: c.url, title: c.title })),
      });
    }
    for (const c of node.children) {
      if (c.children) walk(c, [...path, c.title]);
    }
  }
  for (const root of tree) walk(root, []);
  return folders;
}

async function openBookmarkImportWizard(folders) {
  showModal({
    title: "IMPORT FROM BOOKMARKS",
    bodyHtml: `
      <p style="margin-bottom:12px; font-size:18px;">
        Found ${folders.length} bookmark folder(s). Pick which to import as workspaces.
      </p>
      <div id="bmk-folders" style="max-height: 50vh; overflow-y: auto;">
        ${folders
          .map((f, i) => `
            <div class="bookmark-folder" data-folder-id="${escapeHtml(f.id)}">
              <input type="checkbox">
              <span class="folder-name">${escapeHtml(f.path || f.name)}</span>
              <span class="folder-count">×${f.urls.length}</span>
            </div>`).join("")}
      </div>
      <p style="margin-top:12px; font-size:14px; color: var(--brick-dk);">
        Tip: each folder becomes one workspace with a random Mario emoji.
      </p>`,
    confirmText: "IMPORT",
    onConfirm: async () => {
      const picks = [...$("bmk-folders").querySelectorAll(".bookmark-folder.selected")];
      const pickedFolders = picks
        .map((el) => folders.find((f) => f.id === el.dataset.folderId))
        .filter(Boolean);
      let added = 0;
      for (const f of pickedFolders) {
        const emoji = WS_EMOJIS[Math.floor(Math.random() * WS_EMOJIS.length)];
        const color = WS_COLORS[Math.floor(Math.random() * WS_COLORS.length)];
        state.workspaces.push({
          id: uid(),
          name: f.name,
          emoji,
          color,
          urls: f.urls.map((u) => u.url),
          createdAt: Date.now(),
        });
        added++;
      }
      state.settings.firstLaunchDone = true;
      await saveWorkspaces();
      await saveSettings();
      closeModal();
      toast(`IMPORTED ${added} WORKSPACE(S)`);
      render();
    },
  });
  $("bmk-folders").addEventListener("click", (e) => {
    const row = e.target.closest(".bookmark-folder");
    if (!row) return;
    row.classList.toggle("selected");
    row.querySelector("input").checked = row.classList.contains("selected");
  });
  setupListNavigation($("bmk-folders"), ".bookmark-folder");
  // also override cancel: mark first launch done so it doesn't pop up again
  $("modal-cancel").addEventListener("click", async () => {
    state.settings.firstLaunchDone = true;
    await saveSettings();
  }, { once: true });
}

async function maybeRunFirstLaunch() {
  if (state.settings.firstLaunchDone) return;
  try {
    const folders = await getBookmarkFolders();
    if (folders.length > 0) {
      openBookmarkImportWizard(folders);
    } else {
      state.settings.firstLaunchDone = true;
      await saveSettings();
    }
  } catch (err) {
    console.warn("bookmark import failed", err);
    state.settings.firstLaunchDone = true;
    await saveSettings();
  }
}

// ============================================================
// EASTER EGG: YOSHI'S APPLE GARDEN
// ============================================================

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];
let _konamiIdx = 0;
function checkKonami(key) {
  const k = String(key).toLowerCase();
  const expected = String(KONAMI[_konamiIdx]).toLowerCase();
  if (k === expected) {
    _konamiIdx++;
    if (_konamiIdx === KONAMI.length) {
      _konamiIdx = 0;
      return true;
    }
  } else {
    _konamiIdx = key === "ArrowUp" ? 1 : 0; // restart if first key is matched
  }
  return false;
}

let _logoClicks = 0;
let _logoTimer = null;
function setupEasterEggTriggers() {
  const logo = document.querySelector(".logo");
  if (!logo) return;
  logo.style.cursor = "pointer";
  logo.addEventListener("click", () => {
    _logoClicks++;
    clearTimeout(_logoTimer);
    _logoTimer = setTimeout(() => { _logoClicks = 0; }, 1500);
    if (_logoClicks >= 5) {
      _logoClicks = 0;
      launchYoshiGame();
    }
  });
  $("game-close").addEventListener("click", closeYoshiGame);
  $("game-overlay").addEventListener("click", (e) => {
    if (e.target === $("game-overlay")) closeYoshiGame();
  });
}

let _yoshi = null;
function launchYoshiGame() {
  toast("🦖 LET'S-A-GO!");
  sfxOneUp();
  $("game-overlay").classList.remove("hidden");
  if (_yoshi) _yoshi.stop();
  _yoshi = new YoshiGame($("game-canvas"));
}
function closeYoshiGame() {
  $("game-overlay").classList.add("hidden");
  if (_yoshi) { _yoshi.stop(); _yoshi = null; }
}

class YoshiGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.W = 640;
    this.H = 400;
    this.GROUND = 70;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.keys = {};
    this.lastApple = 0;
    this.running = true;
    this.flashFrames = 0;
    this.reset();
    this._onDown = this._onDown.bind(this);
    this._onUp = this._onUp.bind(this);
    document.addEventListener("keydown", this._onDown, true);
    document.addEventListener("keyup", this._onUp, true);
    this.lastFrame = performance.now();
    this._bgmStep = 0;
    this._bgmTimer = null;
    this._scheduleBgmTick();
    requestAnimationFrame(this.loop.bind(this));
  }
  reset() {
    this.yoshi = { x: this.W / 2 - 28, y: this.H - this.GROUND - 56, w: 56, h: 56, speed: 6 };
    this.apples = [];
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.startTime = performance.now();
    this.highScore = parseInt(localStorage.getItem("yoshi_hi") || "0", 10);
  }
  _onDown(e) {
    // Block from leaking to tabstation while game is open
    this.keys[e.key] = true;
    if (this.gameOver && e.key === " ") {
      this.reset();
    }
    if (e.key === "Escape") {
      closeYoshiGame();
    }
    if (["ArrowLeft", "ArrowRight", " ", "Escape"].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  _onUp(e) {
    this.keys[e.key] = false;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  stop() {
    this.running = false;
    clearTimeout(this._bgmTimer);
    document.removeEventListener("keydown", this._onDown, true);
    document.removeEventListener("keyup", this._onUp, true);
  }
  _scheduleBgmTick() {
    if (!this.running) return;
    const elapsed = (performance.now() - this.startTime) / 1000;
    const interval = Math.max(220, 500 - elapsed * 4);
    this._bgmTimer = setTimeout(() => {
      this._bgmTick();
      this._scheduleBgmTick();
    }, interval);
  }
  _bgmTick() {
    if (this.gameOver) return;
    // walking bass: A2 E2 A2 G2
    const notes = [110, 82.41, 110, 98];
    tone({ freq: notes[this._bgmStep % notes.length], dur: 0.08, type: "triangle", vol: 0.05 });
    this._bgmStep++;
  }
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(3, (now - this.lastFrame) / 16);
    this.lastFrame = now;
    this.update(dt, now);
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }
  update(dt, now) {
    if (this.gameOver) return;
    if (this.flashFrames > 0) this.flashFrames--;
    // Yoshi movement
    if (this.keys["ArrowLeft"]) this.yoshi.x = Math.max(0, this.yoshi.x - this.yoshi.speed * dt);
    if (this.keys["ArrowRight"]) this.yoshi.x = Math.min(this.W - this.yoshi.w, this.yoshi.x + this.yoshi.speed * dt);
    // Spawn apples (gets faster as score climbs)
    const elapsed = (now - this.startTime) / 1000;
    const spawnInterval = Math.max(420, 1200 - elapsed * 18);
    if (now - this.lastApple > spawnInterval) {
      this.lastApple = now;
      this.apples.push({
        x: Math.random() * (this.W - 36),
        y: -36,
        w: 36, h: 36,
        speed: 2.2 + Math.random() * 2.5 + elapsed * 0.04,
        kind: Math.random() < 0.08 ? "star" : (Math.random() < 0.1 ? "bomb" : "apple"),
      });
    }
    // Move + collide
    const yL = this.yoshi.x + 6, yR = this.yoshi.x + this.yoshi.w - 6;
    const yT = this.yoshi.y + 8, yB = this.yoshi.y + this.yoshi.h;
    this.apples = this.apples.filter((a) => {
      a.y += a.speed * dt;
      const aL = a.x + 4, aR = a.x + a.w - 4;
      const aT = a.y + 4, aB = a.y + a.h - 4;
      const hit = aR > yL && aL < yR && aB > yT && aT < yB;
      if (hit) {
        if (a.kind === "apple") { this.score += 10; sfxCoin(); }
        else if (a.kind === "star") { this.score += 50; this.flashFrames = 8; sfxOneUp(); }
        else if (a.kind === "bomb") {
          this.lives--;
          this.flashFrames = 14;
          sfxError();
          if (this.lives <= 0) this._endGame();
        }
        return false;
      }
      if (a.y > this.H - this.GROUND + 4) {
        if (a.kind === "apple") {
          this.lives--;
          if (this.lives <= 0) this._endGame();
        }
        return false;
      }
      return true;
    });
  }
  _endGame() {
    this.gameOver = true;
    sfxPipe();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("yoshi_hi", String(this.highScore));
    }
  }
  draw() {
    const { ctx, W, H, GROUND } = this;
    // Sky
    ctx.fillStyle = "#6B8CFF";
    ctx.fillRect(0, 0, W, H);
    // Clouds (static pixel puffs)
    ctx.fillStyle = "#fff";
    [[60, 60], [220, 40], [420, 80], [540, 50]].forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, 40, 12);
      ctx.fillRect(cx + 8, cy - 8, 28, 8);
      ctx.fillRect(cx + 14, cy + 12, 18, 6);
    });
    // Ground top edge
    ctx.fillStyle = "#C84C0C";
    ctx.fillRect(0, H - GROUND, W, 10);
    // Brick ground
    ctx.fillStyle = "#B53120";
    ctx.fillRect(0, H - GROUND + 10, W, GROUND - 10);
    // Brick lines
    ctx.fillStyle = "#6A1F0F";
    for (let y = H - GROUND + 14; y < H; y += 16) {
      for (let x = ((y / 16) % 2 === 0 ? 0 : 16); x < W; x += 32) {
        ctx.fillRect(x, y, 16, 2);
      }
    }
    // Apples / Stars / Bombs
    ctx.textBaseline = "top";
    ctx.font = "32px serif";
    this.apples.forEach((a) => {
      const sprite = a.kind === "apple" ? "🍎" : a.kind === "star" ? "⭐" : "💣";
      ctx.fillText(sprite, a.x, a.y);
    });
    // Yoshi (flash when hit)
    if (this.flashFrames === 0 || this.flashFrames % 2 === 0) {
      ctx.font = "56px serif";
      ctx.fillText("🦖", this.yoshi.x, this.yoshi.y);
    }
    // HUD
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.fillStyle = "#000";
    ctx.fillText(`SCORE ${this.score}`, 12, 12);
    ctx.fillText(`LIVES ${"♥".repeat(Math.max(0, this.lives))}`, 12, 36);
    ctx.fillStyle = "#FBD000";
    ctx.fillText(`HI ${this.highScore}`, W - 160, 12);
    // Game over overlay
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#FBD000";
      ctx.font = "28px 'Press Start 2P', monospace";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 50);
      ctx.fillStyle = "#fff";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.fillText(`SCORE  ${this.score}`, W / 2, H / 2);
      ctx.fillText(`HIGH   ${this.highScore}`, W / 2, H / 2 + 24);
      ctx.fillStyle = "#FBD000";
      ctx.fillText("PRESS  SPACE  TO  RESTART", W / 2, H / 2 + 72);
      ctx.textAlign = "left";
    }
  }
}

// ============================================================
// BOOT
// ============================================================

(async function init() {
  await loadState();
  await refreshTabs();
  await refreshRecentlyClosed();
  applyTheme();
  // initial view button
  document.querySelectorAll(".view-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === state.settings.view);
  });
  render();
  setupEasterEggTriggers();
  maybeRunFirstLaunch();
})();
