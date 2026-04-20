// Guard: don't run twice if script re-injected
if (window.__STICKY_NOTES_LOADED__) {
  // Re-render with fresh data if already on page
  window.dispatchEvent(new CustomEvent("sticky-notes-inject"));
} else {
  window.__STICKY_NOTES_LOADED__ = true;

  // ── Styles ──────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .sn-card {
      position: fixed;
      z-index: 2147483647;
      min-width: 180px;
      max-width: 280px;
      background: #fff9c4;
      border: 1px solid #f5c842;
      border-radius: 8px;
      box-shadow: 2px 4px 12px rgba(0,0,0,0.18);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 13px;
      cursor: default;
      user-select: none;
    }
    .sn-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f5c842;
      padding: 5px 8px;
      border-radius: 7px 7px 0 0;
      cursor: grab;
      font-size: 11px;
      font-weight: 600;
      color: #555;
    }
    .sn-header:active { cursor: grabbing; }
    .sn-close {
      background: none;
      border: none;
      font-size: 14px;
      cursor: pointer;
      line-height: 1;
      color: #555;
      padding: 0 2px;
    }
    .sn-close:hover { color: #c00; }
    .sn-body {
      padding: 10px 12px;
      white-space: pre-wrap;
      word-break: break-word;
      color: #333;
      line-height: 1.5;
    }
  `;
  document.head.appendChild(style);

  // ── Helpers ─────────────────────────────────────────────

  // Save updated x/y back to storage via message
  function persistPosition(host, noteId, x, y) {
    chrome.runtime.sendMessage({
      type: "UPDATE_POSITION",
      host, noteId, x, y
    });
  }

  // Make a card draggable
  function makeDraggable(card, handle, host, noteId) {
    let startX, startY, startLeft, startTop;

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(card.style.left) || 0;
      startTop  = parseInt(card.style.top)  || 0;

      function onMove(e) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(0, startLeft + dx);
        const newTop  = Math.max(0, startTop  + dy);
        card.style.left = newLeft + "px";
        card.style.top  = newTop  + "px";
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        persistPosition(
          host, noteId,
          parseInt(card.style.left),
          parseInt(card.style.top)
        );
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // Render all notes for this page
  function renderNotes(notes) {
    const host = window.location.hostname;

    // Remove old cards if re-rendering
    document.querySelectorAll(".sn-card").forEach(el => el.remove());

    notes.forEach((note) => {
      const card = document.createElement("div");
      card.className = "sn-card";
      card.dataset.noteId = note.id;
      card.style.left = (note.x ?? 20) + "px";
      card.style.top  = (note.y ?? 20) + "px";

      const header = document.createElement("div");
      header.className = "sn-header";
      header.innerHTML = `<span>📝 Note</span>`;

      const closeBtn = document.createElement("button");
      closeBtn.className = "sn-close";
      closeBtn.title = "Dismiss";
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", () => {
        card.remove();
      });
      header.appendChild(closeBtn);

      const body = document.createElement("div");
      body.className = "sn-body";
      body.textContent = note.text;

      card.appendChild(header);
      card.appendChild(body);
      document.body.appendChild(card);

      makeDraggable(card, header, host, note.id);
    });
  }

  // Listen for injection trigger
  window.addEventListener("sticky-notes-inject", () => {
    if (window.__STICKY_NOTES__?.length) {
      renderNotes(window.__STICKY_NOTES__);
    }
  });
}