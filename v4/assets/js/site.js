(function () {
  "use strict";

  var root = document.documentElement;
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var motionToggle = document.getElementById("motionToggle");
  var savedMotion = null;
  try { savedMotion = window.localStorage.getItem("hongtu-motion"); } catch (ignore) {}
  var manualReduced = savedMotion === "reduced";
  var sceneController = null;
  var sceneLive = false;
  var sceneFailed = false;
  var sceneViewport = document.getElementById("systemViewport");

  function isReduced() {
    return motionQuery.matches || manualReduced;
  }

  function applyMotion() {
    var reduced = isReduced();
    root.dataset.motion = reduced ? "reduced" : "full";
    if (motionToggle) {
      motionToggle.setAttribute("aria-pressed", String(reduced));
      motionToggle.textContent = motionQuery.matches ? "已跟随系统减少动态" : (reduced ? "恢复完整动效" : "减弱动态效果");
      motionToggle.disabled = motionQuery.matches;
    }
    if (sceneController) sceneController.setIntensity(reduced ? 0 : 1);
    if (sceneViewport) {
      sceneViewport.classList.toggle("is-flat", reduced || sceneFailed || !sceneLive);
      sceneViewport.classList.toggle("is-live", !reduced && !sceneFailed && sceneLive);
      var caption = sceneViewport.querySelector(".scene-caption");
      if (caption) caption.textContent = reduced ? "AI 场景示意｜已减少动态，当前为照片版" : (sceneFailed ? "AI 场景示意｜当前设备使用照片版" : "三维总图为空间关系示意，不代替施工图");
    }
    if (reduced) {
      document.querySelectorAll("[data-reveal], [data-reveal-item]").forEach(function (element) {
        element.classList.add("is-visible");
      });
      var deliveryImage = document.querySelector(".delivery-visual > img");
      if (deliveryImage) deliveryImage.style.transform = "none";
    } else if (!sceneController && !sceneFailed) {
      initialiseScene();
    }
  }

  if (motionToggle) {
    motionToggle.addEventListener("click", function () {
      manualReduced = !manualReduced;
      try { window.localStorage.setItem("hongtu-motion", manualReduced ? "reduced" : "full"); } catch (ignore) {}
      applyMotion();
    });
  }
  if (motionQuery.addEventListener) motionQuery.addEventListener("change", applyMotion);
  else if (motionQuery.addListener) motionQuery.addListener(applyMotion);

  var header = document.getElementById("siteHeader");
  var hero = document.querySelector(".hero");
  var progress = document.getElementById("readingProgress");
  var ticking = false;

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset;
    if (header && hero) header.classList.toggle("is-solid", y > hero.offsetHeight - header.offsetHeight - 20);
    if (progress) {
      var distance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = "scaleX(" + Math.min(1, y / distance) + ")";
    }
    if (!isReduced()) {
      var visual = document.querySelector(".delivery-visual");
      var image = visual && visual.querySelector(":scope > img");
      if (visual && image) {
        var rect = visual.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          var centreOffset = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
          image.style.transform = "translate3d(0," + (centreOffset * -7).toFixed(2) + "%,0) scale(1.02)";
        }
      }
    }
    ticking = false;
  }

  function requestScrollUI() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }
  window.addEventListener("scroll", requestScrollUI, { passive: true });
  window.addEventListener("resize", requestScrollUI, { passive: true });

  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");
  function closeMenu() {
    if (!menuToggle || !mainNav) return;
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "菜单";
    document.body.classList.remove("menu-open");
  }
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      var open = !mainNav.classList.contains("is-open");
      mainNav.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.textContent = open ? "关闭" : "菜单";
      document.body.classList.toggle("menu-open", open);
    });
    mainNav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeMenu(); });
  }

  var revealGroups = document.querySelectorAll("[data-reveal-group]");
  revealGroups.forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child) {
      if (!child.hasAttribute("data-reveal-item")) child.setAttribute("data-reveal-item", "");
    });
  });
  root.classList.add("motion-ready");
  var revealElements = document.querySelectorAll("[data-reveal], [data-reveal-item]");
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    revealElements.forEach(function (element) { revealObserver.observe(element); });
  } else {
    revealElements.forEach(function (element) { element.classList.add("is-visible"); });
  }

  var sectionLinks = document.querySelectorAll(".main-nav a[href^='#']");
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-25% 0px -60%", threshold: 0 });
    ["value", "system", "services", "delivery", "cases", "contact"].forEach(function (id) {
      var section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  var systemModules = [
    {
      title: "空间界面",
      scope: "从地面、墙面到钢结构与屋面，先检查基面和使用条件，再确定材料、颜色与施工边界。",
      value: "让生产环境更整洁、耐用，也为后续分区、划线和客户参观打好底。",
      outputs: ["基面检查", "材料建议", "色彩与分区", "翻新施工"]
    },
    {
      title: "目视化标识",
      scope: "把通道、区域、安全提示和现场看板放进同一套规则，明确谁走哪里、物放哪里、异常看哪里。",
      value: "减少找路、找物和口头解释，让新员工、客户与审核人员更快读懂现场。",
      outputs: ["功能分区", "通道划线", "安全标识", "现场看板"]
    },
    {
      title: "环境功能",
      scope: "把照明、机电与环保配套纳入现场规划；合作施工由红涂统管接口、进度和验收边界。",
      value: "减少专业之间互相等待和返工，让配套真正服务生产，而不是后补的一堆管线。",
      outputs: ["照明配合", "机电接口", "环保配套", "进度统管"]
    },
    {
      title: "厂区形象",
      scope: "从园区门头、前台到参观通道与文化展示，把客户实际经过的路线作为设计主线。",
      value: "让客户在进入车间之前就理解企业实力，让销售接待有一条可重复使用的参观路径。",
      outputs: ["门头入口", "接待空间", "参观动线", "文化展示"]
    },
    {
      title: "管理可视化",
      scope: "把区域责任、点检状态、生产信息和改善记录放到对应位置，明确更新人、更新频率和查看方式。",
      value: "让问题更快被看见，让班组交接和日常检查有据可查，而不是只在汇报时整理现场。",
      outputs: ["责任看板", "状态标识", "点检记录", "改善展示"]
    },
    {
      title: "交付服务",
      scope: "从现场体检、方案与排期，到夜间施工、逐项验收和维保，统一协调范围、接口与责任。",
      value: "减少多头沟通，让工期、验收和售后都能找到同一个责任主体。",
      outputs: ["现场体检", "夜间排期", "13项检查", "5年维保"]
    }
  ];
  var systemTabs = Array.prototype.slice.call(document.querySelectorAll(".system-tab"));
  var systemDetail = document.getElementById("systemDetail");
  var activeSystem = 0;

  function selectSystem(index, focusTab) {
    if (index < 0 || index >= systemModules.length) return;
    activeSystem = index;
    var data = systemModules[index];
    systemTabs.forEach(function (tab, tabIndex) {
      var selected = tabIndex === index;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-pressed", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.getElementById("systemNumber").textContent = String(index + 1).padStart(2, "0") + " / 06";
    document.getElementById("systemName").textContent = data.title;
    document.getElementById("systemProvide").textContent = data.scope;
    document.getElementById("systemValue").textContent = data.value;
    var outputs = document.getElementById("systemDeliverables");
    outputs.replaceChildren();
    data.outputs.forEach(function (output) {
      var item = document.createElement("li");
      item.textContent = output;
      outputs.appendChild(item);
    });
    if (systemDetail && !isReduced()) {
      systemDetail.classList.remove("is-changing");
      void systemDetail.offsetWidth;
      systemDetail.classList.add("is-changing");
    }
    if (sceneController) sceneController.setZone(index);
    if (focusTab) systemTabs[index].focus();
  }
  systemTabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () { selectSystem(index, false); });
    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % systemTabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + systemTabs.length) % systemTabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = systemTabs.length - 1;
      if (next !== null) {
        event.preventDefault();
        selectSystem(next, true);
      }
    });
  });
  var sceneHome = document.getElementById("viewReset");
  if (sceneHome) sceneHome.addEventListener("click", function () { if (sceneController) sceneController.setZone(-1); });

  function initialiseScene() {
    var canvas = document.getElementById("systemCanvas");
    if (!canvas || !sceneViewport || !window.HongTuScene || isReduced() || sceneFailed || sceneController) return;
    try {
      sceneController = window.HongTuScene.init({
        canvas: canvas,
        onReady: function (controller) {
          sceneLive = true;
          sceneViewport.classList.add("is-live");
          sceneViewport.classList.remove("is-flat");
          if (controller) controller.setZone(activeSystem, true);
        },
        onError: function () {
          sceneFailed = true;
          sceneLive = false;
          sceneViewport.classList.remove("is-live");
          sceneViewport.classList.add("is-flat");
          var caption = sceneViewport.querySelector(".scene-caption");
          if (caption) caption.textContent = "AI 场景示意｜当前设备使用照片版";
        }
      });
      if (sceneController) {
        sceneController.setIntensity(isReduced() ? 0 : 1);
        sceneController.setZone(activeSystem, true);
      }
    } catch (error) {
      sceneFailed = true;
      sceneLive = false;
      sceneViewport.classList.remove("is-live");
      sceneViewport.classList.add("is-flat");
    }
  }

  var serviceTabs = Array.prototype.slice.call(document.querySelectorAll(".service-tabs [role='tab']"));
  function selectService(key, focusTab) {
    var selectedTab = null;
    serviceTabs.forEach(function (tab) {
      var selected = tab.dataset.service === key;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) selectedTab = tab;
    });
    document.querySelectorAll(".service-panel").forEach(function (panel) {
      var selected = panel.dataset.servicePanel === key;
      panel.hidden = !selected;
      panel.classList.remove("is-entering");
      if (selected && !isReduced()) {
        void panel.offsetWidth;
        panel.classList.add("is-entering");
      }
    });
    if (focusTab && selectedTab) selectedTab.focus();
  }
  serviceTabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () { selectService(tab.dataset.service, false); });
    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % serviceTabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + serviceTabs.length) % serviceTabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = serviceTabs.length - 1;
      if (next !== null) {
        event.preventDefault();
        selectService(serviceTabs[next].dataset.service, true);
      }
    });
  });
  document.querySelectorAll("[data-brief]").forEach(function (trigger) {
    trigger.addEventListener("click", function () { selectService(trigger.dataset.brief, false);
      if (briefStatus) briefStatus.textContent = "已选择「" + trigger.dataset.brief + "」，可复制清单后通过微信或电话继续沟通。"; });
  });

  var briefButton = document.getElementById("briefButton");
  var briefTool = document.getElementById("briefTool");
  var briefStatus = document.getElementById("briefStatus");
  var briefTextarea = document.getElementById("briefTextarea");
  function fallbackBriefCopy() {
    if (!briefTextarea || !briefTool) return;
    briefTool.classList.add("is-fallback");
    briefTextarea.focus();
    briefTextarea.select();
    var copied = false;
    try { copied = document.execCommand("copy"); } catch (ignore) {}
    if (briefStatus) briefStatus.textContent = copied ? "已复制，可通过电话或微信发给我们。" : "请复制上方信息，通过电话或微信发给我们。";
  }
  if (briefButton) {
    briefButton.addEventListener("click", async function () {
      var content = "红涂大师现场沟通信息：\n厂区地址：\n大致面积：\n现场照片：\n最想解决的问题：\n期望施工时间：\n是否涉及验厂或特定指标：\n你的联系电话：\n\n电话联系：135-1078-4619";
      if (briefStatus) briefStatus.textContent = "正在复制现场信息清单…";
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await Promise.race([
            navigator.clipboard.writeText(content),
            new Promise(function (resolve, reject) { window.setTimeout(reject, 900); })
          ]);
          if (briefStatus) briefStatus.textContent = "沟通信息已复制，可补充后通过微信发送；也可以直接拨打 135-1078-4619。";
          briefButton.textContent = "已复制沟通信息";
          return;
        } catch (ignore) {}
      }
      fallbackBriefCopy();
    });
  }

  applyMotion();
  initialiseScene();
  selectSystem(0, false);
  selectService("0", false);
  updateScrollUI();
})();
