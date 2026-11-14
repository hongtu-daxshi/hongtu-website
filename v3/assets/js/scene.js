/* 红涂大师 · 现场总图
   原生 WebGL2，实例化轴对齐盒子，零依赖。
   滚动驱动相机沿关键帧巡览；指针可微转视角。
   -------------------------------------------------- */
(function () {
  "use strict";

  var stage = document.querySelector(".stage");
  var pin = document.getElementById("stagePin");
  var canvas = document.getElementById("scene");
  if (!stage || !pin || !canvas) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia("(max-width: 860px)").matches;

  function flat() {
    stage.classList.add("is-flat");
  }
  if (reduce || small) { flat(); return; }

  var gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: "high-performance"
  });
  if (!gl) { flat(); return; }

  /* ---------- 场景数据 ---------- */
  var PI = Math.PI;
  var C = {
    floor:  [0.64, 0.62, 0.56],
    floor2: [0.59, 0.57, 0.52],
    floor3: [0.53, 0.53, 0.50],
    steel:  [0.38, 0.40, 0.42],
    steelD: [0.24, 0.26, 0.28],
    white:  [0.84, 0.82, 0.76],
    dark:   [0.12, 0.13, 0.14],
    yellow: [0.93, 0.71, 0.12],
    lane:   [0.95, 0.93, 0.86],
    red:    [0.76, 0.21, 0.17],
    redD:   [0.56, 0.15, 0.12],
    glass:  [0.14, 0.19, 0.22],
    screen: [0.10, 0.14, 0.17],
    green:  [0.22, 0.31, 0.23],
    wood:   [0.44, 0.37, 0.28],
    grid:   [0.22, 0.24, 0.26]
  };

  var boxes = [];
  function box(x, y, z, w, h, d, c) {
    boxes.push([x, y, z, w, h, d, c[0], c[1], c[2]]);
  }
  function on(x, z, w, h, d, c, base) {
    var b = base === undefined ? 0 : base;
    box(x, b + h / 2, z, w, h, d, c);
  }
  function line(x, z, w, d, c, base) {
    var b = base === undefined ? 0.03 : base;
    box(x, b, z, w, 0.06, d, c);
  }

  /* 地坪与基座 */
  box(0, -3.4, 0, 460, 0.2, 460, [0.075, 0.082, 0.09]);
  box(0, -0.7, 0, 96, 1.4, 64, C.steelD);
  on(0, 0, 96, 0.28, 64, C.floor);

  /* 场内基准线：极淡的轴线，让地坪不再是一块板 */
  for (var gx2 = -44; gx2 <= 44; gx2 += 11) {
    line(gx2, -16, 0.1, 62, [0.50, 0.49, 0.46], 0.3);
  }
  for (var gz2 = -28; gz2 <= 28; gz2 += 11) {
    line(0, gz2, 94, 0.1, [0.50, 0.49, 0.46], 0.3);
  }

  /* 场外测绘网格：让模型像一张摊开的现场图 */
  for (var gx = -90; gx <= 90; gx += 12) {
    box(gx, -2.4, 0, 0.14, 0.08, 190, C.grid);
  }
  for (var gz = -90; gz <= 90; gz += 12) {
    box(0, -2.4, gz, 190, 0.08, 0.14, C.grid);
  }

  /* 分区地面色块 */
  on(-30, 16, 31, 0.06, 27, C.floor2, 0.14);
  on(5, 16, 31, 0.06, 27, C.floor2, 0.14);
  on(-30, -16, 31, 0.06, 27, C.floor3, 0.14);
  on(35, 16, 22, 0.06, 27, C.floor2, 0.14);
  on(5, -16, 31, 0.06, 27, C.floor3, 0.14);
  on(35, -16, 22, 0.06, 27, C.floor3, 0.14);

  /* 主通道：黄线 + 虚线 */
  line(0, 2.4, 94, 0.45, C.yellow);
  line(0, -2.4, 94, 0.45, C.yellow);
  for (var dx = -44; dx <= 44; dx += 8) {
    line(dx, 0, 3.4, 0.3, C.lane, 0.04);
  }

  /* 外墙（后、左、右）与柱 */
  on(0, -31.4, 96, 9, 1.2, C.steelD);
  on(-47.4, -16, 1.2, 9, 32, C.steelD);
  on(47.4, -12, 1.2, 9, 24, C.steelD);
  for (var cx = -42; cx <= 42; cx += 12) {
    on(cx, -30.4, 1.1, 9.2, 1.1, C.steel);
  }
  for (var cz = -28; cz <= -6; cz += 11) {
    on(-46.4, cz, 1.1, 9.2, 1.1, C.steel);
  }
  for (var cz2 = -26; cz2 <= -4; cz2 += 11) {
    on(46.4, cz2, 1.1, 9.2, 1.1, C.steel);
  }

  // 屋面保持开口，不做桁架——俯瞰时更干净

  // 侧墙采光带
  for (var wz = 6; wz <= 26; wz += 7) {
    on(-46.9, wz, 0.22, 2.4, 4.4, C.white, 4.4);
  }

  /* 六个红色定位标：宽景里像六枚图钉 */
  [
    [-44, 27], [-9, 27], [-44, -28],
    [26, 8], [-9, -28], [26, -28]
  ].forEach(function (m) {
    box(m[0], 2.6, m[1], 0.5, 5.2, 0.5, C.red);
    box(m[0], 5.35, m[1], 1.5, 0.3, 1.5, C.red);
  });

  /* 01 空间界面：三台设备 + 白板墙 */
  [-38, -30, -22].forEach(function (mx, i) {
    on(mx, 16, 6.2, 2.1, 4.6, C.steel);
    on(mx - 1.1, 18.9, 1.9, 3.5, 1.4, C.steelD);
    on(mx + 1.2, 16, 1.2, 1.1, 1.4, C.white);
    line(mx, 11.4, 6.6, 0.24, C.yellow);
    if (i === 0) on(mx + 4.6, 12.4, 2.2, 1.1, 1.8, C.wood);
  });
  [-40, -33, -26].forEach(function (wx) {
    on(wx, 27.5, 5.4, 3.4, 0.2, C.white);
    on(wx, 27.5, 5.6, 0.2, 3.6, C.steelD);
  });

  /* 02 目视化：人行道、看板、标识牌 */
  line(-6.5, 16, 0.4, 26, C.lane);
  line(-1.5, 16, 0.4, 26, C.lane);
  // 地面箭头
  for (var ay = 6; ay <= 24; ay += 6) {
    line(-4, ay, 0.5, 3.4, C.yellow, 0.05);
    box(-4, 0.05, ay - 2.1, 1.8, 0.06, 1.0, C.yellow);
  }
  // 大看板
  on(18.5, 12, 0.4, 5.4, 9.4, C.white);
  on(18.5, 12, 0.5, 0.5, 9.8, C.red);
  on(18.1, 8.7, 0.2, 5.0, 8.6, C.dark);
  on(18.75, 12, 0.25, 4.6, 8.2, C.glass);
  // 立牌
  [-9, -5, -1, 3, 7, 11].forEach(function (sx) {
    on(sx, 4.4, 0.16, 2.6, 0.16, C.steelD);
    on(sx, 4.4, 1.0, 1.0, 0.1, C.white, 2.4);
    on(sx, 4.4, 0.7, 0.7, 0.04, C.red, 2.55);
  });
  // 红框安全区
  line(8, 20, 10.4, 0.22, C.red);
  line(8, 26, 10.4, 0.22, C.red);
  line(3, 23, 0.22, 6.4, C.red);
  line(13, 23, 0.22, 6.4, C.red);
  on(8, 23, 4.2, 1.4, 3.2, C.wood);
  on(8, 23, 4.4, 0.16, 3.4, C.dark, 1.4);

  /* 03 环境配套：灯杆、风管、配电柜 */
  [-42, -34, -26, -18].forEach(function (lx) {
    on(lx, -25, 0.26, 8.6, 0.26, C.steelD);
    on(lx, -25, 2.6, 0.28, 1.1, C.white, 8.6);
    on(lx, 6, 1.0, 2.2, 1.0, C.steel);
  });
  // 沿左墙的管线束，不横穿场地
  on(-45.6, -16, 0.7, 0.7, 24, C.steel, 6.9);
  on(-45.6, -16, 0.4, 0.4, 24, C.steelD, 7.8);
  // 空气处理机组：让这个分区有一个明确的体块
  [-41, -33].forEach(function (ax) {
    on(ax, -6, 6.0, 3.8, 3.4, C.white);
    on(ax, -6, 6.2, 0.5, 3.6, C.steelD, 3.8);
    on(ax, -7.6, 5.0, 1.6, 0.14, C.dark, 1.2);
    on(ax, -7.6, 5.0, 0.14, 1.4, C.dark, 1.2);
    on(ax, -4.2, 0.5, 3.2, 0.5, C.steel);
  });
  [-25, -19].forEach(function (px) {
    on(px, -14, 0.5, 0.5, 12, C.steel);
    on(px, -14, 0.5, 0.5, 12, C.steelD, 6.4);
  });
  [-16, -12, -8].forEach(function (ex) {
    on(-45, ex, 2.2, 3.0, 1.4, C.white);
    on(-45, ex, 2.4, 0.5, 1.5, C.steelD, 3.0);
  });
  on(-20, -28, 6.4, 0.06, 4.2, C.yellow, 0.2);

  /* 04 厂区形象：门头、接待、绿植 */
  on(29, 10, 1.4, 7.2, 1.4, C.red);
  on(43, 10, 1.4, 7.2, 1.4, C.red);
  on(36, 10, 16.4, 1.5, 1.5, C.red);
  on(36, 10, 10.4, 2.0, 0.35, C.white, 6.4);
  on(36, 10, 8.4, 1.2, 0.35, C.dark, 7.0);
  on(34, 15, 5.2, 1.1, 2.0, C.white);
  on(34, 15, 5.4, 0.18, 2.2, C.dark, 1.1);
  [[27, 22], [45, 22], [27, 27]].forEach(function (p) {
    on(p[0], p[1], 2.4, 0.7, 2.4, C.steelD);
    on(p[0], p[1], 1.9, 0.5, 1.9, C.green, 0.7);
    on(p[0], p[1], 0.34, 2.2, 0.34, C.wood, 1.2);
  });
  on(45.6, 18, 0.5, 5.2, 8.4, C.white);
  on(45.3, 18, 0.2, 4.4, 7.4, C.glass);

  /* 05 数字与软实力：大屏、会议桌、白板 */
  on(4, -29.2, 14.4, 6.2, 0.5, C.steelD);
  on(4, -28.9, 13.4, 5.4, 0.12, C.screen);
  on(4, -28.8, 4.6, 0.9, 0.06, C.red);
  on(4, -28.8, 8.4, 0.5, 0.06, C.yellow);
  on(5, -20, 8.4, 0.9, 3.2, C.white);
  on(5, -20, 8.6, 0.12, 3.4, C.dark, 0.9);
  [[2, -17.6], [5, -17.6], [8, -17.6], [2, -22.4], [5, -22.4], [8, -22.4]].forEach(function (ch) {
    on(ch[0], ch[1], 1.0, 1.2, 1.0, C.steelD);
  });
  on(-9.5, -22, 0.2, 3.2, 5.2, C.white);

  /* 06 交付服务：月台、集装箱、货车、货架 */
  on(35, -26.5, 19, 1.2, 9, C.floor2);
  [[33.5, -24.5, C.steel], [33.5, -28.4, C.wood], [39.5, -24.5, C.wood], [39.5, -28.4, C.steel]].forEach(function (cr) {
    on(cr[0], cr[1], 2.2, 1.6, 2.2, cr[2]);
    on(cr[0], cr[1], 2.3, 0.12, 2.3, C.dark, 1.6);
  });
  // 集装箱：加竖向瓦楞，远看才像箱体
  [[31, -26.5, C.redD], [39, -26.5, C.steel]].forEach(function (ct) {
    on(ct[0], ct[1], 6.2, 2.6, 2.6, ct[2]);
    on(ct[0], ct[1], 6.4, 0.22, 2.8, C.dark, 2.6);
    for (var rb = -2.4; rb <= 2.4; rb += 0.8) {
      on(ct[0] + rb, ct[1] - 1.34, 0.12, 2.4, 0.1, C.dark);
    }
  });
  // 厢式货车
  on(35, -21.5, 5.6, 2.4, 2.4, C.white);
  on(31.4, -21.5, 1.9, 1.7, 2.4, C.white);
  on(31.0, -21.5, 0.5, 0.9, 1.6, C.glass);
  [[32, -22.9], [32, -20.1], [37, -22.9], [37, -20.1]].forEach(function (wh) {
    on(wh[0], wh[1], 0.8, 0.9, 0.3, C.dark);
  });
  [[44, -9], [44, -13.5]].forEach(function (rk) {
    on(rk[0], rk[1], 1.5, 6.0, 0.14, C.steel);
    on(rk[0], rk[1], 1.5, 0.14, 4.0, C.steel, 0.35);
    on(rk[0], rk[1], 1.5, 0.14, 4.0, C.steel, 2.4);
    on(rk[0], rk[1], 1.5, 0.14, 4.0, C.steel, 4.5);
    on(rk[0], rk[1] - 1.4, 1.2, 0.9, 1.2, C.wood, 0.5);
    on(rk[0], rk[1] + 1.2, 1.2, 1.5, 1.2, C.wood, 2.5);
  });
  [[-6, 20], [-6, 24]].forEach(function (v) {
    on(v[0], v[1], 1.4, 5.6, 0.12, C.steel);
    on(v[0], v[1], 1.4, 0.12, 3.6, C.steel, 0.4);
    on(v[0], v[1], 1.4, 0.12, 3.6, C.steel, 2.4);
    on(v[0], v[1], 1.4, 0.12, 3.6, C.steel, 4.4);
  });

  /* 散置托盘 */
  [[-12, 6], [22, 20], [-16, 20], [12, -6], [24, -8]].forEach(function (p, i) {
    on(p[0], p[1], 2.4, 1.1 + (i % 2) * 0.4, 2.0, C.wood);
    on(p[0], p[1], 2.6, 0.14, 2.2, C.dark, 1.1 + (i % 2) * 0.4);
  });

  var instanceData = new Float32Array(boxes.length * 9);
  for (var i = 0; i < boxes.length; i++) {
    for (var j = 0; j < 9; j++) instanceData[i * 9 + j] = boxes[i][j];
  }

  /* ---------- 着色器 ---------- */
  var vsSrc = [
    "#version 300 es",
    "in vec3 aPos;",
    "in vec3 aNormal;",
    "in vec3 iOffset;",
    "in vec3 iScale;",
    "in vec3 iColor;",
    "uniform mat4 uVP;",
    "out vec3 vNormal;",
    "out vec3 vColor;",
    "out vec3 vWorld;",
    "void main(){",
    "  vec3 world = iOffset + aPos * iScale;",
    "  vNormal = normalize(aNormal / max(iScale, vec3(0.0001)));",
    "  vColor = iColor;",
    "  vWorld = world;",
    "  gl_Position = uVP * vec4(world, 1.0);",
    "}"
  ].join("\n");

  var fsSrc = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vNormal;",
    "in vec3 vColor;",
    "in vec3 vWorld;",
    "uniform vec3 uCam;",
    "uniform vec3 uFog;",
    "uniform vec3 uLight;",
    "out vec4 outColor;",
    "void main(){",
    "  vec3 n = normalize(vNormal);",
    "  float diff = max(dot(n, uLight), 0.0);",
    "  float fill = max(dot(n, normalize(vec3(-0.5, 0.25, -0.7))), 0.0) * 0.22;",
    "  float ao = mix(0.58, 1.0, smoothstep(-1.5, 5.0, vWorld.y));",
    "  vec3 col = vColor * (0.36 + 0.88 * diff + fill) * ao;",
    "  col += vColor * 0.18 * smoothstep(0.55, 1.0, n.y);",
    "  float d = distance(vWorld, uCam);",
    "  float fog = smoothstep(95.0, 290.0, d);",
    "  col = mix(col, uFog, fog * 0.92);",
    "  outColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("shader", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, vsSrc);
  var fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) { flat(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("link", gl.getProgramInfoLog(prog));
    flat();
    return;
  }
  gl.useProgram(prog);

  /* ---------- 立方体几何 ---------- */
  var faces = [
    { n: [0, 0, 1], v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
    { n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
    { n: [1, 0, 0], v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
    { n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
    { n: [0, 1, 0], v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
    { n: [0, -1, 0], v: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] }
  ];
  var verts = [];
  var norms = [];
  var idx = [];
  faces.forEach(function (f, fi) {
    f.v.forEach(function (p) {
      verts.push(p[0], p[1], p[2]);
      norms.push(f.n[0], f.n[1], f.n[2]);
    });
    var b = fi * 4;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });

  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  function attr(buffer, data, loc, size, stride, offset) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
  }

  var aPos = gl.getAttribLocation(prog, "aPos");
  var aNormal = gl.getAttribLocation(prog, "aNormal");
  var iOffset = gl.getAttribLocation(prog, "iOffset");
  var iScale = gl.getAttribLocation(prog, "iScale");
  var iColor = gl.getAttribLocation(prog, "iColor");

  attr(gl.createBuffer(), new Float32Array(verts), aPos, 3, 0, 0);
  attr(gl.createBuffer(), new Float32Array(norms), aNormal, 3, 0, 0);

  var ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

  var instBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.STATIC_DRAW);
  var stride = 9 * 4;
  [
    [iOffset, 3, 0],
    [iScale, 3, 12],
    [iColor, 3, 24]
  ].forEach(function (a) {
    gl.enableVertexAttribArray(a[0]);
    gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, stride, a[2]);
    gl.vertexAttribDivisor(a[0], 1);
  });

  gl.bindVertexArray(null);

  /* ---------- 相机关键帧 ---------- */
  var KEYS = [
    { t: 0.00, p: [84, 60, 104], g: [-4, -2, 2] },
    { t: 0.10, p: [-22, 34, 50], g: [-31, 1, 15] },
    { t: 0.25, p: [10, 32, 52], g: [6, 1, 14] },
    { t: 0.40, p: [2, 30, 2], g: [-30, 3, -14] },
    { t: 0.55, p: [50, 32, 52], g: [35, 1, 15] },
    { t: 0.69, p: [12, 36, 12], g: [5, 2, -18] },
    { t: 0.83, p: [38, 30, 10], g: [36, 2, -22] },
    { t: 1.00, p: [96, 72, 116], g: [-4, -2, 0] }
  ];

  function keyAt(p) {
    if (p <= KEYS[0].t) return { a: KEYS[0], b: KEYS[0], u: 0, i: 0 };
    for (var i = 0; i < KEYS.length - 1; i++) {
      if (p <= KEYS[i + 1].t) {
        var u = (p - KEYS[i].t) / (KEYS[i + 1].t - KEYS[i].t);
        return { a: KEYS[i], b: KEYS[i + 1], u: u, i: i };
      }
    }
    var last = KEYS.length - 1;
    return { a: KEYS[last], b: KEYS[last], u: 0, i: last };
  }

  function ease(u) {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }

  function mixVec(a, b, u) {
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }

  function camAt(p) {
    var k = keyAt(p);
    var u = ease(k.u);
    var pos = mixVec(k.a.p, k.b.p, u);
    var tgt = mixVec(k.a.g, k.b.g, u);
    // 柔和的弧线，避免直线飞行的机械感
    var arc = Math.sin(u * PI) * 0.5;
    pos[1] += arc * (k.i % 2 === 0 ? 5 : -3);
    return { pos: pos, tgt: tgt };
  }

  /* ---------- 矩阵 ---------- */
  function perspective(fovy, aspect, near, far, shift) {
    var f = 1 / Math.tan(fovy / 2);
    var nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      shift, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  function normalize(v) {
    var l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

  function lookAt(eye, center, up) {
    var z = normalize(sub(eye, center));
    var x = normalize(cross(up, z));
    var y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -x[0] * eye[0] - x[1] * eye[1] - x[2] * eye[2],
      -y[0] * eye[0] - y[1] * eye[1] - y[2] * eye[2],
      -z[0] * eye[0] - z[1] * eye[1] - z[2] * eye[2],
      1
    ]);
  }

  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) {
      for (var r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[r] * b[c * 4] +
          a[4 + r] * b[c * 4 + 1] +
          a[8 + r] * b[c * 4 + 2] +
          a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  /* ---------- 尺寸与渲染 ---------- */
  var dpr = 1;
  var vw = 1, vh = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    vw = canvas.clientWidth || window.innerWidth;
    vh = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  var uVP = gl.getUniformLocation(prog, "uVP");
  var uCam = gl.getUniformLocation(prog, "uCam");
  var uFog = gl.getUniformLocation(prog, "uFog");
  var uLight = gl.getUniformLocation(prog, "uLight");

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(0.059, 0.067, 0.075, 0);

  var pointer = { x: 0, y: 0 };
  var look = { x: 0, y: 0 };
  var drag = { active: false, lastX: 0, lastY: 0 };
  var dragYaw = 0;
  var progress = 0;
  var smooth = 0;
  var time = 0;
  var visible = true;

  pin.addEventListener("pointermove", function (e) {
    var r = pin.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (drag.active) {
      dragYaw += (e.clientX - drag.lastX) * 0.004;
      dragYaw = Math.max(-0.7, Math.min(0.7, dragYaw));
      drag.lastX = e.clientX;
    }
  });
  pin.addEventListener("pointerdown", function (e) {
    if (e.target.closest("a, button")) return;
    drag.active = true;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    pin.classList.add("is-dragging");
  });
  window.addEventListener("pointerup", function () {
    drag.active = false;
    pin.classList.remove("is-dragging");
  });
  pin.addEventListener("pointerleave", function () {
    pointer.x = 0;
    pointer.y = 0;
  });

  function readScroll() {
    var rect = stage.getBoundingClientRect();
    var total = stage.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, -rect.top / total));
  }

  function render() {
    var cam = camAt(smooth);
    var yaw = look.x + dragYaw;
    var pitch = look.y;

    var pos = cam.pos.slice();
    var tgt = cam.tgt.slice();
    // 绕目标点做微小环绕
    var dx = pos[0] - tgt[0];
    var dz = pos[2] - tgt[2];
    var cos = Math.cos(yaw), sin = Math.sin(yaw);
    pos[0] = tgt[0] + dx * cos - dz * sin;
    pos[2] = tgt[2] + dx * sin + dz * cos;
    pos[1] += pitch * 6;

    var shift = -0.06 - 0.14 * Math.min(1, Math.max(0, (smooth - 0.02) / 0.08));
    var proj = perspective((38 * PI) / 180, vw / vh, 1, 900, shift);
    var view = lookAt(pos, tgt, [0, 1, 0]);
    var vp = mul(proj, view);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uVP, false, vp);
    gl.uniform3f(uCam, pos[0], pos[1], pos[2]);
    gl.uniform3f(uFog, 0.059, 0.067, 0.075);
    gl.uniform3f(uLight, 0.42, 0.82, 0.38);
    gl.bindVertexArray(vao);
    gl.drawElementsInstanced(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0, boxes.length);
    gl.bindVertexArray(null);
  }

  var zones = Array.prototype.slice.call(document.querySelectorAll(".zone"));
  var railBtns = Array.prototype.slice.call(document.querySelectorAll("#zoneRail button"));
  var currentZone = -1;

  function setZone(z) {
    if (z === currentZone) return;
    currentZone = z;
    zones.forEach(function (el, i) {
      el.classList.toggle("is-on", i + 1 === z);
    });
    railBtns.forEach(function (b, i) {
      b.classList.toggle("is-on", i + 1 === z);
    });
  }

  function tick() {
    if (!visible || document.hidden) {
      requestAnimationFrame(tick);
      return;
    }
    time += 0.016;
    progress = readScroll();
    smooth += (progress - smooth) * 0.09;
    if (Math.abs(progress - smooth) < 0.0002) smooth = progress;

    // 指针缓动
    look.x += ((pointer.x * 0.06 + Math.sin(time * 0.13) * 0.012) - look.x) * 0.05;
    look.y += ((pointer.y * 0.035) - look.y) * 0.05;

    var touring = smooth > 0.02;
    stage.classList.toggle("is-touring", touring);

    var z = 0;
    if (smooth > 0.03) {
      if (smooth > 0.9) z = 7;
      else {
        var best = 1, bestD = 9;
        for (var k = 1; k <= 6; k++) {
          var d = Math.abs(smooth - KEYS[k].t);
          if (d < bestD) { bestD = d; best = k; }
        }
        z = best;
      }
    }
    setZone(z);

    render();
    requestAnimationFrame(tick);
  }

  var io = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
  }, { rootMargin: "120px" });
  io.observe(pin);

  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    flat();
  });

  render();
  stage.classList.add("is-live");
  requestAnimationFrame(tick);
})();
