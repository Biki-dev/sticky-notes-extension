chrome.runtime.onInstalled.addListener(() => {
  console.log("Site Sticky Notes installed.");
});

// Fire every time a tab finishes loading
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;

  let host;
  try { host = new URL(tab.url).hostname; }
  catch { return; }

  const data = await chrome.storage.local.get(host);
  const notes = data[host]?.notes?.filter(n => n.text.trim() !== "");
  if (!notes?.length) return;

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (notesData) => {
        window.__STICKY_NOTES__ = notesData;
        window.dispatchEvent(new CustomEvent("sticky-notes-inject"));
      },
      args: [notes]
    });
  } catch (err) {
    console.warn("Injection skipped:", err.message);
  }
});

// Handle position updates from content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "UPDATE_POSITION") return;
  const { host, noteId, x, y } = msg;

  chrome.storage.local.get(host, (data) => {
    const siteData = data[host];
    if (!siteData?.notes) return;

    siteData.notes = siteData.notes.map(n =>
      n.id === noteId ? { ...n, x, y } : n
    );
    chrome.storage.local.set({ [host]: siteData });
  });
});