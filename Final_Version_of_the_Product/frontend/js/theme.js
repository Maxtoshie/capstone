/* Theme switch: dark (default) or light. Runs in <head> so the page never flashes the wrong theme. */
(function () {
  var KEY = "ujuzi_theme", root = document.documentElement;
  function apply(t) {
    root.setAttribute("data-theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "light" ? "#f4f5f8" : "#111111");
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  apply(saved || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  window.UJTheme = {
    toggle: function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      return next;
    }
  };
})();
