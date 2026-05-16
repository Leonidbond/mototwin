/**
 * Inline script run before React hydrates.
 * Bitdefender and similar extensions inject attrs (e.g. bis_skin_checked) on DOM nodes,
 * which causes hydration mismatches on otherwise static SSR markup.
 */
export const EXTENSION_DOM_SANITIZE_SCRIPT = `
(function () {
  var ATTRS = ["bis_skin_checked", "bis_register"];
  function strip() {
    for (var i = 0; i < ATTRS.length; i++) {
      var name = ATTRS[i];
      var nodes = document.querySelectorAll("[" + name + "]");
      for (var j = 0; j < nodes.length; j++) {
        nodes[j].removeAttribute(name);
      }
    }
  }
  function scheduleStrip() {
    strip();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(strip);
      requestAnimationFrame(function () {
        requestAnimationFrame(strip);
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleStrip, { once: true });
  } else {
    scheduleStrip();
  }
})();
`.trim();
