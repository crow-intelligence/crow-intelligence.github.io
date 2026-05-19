// Lightweight scroll reveal — no dependencies, no build. Matches the
// Aporia feel (IntersectionObserver toggling .is-visible / .is-active),
// without pulling in Scrollama for what is a two-section page.
(function () {
  "use strict";

  var els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showAll() {
    els.forEach(function (el) {
      el.classList.add("is-visible", "is-active");
    });
  }

  if (reduce || !("IntersectionObserver" in window)) {
    showAll();
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible", "is-active");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  els.forEach(function (el) {
    io.observe(el);
  });
})();
