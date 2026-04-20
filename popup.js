let currentHost = "";
let notes = [];

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function showStatus(msg) {
  const el = document.getElementById("status");
  el.textContent = msg;
  setTimeout(() => (el.textContent = ""), 2000);
}

async function getCurrentHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try { return new URL(tab.url).hostname; }
  catch { return null; }
}

function renderList() {
  const list = document.getElementById("notes-list");
  list.innerHTML = "";

  if (!notes.length) {
    list.innerHTML = `<div id="empty-msg">No notes for this site yet.</div>`;
    return;
  }

  notes.forEach((note, idx) => {
    const item = document.createElement("div");
    item.className = "note-item";

    const ta = document.createElement("textarea");
    ta.value = note.text;
    ta.placeholder = "Write your note...";
    ta.addEventListener("input", () => {
      notes[idx].text = ta.value;
    });

    const del = document.createElement("button");
    del.className = "btn-del";
    del.title = "Delete note";
    del.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
    del.addEventListener("click", () => {
      notes.splice(idx, 1);
      renderList();
    });

    item.appendChild(ta);
    item.appendChild(del);
    list.appendChild(item);
  });
}

async function loadNotes() {
  const data = await chrome.storage.local.get(currentHost);
  notes = data[currentHost]?.notes ?? [];
  renderList();
}

async function saveAll() {
  // Filter out blank notes
  notes = notes.filter(n => n.text.trim() !== "");

  if (!notes.length) {
    await chrome.storage.local.remove(currentHost);
    renderList();
    showStatus("🗑️ All notes cleared.");
    return;
  }

  await chrome.storage.local.set({ [currentHost]: { notes } });
  showStatus("✅ Saved!");
  renderList();
}

function addNote() {
  notes.push({ id: makeId(), text: "", x: 20 + notes.length * 20, y: 20 + notes.length * 20 });
  renderList();

  // Focus the new textarea
  const items = document.querySelectorAll(".note-item textarea");
  items[items.length - 1]?.focus();
}

(async () => {
  currentHost = await getCurrentHost();
  const label = document.getElementById("site-label");

  if (!currentHost) {
    label.textContent = "Cannot detect site.";
    document.getElementById("btn-add").disabled = true;
    document.getElementById("btn-save").disabled = true;
    return;
  }

  label.textContent = `📌 ${currentHost}`;
  await loadNotes();

  document.getElementById("btn-add").addEventListener("click", addNote);
  document.getElementById("btn-save").addEventListener("click", saveAll);
})();