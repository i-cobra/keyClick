// KeyClick - content.js
// Listens for configured keys and simulates a left mouse click at the cursor position.

let settings = {
  enabled: true,
  bindings: [
    { key: "Control", enabled: true },
    { key: "Alt",     enabled: true }
  ]
};

let mouseX = 0;
let mouseY = 0;

// Track mouse position at all times, including inside iframes if possible
document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
}, true);

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get("keyclick_settings", (result) => {
    if (result.keyclick_settings) {
      settings = result.keyclick_settings;
    }
  });
}

// Listen for settings updates from the popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.keyclick_settings) {
    settings = changes.keyclick_settings.newValue;
  }
});

// Find the real clickable target, walking up from pointer-events:none elements
function getClickTarget(x, y) {
  // Temporarily collect elements hidden from pointer events
  const hidden = [];

  let el = document.elementFromPoint(x, y);
  while (el) {
    const pe = getComputedStyle(el).pointerEvents;
    if (pe === "none") {
      hidden.push({ el, original: el.style.pointerEvents });
      el.style.pointerEvents = "auto";
      el = document.elementFromPoint(x, y);
    } else {
      break;
    }
  }

  // Restore pointer-events
  hidden.forEach(({ el, original }) => { el.style.pointerEvents = original; });

  return el;
}

// Walk up DOM to find the nearest clickable ancestor
function findClickable(el) {
  while (el && el !== document.body) {
    const tag = el.tagName?.toLowerCase();
    if (
      tag === "a" || tag === "button" || tag === "input" ||
      tag === "select" || tag === "textarea" || tag === "label" ||
      tag === "summary" || tag === "details" ||
      el.getAttribute("role") === "button" ||
      el.getAttribute("role") === "link" ||
      el.getAttribute("role") === "checkbox" ||
      el.getAttribute("role") === "menuitem" ||
      el.getAttribute("role") === "tab" ||
      el.onclick || el.getAttribute("onclick") ||
      el.getAttribute("tabindex") !== null ||
      getComputedStyle(el).cursor === "pointer"
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return el; // fallback to whatever we found
}

// Fire the full sequence of mouse events on a target
function fireMouseEvents(target, x, y) {
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,   // crosses shadow DOM boundaries
    view: window,
    detail: 1,
    clientX: x,
    clientY: y,
    screenX: x + window.screenX,
    screenY: y + window.screenY,
    button: 0,
    buttons: 1
  };

  target.dispatchEvent(new MouseEvent("pointerover",  { ...init, bubbles: true }));
  target.dispatchEvent(new MouseEvent("mouseover",    { ...init, bubbles: true }));
  target.dispatchEvent(new PointerEvent("pointerdown",{ ...init, bubbles: true, pointerId: 1, isPrimary: true }));
  target.dispatchEvent(new MouseEvent("mousedown",    init));
  target.dispatchEvent(new PointerEvent("pointerup",  { ...init, bubbles: true, pointerId: 1, isPrimary: true }));
  target.dispatchEvent(new MouseEvent("mouseup",      init));
  target.dispatchEvent(new MouseEvent("click",        init));

  // Also call .click() natively for <a>, <button>, <input> — most reliable
  if (typeof target.click === "function") {
    target.click();
  }
}

// Main simulate function
function simulateClick(x, y) {
  let target = getClickTarget(x, y);
  if (!target || target === document.documentElement) return;

  // Try to find a meaningful clickable ancestor
  const clickable = findClickable(target);
  if (clickable) target = clickable;

  fireMouseEvents(target, x, y);
}

// Key press handler
document.addEventListener("keydown", (e) => {
  if (!settings.enabled) return;

  const binding = settings.bindings.find(b => b.key === e.key && b.enabled);
  if (!binding) return;

  // Don't intercept if user is actively typing
  const tag = document.activeElement?.tagName?.toLowerCase();
  const isEditable = document.activeElement?.isContentEditable;
  if (tag === "input" || tag === "textarea" || tag === "select" || isEditable) return;

  // Prevent default browser behavior (e.g. Alt opening menu, Ctrl shortcuts)
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  simulateClick(mouseX, mouseY);
}, true);

loadSettings();
