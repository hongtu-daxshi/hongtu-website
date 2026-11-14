(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const body = document.body;
  const header = $('#siteHeader');
  const motionToggle = $('#motionToggle');
  const systemReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let storedMotion = null;
  try { storedMotion = localStorage.getItem('hongtu-motion-v4'); } catch (_) { /* storage is optional */ }
  let motion = systemReduced.matches ? 'reduced' : (storedMotion === 'reduced' ? 'reduced' : 'full');
  let sceneZone = 0;
  let sceneRequest = 0;
  let sceneFocused = false;
  let pointerX = 0;
  let pointerY = 0;
  let scrollTicking = false;

  const sceneZones = [
    { name: '空间界面', value: '让地面、墙面与钢构经得起生产、时间与验厂。', deliverables: '地坪系统 / 墙面天花 / 屋面 / 钢构防护', image: 'assets/img/detail-space.jpg', x: 7, y: 3, scale: 1.18 },
    { name: '目视化标识', value: '让通道、区域与规则一眼可见，减少寻找和沟通。', deliverables: '功能分区 / 安全标识 / 动线 / 定置管理', image: 'assets/img/detail-visual.jpg', x: 3, y: -5, scale: 1.2 },
    { name: '环境与功能', value: '让照明、机电与环保配套真正服务生产，而不是各自为政。', deliverables: '照明 / 机电 / 环保配套 / 接口统管', image: 'assets/img/detail-environment.jpg', x: 7, y: 10, scale: 1.2 },
    { name: '厂区形象', value: '让客户从进门开始，就读到企业的秩序、标准与实力。', deliverables: '门头 / 外立面 / 参观动线 / 文化空间', image: 'assets/img/detail-image.jpg', x: -8, y: 5, scale: 1.2 },
    { name: '管理可视化', value: '让目标、异常与责任进入现场，支持每天的经营管理。', deliverables: '生产看板 / 质量目视化 / 数字界面 / 管理标准', image: 'assets/img/detail-management.jpg', x: -2, y: -5, scale: 1.2 },
    { name: '交付服务', value: '让生产、施工与长期维保不打架，一个主体负责到底。', deliverables: '现场诊断 / 夜间施工 / 13 项检查 / 5 年维保', image: 'assets/img/detail-delivery.jpg', x: -11, y: -4, scale: 1.18 }
  ];
  const expertise = [
    { caption: '地坪、墙面与天花、屋面、钢构防护；以统一基面与材质标准，托住每天的生产。', note: 'AI 场景示意' },
    { caption: '划线、安全标识、区域看板与定置管理；让人流、物流和参观路线各自清楚。', note: 'AI 场景示意' },
    { caption: '照明、机电与环保配套由专业团队协同，红涂统一接口、进度与验收。', note: 'AI 场景示意' },
    { caption: '门头、外立面、文化空间与参观动线；让厂区形象成为企业实力的一部分。', note: 'AI 场景示意' },
    { caption: '生产、质量与数字看板进入真实现场；让管理者更快看到目标、异常与责任。', note: '项目资料照片' },
    { caption: '现场诊断、夜间施工、逐项验收与长期维保；交付之后，仍然有人负责。', note: 'AI 场景示意' }
  ];

  function applyMotion() {
    root.dataset.motion = motion;
    const reduced = motion === 'reduced';
    motionToggle.setAttribute('aria-pressed', String(reduced));
    motionToggle.textContent = systemReduced.matches ? '跟随系统：减弱动效' : (reduced ? '恢复完整动效' : '减弱动效');
    motionToggle.disabled = systemReduced.matches;
    root.classList.add('motion-ready');
    root.classList.add('is-ready');
    if (reduced) {
      $$('.reveal').forEach(el => el.classList.add('is-visible'));
      $('#vision')?.classList.add('is-visible');
    }
    updateCamera();
    updateScroll();
  }

  function updateCamera() {
    const camera = $('#heroCamera');
    if (!camera) return;
    const reduced = motion === 'reduced';
    const zone = sceneZones[sceneZone];
    const baseX = sceneFocused && !reduced ? zone.x : 0;
    const baseY = sceneFocused && !reduced ? zone.y : 0;
    const scale = sceneFocused && !reduced ? zone.scale : 1.03;
    camera.style.setProperty('--camera-x', `${baseX + (reduced ? 0 : pointerX)}%`);
    camera.style.setProperty('--camera-y', `${baseY + (reduced ? 0 : pointerY)}%`);
    camera.style.setProperty('--camera-scale', String(scale));
  }

  function setSceneZone(index, focus = true) {
    sceneZone = index;
    sceneFocused = focus;
    const zone = sceneZones[index];
    const hero = $('#home');
    hero.classList.remove('is-zoomed');
    $('#sceneZoom').textContent = '继续放大';
    $('#sceneZoom').setAttribute('aria-pressed', 'false');
    $('#sceneNumber').textContent = `${String(index + 1).padStart(2, '0')} / 06`;
    $('#sceneName').textContent = zone.name;
    $('#sceneValue').textContent = zone.value;
    $('#sceneDeliverables').textContent = zone.deliverables;
    const serviceLink = $('#sceneServiceLink');
    if (serviceLink) {
      serviceLink.href = `services.html#cap-${index}`;
      serviceLink.textContent = '查看此项服务';
    }
    $$('[data-scene-zone]').forEach(button => {
      const active = Number(button.dataset.sceneZone) === index;
      button.classList.toggle('is-active', active);
      if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active));
      else button.setAttribute('aria-pressed', String(active));
    });
    updateCamera();
    if (!focus) return;
    const detailImage = $('#sceneDetailImage');
    detailImage.src = zone.image;
    detailImage.alt = `${zone.name}高清局部场景示意`;
    $('#sceneViewLabel').textContent = `${zone.name}｜高清局部场景`;
    $('#sceneMode').textContent = `${zone.name}｜局部细节`;
    $('#sceneInstruction').textContent = '点击其他编号切换';
    $('#sceneDetailView').setAttribute('aria-hidden', 'false');
    $('#sceneZoom').hidden = false;
    hero.classList.add('is-detail');
  }

  function resetScene() {
    sceneRequest += 1;
    sceneFocused = false;
    pointerX = 0;
    pointerY = 0;
    const hero = $('#home');
    hero.classList.remove('is-detail', 'is-zoomed');
    $('#sceneDetailView').setAttribute('aria-hidden', 'true');
    $('#sceneZoom').hidden = true;
    $('#sceneZoom').setAttribute('aria-pressed', 'false');
    $('#sceneMode').textContent = '厂区总览';
    $('#sceneInstruction').textContent = '选择圆圈，展开局部细节';
    $('#sceneNumber').textContent = '空间总览';
    $('#sceneName').textContent = '一座视觉服务中心';
    $('#sceneValue').textContent = '六个区域，一套视觉系统，一个责任主体。';
    $('#sceneDeliverables').textContent = '从物理空间到管理现场，从建设到长期交付';
    const serviceLink = $('#sceneServiceLink');
    if (serviceLink) {
      serviceLink.href = 'services.html#capabilities';
      serviceLink.textContent = '查看六项服务';
    }
    $$('[data-scene-zone]').forEach(button => {
      button.classList.remove('is-active');
      if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', 'false');
      else button.setAttribute('aria-pressed', 'false');
    });
    updateCamera();
  }

  function setExpertise(index) {
    if (!$('#expertiseCaptionIndex')) return;
    $$('[data-expertise]').forEach(button => {
      const active = Number(button.dataset.expertise) === index;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $$('[data-expertise-image]').forEach(image => image.classList.toggle('is-active', Number(image.dataset.expertiseImage) === index));
    const names = ['空间界面', '目视化标识', '环境与功能', '厂区形象', '管理可视化', '交付服务'];
    $('#expertiseCaptionIndex').textContent = `${String(index + 1).padStart(2, '0')} / ${names[index]}`;
    $('#expertiseCaptionText').textContent = expertise[index].caption;
    $('#expertiseImageNote').textContent = expertise[index].note;
  }

  function updateScroll() {
    scrollTicking = false;
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    $('#readingProgress').style.transform = `scaleX(${Math.min(1, y / max)})`;
    const hero = $('#home');
    const solidAt = hero.offsetHeight - header.offsetHeight - 12;
    header.classList.toggle('is-solid', y > solidAt);
    const heroProgress = Math.max(0, Math.min(1, y / Math.max(1, hero.offsetHeight)));
    if (motion !== 'reduced') {
      hero.style.setProperty('--scene-scroll', `${heroProgress * 3.5}%`);
      hero.style.setProperty('--scene-scale', String(1 + heroProgress * .055));
      const vision = $('#vision');
      if (vision) {
        const rect = vision.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
        vision.style.setProperty('--vision-shift', `${(progress - .5) * 9}%`);
      }
    } else {
      hero.style.setProperty('--scene-scroll', '0%');
      hero.style.setProperty('--scene-scale', '1');
      $('#vision')?.style.setProperty('--vision-shift', '0%');
    }
    // Current-page navigation is supplied by each HTML document.
  }

  function requestScrollUpdate() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(updateScroll);
    }
  }

  async function copyBrief() {
    const status = $('#briefStatus');
    const textarea = $('#briefTextarea');
    const text = `红涂大师视觉服务中心｜现场沟通信息\n${textarea.value}`;
    status.textContent = '正在复制现场信息…';
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await Promise.race([
          navigator.clipboard.writeText(text).then(() => { copied = true; }),
          new Promise(resolve => setTimeout(resolve, 900))
        ]);
      } catch (_) { /* use the local fallback below */ }
    }
    if (!copied) {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      helper.remove();
    }
    status.textContent = copied
      ? '沟通信息已复制，可补充后通过微信发送；也可以直接拨打 135-1078-4619。'
      : '浏览器未允许自动复制，请直接在上方文本框中全选复制，或拨打 135-1078-4619。';
  }

  $$('[data-scene-zone]').forEach(button => {
    button.addEventListener('click', () => setSceneZone(Number(button.dataset.sceneZone)));
  });
  $('.hero-zone-nav').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = sceneZone;
    if (event.key === 'ArrowLeft') next = (sceneZone + 5) % 6;
    if (event.key === 'ArrowRight') next = (sceneZone + 1) % 6;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = 5;
    setSceneZone(next);
    $(`.hero-zone-nav [data-scene-zone="${next}"]`).focus();
  });
  $('#sceneReset').addEventListener('click', resetScene);
  $('#sceneZoom').addEventListener('click', () => {
    const hero = $('#home');
    const zoomed = hero.classList.toggle('is-zoomed');
    $('#sceneZoom').textContent = zoomed ? '还原细节' : '继续放大';
    $('#sceneZoom').setAttribute('aria-pressed', String(zoomed));
  });

  const heroScene = $('#heroScene');
  heroScene.addEventListener('pointermove', event => {
    if (motion === 'reduced' || !finePointer.matches) return;
    const rect = heroScene.getBoundingClientRect();
    if (sceneFocused) {
      if ($('#home').classList.contains('is-zoomed')) {
        const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
        const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
        $('#sceneDetailImage').style.transformOrigin = `${x}% ${y}%`;
      }
      return;
    }
    pointerX = ((event.clientX - rect.left) / rect.width - .5) * 1.2;
    pointerY = ((event.clientY - rect.top) / rect.height - .5) * .8;
    updateCamera();
  });
  heroScene.addEventListener('pointerleave', () => {
    pointerX = 0;
    pointerY = 0;
    $('#sceneDetailImage').style.transformOrigin = 'center';
    updateCamera();
  });

  if ($('.expertise-list')) {
    $$('[data-expertise]').forEach(button => {
      const index = Number(button.dataset.expertise);
      button.addEventListener('click', () => setExpertise(index));
      button.addEventListener('focus', () => setExpertise(index));
      button.addEventListener('mouseenter', () => { if (finePointer.matches) setExpertise(index); });
    });
    $('.expertise-list').addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = $$('[data-expertise]').findIndex(button => button.getAttribute('aria-selected') === 'true');
      let next = current;
      if (event.key === 'ArrowUp') next = (current + 5) % 6;
      if (event.key === 'ArrowDown') next = (current + 1) % 6;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = 5;
      setExpertise(next);
      $(`[data-expertise="${next}"]`).focus();
    });
  }

  motionToggle.addEventListener('click', () => {
    motion = motion === 'reduced' ? 'full' : 'reduced';
    try { localStorage.setItem('hongtu-motion-v4', motion); } catch (_) { /* storage is optional */ }
    applyMotion();
  });
  const handleSystemMotion = () => {
    motion = systemReduced.matches ? 'reduced' : (storedMotion === 'reduced' ? 'reduced' : 'full');
    applyMotion();
  };
  if (systemReduced.addEventListener) systemReduced.addEventListener('change', handleSystemMotion);

  $('#menuToggle').addEventListener('click', () => {
    const open = $('#menuToggle').getAttribute('aria-expanded') !== 'true';
    $('#menuToggle').setAttribute('aria-expanded', String(open));
    $('#mobileNav').hidden = !open;
  });
  $$('#mobileNav a').forEach(link => link.addEventListener('click', () => {
    $('#menuToggle').setAttribute('aria-expanded', 'false');
    $('#mobileNav').hidden = true;
  }));
  $('#briefButton')?.addEventListener('click', () => {
    const open = $('#briefButton').getAttribute('aria-expanded') !== 'true';
    $('#briefButton').setAttribute('aria-expanded', String(open));
    $('#briefTool').hidden = !open;
  });
  $('#briefCopy')?.addEventListener('click', copyBrief);

  $$('img').forEach(image => {
    image.loading = 'eager';
    image.addEventListener('error', () => {
      if (image.dataset.retried === 'true') return;
      image.dataset.retried = 'true';
      const source = image.src.split('?')[0];
      image.src = `${source}?reload=1`;
    });
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -7% 0px' });
    $$('.reveal').forEach(el => revealObserver.observe(el));
    const vision = $('#vision');
    if (vision) {
      const visionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('is-visible'); });
      }, { threshold: .16 });
      visionObserver.observe(vision);
    }
  } else {
    $$('.reveal').forEach(el => el.classList.add('is-visible'));
    $('#vision')?.classList.add('is-visible');
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });
  setExpertise(0);
  setSceneZone(0, false);
  applyMotion();
  const markReady = () => root.classList.add('is-ready');
  requestAnimationFrame(markReady);
  setTimeout(markReady, 120);
})();
