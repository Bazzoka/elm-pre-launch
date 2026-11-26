/* ELM landing page behaviour. No libraries, no cookies, no local storage. */
(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const ICON = (name) => `<svg class="i" aria-hidden="true"><use href="static/img/icons.svg#i-${name}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ------------------------------------------------------------ privacy-conscious analytics
  const viewId = Math.random().toString(36).slice(2, 12);
  const attribution = {
    utm_source: params.get('utm_source'), utm_medium: params.get('utm_medium'), utm_campaign: params.get('utm_campaign'),
    ref: /^[a-z0-9]{6,12}$/.test(params.get('ref') || '') ? params.get('ref') : null,
    referrer_host: (() => { try { const h = new URL(document.referrer).hostname; return h && h !== location.hostname ? h : null; } catch { return null; } })(),
  };
  // static copy (GitHub Pages): no server, so no analytics, no live counter and no signup form
  const STATIC = document.documentElement.dataset.mode === 'static';
  const noTrack = STATIC || navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  function track(name, label) {
    if (noTrack) return;
    const body = JSON.stringify({ name, label: label || null, view_id: viewId, path: location.pathname, ...attribution });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
      else fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
    } catch { /* analytics never breaks the page */ }
  }
  track('page_view');
  if (attribution.ref) track('referral_visit', attribution.ref);
  document.addEventListener('click', (e) => {
    const cta = e.target.closest('[data-cta]');
    if (cta) track('cta_click', cta.dataset.cta);
  });

  // ------------------------------------------------------------ navigation
  const toggle = $('.nav-toggle');
  const menu = $('#mobile-menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      menu.hidden = false;
      const links = $$('a', menu);
      const step = Math.min(60, 400 / Math.max(1, links.length));
      links.forEach((a, i) => { a.style.transitionDelay = reduced ? '0ms' : `${i * step}ms`; });
      requestAnimationFrame(() => menu.classList.add('open'));
      document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => { if (toggle.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, 300);
    }
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); } });

  const navLinks = $$('.nav-links a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${en.target.id}`)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['product', 'features', 'how', 'faq'].forEach((id) => { const el = document.getElementById(id); if (el) sectionObserver.observe(el); });

  // ------------------------------------------------------------ scroll reveals (once)
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  // ------------------------------------------------------------ tagline: words light up as they cross a trigger line
  const tagline = $('[data-words]');
  if (tagline) {
    const words = tagline.textContent.trim().split(/\s+/);
    tagline.innerHTML = words.map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
    const spans = $$('.w', tagline);
    if (reduced) spans.forEach((s) => s.classList.add('on'));
    else {
      let ticking = false;
      const update = () => {
        ticking = false;
        const line = window.innerHeight * 0.62;
        const rect = tagline.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const progress = (line - rect.top) / Math.max(1, rect.height);
        const lit = Math.max(0, Math.min(spans.length, Math.ceil(progress * spans.length * 1.15)));
        spans.forEach((s, i) => { if (i < lit) s.classList.add('on'); });
      };
      window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      update();
    }
  }

  // ------------------------------------------------------------ hero preview: a live activity feed with sample data
  const feed = $('#hero-feed');
  const rows = $$('#hero-rows tr');
  const events = [
    { cls: 'ev-out', row: 0, st: ['st-out', 'Sold out'], q: '0', text: 'Trail Jacket · Navy / M', sub: 'Supplier sold out. eBay quantity 3 → 0' },
    { cls: 'ev-hold', row: 2, st: ['st-unk', 'Check failed'], q: '2 <span class="caption-5 muted">held</span>', text: 'Stoneware Mug Set · Slate', sub: 'Check failed. Holding quantity, retry in 15 min' },
    { cls: 'ev-in', row: 3, st: ['st-in', 'In stock'], q: '2', text: 'Merino Crew Socks · Grey / L', sub: 'Restock confirmed twice. eBay quantity 0 → 2' },
    { cls: 'ev-in', row: 0, st: ['st-in', 'In stock'], q: '3', text: 'Trail Jacket · Navy / M', sub: 'Restock confirmed twice. eBay quantity 0 → 3' },
    { cls: 'ev-out', row: 1, st: ['st-out', 'Sold out'], q: '0', text: 'Canvas Weekender · Olive', sub: 'Supplier sold out. eBay quantity 2 → 0' },
    { cls: 'ev-in', row: 1, st: ['st-in', 'In stock'], q: '2', text: 'Canvas Weekender · Olive', sub: 'Restock confirmed twice. eBay quantity 0 → 2' },
    { cls: 'ev-out', row: 3, st: ['st-out', 'Sold out'], q: '0', text: 'Merino Crew Socks · Grey / L', sub: 'Supplier sold out. eBay quantity 2 → 0' },
  ];
  let evIndex = 0;
  let changes = 37;
  function pushEvent(animate = true) {
    const ev = events[evIndex % events.length];
    evIndex += 1;
    const li = document.createElement('li');
    li.className = ev.cls;
    if (!animate) li.style.animation = 'none';
    li.innerHTML = `<span><span class="body-5">${ev.text}</span><span class="caption-5">${ev.sub}</span></span>`;
    feed.prepend(li);
    while (feed.children.length > 4) feed.lastElementChild.remove();
    const row = rows[ev.row];
    if (row) {
      const st = row.querySelector('.st');
      st.className = `st ${ev.st[0]} caption-4`;
      st.textContent = ev.st[1];
      row.querySelector('.q').innerHTML = ev.q;
      row.classList.remove('flash', 'flash-out');
      void row.offsetWidth;
      row.classList.add(ev.cls === 'ev-out' ? 'flash-out' : 'flash');
    }
    if (ev.cls !== 'ev-hold') { changes += 1; $('#kpi-changes').textContent = String(changes); }
  }
  if (feed) {
    for (let i = 0; i < 3; i += 1) pushEvent(false);
    if (!reduced) {
      let timer = null;
      const heroObs = new IntersectionObserver(([en]) => {
        if (en.isIntersecting && !timer) timer = setInterval(pushEvent, 2800);
        if (!en.isIntersecting && timer) { clearInterval(timer); timer = null; }
      });
      heroObs.observe($('.app-frame'));
    }
  }

  // ------------------------------------------------------------ accessible tabs
  function wireTabs(list, onSelect) {
    const tabs = $$('[role="tab"]', list);
    function select(tab, focus) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel && panel.dataset.shared !== 'true') panel.hidden = !on;
      });
      if (focus) tab.focus();
      onSelect && onSelect(tab);
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t, false));
      t.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
    return select;
  }

  // workflows: steps light up one after another while visible
  function lightPipeline(panel) {
    const steps = $$('.pipeline li', panel);
    steps.forEach((s) => s.classList.remove('lit'));
    if (reduced) { steps.forEach((s) => s.classList.add('lit')); return; }
    $$('.pipeline', panel).forEach((pipe, p) => {
      $$('li', pipe).forEach((li, i) => setTimeout(() => li.classList.add('lit'), 250 + p * 900 + i * 380));
    });
  }
  const wfTabs = $('#product .tabs');
  wireTabs(wfTabs, (tab) => { track('workflow_tab', tab.id); lightPipeline(document.getElementById(tab.getAttribute('aria-controls'))); });
  const wfObs = new IntersectionObserver(([en], obs) => { if (en.isIntersecting) { lightPipeline($('#wf-sync')); obs.disconnect(); } }, { threshold: 0.35 });
  wfObs.observe($('#wf-sync'));

  // ------------------------------------------------------------ dashboard showcase (sample data)
  const NOW = 'Today';
  const sc = [
    { id: 'inventory', name: 'Inventory', status: 'today', desc: 'Every monitored variant with its supplier status and the quantity on eBay.',
      cols: ['Variant', 'SKU', 'Supplier', 'Supplier status', 'eBay qty', 'Last check'],
      rows: [
        ['Trail Jacket<span class="sub">Navy / M</span>', '<span class="mono">NFS-TJ-NV-M</span>', 'Northfield Supply', st('in', 'In stock'), '<span class="mono">3</span>', '<span class="mono">4 min ago</span>'],
        ['Trail Jacket<span class="sub">Navy / L</span>', '<span class="mono">NFS-TJ-NV-L</span>', 'Northfield Supply', st('out', 'Sold out'), '<span class="mono">0</span>', '<span class="mono">4 min ago</span>'],
        ['Canvas Weekender<span class="sub">Olive</span>', '<span class="mono">HPO-CW-OL</span>', 'Harbor &amp; Pine Outfitters', st('in', 'In stock'), '<span class="mono">2</span>', '<span class="mono">11 min ago</span>'],
        ['Stoneware Mug Set<span class="sub">Slate, set of 4</span>', '<span class="mono">KH-SM-SL4</span>', 'Kestrel Home', st('unk', 'Check failed'), '<span class="mono">2</span> held', '<span class="mono">17 min ago</span>'],
        ['Linen Throw<span class="sub">Sand</span>', '<span class="mono">KH-LT-SD</span>', 'Kestrel Home', st('pre', 'Pre order'), '<span class="mono">0</span>', '<span class="mono">23 min ago</span>'],
      ] },
    { id: 'products', name: 'Products', status: 'today', desc: 'Supplier products you track, with variants, check history and the eBay listings they feed.',
      cols: ['Product', 'Supplier', 'Variants', 'In stock', 'Mapped to eBay', 'Interval'],
      rows: [
        ['Trail Jacket', 'Northfield Supply', '<span class="mono">12</span>', '<span class="mono">9</span>', '<span class="mono">12</span>', '60 min'],
        ['Merino Crew Socks', 'Northfield Supply', '<span class="mono">8</span>', '<span class="mono">7</span>', '<span class="mono">8</span>', '60 min'],
        ['Canvas Weekender', 'Harbor &amp; Pine Outfitters', '<span class="mono">3</span>', '<span class="mono">2</span>', '<span class="mono">3</span>', '30 min'],
        ['Stoneware Mug Set', 'Kestrel Home', '<span class="mono">4</span>', '<span class="mono">3</span>', '<span class="mono">2</span>', '60 min'],
      ] },
    { id: 'listings', name: 'eBay listings', status: 'today', desc: 'Your active fixed price listings and variations, read from eBay, with what ELM can safely sync.',
      cols: ['Listing', 'Variations', 'Mapped', 'Sync', 'Health'],
      rows: [
        ['Trail Jacket, water resistant, 6 colors<span class="sub">Fixed price · Good until cancelled</span>', '<span class="mono">12</span>', '<span class="mono">12 of 12</span>', st('in', 'On'), st('in', 'Ready')],
        ['Canvas Weekender Bag<span class="sub">Fixed price · Good until cancelled</span>', '<span class="mono">3</span>', '<span class="mono">3 of 3</span>', st('in', 'On'), st('in', 'Ready')],
        ['Stoneware Mug Set of 4<span class="sub">Fixed price · Good until cancelled</span>', '<span class="mono">4</span>', '<span class="mono">2 of 4</span>', st('unk', 'Partial'), st('unk', 'Needs SKUs')],
      ] },
    { id: 'suppliers', name: 'Suppliers', status: 'today', desc: 'Each supplier store, how reliably it answers, and controls to pause it or keep it out of sync.',
      cols: ['Supplier', 'Products', 'Checks today', 'Failed', 'Last failure', 'State'],
      rows: [
        ['Northfield Supply', '<span class="mono">41</span>', '<span class="mono">984</span>', '<span class="mono">3</span>', 'Timeout, 2:14 pm', st('in', 'Active')],
        ['Harbor &amp; Pine Outfitters', '<span class="mono">17</span>', '<span class="mono">816</span>', '<span class="mono">0</span>', 'None', st('in', 'Active')],
        ['Kestrel Home', '<span class="mono">23</span>', '<span class="mono">552</span>', '<span class="mono">19</span>', 'Blocked, 1:47 pm', st('unk', 'Cooling down')],
      ] },
    { id: 'mapping', name: 'Mapping', status: 'mixed', desc: 'Which supplier variant each eBay variation depends on. Exact SKU suggestions work today; matching by options and title is coming at launch.',
      cols: ['eBay variation', 'Supplier variant', 'Matched by', 'Confidence', 'State'],
      rows: [
        ['Trail Jacket · Navy / M', 'Northfield Supply · Navy / M', 'Exact SKU', '<span class="mono">100%</span>', st('in', 'Verified')],
        ['Trail Jacket · Navy / L', 'Northfield Supply · Navy / L', 'Exact SKU', '<span class="mono">100%</span>', st('in', 'Verified')],
        ['Mug Set · Slate', 'Kestrel Home · Slate / 4 pack', 'Options and title', '<span class="mono">87%</span>', st('unk', 'Needs review')],
        ['Mug Set · Sage', 'Kestrel Home · Sage / 4 pack', 'Options and title', '<span class="mono">91%</span>', st('unk', 'Needs review')],
      ] },
    { id: 'history', name: 'Automation history', status: 'today', desc: 'Every decision ELM made, what it changed on eBay, and why. Nothing happens without a recorded reason.',
      cols: ['When', 'Variation', 'Supplier', 'eBay qty', 'Reason', 'Result'],
      rows: [
        [`<span class="mono">2:41 pm</span>`, 'Trail Jacket · Navy / L', st('out', 'Sold out'), '<span class="mono">2 → 0</span>', 'Supplier shows sold out', st('in', 'Written, read back')],
        [`<span class="mono">2:14 pm</span>`, 'Stoneware Mug Set · Slate', st('unk', 'Check failed'), '<span class="mono">2 → 2</span>', 'Holding: check failed, retry at 2:29 pm', 'No change'],
        [`<span class="mono">1:58 pm</span>`, 'Merino Crew Socks · Grey / L', st('in', 'In stock'), '<span class="mono">0 → 2</span>', 'Restock confirmed by a second check', st('in', 'Written, read back')],
        [`<span class="mono">1:30 pm</span>`, 'Canvas Weekender · Olive', st('in', 'In stock'), '<span class="mono">2 → 2</span>', 'You edited this listing on eBay: paused for 24 h', 'Skipped'],
      ] },
    { id: 'notifications', name: 'Notifications', status: 'mixed', desc: 'Alerts for what needs you. Telegram works today; email arrives at launch.',
      cols: ['When', 'Event', 'Channel', 'Delivered'],
      rows: [
        [`<span class="mono">2:41 pm</span>`, 'Trail Jacket · Navy / L sold out at supplier. eBay set to 0.', 'Telegram', st('in', 'Sent')],
        [`<span class="mono">1:47 pm</span>`, 'Kestrel Home is blocking checks. 23 products on hold.', 'Telegram', st('in', 'Sent')],
        [`<span class="mono">9:02 am</span>`, 'Daily summary: 37 changes, 3 suppliers healthy.', 'Email', '<span class="status status-launch caption-3">At launch</span>'],
      ] },
    { id: 'bulk', name: 'Bulk management', status: 'launch', desc: 'Select hundreds of products or listings and act on them together: import, map, start monitoring, generate SKUs.',
      cols: ['', 'Product', 'Supplier', 'Variants', 'SKUs', 'Action'],
      rows: [
        ['<input type="checkbox" checked aria-label="Selected" disabled>', 'Ridge Fleece Vest', 'Northfield Supply', '<span class="mono">10</span>', 'Will generate', 'Create listing'],
        ['<input type="checkbox" checked aria-label="Selected" disabled>', 'Harbor Rope Tote', 'Harbor &amp; Pine Outfitters', '<span class="mono">4</span>', 'Will generate', 'Create listing'],
        ['<input type="checkbox" checked aria-label="Selected" disabled>', 'Glazed Serving Bowl', 'Kestrel Home', '<span class="mono">3</span>', 'Will generate', 'Create listing'],
        ['<input type="checkbox" aria-label="Not selected" disabled>', 'Wool Beanie', 'Northfield Supply', '<span class="mono">6</span>', 'Existing', 'Map to listing'],
      ] },
  ];
  function st(kind, label) { return `<span class="st st-${kind === 'pre' ? 'unk' : kind} caption-4">${label}</span>`; }
  const statusChip = { today: '<span class="status status-today caption-3">Works today</span>', mixed: '<span class="status status-mixed caption-3">Partly today, rest at launch</span>', launch: '<span class="status status-launch caption-3">Concept preview · Coming at launch</span>' };
  const scTabs = $('#showcase-tabs');
  const scPanel = $('#showcase-panel');
  scTabs.innerHTML = sc.map((s, i) => `<button class="tab button-sm" role="tab" id="sc-${s.id}" aria-controls="showcase-panel" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''}>${s.name}</button>`).join('');
  scPanel.dataset.shared = 'true';
  function renderShowcase(id) {
    const s = sc.find((x) => x.id === id) || sc[0];
    scPanel.setAttribute('aria-labelledby', `sc-${s.id}`);
    scPanel.innerHTML = `<div class="sc-top"><span class="title-3">${s.name}</span><span class="labels">${statusChip[s.status]}<span class="tag tag-muted caption-4">Sample data</span></span></div>
      <div class="sc-body" tabindex="0" role="region" aria-label="${s.name} table, scrolls sideways on small screens"><p class="sc-desc body-6">${s.desc}</p><table class="dt"><thead><tr>${s.cols.map((c) => `<th class="caption-4">${c}</th>`).join('')}</tr></thead>
      <tbody>${s.rows.map((r) => `<tr>${r.map((c) => `<td class="body-6">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  wireTabs(scTabs, (tab) => { renderShowcase(tab.id.replace('sc-', '')); track('showcase_tab', tab.id); });
  renderShowcase('inventory');

  // ------------------------------------------------------------ backends
  // Local server (Flask): the /api endpoints. Static copy (GitHub Pages): the waitlist goes to Supabase through two
  // public database functions, and contact messages go to Web3Forms. Both keys are public by design; no secret is here.
  const cfg = ($('meta[name="elm-config"]') || { dataset: {} }).dataset;
  const has = (v) => !!v && !/^\{\{/.test(v);
  const SB = STATIC && has(cfg.supabaseUrl) && has(cfg.supabaseKey) ? { url: cfg.supabaseUrl, key: cfg.supabaseKey } : null;
  const W3F = STATIC && has(cfg.web3formsKey) ? cfg.web3formsKey : null;
  async function rpc(fn, body) {
    if (!SB) throw new Error('not configured');
    const r = await fetch(`${SB.url}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: { apikey: SB.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
    });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }
  // the local server signs a form token with a minimum fill time; the static copy checks the fill time in the page
  const pageStart = Date.now();
  let formToken = null;
  async function getToken() {
    if (STATIC) return;
    const r = await fetch('/api/form-token', { cache: 'no-store' });
    formToken = (await r.json()).token;
  }
  getToken().catch(() => {});
  const tooQuick = (since) => STATIC && Date.now() - since < 3000;

  function showError(id, msg, input) {
    const p = document.getElementById(id);
    p.textContent = msg || '';
    p.hidden = !msg;
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
  const directEmail = () => { const a = $('.contact-direct a'); return a ? a.textContent.trim() : ''; };
  function setBusy(btn, busy, idle, working) {
    btn.disabled = busy;
    if (busy) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy');
    $('.btn-label', btn).textContent = busy ? working : idle;
  }

  // ------------------------------------------------------------ pricing: carry the chosen plan into the waitlist form
  const PLAN_NAMES = { starter: 'Starter', growth: 'Growth', pro: 'Pro', business: 'Business' };
  const planSelect = $('#plan');
  const planNote = $('#plan-note');
  function choosePlan(plan) {
    if (!planSelect || !PLAN_NAMES[plan]) return;
    planSelect.value = plan;
    planNote.textContent = `You picked ${PLAN_NAMES[plan]}. You can change it here. Joining is free and nothing is charged.`;
    planNote.hidden = false;
  }
  $$('[data-plan]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    choosePlan(a.dataset.plan);
    track('pricing_plan', a.dataset.plan);
    $('#waitlist').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    const target = $('#waitlist-form').hidden ? $('#success') : $('#email');
    setTimeout(() => target.focus({ preventScroll: true }), reduced ? 0 : 700);
  }));
  if (planSelect) {
    if (PLAN_NAMES[params.get('plan')]) choosePlan(params.get('plan'));
    planSelect.addEventListener('change', () => { planNote.hidden = true; });
  }

  // ------------------------------------------------------------ waitlist counter (truthful) and form
  const demo = !STATIC && params.get('demo') === '1';
  let goal = 250;
  let milestones = [50, 100, 150, 200, 250];
  let shown = 0;
  // the static copy has no confirmation email, so it counts everyone who joined and says so
  const countWord = STATIC ? 'waitlist signups' : 'verified signups';
  if (STATIC) {
    $('#counter-label').textContent = 'Waitlist signups';
    $('#counter-note').textContent = 'Counts everyone who joined the waitlist. Updated live.';
  }
  function renderCounter(count) {
    const bar = $('#counter-bar');
    $('#counter-goal').textContent = String(goal);
    bar.setAttribute('aria-valuemax', String(goal));
    bar.setAttribute('aria-valuenow', String(count));
    bar.setAttribute('aria-valuetext', `${count} of ${goal} ${countWord}`);
    $('#bar-fill').style.transform = `scaleX(${Math.min(1, count / goal)})`;
    // positions are set through the CSSOM: the content security policy blocks inline style attributes
    const marks = $('#bar-marks');
    marks.replaceChildren(...milestones.filter((m) => m < goal).map((m) => { const s = document.createElement('span'); s.style.left = `${(m / goal) * 100}%`; return s; }));
    const list = $('#milestones');
    list.replaceChildren(...milestones.map((m) => { const li = document.createElement('li'); li.textContent = String(m); li.className = count >= m ? 'reached' : ''; li.style.left = `${(m / goal) * 100}%`; return li; }));
    const from = shown;
    shown = count;
    const el = $('#counter-value');
    if (reduced || from === count) { el.textContent = count.toLocaleString('en-US'); return; }
    const t0 = performance.now();
    const dur = 1200;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (count - from) * ease(t)).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  async function loadStats() {
    try {
      if (STATIC) { renderCounter(Math.max(0, Number(await rpc('waitlist_count')) || 0)); return; }
      const r = await fetch('/api/waitlist/stats', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const s = await r.json();
      goal = s.goal;
      milestones = s.milestones.map((m) => m.at);
      if (demo) return;
      renderCounter(s.confirmed);
    } catch {
      $('#counter-note').textContent = 'The live count is unavailable right now.';
    }
  }
  if (demo) {
    $('#demo-flag').hidden = false;
    $('#counter-note').textContent = 'Design preview: this number is a sample, not real signups.';
  }
  const counterObs = new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    if (demo) { fetch('/api/config').then((r) => r.json()).then((c) => { goal = c.waitlist.goal; milestones = c.waitlist.milestones; renderCounter(c.waitlist.designPreviewCount); }).catch(() => renderCounter(35)); }
    else loadStats();
    if (!demo) setInterval(loadStats, STATIC ? 60000 : 30000);
  }, { threshold: 0.3 });
  counterObs.observe($('#counter'));

  const form = $('#waitlist-form');
  const emailInput = $('#email');
  const consent = $('#consent');
  let focused = false;
  form.addEventListener('focusin', () => { if (!focused) { focused = true; track('form_focus'); } });
  emailInput.addEventListener('blur', () => { if (emailInput.value && !EMAIL.test(emailInput.value.trim())) showError('email-error', 'Enter a valid email address, like name@example.com.', emailInput); });
  emailInput.addEventListener('input', () => showError('email-error', '', emailInput));
  consent.addEventListener('change', () => showError('consent-error', ''));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('form-error', '');
    const email = emailInput.value.trim();
    let bad = false;
    if (!email) { showError('email-error', 'Enter your email address.', emailInput); bad = true; }
    else if (!EMAIL.test(email)) { showError('email-error', 'Enter a valid email address, like name@example.com.', emailInput); bad = true; }
    if (!consent.checked) { showError('consent-error', 'Tick the box to agree to receive early access emails.'); bad = true; }
    if (bad) { (emailInput.getAttribute('aria-invalid') === 'true' ? emailInput : consent).focus(); return; }
    if (tooQuick(pageStart)) { showError('form-error', 'That was quick. Wait a moment and try again.'); return; }

    const btn = $('#submit');
    const plan = planSelect && PLAN_NAMES[planSelect.value] ? planSelect.value : null;
    setBusy(btn, true, 'Join the waitlist', 'Joining');
    track('form_submit');
    try {
      let data;
      let status = 200;
      if (STATIC) {
        data = await rpc('join_waitlist', {
          p_email: email, p_consent: true, p_plan: plan, p_company_website: $('#company_website').value,
          p_utm_source: attribution.utm_source, p_utm_medium: attribution.utm_medium, p_utm_campaign: attribution.utm_campaign,
          p_ref: attribution.ref, p_referrer_host: attribution.referrer_host,
        });
      } else {
        if (!formToken) await getToken();
        const r = await fetch('/api/waitlist', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, consent: true, plan, form_token: formToken, company_website: $('#company_website').value, ...attribution }),
        });
        status = r.status;
        data = await r.json().catch(() => ({}));
        if (!r.ok) data.ok = false;
      }
      if (!data || !data.ok) {
        track('signup_error', String(status));
        if (data && data.field === 'email') showError('email-error', data.error, emailInput);
        else if (data && data.field === 'consent') showError('consent-error', data.error);
        else showError('form-error', (data && data.error) || 'Something went wrong on our side. Try again in a minute.');
        if (status === 400 && /expired/i.test((data && data.error) || '')) getToken().catch(() => {});
        return;
      }
      track('signup_ok');
      form.hidden = true;
      if (STATIC) {
        $('#success-title').textContent = 'You are on the list';
        const strong = document.createElement('strong');
        strong.textContent = email;
        $('#success-text').replaceChildren('We saved your place for ', strong,
          `. ${plan ? `Plan noted: ${PLAN_NAMES[plan]}. ` : ''}We will email you when early access opens.`);
        loadStats();
      } else {
        $('#success-email').textContent = email;
      }
      const ok = $('#success');
      ok.hidden = false;
      ok.focus();
    } catch {
      showError('form-error', 'We could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(btn, false, 'Join the waitlist', 'Joining');
    }
  });

  // ------------------------------------------------------------ contact form
  const cForm = $('#contact-form');
  if (cForm) {
    const f = { name: $('#c-name'), email: $('#c-email'), subject: $('#c-subject'), message: $('#c-message') };
    const rules = {
      name: (v) => (!v ? 'Enter your full name.' : v.length > 100 ? 'Keep your name under 100 characters.' : ''),
      email: (v) => (!v ? 'Enter your email address.' : !EMAIL.test(v) || v.length > 254 ? 'Enter a valid email address, like name@example.com.' : ''),
      subject: (v) => (!v ? 'Enter a subject.' : v.length > 150 ? 'Keep the subject under 150 characters.' : ''),
      message: (v) => (v.length < 10 ? 'Write a message of at least 10 characters.' : v.length > 5000 ? 'Keep the message under 5,000 characters.' : ''),
    };
    const check = (k) => { const msg = rules[k](f[k].value.trim()); showError(`c-${k}-error`, msg, f[k]); return !msg; };
    Object.keys(f).forEach((k) => {
      f[k].addEventListener('input', () => showError(`c-${k}-error`, '', f[k]));
      f[k].addEventListener('blur', () => { if (f[k].value.trim()) check(k); });
    });
    const fail = (msg) => {
      const mail = directEmail();
      showError('c-form-error', mail ? `${msg} You can also email us at ${mail}.` : msg);
    };
    cForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('c-form-error', '');
      const bad = Object.keys(f).filter((k) => !check(k));
      if (bad.length) { f[bad[0]].focus(); return; }
      if (STATIC && !W3F) { fail('The contact form is not set up yet.'); return; }
      if (tooQuick(pageStart)) { showError('c-form-error', 'That was quick. Wait a moment and try again.'); return; }
      const v = Object.fromEntries(Object.keys(f).map((k) => [k, f[k].value.trim()]));
      const btn = $('#c-submit');
      setBusy(btn, true, 'Send message', 'Sending');
      track('contact_submit');
      try {
        let ok = false;
        let err = '';
        let field = '';
        if ($('#c-website').value) {
          ok = true; // honeypot filled: a bot; pretend it worked and send nothing
        } else if (STATIC) {
          const r = await fetch('https://api.web3forms.com/submit', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ access_key: W3F, subject: `[ELM contact] ${v.subject}`, from_name: 'ELM pre-launch page', replyto: v.email, name: v.name, email: v.email, message: v.message }),
          });
          const d = await r.json().catch(() => ({}));
          ok = r.ok && d.success === true;
          err = r.status === 429 ? 'Too many messages from this connection. Try again in an hour.' : '';
        } else {
          if (!formToken) await getToken();
          const r = await fetch('/api/contact', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...v, form_token: formToken, company_website: $('#c-website').value }),
          });
          const d = await r.json().catch(() => ({}));
          ok = r.ok && d.ok === true;
          err = d.error || '';
          field = d.field || '';
        }
        if (!ok) {
          track('contact_error');
          if (field && f[field]) { showError(`c-${field}-error`, err, f[field]); f[field].focus(); }
          else fail(err || 'We could not send your message. Try again in a few minutes.');
          return;
        }
        track('contact_ok');
        $('#c-success-email').textContent = v.email;
        cForm.reset();
        cForm.hidden = true;
        const done = $('#c-success');
        done.hidden = false;
        done.focus();
      } catch {
        fail('We could not reach the server. Check your connection and try again.');
      } finally {
        setBusy(btn, false, 'Send message', 'Sending');
      }
    });
    $('#c-again').addEventListener('click', () => {
      $('#c-success').hidden = true;
      cForm.hidden = false;
      f.name.focus();
    });
  }


  // ------------------------------------------------------------ FAQ and video
  $$('#faq-list details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) track('faq_open', $('summary', d).textContent); }));

  const modal = $('#video-modal');
  const video = $('#tour');
  let lastFocus = null;
  let videoChecked = false;
  async function openVideo() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-close-video]').focus();
    track('demo_open');
    if (!videoChecked) {
      videoChecked = true;
      try {
        const r = await fetch(video.dataset.src, { method: 'HEAD' });
        if (!r.ok) throw new Error('missing');
        // attach media only once the file exists, so a missing render never produces broken requests
        video.poster = video.dataset.poster;
        video.src = video.dataset.src;
        const cap = await fetch(video.dataset.captions, { method: 'HEAD' }).catch(() => null);
        if (cap && cap.ok) {
          const track = document.createElement('track');
          Object.assign(track, { kind: 'captions', src: video.dataset.captions, srclang: 'en', label: 'English', default: true });
          video.append(track);
        }
      } catch {
        video.hidden = true;
        $('#video-missing').hidden = false;
      }
    }
  }
  function closeVideo() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (!video.paused) video.pause();
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-open-video]').forEach((b) => b.addEventListener('click', openVideo));
  $('[data-close-video]').addEventListener('click', closeVideo);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeVideo(); });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideo();
    if (e.key === 'Tab') {
      const f = $$('button, video[controls], a[href]', modal).filter((x) => !x.hidden);
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
