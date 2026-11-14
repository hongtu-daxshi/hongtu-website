/* 红涂大师 · 六模块系统总图
   原生 WebGL2 / 实例化轴对齐盒子 / 零依赖。
   页面内交互组件，不读取滚动、不接管页面。
   -------------------------------------------------- */
(function () {
  "use strict";

  var PI = Math.PI;
  var OVERVIEW = -1;
  var TRANSITION = 900;
  var MAX_DPR = 1.5;
  var FALLBACK_PHOTO = "assets/img/service-audit.jpg";

  function noop() {}

  /* 即使 WebGL2 不可用，也返回完整、可安全调用的控制接口。 */
  function fallbackController(canvas, onError, error) {
    var fallback = null;
    var ownsFallback = false;
    var host = canvas && canvas.parentNode;
    if (canvas) {
      canvas.style.visibility = "hidden";
      canvas.setAttribute("aria-hidden", "true");
    }
    if (host && host.nodeType === 1) {
      fallback = host.querySelector("img.system-fallback, img[data-hongtu-scene-fallback]");
      if (!fallback) {
        ownsFallback = true;
        fallback = document.createElement("img");
        fallback.setAttribute("data-hongtu-scene-fallback", "");
        host.insertBefore(fallback, canvas);
      }
      fallback.src = canvas.getAttribute("data-fallback-src") || FALLBACK_PHOTO;
      fallback.alt = "工厂目视化场景示意图（三维总图不可用时的静态展示）";
      fallback.loading = "lazy";
      fallback.decoding = "async";
      fallback.style.position = "absolute";
      fallback.style.left = "0";
      fallback.style.top = "0";
      fallback.style.width = "100%";
      fallback.style.height = "100%";
      fallback.style.objectFit = "cover";
      fallback.style.display = "block";
      fallback.style.pointerEvents = "none";
      /* 仅给无定位上下文的主机补定位，不改动其它节点。 */
      if (window.getComputedStyle(host).position === "static") host.style.position = "relative";
    }
    try { onError(error || new Error("WebGL2 unavailable")); } catch (ignore) {}
    return {
      setZone: noop,
      setIntensity: noop,
      resize: noop,
      destroy: function () {
        if (ownsFallback && fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
        if (canvas) {
          canvas.style.visibility = "";
          canvas.removeAttribute("aria-hidden");
        }
      }
    };
  }

  function init(options) {
    options = options || {};
    var canvas = options.canvas;
    var onReady = typeof options.onReady === "function" ? options.onReady : noop;
    var onError = typeof options.onError === "function" ? options.onError : noop;
    if (!canvas || typeof canvas.getContext !== "function") {
      return fallbackController(canvas, onError, new Error("HongTuScene.init requires a canvas"));
    }

    var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    var reduced = !!motionQuery.matches;
    var intensity = reduced ? 0 : 1;
    var destroyed = false;
    var failed = false;
    var fallbackCleanup = noop;
    var gl = null;
    try {
      gl = canvas.getContext("webgl2", {
        antialias: true,
        alpha: false,
        premultipliedAlpha: false,
        powerPreference: "high-performance"
      });
    } catch (error) {
      return fallbackController(canvas, onError, error);
    }
    if (!gl) return fallbackController(canvas, onError, new Error("WebGL2 is not supported"));

    /* ---------- 材质与实例数据 ---------- */
    var C = {
      floor: [0.61, 0.60, 0.56], floor2: [0.54, 0.55, 0.53],
      steel: [0.40, 0.43, 0.44], steelD: [0.22, 0.25, 0.26],
      white: [0.86, 0.84, 0.78], dark: [0.105, 0.12, 0.13],
      yellow: [0.94, 0.70, 0.12], lane: [0.94, 0.92, 0.84],
      red: [0.78, 0.16, 0.12], redD: [0.54, 0.105, 0.085],
      glass: [0.12, 0.22, 0.25], screen: [0.075, 0.13, 0.16],
      green: [0.20, 0.32, 0.24], wood: [0.46, 0.37, 0.27],
      grid: [0.19, 0.22, 0.23], rubber: [0.07, 0.075, 0.08],
      copper: [0.62, 0.39, 0.20], blue: [0.19, 0.34, 0.39]
    };
    var zoneFloors = [
      [0.47, 0.51, 0.50], [0.57, 0.52, 0.40], [0.40, 0.49, 0.51],
      [0.55, 0.45, 0.42], [0.40, 0.46, 0.53], [0.50, 0.47, 0.41]
    ];
    var zoneCenters = [
      [-30, 16], [5, 16], [-30, -16],
      [35, 16], [5, -16], [35, -16]
    ];
    var boxes = [];
    var activeBuildZone = -1;

    function box(x, y, z, w, h, d, c, kind) {
      boxes.push([x, y, z, w, h, d, c[0], c[1], c[2], activeBuildZone, kind || 0]);
    }
    function on(x, z, w, h, d, c, base, kind) {
      var b = base === undefined ? 0 : base;
      box(x, b + h / 2, z, w, h, d, c, kind);
    }
    function line(x, z, w, d, c, base) {
      var b = base === undefined ? 0.035 : base;
      box(x, b, z, w, 0.055, d, c);
    }
    function inZone(index, build) {
      var previous = activeBuildZone;
      activeBuildZone = index;
      build();
      activeBuildZone = previous;
    }

    /* 场地、测绘细网格与六块可辨识的材质地坪。 */
    box(0, -2.65, 0, 220, 0.25, 180, [0.065, 0.077, 0.083]);
    box(0, -0.68, 0, 97, 1.35, 65, C.steelD);
    on(0, 0, 96, 0.26, 64, C.floor);
    for (var gx = -96; gx <= 96; gx += 8) box(gx, -2.49, 0, 0.075, 0.045, 164, C.grid);
    for (var gz = -80; gz <= 80; gz += 8) box(0, -2.49, gz, 194, 0.045, 0.075, C.grid);
    for (gx = -44; gx <= 44; gx += 4) line(gx, 0, 0.045, 62, [0.48, 0.49, 0.46], 0.285);
    for (gz = -28; gz <= 28; gz += 4) line(0, gz, 94, 0.045, [0.48, 0.49, 0.46], 0.285);

    var zoneRects = [
      [-30, 16, 31, 27], [5, 16, 31, 27], [-30, -16, 31, 27],
      [35, 16, 22, 27], [5, -16, 31, 27], [35, -16, 22, 27]
    ];
    zoneRects.forEach(function (r, i) {
      inZone(i, function () {
        on(r[0], r[1], r[2], 0.075, r[3], zoneFloors[i], 0.14);
        /* 地坪切角双线：在总图中也清楚分区。 */
        line(r[0], r[1] - r[3] / 2 + 0.35, r[2] - 0.7, 0.11, C.lane, 0.24);
        line(r[0], r[1] + r[3] / 2 - 0.35, r[2] - 0.7, 0.11, C.lane, 0.24);
      });
    });

    line(0, 2.4, 94, 0.36, C.yellow);
    line(0, -2.4, 94, 0.36, C.yellow);
    for (var dx = -44; dx <= 44; dx += 8) line(dx, 0, 3.4, 0.22, C.lane, 0.055);

    /* 半高围护保留开阔斜鸟瞰视线。 */
    on(0, -31.4, 96, 8.6, 1.0, C.steelD);
    on(-47.4, -16, 1.0, 8.6, 32, C.steelD);
    on(47.4, -12, 1.0, 8.6, 24, C.steelD);
    for (var cx = -42; cx <= 42; cx += 12) on(cx, -30.4, 0.9, 9.0, 0.9, C.steel);
    for (var cz = -28; cz <= -6; cz += 11) on(-46.4, cz, 0.9, 9.0, 0.9, C.steel);
    for (var wz = 6; wz <= 26; wz += 7) on(-46.9, wz, 0.18, 2.2, 4.2, C.white, 4.3);

    /* 六枚红色定位标，带底座、立柱与悬浮帽。 */
    var markerPositions = [[-44, 27], [-9, 27], [-44, -28], [26, 8], [-9, -28], [26, -28]];
    markerPositions.forEach(function (m, i) {
      inZone(i, function () {
        on(m[0], m[1], 1.7, 0.18, 1.7, C.redD, 0.2, 1);
        box(m[0], 3.0, m[1], 0.34, 5.5, 0.34, C.red, 1);
        box(m[0], 5.9, m[1], 1.35, 0.34, 1.35, C.red, 1);
        box(m[0], 6.35, m[1], 0.58, 0.58, 0.58, C.white, 1);
      });
    });

    /* 01 空间界面：设备岛、控制柜与白板墙。 */
    inZone(0, function () {
      [-38, -30, -22].forEach(function (mx, i) {
        on(mx, 16, 6.2, 2.1, 4.6, C.steel);
        on(mx, 16, 6.5, 0.22, 4.9, C.steelD, 2.1);
        on(mx - 1.1, 18.9, 1.9, 3.5, 1.4, C.steelD);
        on(mx + 1.2, 16, 1.2, 1.1, 1.4, C.white);
        on(mx + 1.2, 15.25, 0.72, 0.52, 0.06, C.glass, 0.35);
        for (var b = -2; b <= 2; b++) on(mx + b * 0.85, 13.72, 0.32, 0.32, 0.08, i === 1 ? C.red : C.white, 1.0);
        line(mx, 11.4, 6.6, 0.20, C.yellow);
        if (i === 0) on(mx + 4.6, 12.4, 2.2, 1.1, 1.8, C.wood);
      });
      [-40, -33, -26].forEach(function (wx) {
        on(wx, 27.5, 5.4, 3.4, 0.18, C.white);
        on(wx, 27.5, 5.6, 0.18, 3.6, C.steelD);
        on(wx - 1.7, 27.37, 0.12, 2.7, 0.05, C.red, 0.3);
      });
    });

    /* 02 目视化：人行轴线、信息看板与安全边界。 */
    inZone(1, function () {
      line(-6.5, 16, 0.30, 26, C.lane);
      line(-1.5, 16, 0.30, 26, C.lane);
      for (var ay = 6; ay <= 24; ay += 6) {
        line(-4, ay, 0.42, 3.4, C.yellow, 0.06);
        box(-4, 0.065, ay - 2.1, 1.8, 0.055, 0.9, C.yellow);
      }
      on(18.5, 12, 0.4, 5.4, 9.4, C.white);
      on(18.5, 12, 0.5, 0.5, 9.8, C.red);
      on(18.1, 8.7, 0.2, 5.0, 8.6, C.dark);
      on(18.75, 12, 0.25, 4.6, 8.2, C.glass);
      for (var sy = 9; sy <= 15; sy += 2) on(18.9, sy, 0.08, 0.42, 6.8, C.lane, 1.6);
      [-9, -5, -1, 3, 7, 11].forEach(function (sx) {
        on(sx, 4.4, 0.14, 2.6, 0.14, C.steelD);
        on(sx, 4.4, 1.0, 1.0, 0.10, C.white, 2.4);
        on(sx, 4.4, 0.7, 0.7, 0.04, C.red, 2.55);
      });
      line(8, 20, 10.4, 0.18, C.red);
      line(8, 26, 10.4, 0.18, C.red);
      line(3, 23, 0.18, 6.4, C.red);
      line(13, 23, 0.18, 6.4, C.red);
      on(8, 23, 4.2, 1.4, 3.2, C.wood);
      on(8, 23, 4.4, 0.16, 3.4, C.dark, 1.4);
    });

    /* 03 环境配套：灯杆、风管、处理机组与配电。 */
    inZone(2, function () {
      [-42, -34, -26, -18].forEach(function (lx) {
        on(lx, -25, 0.22, 8.6, 0.22, C.steelD);
        on(lx, -25, 2.6, 0.24, 1.1, C.white, 8.6);
        on(lx, -25, 2.2, 0.08, 0.75, C.yellow, 8.48);
        on(lx, -7, 1.0, 2.2, 1.0, C.steel);
      });
      on(-45.6, -16, 0.65, 0.65, 24, C.steel, 6.9);
      on(-45.6, -16, 0.34, 0.34, 24, C.steelD, 7.8);
      [-41, -33].forEach(function (ax) {
        on(ax, -6, 6.0, 3.8, 3.4, C.white);
        on(ax, -6, 6.2, 0.45, 3.6, C.steelD, 3.8);
        on(ax, -7.6, 5.0, 1.6, 0.14, C.dark, 1.2);
        on(ax, -7.6, 5.0, 0.14, 1.4, C.dark, 1.2);
        on(ax, -4.2, 0.5, 3.2, 0.5, C.steel);
        for (var v = -2; v <= 2; v++) on(ax + v * 0.75, -7.69, 0.18, 1.15, 0.08, C.steel, 1.35);
      });
      [-25, -19].forEach(function (px) {
        on(px, -14, 0.42, 0.42, 12, C.steel);
        on(px, -14, 0.42, 0.42, 12, C.steelD, 6.4);
      });
      [-16, -12, -8].forEach(function (ex) {
        on(-45, ex, 2.2, 3.0, 1.4, C.white);
        on(-45, ex, 2.4, 0.45, 1.5, C.steelD, 3.0);
        on(-43.88, ex, 0.06, 0.28, 0.65, C.red, 1.7);
      });
      on(-20, -28, 6.4, 0.06, 4.2, C.yellow, 0.2);
    });

    /* 04 厂区形象：门头、接待、绿植与展示墙。 */
    inZone(3, function () {
      on(29, 10, 1.2, 7.2, 1.2, C.red);
      on(43, 10, 1.2, 7.2, 1.2, C.red);
      on(36, 10, 16.4, 1.5, 1.5, C.red);
      on(36, 10, 10.4, 2.0, 0.30, C.white, 6.4);
      on(36, 10, 8.4, 1.2, 0.32, C.dark, 7.0);
      on(34, 15, 5.2, 1.1, 2.0, C.white);
      on(34, 15, 5.4, 0.18, 2.2, C.dark, 1.1);
      on(34, 13.95, 3.5, 0.36, 0.08, C.red, 0.5);
      [[27, 22], [45, 22], [27, 27]].forEach(function (p) {
        on(p[0], p[1], 2.4, 0.7, 2.4, C.steelD);
        on(p[0], p[1], 1.9, 0.5, 1.9, C.green, 0.7);
        on(p[0], p[1], 0.30, 2.2, 0.30, C.wood, 1.2);
        on(p[0], p[1], 2.2, 1.4, 2.2, C.green, 2.7);
      });
      on(45.6, 18, 0.45, 5.2, 8.4, C.white);
      on(45.3, 18, 0.18, 4.4, 7.4, C.glass);
      for (var boll = 28; boll <= 44; boll += 4) on(boll, 5.3, 0.24, 1.1, 0.24, C.yellow);
    });

    /* 05 数字与软实力：数据大屏、会议桌与协作白板。 */
    inZone(4, function () {
      on(4, -29.2, 14.4, 6.2, 0.45, C.steelD);
      on(4, -28.9, 13.4, 5.4, 0.12, C.screen);
      on(0.5, -28.8, 4.6, 0.9, 0.06, C.red);
      on(6.2, -28.8, 5.4, 0.5, 0.06, C.yellow);
      for (var chart = 0; chart < 6; chart++) on(-1 + chart * 1.7, -28.78, 0.72, 0.5 + chart * 0.38, 0.05, C.blue, 1.2);
      on(5, -20, 8.4, 0.9, 3.2, C.white);
      on(5, -20, 8.6, 0.12, 3.4, C.dark, 0.9);
      [[2, -17.6], [5, -17.6], [8, -17.6], [2, -22.4], [5, -22.4], [8, -22.4]].forEach(function (ch) {
        on(ch[0], ch[1], 1.0, 1.2, 1.0, C.steelD);
        on(ch[0], ch[1] + (ch[1] > -20 ? 0.45 : -0.45), 1.0, 1.2, 0.18, C.steel, 0.5);
      });
      on(-9.5, -22, 0.18, 3.2, 5.2, C.white);
      on(-9.38, -22, 0.05, 0.16, 4.2, C.red, 2.3);
    });

    /* 06 交付服务：月台、瓦楞集装箱、货车与货架。 */
    inZone(5, function () {
      on(35, -26.5, 19, 1.2, 9, C.floor2);
      [[33.5, -24.5, C.steel], [33.5, -28.4, C.wood], [39.5, -24.5, C.wood], [39.5, -28.4, C.steel]].forEach(function (cr) {
        on(cr[0], cr[1], 2.2, 1.6, 2.2, cr[2]);
        on(cr[0], cr[1], 2.3, 0.12, 2.3, C.dark, 1.6);
      });
      [[31, -26.5, C.redD], [39, -26.5, C.steel]].forEach(function (ct) {
        on(ct[0], ct[1], 6.2, 2.6, 2.6, ct[2]);
        on(ct[0], ct[1], 6.4, 0.20, 2.8, C.dark, 2.6);
        for (var rb = -2.4; rb <= 2.4; rb += 0.8) on(ct[0] + rb, ct[1] - 1.34, 0.10, 2.4, 0.08, C.dark);
      });
      on(35, -21.5, 5.6, 2.4, 2.4, C.white);
      on(31.4, -21.5, 1.9, 1.7, 2.4, C.white);
      on(31.0, -21.5, 0.5, 0.9, 1.6, C.glass);
      [[32, -22.9], [32, -20.1], [37, -22.9], [37, -20.1]].forEach(function (wh) {
        on(wh[0], wh[1], 0.8, 0.9, 0.28, C.rubber);
      });
      [[44, -9], [44, -13.5]].forEach(function (rk) {
        on(rk[0], rk[1], 1.5, 6.0, 0.12, C.steel);
        on(rk[0], rk[1], 1.5, 0.12, 4.0, C.steel, 0.35);
        on(rk[0], rk[1], 1.5, 0.12, 4.0, C.steel, 2.4);
        on(rk[0], rk[1], 1.5, 0.12, 4.0, C.steel, 4.5);
        on(rk[0], rk[1] - 1.4, 1.2, 0.9, 1.2, C.wood, 0.5);
        on(rk[0], rk[1] + 1.2, 1.2, 1.5, 1.2, C.wood, 2.5);
      });
    });
    inZone(1, function () {
      [[-6, 20], [-6, 24]].forEach(function (v) {
        on(v[0], v[1], 1.4, 5.6, 0.12, C.steel);
        on(v[0], v[1], 1.4, 0.12, 3.6, C.steel, 0.4);
        on(v[0], v[1], 1.4, 0.12, 3.6, C.steel, 2.4);
        on(v[0], v[1], 1.4, 0.12, 3.6, C.steel, 4.4);
      });
    });

    [[-12, 6], [22, 20], [-16, 20], [12, -6], [24, -8]].forEach(function (p, i) {
      on(p[0], p[1], 2.4, 1.1 + (i % 2) * 0.4, 2.0, C.wood);
      on(p[0], p[1], 2.6, 0.14, 2.2, C.dark, 1.1 + (i % 2) * 0.4);
    });

    /* 真实几何细节补足到约 700 实例：地脚、边线、立柱连接件与设备散热片。
       固定种子，避免每次加载布局抖动；不使用透明实例或后处理。 */
    var seed = 20261114;
    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    var detail = 0;
    while (boxes.length < 696) {
      var zi = detail % 6;
      var zr = zoneRects[zi];
      var edge = detail % 4;
      var along = random() - 0.5;
      var ex = zr[0], ez = zr[1];
      if (edge < 2) {
        ex += along * (zr[2] - 2);
        ez += (edge === 0 ? -1 : 1) * (zr[3] / 2 - 0.8);
      } else {
        ex += (edge === 2 ? -1 : 1) * (zr[2] / 2 - 0.8);
        ez += along * (zr[3] - 2);
      }
      inZone(zi, function () {
        if (detail % 3 === 0) {
          on(ex, ez, 0.18, 0.46, 0.18, C.steelD, 0.22);
          on(ex, ez, 0.30, 0.07, 0.30, C.yellow, 0.68);
        } else if (detail % 3 === 1) {
          on(ex, ez, 0.55, 0.055, 0.12, C.lane, 0.24);
        } else {
          on(ex, ez, 0.22, 0.10, 0.22, C.steel, 0.24);
        }
      });
      detail++;
    }
    /* 四个红色角标，明确总图边界。 */
    [[-46, -30], [46, -30], [-46, 30], [46, 30]].forEach(function (p) {
      on(p[0], p[1], 0.45, 0.22, 0.45, C.red, 0.28);
    });

    var instanceData = new Float32Array(boxes.length * 11);
    for (var i = 0; i < boxes.length; i++) {
      for (var j = 0; j < 11; j++) instanceData[i * 11 + j] = boxes[i][j];
    }

    /* ---------- 着色器：单 Pass，高度 AO + 定向光 + 距离雾 ---------- */
    var vsSrc = [
      "#version 300 es",
      "in vec3 aPos;", "in vec3 aNormal;",
      "in vec3 iOffset;", "in vec3 iScale;", "in vec3 iColor;",
      "in float iZone;", "in float iKind;",
      "uniform mat4 uVP;",
      "out vec3 vNormal;", "out vec3 vColor;", "out vec3 vWorld;",
      "out float vZone;", "out float vKind;",
      "void main(){",
      "  vec3 world = iOffset + aPos * iScale;",
      "  vNormal = normalize(aNormal / max(iScale, vec3(0.0001)));",
      "  vColor = iColor; vWorld = world; vZone = iZone; vKind = iKind;",
      "  gl_Position = uVP * vec4(world, 1.0);",
      "}"
    ].join("\n");
    var fsSrc = [
      "#version 300 es",
      "precision highp float;",
      "in vec3 vNormal;", "in vec3 vColor;", "in vec3 vWorld;",
      "in float vZone;", "in float vKind;",
      "uniform vec3 uCam;", "uniform vec3 uFog;", "uniform vec3 uLight;",
      "uniform float uActiveZone;", "uniform float uTime;", "uniform float uIntensity;",
      "out vec4 outColor;",
      "void main(){",
      "  vec3 n = normalize(vNormal);",
      "  float diff = max(dot(n, normalize(uLight)), 0.0);",
      "  float fill = max(dot(n, normalize(vec3(-0.5, 0.25, -0.7))), 0.0) * 0.18;",
      "  float ao = mix(0.64, 1.0, smoothstep(-1.2, 4.2, vWorld.y));",
      "  vec3 col = vColor * (0.43 + 0.72 * diff + fill) * ao;",
      "  col += vColor * 0.14 * smoothstep(0.55, 1.0, n.y);",
      "  float focused = step(-0.5, uActiveZone);",
      "  float other = focused * (1.0 - step(abs(vZone - uActiveZone), 0.1)) * step(-0.5, vZone);",
      "  col = mix(col, uFog, other * 0.24);",
      "  float selected = step(abs(vZone - uActiveZone), 0.1) * focused;",
      "  float pulse = 1.0 + selected * step(0.5, vKind) * sin(uTime * 2.0) * 0.08 * uIntensity;",
      "  col *= pulse;",
      "  float d = distance(vWorld, uCam);",
      "  float fog = smoothstep(125.0, 310.0, d);",
      "  col = mix(col, uFog, fog * 0.88);",
      "  outColor = vec4(col, 1.0);",
      "}"
    ].join("\n");

    var resources = { shaders: [], buffers: [], vao: null, program: null };
    function cleanupGL() {
      if (!gl) return;
      resources.shaders.forEach(function (s) { gl.deleteShader(s); });
      resources.buffers.forEach(function (b) { gl.deleteBuffer(b); });
      if (resources.vao) gl.deleteVertexArray(resources.vao);
      if (resources.program) gl.deleteProgram(resources.program);
      resources = { shaders: [], buffers: [], vao: null, program: null };
    }
    function compile(type, src) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var message = gl.getShaderInfoLog(shader) || "Shader compile failed";
        gl.deleteShader(shader);
        throw new Error(message);
      }
      resources.shaders.push(shader);
      return shader;
    }

    var prog, vao, ibo;
    var idx = [];
    try {
      var vs = compile(gl.VERTEX_SHADER, vsSrc);
      var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
      prog = gl.createProgram();
      resources.program = prog;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "Shader link failed");
      gl.useProgram(prog);

      var faces = [
        { n: [0, 0, 1], v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
        { n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
        { n: [1, 0, 0], v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5]] },
        { n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
        { n: [0, 1, 0], v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
        { n: [0, -1, 0], v: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] }
      ];
      var verts = [], norms = [];
      faces.forEach(function (face, fi) {
        face.v.forEach(function (p) {
          verts.push(p[0], p[1], p[2]);
          norms.push(face.n[0], face.n[1], face.n[2]);
        });
        var base = fi * 4;
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      });

      function attr(buffer, data, location, size, stride, offset, divisor) {
        resources.buffers.push(buffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride || 0, offset || 0);
        if (divisor) gl.vertexAttribDivisor(location, divisor);
      }
      vao = gl.createVertexArray();
      resources.vao = vao;
      gl.bindVertexArray(vao);
      attr(gl.createBuffer(), new Float32Array(verts), gl.getAttribLocation(prog, "aPos"), 3);
      attr(gl.createBuffer(), new Float32Array(norms), gl.getAttribLocation(prog, "aNormal"), 3);
      ibo = gl.createBuffer();
      resources.buffers.push(ibo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      var instBuf = gl.createBuffer();
      resources.buffers.push(instBuf);
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.STATIC_DRAW);
      [
        ["iOffset", 3, 0], ["iScale", 3, 12], ["iColor", 3, 24],
        ["iZone", 1, 36], ["iKind", 1, 40]
      ].forEach(function (a) {
        var location = gl.getAttribLocation(prog, a[0]);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, a[1], gl.FLOAT, false, 44, a[2]);
        gl.vertexAttribDivisor(location, 1);
      });
      gl.bindVertexArray(null);
    } catch (error) {
      cleanupGL();
      return fallbackController(canvas, onError, error);
    }

    /* ---------- 相机：总图 + 六区，900ms easeInOutCubic ---------- */
    var PRESETS = [
      { target: [-30, 1.4, 16], distance: 61, yaw: 0.58, pitch: 0.69 },
      { target: [5, 1.4, 16], distance: 62, yaw: 0.76, pitch: 0.72 },
      { target: [-30, 1.4, -16], distance: 62, yaw: 0.38, pitch: 0.72 },
      { target: [35, 1.4, 16], distance: 54, yaw: -0.56, pitch: 0.66 },
      { target: [5, 1.4, -16], distance: 58, yaw: 0.30, pitch: 0.72 },
      { target: [35, 1.4, -16], distance: 54, yaw: -0.64, pitch: 0.68 }
    ];
    var HOME = { target: [0, 0.2, 0], distance: 139, yaw: 0.72, pitch: 0.64 };
    function cloneCamera(c) {
      return { target: c.target.slice(), distance: c.distance, yaw: c.yaw, pitch: c.pitch };
    }
    var current = cloneCamera(HOME);
    var selectedZone = OVERVIEW;
    var transition = null;
    var dragYaw = 0, dragPitch = 0;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function mix(a, b, t) { return a + (b - a) * t; }
    function normalize(v) {
      var length = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / length, v[1] / length, v[2] / length];
    }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function cross(a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }
    function perspective(fovy, aspect, near, far) {
      var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
    }
    function lookAt(eye, center) {
      var z = normalize(sub(eye, center));
      var x = normalize(cross([0, 1, 0], z));
      var y = cross(z, x);
      return new Float32Array([
        x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
        -x[0] * eye[0] - x[1] * eye[1] - x[2] * eye[2],
        -y[0] * eye[0] - y[1] * eye[1] - y[2] * eye[2],
        -z[0] * eye[0] - z[1] * eye[1] - z[2] * eye[2], 1
      ]);
    }
    function mul(a, b) {
      var out = new Float32Array(16);
      for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
        out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return out;
    }

    /* ---------- 尺寸、调度与可见性 ---------- */
    var dpr = 1, vw = 1, vh = 1;
    var nearViewport = false;
    var rafId = 0;
    var lastFrame = 0;
    var startTime = performance.now();
    var uVP = gl.getUniformLocation(prog, "uVP");
    var uCam = gl.getUniformLocation(prog, "uCam");
    var uFog = gl.getUniformLocation(prog, "uFog");
    var uLight = gl.getUniformLocation(prog, "uLight");
    var uActiveZone = gl.getUniformLocation(prog, "uActiveZone");
    var uTime = gl.getUniformLocation(prog, "uTime");
    var uIntensity = gl.getUniformLocation(prog, "uIntensity");

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.059, 0.071, 0.078, 1);

    function shouldAnimate() {
      return !destroyed && !failed && !reduced && intensity > 0 && nearViewport && !document.hidden;
    }
    function cameraPosition() {
      var yaw = current.yaw + dragYaw;
      var pitch = Math.max(0.32, Math.min(1.08, current.pitch + dragPitch));
      var flat = Math.cos(pitch) * current.distance;
      return [
        current.target[0] + Math.sin(yaw) * flat,
        current.target[1] + Math.sin(pitch) * current.distance,
        current.target[2] + Math.cos(yaw) * flat
      ];
    }
    function render(now) {
      if (destroyed || failed || document.hidden) return;
      if (transition) {
        var raw = Math.min(1, (now - transition.started) / TRANSITION);
        var t = easeInOutCubic(raw);
        for (var k = 0; k < 3; k++) current.target[k] = mix(transition.from.target[k], transition.to.target[k], t);
        current.distance = mix(transition.from.distance, transition.to.distance, t);
        current.yaw = mix(transition.from.yaw, transition.to.yaw, t);
        current.pitch = mix(transition.from.pitch, transition.to.pitch, t);
        if (raw >= 1) {
          current = cloneCamera(transition.to);
          transition = null;
        }
      }
      var pos = cameraPosition();
      var projection = perspective(39 * PI / 180, vw / Math.max(1, vh), 0.5, 600);
      var vp = mul(projection, lookAt(pos, current.target));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniformMatrix4fv(uVP, false, vp);
      gl.uniform3f(uCam, pos[0], pos[1], pos[2]);
      gl.uniform3f(uFog, 0.059, 0.071, 0.078);
      gl.uniform3f(uLight, 0.42, 0.82, 0.38);
      gl.uniform1f(uActiveZone, selectedZone);
      gl.uniform1f(uTime, (now - startTime) / 1000);
      gl.uniform1f(uIntensity, intensity);
      gl.bindVertexArray(vao);
      gl.drawElementsInstanced(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0, boxes.length);
      gl.bindVertexArray(null);
    }
    function frame(now) {
      rafId = 0;
      if (!shouldAnimate()) return;
      /* 动画/相机更新最高 60fps；低强度模式同时降低渲染频率。 */
      var interval = intensity < 0.5 ? 50 : 16;
      if (now - lastFrame >= interval) {
        render(now);
        lastFrame = now;
      }
      rafId = requestAnimationFrame(frame);
    }
    function syncLoop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (shouldAnimate()) rafId = requestAnimationFrame(frame);
    }
    function requestFrame() {
      if (destroyed || failed || document.hidden || !nearViewport) return;
      render(performance.now());
      syncLoop();
    }
    function resize() {
      if (destroyed || failed) return;
      var rect = canvas.getBoundingClientRect();
      vw = Math.max(1, Math.round(rect.width || canvas.clientWidth || 1));
      vh = Math.max(1, Math.round(rect.height || canvas.clientHeight || 1));
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      var width = Math.max(1, Math.round(vw * dpr));
      var height = Math.max(1, Math.round(vh * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      requestFrame();
    }

    function setZone(index, immediate) {
      if (destroyed || failed) return;
      if (index !== OVERVIEW && (typeof index !== "number" || index % 1 !== 0 || index < 0 || index > 5)) return;
      immediate = immediate === undefined ? false : !!immediate;
      var next = cloneCamera(index === OVERVIEW ? HOME : PRESETS[index]);
      selectedZone = index;
      dragYaw = 0;
      dragPitch = 0;
      if (immediate || reduced || intensity === 0) {
        transition = null;
        current = next;
      } else {
        var from = cloneCamera(current);
        var delta = ((next.yaw - from.yaw + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
        next.yaw = from.yaw + delta;
        transition = { from: from, to: next, started: performance.now() };
      }
      requestFrame();
    }
    function setIntensity(level) {
      if (destroyed || failed) return;
      level = Number(level);
      if (!isFinite(level)) return;
      intensity = Math.max(0, Math.min(1, level));
      if (reduced) intensity = 0;
      if (intensity === 0 && transition) {
        current = cloneCamera(transition.to);
        transition = null;
      }
      requestFrame();
    }

    /* 只监听 canvas 内拖动；不监听 wheel，不调用 preventDefault。 */
    var dragging = false, dragPointer = null, lastX = 0, lastY = 0;
    function pointerDown(event) {
      if (event.button !== 0 || dragging) return;
      dragging = true;
      dragPointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch (ignore) {}
    }
    function pointerMove(event) {
      if (!dragging || event.pointerId !== dragPointer) return;
      var dx = event.clientX - lastX, dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      dragYaw = Math.max(-0.32, Math.min(0.32, dragYaw - dx * 0.0022));
      dragPitch = Math.max(-0.16, Math.min(0.16, dragPitch + dy * 0.0016));
      requestFrame();
    }
    function pointerUp(event) {
      if (event.pointerId !== dragPointer) return;
      dragging = false;
      dragPointer = null;
      try { canvas.releasePointerCapture(event.pointerId); } catch (ignore) {}
    }
    function visibilityChange() {
      if (!document.hidden) requestFrame();
      else syncLoop();
    }
    function motionChange(event) {
      reduced = !!event.matches;
      if (reduced) {
        intensity = 0;
        if (transition) {
          current = cloneCamera(transition.to);
          transition = null;
        }
      }
      requestFrame();
    }
    function contextLost(event) {
      event.preventDefault();
      if (destroyed || failed) return;
      failed = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      var fallback = fallbackController(canvas, onError, new Error("WebGL context lost"));
      fallbackCleanup = fallback.destroy;
    }

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("webglcontextlost", contextLost, false);
    document.addEventListener("visibilitychange", visibilityChange);
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", motionChange);
    else if (motionQuery.addListener) motionQuery.addListener(motionChange);

    var resizeObserver = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }
    var intersectionObserver = null;
    if (window.IntersectionObserver) {
      intersectionObserver = new IntersectionObserver(function (entries) {
        nearViewport = !!(entries[0] && entries[0].isIntersecting);
        if (nearViewport) requestFrame();
        else syncLoop();
      }, { rootMargin: "180px 0px", threshold: 0 });
      intersectionObserver.observe(canvas);
    } else {
      nearViewport = true;
    }

    var controller = {
      setZone: setZone,
      setIntensity: setIntensity,
      resize: resize,
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        fallbackCleanup();
        fallbackCleanup = noop;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", resize);
        if (intersectionObserver) intersectionObserver.disconnect();
        canvas.removeEventListener("pointerdown", pointerDown);
        canvas.removeEventListener("pointermove", pointerMove);
        canvas.removeEventListener("pointerup", pointerUp);
        canvas.removeEventListener("pointercancel", pointerUp);
        canvas.removeEventListener("webglcontextlost", contextLost);
        document.removeEventListener("visibilitychange", visibilityChange);
        if (motionQuery.removeEventListener) motionQuery.removeEventListener("change", motionChange);
        else if (motionQuery.removeListener) motionQuery.removeListener(motionChange);
        cleanupGL();
        gl = null;
      }
    };

    resize();
    /* 无 IntersectionObserver 时退化为始终可见；否则等待观察回调再渲染。 */
    if (!window.IntersectionObserver) {
      nearViewport = true;
      requestFrame();
    }
    syncLoop();
    try { onReady(controller); } catch (ignore) {}
    return controller;
  }

  window.HongTuScene = { init: init };
})();
