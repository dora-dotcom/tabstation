const TABSTATION_URL = chrome.runtime.getURL("src/tabstation.html");

async function focusOrOpenTabstation() {
  const tabs = await chrome.tabs.query({ url: TABSTATION_URL });
  if (tabs.length > 0) {
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    return;
  }
  const win = await chrome.windows.getCurrent();
  const newTab = await chrome.tabs.create({
    url: TABSTATION_URL,
    windowId: win.id,
    index: 0,
    pinned: true,
    active: true,
  });
  return newTab;
}

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === "open-tabstation") focusOrOpenTabstation();
});

chrome.action.onClicked.addListener(() => {
  focusOrOpenTabstation();
});

chrome.runtime.onInstalled.addListener(() => {
  focusOrOpenTabstation();
});
