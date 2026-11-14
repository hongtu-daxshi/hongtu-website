/* 红涂大师 · 页面外壳
   导航态、阅读进度、分区跳转
   -------------------------------------------------- */
(function () {
  "use strict";

  var nav = document.getElementById("nav");
  var rule = document.getElementById("navRule");
  var stage = document.querySelector(".stage");
  var docEl = document.documentElement;
  var stageTop = 0;
  var stageH = 0;

  function measure() {
    if (!stage) return;
    var r = stage.getBoundingClientRect();
    stageTop = r.top + (window.scrollY || 0);
    stageH = stage.offsetHeight;
  }

  function onScroll() {
    var y = window.scrollY || docEl.scrollTop || 0;
    var max = docEl.scrollHeight - window.innerHeight;
    if (rule) {
      rule.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    }
    if (nav) {
      var solid = stage ? y > stageTop + stageH - window.innerHeight * 0.6 : y > 80;
      nav.classList.toggle("is-solid", solid);
    }
  }

  measure();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    measure();
    onScroll();
  }, { passive: true });
  window.addEventListener("load", measure);

  /* 分区跳转：桌面走滚动进度，移动端走元素 */
  var KEY_T = [0, 0.1, 0.25, 0.4, 0.55, 0.69, 0.83];

  function goZone(n) {
    if (!stage) return;
    var isSmall = window.matchMedia("(max-width: 860px)").matches;
    if (isSmall) {
      var el = document.querySelector('.zone[data-zone="' + n + '"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var total = stageH - window.innerHeight;
    var t = KEY_T[n] === undefined ? 0 : KEY_T[n];
    window.scrollTo({ top: stageTop + t * total, behavior: "smooth" });
  }

  Array.prototype.forEach.call(
    document.querySelectorAll("[data-zone-jump]"),
    function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        goZone(parseInt(btn.getAttribute("data-zone-jump"), 10) || 0);
      });
    }
  );

  /* 键盘：上下键在舞台内按分区步进 */
  document.addEventListener("keydown", function (e) {
    if (!stage || window.matchMedia("(max-width: 860px)").matches) return;
    var y = window.scrollY || 0;
    if (y < stageTop - 10 || y > stageTop + stageH - window.innerHeight + 10) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var p = total0();
    var idx = 0, bestD = 9;
    for (var i = 1; i <= 6; i++) {
      var d = Math.abs(p - KEY_T[i]);
      if (d < bestD) { bestD = d; idx = i; }
    }
    var next = e.key === "ArrowRight" ? Math.min(6, idx + 1) : Math.max(1, idx - 1);
    e.preventDefault();
    goZone(next);
  });

  function total0() {
    var total = stageH - window.innerHeight;
    return total > 0 ? Math.max(0, Math.min(1, (window.scrollY - stageTop) / total)) : 0;
  }
})();
