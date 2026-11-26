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

  // ------------------------------------------------------------ waitlist counter (truthful) and form
  if (!STATIC) {
  const demo = params.get('demo') === '1';
  let goal = 250;
  let milestones = [50, 100, 150, 200, 250];
  let shown = 0;
  function renderCounter(count) {
    const bar = $('#counter-bar');
    $('#counter-goal').textContent = String(goal);
    bar.setAttribute('aria-valuemax', String(goal));
    bar.setAttribute('aria-valuenow', String(count));
    bar.setAttribute('aria-valuetext', `${count} of ${goal} verified signups`);
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
    if (!demo) setInterval(loadStats, 30000);
  }, { threshold: 0.3 });
  counterObs.observe($('#counter'));

  const form = $('#waitlist-form');
  const emailInput = $('#email');
  const consent = $('#consent');
  let formToken = null;
  async function getToken() {
    const r = await fetch('/api/form-token', { cache: 'no-store' });
    formToken = (await r.json()).token;
  }
  getToken().catch(() => {});
  let focused = false;
  form.addEventListener('focusin', () => { if (!focused) { focused = true; track('form_focus'); } });

  function showError(id, msg, input) {
    const p = document.getElementById(id);
    p.textContent = msg || '';
    p.hidden = !msg;
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
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

    const btn = $('#submit');
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    $('.btn-label', btn).textContent = 'Joining';
    track('form_submit');
    try {
      if (!formToken) await getToken();
      const r = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true, form_token: formToken, company_website: $('#company_website').value, ...attribution }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        track('signup_error', String(r.status));
        if (data.field === 'email') showError('email-error', data.error, emailInput);
        else if (data.field === 'consent') showError('consent-error', data.error);
        else showError('form-error', data.error || 'Something went wrong on our side. Try again in a minute.');
        if (r.status === 400 && /expired/i.test(data.error || '')) getToken().catch(() => {});
        return;
      }
      track('signup_ok');
      form.hidden = true;
      $('#success-email').textContent = email;
      const ok = $('#success');
      ok.hidden = false;
      ok.focus();
    } catch {
      showError('form-error', 'We could not reach the server. Check your connection and try again.');
    } finally {
      btn.removeAttribute('aria-busy');
      btn.disabled = false;
      $('.btn-label', btn).textContent = 'Join the waitlist';
    }
  });
  } // end if (!STATIC)

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
