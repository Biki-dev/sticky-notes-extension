let currentHost = "";

// Utility: generate a simple unique ID
function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

// Show a brief status message
function showStatus(msg) {
  const el = document.getElementById("status");
  el.textContent = msg;
  setTimeout(() => (el.textContent = ""), 2000);
}

// Get the active tab's hostname
async function getCurrentHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

// Load existing notes for this host and populate textarea

async function loadNote(host) {
  const data = await chrome.storage.local.get(host);
  const siteData = data[host];
  const textarea = document.getElementById("note-input");

  if (siteData?.notes?.length > 0) {
    textarea.value = siteData.notes[0].text;
  } else {
    textarea.value = "";
  }
}

// Save note to storage
async function saveNote() {
  const text = document.getElementById("note-input").value.trim();
  if (!text) { showStatus("⚠️ Note is empty."); return; }

  const data = await chrome.storage.local.get(currentHost);
  const existing = data[currentHost];

  let notes;
  if (existing?.notes?.length > 0) {
    // Update first note's text, keep existing x/y
    notes = [{ ...existing.notes[0], text }];
  } else {
    // Brand new note — default position, will be positioned on inject
    notes = [{ id: makeId(), text, x: 20, y: 20 }];
  }

  await chrome.storage.local.set({ [currentHost]: { notes } });
  showStatus("✅ Saved!");
}

// Clear note from storage
async function clearNote() {
  await chrome.storage.local.remove(currentHost);
  document.getElementById("note-input").value = "";
  showStatus("🗑️ Cleared.");
}

// Boot
(async () => {
  currentHost = await getCurrentHost();
  const label = document.getElementById("site-label");

  if (!currentHost) {
    label.textContent = "Cannot detect site.";
    return;
  }

  label.textContent = `📌 ${currentHost}`;
  await loadNote(currentHost);

  document.getElementById("btn-save").addEventListener("click", saveNote);
  document.getElementById("btn-clear").addEventListener("click", clearNote);
})();