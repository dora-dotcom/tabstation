const WORKSTATION_URL = chrome.runtime.getURL("src/workstation.html");

async function focusOrOpenWorkstation() {
  const tabs = await chrome.tabs.query({ url: WORKSTATION_URL });
  if (tabs.length > 0) {
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    return;
  }
  const win = await chrome.windows.getCurrent();
  const newTab = await chrome.tabs.create({
    url: WORKSTATION_URL,
    windowId: win.id,
    index: 0,
    pinned: true,
    active: true,
  });
  return newTab;
}

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === "open-workstation") focusOrOpenWorkstation();
});

chrome.action.onClicked.addListener(() => {
  focusOrOpenWorkstation();
});

chrome.runtime.onInstalled.addListener(() => {
  focusOrOpenWorkstation();
});
