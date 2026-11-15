(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionToggle = document.getElementById('motionToggle');
  const header = document.getElementById('siteHeader');
  const overlayHero = header?.hasAttribute('data-overlay-hero');
  function syncHeader() {
    if (!overlayHero || !header) return;
    header.classList.toggle('is-solid', window.scrollY > 24);
  }
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const progress = document.getElementById('readingProgress');
  const pageHero = document.querySelector('.page-hero');
  let motion = 'full';
  let ticking = false;
  try { motion = localStorage.getItem('hongtu-motion-v4') === 'reduced' ? 'reduced' : 'full'; } catch (_) {}
  function isReduced() { return reducedMedia.matches || motion === 'reduced'; }
  function applyMotion() {
    root.dataset.motion = isReduced() ? 'reduced' : 'full';
    if (motionToggle) {
      motionToggle.textContent = isReduced() ? '恢复动效' : '减弱动效';
      motionToggle.setAttribute('aria-pressed', String(isReduced()));
      motionToggle.disabled = reducedMedia.matches;
      if (reducedMedia.matches) motionToggle.title = '已遵循系统的减少动态设置';
    }
    if (isReduced()) document.querySelectorAll('[data-reveal],.reveal').forEach(el => el.classList.add('is-visible'));
    root.classList.add('motion-ready');
  }
  applyMotion();
  motionToggle?.addEventListener('click', () => {
    motion = isReduced() ? 'full' : 'reduced';
    try { localStorage.setItem('hongtu-motion-v4', motion); } catch (_) {}
    applyMotion();
  });
  reducedMedia.addEventListener?.('change', applyMotion);
  function closeMenu() {
    if (!menuToggle || !mobileNav) return;
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '菜单';
  }
  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.textContent = open ? '关闭' : '菜单';
    mobileNav.hidden = !open;
  });
  mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => {
    if (mobileNav && !mobileNav.hidden && header && !header.contains(e.target)) closeMenu();
  });
  function updateScroll() {
    const y = window.scrollY;
    syncHeader();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (pageHero && !isReduced()) {
      const value = Math.max(-24, Math.min(24, y * .035));
      pageHero.style.setProperty('--page-hero-y', `${value.toFixed(2)}px`);
    }
    ticking = false;
  }
  function requestScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); } }
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });
  updateScroll();
  window.addEventListener('load', () => {
    if (!location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    root.style.scrollBehavior = 'auto';
    target.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => { root.style.scrollBehavior = ''; });
  });
  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .06 }) : null;
  document.querySelectorAll('[data-reveal],.reveal').forEach(el => {
    if (isReduced() || !revealObserver) el.classList.add('is-visible');
    else revealObserver.observe(el);
  });
  function revealInView() {
    document.querySelectorAll('.reveal:not(.is-visible), [data-reveal]:not(.is-visible)').forEach(el => {
      const box = el.getBoundingClientRect();
      if (box.bottom > -48 && box.top < window.innerHeight * 1.05) {
        el.classList.add('is-visible');
        if (revealObserver) revealObserver.unobserve(el);
      }
    });
  }
  requestAnimationFrame(revealInView);
  window.addEventListener('hashchange', () => requestAnimationFrame(revealInView));
  window.addEventListener('load', () => { revealInView(); setTimeout(revealInView, 700); });
  setTimeout(revealInView, 1400);
  document.querySelectorAll('img').forEach(img => {
    img.loading = 'eager';
    img.addEventListener('error', () => {
      if (img.dataset.retried) return;
      img.dataset.retried = '1';
      const url = new URL(img.src, location.href);
      url.searchParams.set('reload', '1');
      img.src = url.href;
    }, { once: true });
  });
  const briefButton = document.getElementById('briefButton');
  const briefTool = document.getElementById('briefTool');
  const briefCopy = document.getElementById('briefCopy');
  const briefTextarea = document.getElementById('briefTextarea');
  const briefStatus = document.getElementById('briefStatus');
  briefButton?.addEventListener('click', () => {
    const open = briefTool.hidden;
    briefTool.hidden = !open;
    briefButton.setAttribute('aria-expanded', String(open));
    if (open) briefTextarea?.focus();
  });
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      let timer;
      try {
        await Promise.race([
          navigator.clipboard.writeText(text),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('clipboard-timeout')), 900); })
        ]);
        return true;
      } catch (_) { /* use selection fallback */ } finally { clearTimeout(timer); }
    }
    const previous = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.left = '-9999px';
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    field.remove();
    if (previous && previous.focus) previous.focus();
    return copied;
  }
  briefCopy?.addEventListener('click', async () => {
    briefCopy.disabled = true;
    briefStatus.textContent = '正在复制现场信息清单…';
    const ok = await copyText(briefTextarea.value);
    briefStatus.textContent = ok ? '沟通信息已复制，可补充后通过微信发送；也可以直接拨打 135-1078-4619。' : '浏览器未允许自动复制，请直接在上方文本框中全选复制，或拨打 135-1078-4619。';
    briefCopy.disabled = false;
  });
  const filterButtons = [...document.querySelectorAll('[data-case-filter]')];
  const caseItems = [...document.querySelectorAll('[data-case-type]')];
  const caseCount = document.getElementById('caseCount');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.caseFilter;
    filterButtons.forEach(b => {
      const active = b === button;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    caseItems.forEach(item => {
      const show = filter === 'all' || item.dataset.caseType === filter;
      item.hidden = !show;
      if (show) {
        count += 1;
        if (!isReduced() && item.animate) item.animate([{ opacity: 0, transform: 'translate3d(0,16px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 360, easing: 'cubic-bezier(.22,.68,.16,1)' });
      }
    });
    if (caseCount) caseCount.textContent = `当前显示 ${count} 个项目`;
  }));
  const values = [
    ['让每一处现场，都有明确的位置与规则。','地面分区、墙面界面、通道与标识共同建立秩序，减少临时摆放与规则只靠口头传递。','功能分区图、动线与定置方案、现场标识清单'],
    ['让人、车、物与管理信息，走得更直接。','通过通行关系与信息位置设计，减少寻找、询问和重复确认；不承诺未经实测的效率百分比。','人流、物流、车流与参观动线，以及看板位置规划'],
    ['让客户从进入厂区开始，读到同一套企业标准。','门头、外立面、车间与文化空间不是孤立装修，而是企业能力在现场的连续表达。','厂区形象方案、参观动线、文化与展示界面'],
    ['让目标、异常、责任和维护要求进入每天。','把管理信息放到正确的位置，让现场可看、可验、可维护；具体管理机制按企业实际确定。','生产与质量看板、13 项检查、年度巡检与维保接口']
  ];
  const valueTabs = [...document.querySelectorAll('[data-system-value]')];
  const valuePanel = document.querySelector('.system-value-panel');
  function setSystemValue(index, focus = false) {
    const data = values[index];
    if (!data) return;
    valueTabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    document.getElementById('systemValueNumber').textContent = `${String(index + 1).padStart(2, '0')} / 04`;
    document.getElementById('systemValueTitle').textContent = data[0];
    document.getElementById('systemValueText').textContent = data[1];
    document.getElementById('systemValueOutput').textContent = data[2];
    document.querySelectorAll('[data-system-value-image]').forEach(img => { img.classList.toggle('is-active', Number(img.dataset.systemValueImage) === index); });
    if (!isReduced() && valuePanel?.animate) valuePanel.animate([{ opacity: .25, transform: 'translate3d(0,16px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 400, easing: 'cubic-bezier(.22,.68,.16,1)' });
    if (focus) valueTabs[index].focus();
  }
  valueTabs.forEach((tab, i) => {
    tab.id = `systemValueTab${i}`;
    tab.setAttribute('aria-controls', 'systemValuePanel');
    tab.addEventListener('click', () => setSystemValue(i));
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % valueTabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + valueTabs.length) % valueTabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = valueTabs.length - 1;
      if (next !== undefined) { e.preventDefault(); setSystemValue(next, true); }
    });
  });
  if (valuePanel) valuePanel.id = 'systemValuePanel';
  const mapText = [
    '空间界面：把地坪、墙面、屋面与钢构作为生产基础统一检查。',
    '目视化标识：把功能分区、安全标识、动线与定置放进同一套规则。',
    '环境与功能：由合作专业实施，红涂统一接口、进度与验收。',
    '厂区形象：安排客户进入、看见和通过的路径，让形象服务真实业务。',
    '管理可视化：把生产、质量、目标与异常放到现场正确的位置。',
    '交付服务：诊断、夜间施工、13 项检查、5 年维保与一个责任主体。'
  ];
  const mapButtons = [...document.querySelectorAll('[data-map-zone]')];
  mapButtons.forEach((button, i) => button.addEventListener('click', () => {
    mapButtons.forEach((b, n) => b.classList.toggle('is-active', n === i));
    const description = document.getElementById('mapDescription');
    description.textContent = mapText[i];
    if (!isReduced() && description.animate) description.animate([{ opacity: 0, transform: 'translate3d(0,8px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 280 });
  }));
  const markReady = () => root.classList.add('is-ready');
  requestAnimationFrame(markReady);
  setTimeout(markReady, 120);
})();
