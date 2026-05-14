// KeyClick - popup.js

const COLORS = ["green", "purple", "green", "purple"];

let settings = {
  enabled: true,
  bindings: [
    { key: "Control", enabled: true },
    { key: "Alt",     enabled: true }
  ]
};

// Load settings and render
chrome.storage.sync.get("keyclick_settings", (result) => {
  if (result.keyclick_settings) {
    settings = result.keyclick_settings;
  }
  render();
});

function save() {
  chrome.storage.sync.set({ keyclick_settings: settings });
}

function render() {
  // Status pill
  const pill = document.getElementById("statusPill");
  const txt  = document.getElementById("statusText");
  if (settings.enabled) {
    pill.classList.remove("off");
    txt.textContent = "ACTIVE";
  } else {
    pill.classList.add("off");
    txt.textContent = "PAUSED";
  }

  // Bindings list
  const list = document.getElementById("bindingsList");
  list.innerHTML = "";

  settings.bindings.forEach((binding, i) => {
    const color = COLORS[i % COLORS.length];
    const card = document.createElement("div");
    card.className = "bind-card";
    card.innerHTML = `
      <div class="bind-row">
        <div class="bind-left">
          <div class="key-badge ${color}" data-index="${i}">${escapeHtml(binding.key)}</div>
          <span class="arrow">→</span>
          <span class="click-label">🖱 Left Click</span>
        </div>
        <div class="toggle ${binding.enabled ? "on " + color : ""}" data-toggle="${i}"></div>
      </div>
      <div class="bind-meta">
        <div class="bind-name">${keyName(binding.key)}</div>
        <div class="bind-hint">Press ${escapeHtml(binding.key)} → simulates left click</div>
      </div>
    `;

    // Toggle click
    card.querySelector(`[data-toggle="${i}"]`).addEventListener("click", () => {
      settings.bindings[i].enabled = !settings.bindings[i].enabled;
      save();
      render();
    });

    // Key badge click - rebind
    card.querySelector(`[data-index="${i}"]`).addEventListener("click", () => {
      startRebind(i, card.querySelector(`[data-index="${i}"]`));
    });

    list.appendChild(card);
  });
}

function startRebind(index, el) {
  const original = el.textContent;
  el.textContent = "…";
  el.style.opacity = "0.6";

  const onKey = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore pure modifier-only if it's a duplicate
    const newKey = e.key;
    if (newKey === "Escape") {
      el.textContent = original;
      el.style.opacity = "1";
      document.removeEventListener("keydown", onKey, true);
      return;
    }

    settings.bindings[index].key = newKey;
    save();
    document.removeEventListener("keydown", onKey, true);
    render();
  };

  document.addEventListener("keydown", onKey, true);
}

// Add new binding
document.getElementById("addBtn").addEventListener("click", () => {
  settings.bindings.push({ key: "?", enabled: true });
  save();
  render();

  // Immediately trigger rebind on the new entry
  const badges = document.querySelectorAll(".key-badge");
  const last = badges[badges.length - 1];
  if (last) startRebind(settings.bindings.length - 1, last);
});

// Status toggle
document.getElementById("statusPill").addEventListener("click", () => {
  settings.enabled = !settings.enabled;
  save();
  render();
});

function keyName(key) {
  const map = {
    Control: "Ctrl — Hold to Click",
    Alt:     "Alt — Press to Click",
    Shift:   "Shift — Press to Click",
    Meta:    "Meta/Cmd — Press to Click",
    Tab:     "Tab — Press to Click",
  };
  return map[key] || `${key} — Press to Click`;
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
