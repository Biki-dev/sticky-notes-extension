// Guard against re-injection
if (window.__STICKY_NOTES_LOADED__) {
  window.dispatchEvent(new CustomEvent("sticky-notes-inject"));
} else {
  window.__STICKY_NOTES_LOADED__ = true;

  // ── Inject Google Fonts ──────────────────────────────────
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=DM+Serif+Display&display=swap";
  document.head.appendChild(fontLink);

  // ── Styles ───────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .sn-card {
      position: fixed;
      z-index: 2147483647;
      width: 200px;
      background: #fdf6e3;
      background-image:
        repeating-linear-gradient(
          transparent,
          transparent 23px,
          rgba(100,149,237,0.18) 23px,
          rgba(100,149,237,0.18) 24px
        );
      border-radius: 2px;
      box-shadow:
        3px 6px 16px rgba(0,0,0,0.32),
        inset 0 1px 0 rgba(255,255,255,0.9),
        inset 0 -1px 0 rgba(0,0,0,0.04);
      font-family: 'Caveat', cursive;
      font-size: 16px;
      color: #2c1a0e;
      user-select: none;
      animation: sn-drop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
      padding-top: 28px;
    }

    @keyframes sn-drop {
      from { opacity: 0; transform: translateY(-16px) scale(0.9) rotate(-4deg); }
      to   { opacity: 1; }
    }

    /* Pushpin */
    .sn-card::before {
      content: '';
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 16px;
      height: 16px;
      background: radial-gradient(circle at 35% 30%, #e74c3c, #7b241c);
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.5);
      z-index: 10;
    }

    .sn-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px 0 10px;
      cursor: grab;
      background: rgba(0,0,0,0.03);
      border-bottom: 1px solid rgba(0,0,0,0.06);
      border-radius: 2px 2px 0 0;
    }

    .sn-header:active { cursor: grabbing; }

    .sn-label {
      font-family: 'DM Serif Display', serif;
      font-size: 10px;
      letter-spacing: 0.08em;
      color: rgba(44,26,14,0.4);
      text-transform: uppercase;
    }

    .sn-close {
      background: none;
      border: none;
      font-size: 13px;
      cursor: pointer;
      color: rgba(44,26,14,0.3);
      padding: 0;
      line-height: 1;
      transition: color 0.15s;
      font-family: 'Caveat', cursive;
    }

    .sn-close:hover { color: #c0392b; }

    .sn-body {
      padding: 6px 12px 12px;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 24px;
      color: #2c1a0e;
      font-size: 16px;
      letter-spacing: 0.01em;
    }

    /* Tape strip on one corner */
    .sn-card.sn-tape::after {
      content: '';
      position: absolute;
      top: 14px;
      right: -10px;
      width: 30px;
      height: 12px;
      background: rgba(180,220,255,0.45);
      transform: rotate(35deg);
      border-radius: 1px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3);
    }
  `;
  document.head.appendChild(style);

  // ── Helpers ──────────────────────────────────────────────
  const ROTATIONS = [-2.5, 1.8, -0.9, 2.2, -1.4, 0.6, -2.0, 1.2];

  function persistPosition(host, noteId, x, y) {
    chrome.runtime.sendMessage({ type: "UPDATE_POSITION", host, noteId, x, y });
  }

  function makeDraggable(card, handle, host, noteId) {
    let startX, startY, startLeft, startTop;

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(card.style.left) || 0;
      startTop  = parseInt(card.style.top)  || 0;
      card.style.transition = "none";
      card.style.zIndex = "2147483647";

      function onMove(e) {
        card.style.left = Math.max(0, startLeft + e.clientX - startX) + "px";
        card.style.top  = Math.max(0, startTop  + e.clientY - startY) + "px";
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        persistPosition(host, noteId, parseInt(card.style.left), parseInt(card.style.top));
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function renderNotes(notes) {
    const host = window.location.hostname;
    document.querySelectorAll(".sn-card").forEach(el => el.remove());

    notes.forEach((note, i) => {
      const card = document.createElement("div");
      card.className = "sn-card" + (i % 3 === 1 ? " sn-tape" : "");
      card.dataset.noteId = note.id;
      card.style.left = (note.x ?? 24) + "px";
      card.style.top  = (note.y ?? 24) + "px";
      card.style.transform = `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)`;
      card.style.animationDelay = (i * 0.07) + "s";

      const header = document.createElement("div");
      header.className = "sn-header";

      const label = document.createElement("span");
      label.className = "sn-label";
      label.textContent = "note";

      const closeBtn = document.createElement("button");
      closeBtn.className = "sn-close";
      closeBtn.title = "Dismiss";
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", () => {
        card.style.transition = "all 0.2s ease";
        card.style.opacity = "0";
        card.style.transform += " scale(0.8)";
        setTimeout(() => card.remove(), 200);
      });

      header.appendChild(label);
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

  window.addEventListener("sticky-notes-inject", () => {
    if (window.__STICKY_NOTES__?.length) renderNotes(window.__STICKY_NOTES__);
  });
}