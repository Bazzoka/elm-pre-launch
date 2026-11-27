/* ELM landing page behaviour. No libraries, no cookies, no local storage. */
(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
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
      links.forEach((a, i) => { a.style.transitionDelay = reduced ? '0ms' : `${Math.round(i * step)}ms`; });
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

  // the nav marks the section being read
  const navLinks = $$('.nav-links a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${en.target.id}`)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const el = document.getElementById(a.getAttribute('href').slice(1)); if (el) sectionObserver.observe(el); });

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

  // ------------------------------------------------------------ accessible tabs (arrow keys, Home, End)
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
      if (onSelect) onSelect(tab);
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
  const st = (kind, label) => `<span class="st st-${kind} caption-4">${label}</span>`;

  // ------------------------------------------------------------ hero product tour: nothing loads until Play is pressed
  const video = $('#tour');
  const playBtn = $('#tour-play');
  let tourAttached = null;
  async function attachTour() {
    // attach media only once the file exists, so a missing render never produces broken requests
    const r = await fetch(video.dataset.src, { method: 'HEAD' });
    if (!r.ok) throw new Error('missing');
    const cap = await fetch(video.dataset.captions, { method: 'HEAD' }).catch(() => null);
    if (cap && cap.ok) {
      const t = document.createElement('track');
      Object.assign(t, { kind: 'captions', src: video.dataset.captions, srclang: 'en', label: 'English', default: true });
      video.append(t);
    }
    video.poster = video.dataset.poster;
    video.preload = 'auto';
    video.src = video.dataset.src;
  }
  if (video && playBtn) {
    playBtn.addEventListener('click', async () => {
      track('demo_open');
      playBtn.disabled = true;
      try {
        tourAttached = tourAttached || attachTour();
        await tourAttached;
        video.hidden = false;
        playBtn.hidden = true;
        video.focus({ preventScroll: true });
        await video.play().catch(() => { /* the visitor can press play on the controls */ });
      } catch {
        playBtn.hidden = true;
        $('#video-missing').hidden = false;
      }
    });
  }

  // ------------------------------------------------------------ the problem, solved: supplier -> ELM -> eBay
  const FLOW = {
    'fl-out': {
      s: ['Trail Jacket · Navy / M', st('out', 'Sold out'), 'Read on the scheduled check'],
      checks: [['ok', 'Mapping verified by you'], ['ok', 'Sync is on for this variation'], ['ok', 'eBay Out-of-Stock Control is on']],
      verdict: 'Lower now, on this check', qty: ['1', '0', 'out'], note: 'Written, then read back from eBay',
      outcome: 'The listing stays live as sold out, so buyers can\'t order a variation your supplier no longer has.' },
    'fl-restock': {
      s: ['Trail Jacket · Navy / M', st('in', 'In stock'), 'Back in stock at the supplier'],
      checks: [['ok', 'First check: in stock'], ['ok', 'Second check, about 10 minutes later: still in stock'], ['ok', 'Mapping verified and sync on']],
      verdict: 'Restock confirmed', qty: ['0', '1', 'in'], note: 'Written, then read back from eBay',
      outcome: 'Your listing sells again once the restock is confirmed. A brief glitch on the supplier page does not reopen sales.' },
    'fl-fail': {
      s: ['Stoneware Mug Set · Slate', st('unk', 'Check failed'), 'The supplier page did not answer'],
      checks: [['warn', 'Check failed, so stock is unknown'], ['ok', 'A failed check is never read as sold out'], ['ok', 'Retry on the next check']],
      verdict: 'Hold the last quantity', qty: ['1', '1', 'hold'], note: 'Held for a set window, 24 hours by default',
      outcome: 'A slow or blocked supplier page does not empty your listing. If the supplier still cannot be read after 24 hours, ELM lowers the quantity to 0.' },
    'fl-edit': {
      s: ['Canvas Weekender · Olive', st('in', 'In stock'), 'Checked as usual'],
      checks: [['warn', 'You changed this quantity on eBay'], ['ok', 'Hold off on this listing for 24 hours'], ['ok', 'Tell you on Telegram']],
      verdict: 'Your edit stays', qty: [null, '0', 'mine', 'Set by you'], note: 'ELM steps aside, then normal sync resumes by itself',
      outcome: 'You can step in by hand at any time. ELM does not overwrite your change, and it tells you it is holding off.' },
    'fl-mine': {
      s: ['Trail Jacket · Olive / L', st('in', 'In stock'), 'Checked as usual'],
      checks: [['ok', 'Supplier has stock'], ['warn', 'eBay shows 3, a quantity you set'], ['ok', 'ELM only ever writes 0 or 1']],
      verdict: 'Leave it to you', qty: [null, '3', 'mine', 'Left to you'], note: 'Unless you allow ELM to manage it',
      outcome: 'Quantities above 1 that you set stay yours. ELM leaves them alone unless you allow it.' },
  };
  const flowPanel = $('#flow-panel');
  if (flowPanel) {
    const set = (k, html) => { $(`[data-f="${k}"]`, flowPanel).innerHTML = html; };
    const ICON_ARROW = '<svg class="i" aria-hidden="true"><use href="static/img/icons.svg#i-arrow-right"/></svg>';
    function renderFlow(id, animate) {
      const f = FLOW[id];
      flowPanel.setAttribute('aria-labelledby', id);
      set('s-item', esc(f.s[0])); set('s-state', f.s[1]); set('s-note', esc(f.s[2]));
      set('e-checks', f.checks.map(([k, t]) => `<li class="${k} caption-2">${esc(t)}</li>`).join(''));
      set('e-verdict', esc(f.verdict));
      set('b-item', esc(f.s[0]));
      const [from, to, cls, tag] = f.qty;
      set('b-qty', (from !== null ? `<span class="from">${from}</span>${ICON_ARROW}` : '') + `<span class="to to-${cls}">${to}</span>` + (tag ? `<span class="qty-tag caption-4">${esc(tag)}</span>` : ''));
      set('b-note', esc(f.note));
      $('#flow-outcome').textContent = f.outcome;
      flowPanel.classList.remove('play');
      if (animate && !reduced) { void flowPanel.offsetWidth; flowPanel.classList.add('play'); }
    }
    wireTabs($('#flow-tabs'), (tab) => { renderFlow(tab.id, true); track('flow_tab', tab.id); });
    new IntersectionObserver(([en], obs) => { if (en.isIntersecting) { renderFlow($('#flow-tabs [aria-selected="true"]').id, true); obs.disconnect(); } }, { threshold: 0.4 }).observe(flowPanel);
  }

  // ------------------------------------------------------------ live activity feed (sample data)
  const feed = $('#hero-feed');
  const rows = $$('#hero-rows tr');
  const events = [
    { cls: 'ev-out', row: 0, st: ['st-out', 'Sold out'], q: '0', text: 'Trail Jacket · Navy / M', sub: 'Supplier sold out. eBay quantity 1 → 0' },
    { cls: 'ev-hold', row: 2, st: ['st-unk', 'Check failed'], q: '1 <span class="caption-5 muted">held</span>', text: 'Stoneware Mug Set · Slate', sub: 'Check failed. Holding quantity, retry in 15 min' },
    { cls: 'ev-in', row: 3, st: ['st-in', 'In stock'], q: '1', text: 'Merino Crew Socks · Grey / L', sub: 'Restock confirmed twice. eBay quantity 0 → 1' },
    { cls: 'ev-in', row: 0, st: ['st-in', 'In stock'], q: '1', text: 'Trail Jacket · Navy / M', sub: 'Restock confirmed twice. eBay quantity 0 → 1' },
    { cls: 'ev-out', row: 1, st: ['st-out', 'Sold out'], q: '0', text: 'Canvas Weekender · Olive', sub: 'Supplier sold out. eBay quantity 1 → 0' },
    { cls: 'ev-in', row: 1, st: ['st-in', 'In stock'], q: '1', text: 'Canvas Weekender · Olive', sub: 'Restock confirmed twice. eBay quantity 0 → 1' },
    { cls: 'ev-out', row: 3, st: ['st-out', 'Sold out'], q: '0', text: 'Merino Crew Socks · Grey / L', sub: 'Supplier sold out. eBay quantity 1 → 0' },
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
      const s = row.querySelector('.st');
      s.className = `st ${ev.st[0]} caption-4`;
      s.textContent = ev.st[1];
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
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting && !timer) timer = setInterval(pushEvent, 2800);
        if (!en.isIntersecting && timer) { clearInterval(timer); timer = null; }
      }).observe($('.app-frame'));
    }
  }

  // ------------------------------------------------------------ features: four categories plus a status filter
  const featTabs = $('#feat-tabs');
  if (featTabs) {
    const section = $('#features');
    const empty = $('#feat-empty');
    const updateEmpty = () => {
      const panel = $('.feat-panel:not([hidden])', section);
      const f = section.dataset.filter || 'all';
      empty.hidden = !panel || f === 'all' || $$(`.feat[data-status="${f}"]`, panel).length > 0;
    };
    const selectFeat = wireTabs(featTabs, (tab) => { updateEmpty(); track('feature_tab', tab.id); });
    selectFeat($('[role="tab"]', featTabs), false);
    $$('#feat-filter [data-filter]').forEach((b) => b.addEventListener('click', () => {
      $$('#feat-filter [data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      section.dataset.filter = b.dataset.filter;
      updateEmpty();
      track('feature_filter', b.dataset.filter);
    }));
  }

  // ------------------------------------------------------------ product demos (data driven)
  // To add a recorded demo: put <slug>.mp4 and <slug>.png (and optionally <slug>.vtt) in /static/video/demos/,
  // then set src (and captions) on its entry below. Entries without a src, or whose file is missing (HEAD check),
  // show the interactive preview instead, so the page never requests a file that is not there.
  const REAL = 'Real ELM engine · sample data · test mode';
  const CONCEPT = 'Concept preview · Coming at launch';
  const q = (n) => `<span class="mono">${n}</span>`;
  const sub = (a, b) => `${a}<span class="sub">${b}</span>`;
  const DEMOS = [
    { slug: 'monitoring-a-supplier', title: 'Monitoring a supplier', label: REAL, status: 'today', poster: 'monitoring-a-supplier.png', src: 'monitoring-a-supplier.mp4', captions: null,
      desc: 'Each supplier store with its checks today, its failures and its state. You can pause a supplier or keep it out of eBay sync from here.',
      cols: ['Supplier', 'Products', 'Checks today', 'Failed', 'Last failure', 'State'],
      rows: [
        ['Northfield Supply', q(41), q(984), q(3), 'Timeout, 2:14 pm', st('in', 'Active')],
        ['Harbor &amp; Pine Outfitters', q(17), q(816), q(0), 'None', st('in', 'Active')],
        ['Kestrel Home', q(23), q(552), q(19), 'Blocked, 1:47 pm', st('unk', 'Cooling down')],
      ],
      steps: [[0, 'Northfield Supply is checked every 60 minutes. Three checks failed today, and each one held the last quantity instead of zeroing a listing.'],
        [1, 'Harbor & Pine Outfitters is checked every 30 minutes, with no failures today.'],
        [2, 'Kestrel Home blocked a check. ELM backs off and retries later instead of trying to get around the block.']] },
    { slug: 'mapping-a-product', title: 'Mapping a product', label: REAL, status: 'mixed', concept: 'Option and title matching is a concept preview', poster: 'mapping-a-product.png', src: 'mapping-a-product.mp4', captions: null,
      desc: 'Which supplier variant each eBay variation depends on. Exact SKU suggestions work today; matching by options and title is coming at launch.',
      cols: ['eBay variation', 'Supplier variant', 'Matched by', 'Confidence', 'State'],
      rows: [
        ['Trail Jacket · Navy / M', 'Northfield Supply · Navy / M', 'Exact SKU', q('100%'), st('in', 'Verified')],
        ['Trail Jacket · Navy / L', 'Northfield Supply · Navy / L', 'Exact SKU', q('100%'), st('in', 'Verified')],
        ['Mug Set · Slate', 'Kestrel Home · Slate / 4 pack', 'Options and title', q('87%'), st('unk', 'Needs review')],
        ['Mug Set · Sage', 'Kestrel Home · Sage / 4 pack', 'Options and title', q('91%'), st('unk', 'Needs review')],
      ],
      steps: [[[0, 1], 'Today: the eBay SKU and the supplier SKU match exactly, so ELM suggests the link and you verify it.'],
        [[2, 3], 'At launch: matches by option values and title wait in a review queue until you approve them.'],
        [[0, 1], 'Only verified mappings can change your eBay stock. Sync starts after the next successful supplier check.']] },
    { slug: 'updating-stock', title: 'Updating stock', label: REAL, status: 'today', poster: 'updating-stock.png', src: 'updating-stock.mp4', captions: null,
      desc: 'Every decision ELM made, what it changed on eBay, and why.',
      cols: ['When', 'Variation', 'Supplier', 'eBay qty', 'Reason', 'Result'],
      rows: [
        [q('2:41 pm'), 'Trail Jacket · Navy / L', st('out', 'Sold out'), q('1 → 0'), 'Supplier shows sold out', st('in', 'Written, read back')],
        [q('2:14 pm'), 'Stoneware Mug Set · Slate', st('unk', 'Check failed'), q('1 → 1'), 'Holding: check failed, retry at 2:29 pm', 'No change'],
        [q('1:58 pm'), 'Merino Crew Socks · Grey / L', st('in', 'In stock'), q('0 → 1'), 'Restock confirmed by a second check', st('in', 'Written, read back')],
        [q('1:30 pm'), 'Canvas Weekender · Olive', st('in', 'In stock'), q(1), 'You edited this listing on eBay: ELM holds off for 24 h, then sync resumes', 'Skipped'],
        [q('1:12 pm'), 'Linen Throw · Sand', st('in', 'In stock'), `${q(3)} yours`, 'Above 1, set by you: left alone unless you allow it', 'No change'],
      ],
      steps: [[0, 'Sold out at the supplier: ELM lowers the eBay quantity to 0 on that check and reads the listing back.'],
        [1, 'A failed check is never read as sold out. ELM holds the last quantity and retries.'],
        [2, 'A restock is confirmed by a second check before the quantity goes back to 1.'],
        [3, 'You edited this listing yourself, so ELM holds off for 24 hours, then normal sync resumes by itself.'],
        [4, 'Linen Throw shows 3 on eBay. Quantities above 1 are yours, so ELM leaves them alone unless you allow it.']] },
    { slug: 'generating-skus', title: 'Generating SKUs', label: CONCEPT, status: 'launch', poster: 'generating-skus.png', src: 'generating-skus.mp4', captions: null,
      desc: 'Variations without a SKU get a consistent one. Duplicate SKUs are flagged, which already works today.',
      cols: ['Variation', 'SKU on eBay', 'ELM SKU', 'State'],
      rows: [
        [sub('Ridge Fleece Vest', 'Black / S'), '<span class="muted">Missing</span>', q('RFV-BK-S-4Q7'), st('unk', 'Ready for review')],
        [sub('Ridge Fleece Vest', 'Black / M'), '<span class="muted">Missing</span>', q('RFV-BK-M-8T2'), st('unk', 'Ready for review')],
        [sub('Trail Jacket', 'Navy / M'), q('NFS-TJ-NV-M'), 'Kept as it is', st('in', 'Existing SKU')],
        [sub('Harbor Rope Tote', 'Natural'), q('HPO-RT-01'), 'Shared with another listing', st('out', 'Duplicate')],
      ],
      steps: [[[0, 1], 'At launch: variations without a SKU get one from a single consistent scheme, for you to review.'],
        [2, 'SKUs you already have stay as they are.'],
        [3, 'Works today: a duplicate SKU is flagged and kept out of sync until you fix it.']] },
    { slug: 'creating-a-listing', title: 'Creating a listing', label: CONCEPT, status: 'launch', poster: 'creating-a-listing.png', src: 'creating-a-listing.mp4', captions: null,
      desc: 'From a supplier product to an eBay listing draft you review. Use only images and descriptions you have the right to use.',
      cols: ['Step', 'What ELM prepares', 'State'],
      rows: [
        ['Supplier product', 'Ridge Fleece Vest from Northfield Supply, inside your price filter', st('in', 'Selected')],
        ['Variations', '10 variations: 5 sizes in 2 colors', st('in', 'Ready')],
        ['Images', 'Supplier images matched to Black and Forest', st('in', 'Ready')],
        ['Category and item specifics', 'Suggested category; 2 item specifics need your input', st('unk', 'Needs you')],
        ['SKUs', '10 generated, one per variation', st('in', 'Ready')],
        ['Publish', 'Sent to eBay only when you approve', st('unk', 'Waiting for review')],
      ],
      steps: [[0, 'Pick a product from a supplier catalog, filtered by a minimum and maximum supplier price.'],
        [[1, 2], 'ELM prepares the variations and matches supplier images to each color.'],
        [3, 'Category rules vary, so some drafts need a quick fix from you.'],
        [4, 'Every variation gets a SKU, ready for stock sync.'],
        [5, 'Nothing is published until you review and approve the draft. Eligible listings are then connected to monitoring.']] },
    { slug: 'many-variations', title: 'Many variations', label: REAL, status: 'today', poster: 'many-variations.png', src: 'many-variations.mp4', captions: null,
      desc: 'One listing, many variations. Each one follows its own supplier variant.',
      cols: ['Variation', 'SKU', 'Supplier', 'eBay qty'],
      rows: [
        [sub('Trail Jacket', 'Navy / S'), q('NFS-TJ-NV-S'), st('in', 'In stock'), q(1)],
        [sub('Trail Jacket', 'Navy / M'), q('NFS-TJ-NV-M'), st('out', 'Sold out'), q(0)],
        [sub('Trail Jacket', 'Navy / L'), q('NFS-TJ-NV-L'), st('in', 'In stock'), q(1)],
        [sub('Trail Jacket', 'Olive / S'), q('NFS-TJ-OL-S'), st('unk', 'Check failed'), `${q(1)} held`],
        [sub('Trail Jacket', 'Olive / M'), q('NFS-TJ-OL-M'), st('in', 'In stock'), q(1)],
        [sub('Trail Jacket', 'Olive / L'), q('NFS-TJ-OL-L'), st('in', 'In stock'), `${q(3)} left to you`],
      ],
      steps: [[1, 'Navy / M sold out, so only that variation goes to 0. The other sizes keep selling.'],
        [3, 'Olive / S could not be checked. ELM holds its quantity instead of guessing.'],
        [5, 'Olive / L shows 3, a quantity you set. ELM leaves it alone.']] },
    { slug: 'notifications', title: 'Notifications', label: REAL, status: 'mixed', concept: 'Email alerts are a concept preview', poster: 'reviewing-notifications.png', src: 'reviewing-notifications.mp4', captions: null,
      desc: 'Alerts for what needs you. Telegram works today; email arrives at launch.',
      cols: ['When', 'Event', 'Channel', 'Delivered'],
      rows: [
        [q('2:41 pm'), 'eBay update failed for Trail Jacket · Navy / L. ELM will retry.', 'Telegram', st('in', 'Sent')],
        [q('1:30 pm'), 'You changed Canvas Weekender · Olive on eBay. ELM holds off for 24 h.', 'Telegram', st('in', 'Sent')],
        [q('11:05 am'), 'Mug Set · Sage changed its variations on eBay. Review the mapping.', 'Telegram', st('in', 'Sent')],
        [q('10:12 am'), 'The same alerts by email.', 'Email', '<span class="status status-launch caption-3">At launch</span>'],
      ],
      steps: [[0, 'When an eBay update fails, you hear about it on Telegram.'],
        [1, 'When you change a listing yourself, ELM tells you it is holding off.'],
        [2, 'When a listing changes its variations, ELM asks you to review the mapping.'],
        [3, 'At launch: the same alerts by email.']] },
  ];
  const STATUS = {
    today: '<span class="status status-today caption-3">Works today</span>',
    mixed: '<span class="status status-mixed caption-3">Partly today, rest at launch</span>',
    launch: '<span class="status status-launch caption-3">Coming at launch</span>',
  };
  const demoTabs = $('#demo-tabs');
  const demoPanel = $('#demo-panel');
  if (demoTabs && demoPanel) {
    const base = demoPanel.dataset.src;
    const available = {};
    const exists = async (path) => { try { return (await fetch(path, { method: 'HEAD' })).ok; } catch { return false; } };
    demoTabs.innerHTML = DEMOS.map((d, i) => `<button class="tab button-sm" role="tab" id="dm-${d.slug}" aria-controls="demo-panel" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(d.title)}</button>`).join('');
    demoPanel.dataset.shared = 'true';
    let current = 0;

    function previewHtml(d) {
      const tags = d.status === 'launch' ? `<span class="tag caption-4">Concept preview</span>`
        : `<span class="tag caption-4">Product preview</span>${d.concept ? `<span class="tag caption-4">${esc(d.concept)}</span>` : ''}`;
      return `<div class="sc-top"><span class="title-3">${esc(d.title)}</span><span class="labels">${STATUS[d.status]}${tags}<span class="tag tag-muted caption-4">Sample data</span></span></div>
        <div class="demo-body"><p class="sc-desc body-6">${esc(d.desc)}</p>
        <div class="sc-scroll" tabindex="0" role="region" aria-label="${esc(d.title)} table, scrolls sideways on small screens"><table class="dt"><thead><tr>${d.cols.map((c) => `<th class="caption-4" scope="col">${c}</th>`).join('')}</tr></thead>
        <tbody>${d.rows.map((r) => `<tr>${r.map((c) => `<td class="body-6">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="demo-steps"><p class="caption-3 mono demo-count" id="demo-count"></p><p class="body-5 demo-text" id="demo-text" aria-live="polite"></p>
        <div class="demo-nav"><button class="btn btn-ghost button-sm" type="button" id="demo-prev">Previous</button><button class="btn btn-primary button-sm" type="button" id="demo-next">Next step</button></div></div></div>`;
    }
    function videoHtml(d) {
      const cap = d.captions && available[`${d.slug}:cap`] ? `<track kind="captions" src="${base}${d.captions}" srclang="en" label="English" default>` : '';
      const poster = available[`${d.slug}:poster`] ? ` poster="${base}${d.poster}"` : '';
      return `<div class="sc-top"><span class="title-3">${esc(d.title)}</span><span class="labels">${STATUS[d.status]}<span class="tag ${d.label === REAL ? 'tag-muted ' : ''}caption-4">${esc(d.label)}</span></span></div>
        <div class="demo-video"><video controls playsinline preload="metadata"${poster} src="${base}${d.src}">${cap}</video></div>`;
    }
    function step(d, i) {
      const n = d.steps.length;
      current = (i + n) % n;
      const [rowsOn, text] = d.steps[current];
      const on = [].concat(rowsOn);
      $$('tbody tr', demoPanel).forEach((tr, r) => tr.classList.toggle('hl', on.includes(r)));
      $('#demo-count').textContent = `Step ${current + 1} of ${n}`;
      $('#demo-text').textContent = text;
      $('#demo-next').textContent = current === n - 1 ? 'Start again' : 'Next step';
      $('#demo-prev').disabled = current === 0;
    }
    async function renderDemo(slug) {
      const d = DEMOS.find((x) => x.slug === slug) || DEMOS[0];
      demoPanel.setAttribute('aria-labelledby', `dm-${d.slug}`);
      if (d.src && available[d.slug] === undefined) {
        available[d.slug] = await exists(base + d.src);
        if (available[d.slug]) {
          available[`${d.slug}:poster`] = d.poster ? await exists(base + d.poster) : false;
          available[`${d.slug}:cap`] = d.captions ? await exists(base + d.captions) : false;
        }
      }
      if (demoTabs.querySelector('[aria-selected="true"]').id !== `dm-${d.slug}`) return; // another tab was picked meanwhile
      if (d.src && available[d.slug]) { demoPanel.innerHTML = videoHtml(d); return; }
      demoPanel.innerHTML = previewHtml(d);
      $('#demo-next').addEventListener('click', () => step(d, current + 1));
      $('#demo-prev').addEventListener('click', () => step(d, current - 1));
      step(d, 0);
    }
    wireTabs(demoTabs, (tab) => { renderDemo(tab.id.replace('dm-', '')); track('demo_tab', tab.id); });
    renderDemo(DEMOS[0].slug);
  }

  // ------------------------------------------------------------ backends
  // Local server (Flask): the /api endpoints. Static copy (GitHub Pages): the waitlist goes to Supabase through two
  // public database functions, and contact messages go to Web3Forms. Both keys are public by design; no secret is here.
  const cfg = ($('meta[name="elm-config"]') || { dataset: {} }).dataset;
  const has = (v) => !!v && !/^\{\{/.test(v);
  const SB = STATIC && has(cfg.supabaseUrl) && has(cfg.supabaseKey) ? { url: cfg.supabaseUrl, key: cfg.supabaseKey } : null;
  const W3F = STATIC && has(cfg.web3formsKey) ? cfg.web3formsKey : null;
  // Static copy: after a signup is saved in the database, email the owner a short notice through Web3Forms.
  // Fire and forget: the signup is already stored, so a failed notice never affects the visitor. Bots that fill the
  // honeypot are not stored and are not reported.
  function notifyOwner(email, plan) {
    if (!W3F || (document.getElementById('company_website') || {}).value) return;
    const planName = plan ? ({ starter: 'Starter', growth: 'Growth', pro: 'Pro', business: 'Business' }[plan] || plan) : 'Not sure yet';
    const when = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' });
    const source = [attribution.utm_source, attribution.utm_campaign, attribution.referrer_host].filter(Boolean).join(' / ') || 'direct';
    try {
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: W3F, subject: `[ELM waitlist] New signup: ${email}`, from_name: 'ELM pre-launch page', replyto: email,
          'Signup email': email, 'Plan picked': planName, 'Joined (Cairo time)': when, Source: source }),
      }).catch(() => {});
    } catch { /* the signup is saved either way */ }
  }
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
        notifyOwner(email, plan);
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

  // ------------------------------------------------------------ FAQ
  $$('#faq-list details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) track('faq_open', $('summary', d).textContent); }));
})();
