/* Motion layer (0.22.0). Visual only: it wraps render and state globals after every other module,
   and never changes data, copy, order or which handlers run. Spec: docs/design-evidence/motion.md
   - Keyed presence: an innerHTML re-render keeps rows whose key survives (FLIP + colour carry-over),
     enters only new keys and lets removed keys leave as short-lived ghosts. No row replays an entrance.
   - Screens: View Transitions for nav clicks, a CSS rise for programmatic navigation; scroll resets.
   - Completion: pen-stroke check, accent fill, left-to-right strike, muted settle; quick reverse.
   - Dialogs, sheets, toasts and the schedule player enter and exit; counts tick to their value. */
(function motionLayerV22() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const rootStyle = () => getComputedStyle(document.documentElement);
  const token = name => parseFloat(rootStyle().getPropertyValue(name)) || 0;
  const EASE = 'cubic-bezier(0.2,0,0,1)';
  const ITEMS = '.task,.schedule-row,.matrix-task,.hub-rail-item,.hub-project,.hub-person,.hub-bar-row,.hub-settings-row,.plan-item,.routine-item,.purpose-manager-row,.space-switcher-option,.sheet-project';
  const ITEM_RE = /class="[^"]*\b(task|schedule-row|matrix-task|hub-rail-item|hub-project|hub-person|hub-bar-row|hub-settings-row|plan-item|routine-item|purpose-manager-row|space-switcher-option|sheet-project)\b/;
  const COLOR_PARTS = '.check,.schedule-main,.schedule-state-icon,.deadline,.hub-rail-count,.space-switcher-avatar';
  const COUNTS = '#taskCount,#sideCount,.today-section-title span,#progressPercent,.hub-count,.hub-rail-count,.panel-head .number';
  const MAX_ITEMS = 120;
  const LAYERS = new Set(['modalRoot', 'toastRoot', 'playerV2']);

  const ghosts = document.createElement('div');
  ghosts.id = 'motionGhostsV22';
  ghosts.setAttribute('aria-hidden', 'true');
  ghosts.inert = true;
  document.body.append(ghosts);

  let suppressed = 0;
  /* Hold row animations for the frame a screen change renders in. A timer backs up rAF for throttled tabs. */
  const suppressFrame = () => {
    suppressed++;
    let released = false;
    const release = () => { if (!released) { released = true; suppressed = Math.max(0, suppressed - 1); } };
    requestAnimationFrame(() => requestAnimationFrame(release));
    setTimeout(release, 120);
  };

  function restart(el, cls, ms) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el['_m_' + cls]);
    el['_m_' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }
  function asGhost(node) {
    node.classList.remove('m-enter', 'm-replace', 'm-flip', 'm-open', 'm-done-in', 'm-reopen');
    node.style.translate = '';
    node.classList.add('m-ghost');
    node.setAttribute('aria-hidden', 'true');
    node.inert = true;
    if (node.id) node.removeAttribute('id');
    node.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    return node;
  }
  function dropLater(node, ms) { setTimeout(() => node.remove(), ms + 40); }

  /* ---------- Strike line: a scaleX pseudo-element on single-line completed titles ---------- */
  function singleLine(el) {
    const h = el.offsetHeight;
    if (!h) return null;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.6;
    return h < lh * 1.5;
  }
  function markStrikes(scope) {
    (scope || document).querySelectorAll('.task .task-title').forEach(title => {
      const one = singleLine(title);
      if (one === null) return;
      title.classList.toggle('m-strike', one);
    });
  }

  /* ---------- Count tween ---------- */
  const writing = new WeakMap();
  function parseCount(text) { const m = /^(\D*?)(-?\d+)(\D*)$/.exec(String(text).trim()); return m ? { pre: m[1], n: Number(m[2]), post: m[3] } : null; }
  function tweenCount(el, fromText, toText) {
    if (reduce.matches || !el.isConnected) return;
    const a = parseCount(fromText), b = parseCount(toText);
    if (!a || !b || a.n === b.n || a.pre !== b.pre || a.post !== b.post) return;
    restart(el, 'm-tick', token('--motion-base') + 40);
    const span = b.n - a.n, duration = token('--motion-base');
    if (Math.abs(span) < 2 || Math.abs(span) > 200) return;
    const start = performance.now();
    const step = now => {
      if (writing.get(el)?.final !== toText) return;
      const p = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - p, 3);
      const text = b.pre + Math.round(a.n + span * eased) + b.post;
      writing.set(el, { final: toText, text });
      el.textContent = text;
      if (p < 1) requestAnimationFrame(step);
    };
    writing.set(el, { final: toText, text: fromText });
    el.textContent = fromText;
    requestAnimationFrame(step);
  }
  new MutationObserver(records => {
    for (const r of records) {
      const el = r.type === 'characterData' ? r.target.parentElement : r.target;
      if (!el || el.nodeType !== 1 || ghosts.contains(el) || !el.matches(COUNTS)) continue;
      const mine = writing.get(el);
      if (mine && el.textContent === mine.text) continue;
      writing.delete(el);
      const old = r.type === 'characterData' ? r.oldValue : [...r.removedNodes].map(n => n.textContent).join('');
      if (old && old !== el.textContent && !suppressed) tweenCount(el, old, el.textContent);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, characterDataOldValue: true });

  /* ---------- Keyed presence for innerHTML re-renders ---------- */
  function topItems(container) {
    return [...container.querySelectorAll(ITEMS)].filter(el => !el.classList.contains('m-ghost') && !(el.parentElement && el.parentElement.closest(ITEMS) && container.contains(el.parentElement.closest(ITEMS))));
  }
  function keyOf(el) {
    const d = el.dataset;
    const id = d.taskId ? 't' + d.taskId : d.scheduleId ? 's' + d.scheduleId : d.itemId ? 'i' + d.itemId : d.space ? 'sp' + d.space : d.mapId ? 'm' + d.mapId : null;
    if (id) return id;
    const action = el.getAttribute('onclick') || el.querySelector('[onclick]')?.getAttribute('onclick');
    const label = (el.querySelector('strong,h3,h4,[class*="title"],[class*="name"]') || el).textContent.trim().slice(0, 40);
    return (el.classList[0] || el.tagName) + '|' + (action || label);
  }
  function keyed(items) {
    const seen = {}, map = new Map();
    items.forEach(el => { const k = keyOf(el), n = seen[k] = (seen[k] || 0) + 1; map.set(k + '#' + n, el); });
    return map;
  }
  function colorsOf(el) {
    return [el, ...el.querySelectorAll(COLOR_PARTS)].map(node => { const cs = getComputedStyle(node); return [cs.color, cs.backgroundColor, cs.borderTopColor]; });
  }
  function snapshot(container) {
    const items = topItems(container);
    if (items.length > MAX_ITEMS) return { big: true, items: new Map(), counts: [] };
    const map = keyed(items), entries = new Map();
    map.forEach((el, k) => { const rect = el.getBoundingClientRect(); entries.set(k, { el, rect, colors: rect.width ? colorsOf(el) : null }); });
    return { items: entries, counts: [...container.querySelectorAll(COUNTS)].map(el => el.textContent), visible: container.getClientRects().length > 0 };
  }
  function carryColors(el, before) {
    if (!before || el.classList.contains('m-done-in') || el.classList.contains('m-reopen')) return;
    const nodes = [el, ...el.querySelectorAll(COLOR_PARTS)];
    if (nodes.length !== before.length) nodes.length = 1;
    nodes.forEach((node, i) => {
      const cs = getComputedStyle(node), was = before[i], now = [cs.color, cs.backgroundColor, cs.borderTopColor];
      const frames = {};
      ['color', 'backgroundColor', 'borderColor'].forEach((prop, j) => { if (was[j] !== now[j]) frames[prop] = [was[j], now[j]]; });
      if (Object.keys(frames).length) node.animate(frames, { duration: token('--motion-base'), easing: EASE });
    });
  }
  function exitGhost(container, entry) {
    const node = asGhost(entry.el), r = entry.rect;
    Object.assign(node.style, { position: 'absolute', margin: '0', top: '0', left: '0', width: r.width + 'px', height: r.height + 'px', boxSizing: 'border-box', zIndex: '1' });
    node.classList.add('m-exit');
    container.appendChild(node);
    const at = node.getBoundingClientRect();
    node.style.top = (r.top - at.top) + 'px';
    node.style.left = (r.left - at.left) + 'px';
    dropLater(node, reduce.matches ? token('--motion-fast') : token('--motion-exit'));
  }
  function flip(el, from) {
    if (reduce.matches) return;
    const to = el.getBoundingClientRect(), dx = from.left - to.left, dy = from.top - to.top;
    if ((Math.abs(dx) < 1 && Math.abs(dy) < 1) || Math.abs(dy) > innerHeight || !to.width) return;
    el.classList.remove('m-flip');
    el.style.translate = dx + 'px ' + dy + 'px';
    void el.offsetWidth;
    el.classList.add('m-flip');
    el.style.translate = '';
    const done = () => { el.classList.remove('m-flip'); el.removeEventListener('transitionend', done); };
    el.addEventListener('transitionend', done);
    setTimeout(done, token('--motion-base') + 60);
  }
  function diff(container, before) {
    if (!container.isConnected) return;
    markStrikes(container);
    if (before.big || suppressed) return;
    const after = keyed(topItems(container));
    if (after.size > MAX_ITEMS) return;
    const counts = [...container.querySelectorAll(COUNTS)];
    counts.forEach((el, i) => { if (before.counts[i] != null && before.counts[i] !== el.textContent) tweenCount(el, before.counts[i], el.textContent); });
    if (!before.visible || !container.getClientRects().length) return;
    let overlap = 0;
    after.forEach((_, k) => { if (before.items.has(k)) overlap++; });
    if (!overlap && before.items.size && after.size > 3) { restart(container, 'm-replace', token('--motion-fast') + 40); return; }
    if (!before.items.size && after.size > 3) return;
    let delay = 0;
    after.forEach((el, k) => {
      const old = before.items.get(k);
      if (old) { flip(el, old.rect); carryColors(el, old.colors); return; }
      el.style.setProperty('--m-delay', Math.min(delay, 120) + 'ms');
      delay += 30;
      restart(el, 'm-enter', token('--motion-enter') + 200);
    });
    if (before.items.size - overlap > 8) return;
    before.items.forEach((entry, k) => { if (!after.has(k) && entry.rect.width) exitGhost(container, entry); });
  }
  const pending = new Map();
  const html = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: true,
    enumerable: html.enumerable,
    get() { return html.get.call(this); },
    set(value) {
      let track = false;
      if (this.isConnected && !LAYERS.has(this.id) && !pending.has(this) && !ghosts.contains(this) && !this.closest?.('.m-ghost')) {
        let covered = false;
        for (const p of pending.keys()) if (p.contains(this)) { covered = true; break; }
        if (!covered && (this.querySelector(ITEMS) || ITEM_RE.test(String(value)))) {
          pending.set(this, snapshot(this));
          track = true;
        }
      }
      html.set.call(this, value);
      if (track) queueMicrotask(() => { const before = pending.get(this); pending.delete(this); if (before) diff(this, before); });
    }
  });

  /* ---------- Screen change ---------- */
  let navDepth = 0, inTransition = false, bypassNav = false;
  const content = () => document.getElementById('content');
  const navigateBeforeMotionV22 = navigate;
  navigate = function (view) {
    const from = currentView, scrollY0 = scrollY;
    navDepth++;
    suppressFrame();
    try { return navigateBeforeMotionV22.apply(this, arguments); }
    finally {
      navDepth--;
      if (!navDepth && from !== currentView) {
        if (scrollY0) scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (!inTransition) { const el = content(); if (el) restart(el, 'm-screen-in', token('--motion-enter') + 60); }
        setTimeout(() => markStrikes(), 0);
      }
    }
  };
  document.addEventListener('click', event => {
    if (bypassNav || !document.startViewTransition) return;
    const button = event.target.closest && event.target.closest('[data-nav]');
    if (!button || button.disabled || button.dataset.nav === currentView) return;
    event.stopImmediatePropagation();
    let ran = false, transition = null;
    const run = viaTransition => {
      if (ran) return;
      ran = true;
      bypassNav = true; inTransition = viaTransition;
      try { button.click(); } finally { bypassNav = false; inTransition = false; }
    };
    try { transition = document.startViewTransition(() => run(true)); } catch (error) { run(false); return; }
    /* A transition waits for a rendered frame; if none comes (background tab, throttled pane), navigate anyway. */
    const watchdog = setTimeout(() => { if (!ran) { run(false); transition.skipTransition(); } }, 150);
    transition.updateCallbackDone.finally(() => clearTimeout(watchdog)).catch(() => {});
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  }, true);

  /* ---------- Signature completion ---------- */
  function markTaskRows(id, done) {
    const cls = done ? 'm-done-in' : 'm-reopen', other = done ? 'm-reopen' : 'm-done-in';
    document.querySelectorAll('[data-task-id="' + id + '"]').forEach(row => {
      if (row.classList.contains('m-ghost')) return;
      row.classList.remove(other);
      row.querySelectorAll('.check svg path').forEach(path => path.setAttribute('pathLength', '1'));
      const title = row.querySelector('.task-title');
      if (title) { const one = singleLine(title); if (one !== null) title.classList.toggle('m-strike', one); }
      restart(row, cls, done ? 760 : 260);
    });
  }
  const toggleTaskBeforeMotionV22 = toggleTask;
  toggleTask = function (id) {
    const was = tasks.find(t => t.id === id)?.done;
    const result = toggleTaskBeforeMotionV22.apply(this, arguments);
    const now = tasks.find(t => t.id === id)?.done;
    if (was !== undefined && was !== now) markTaskRows(id, now);
    return result;
  };
  if (typeof changeStateV2 === 'function') {
    const changeStateBeforeMotionV22 = changeStateV2;
    changeStateV2 = function (id, state) {
      const was = scheduled.find(s => s.id === id)?.state;
      const result = changeStateBeforeMotionV22.apply(this, arguments);
      const now = scheduled.find(s => s.id === id)?.state;
      if (was !== now) document.querySelectorAll('[data-schedule-id="' + id + '"]').forEach(row => {
        if (row.classList.contains('m-ghost')) return;
        restart(row, 'm-state-in', token('--motion-base') + 60);
        if (now === 'COMPLETED') restart(row, 'm-state-done', token('--motion-base') + 60);
      });
      return result;
    };
  }

  /* ---------- Form affiliation line (0.23.0) ---------- */
  /* The summary is rebuilt with innerHTML whenever the space, project or assignee changes. When its text
     really changed, the new mark and text fade in. The line the form opens with does not animate:
     the dialog's own entrance covers it. */
  if (typeof followupAffiliationRefreshV21 === 'function') {
    const affiliationRefreshBeforeMotionV23 = followupAffiliationRefreshV21;
    followupAffiliationRefreshV21 = function () {
      const summary = () => document.getElementById('affiliationSummaryV21');
      const text = () => summary()?.querySelector('.affiliation-summary-text')?.textContent || '';
      const was = text();
      const result = affiliationRefreshBeforeMotionV23.apply(this, arguments);
      const now = text();
      if (was && was !== now) summary()?.querySelectorAll('.affiliation-summary-text,.space-mark,.hub-mark').forEach(el => restart(el, 'm-fade', token('--motion-base') + 60));
      return result;
    };
  }

  /* ---------- Dialogs, toasts and the schedule player (any code path that adds or removes them) ---------- */
  let overlayGhost = null;
  function watchLayer(root, selector, onEnter, onLeave) {
    if (!root) return;
    new MutationObserver(records => {
      const added = [], removed = [];
      records.forEach(r => { r.addedNodes.forEach(n => n.nodeType === 1 && n.matches(selector) && added.push(n)); r.removedNodes.forEach(n => n.nodeType === 1 && n.matches(selector) && removed.push(n)); });
      const live = added.filter(n => n.isConnected);
      if (live.length) live.forEach(n => onEnter(n, removed.length > 0, removed[0]));
      else if (removed.length) onLeave(removed[removed.length - 1]);
    }).observe(root, { childList: true });
  }
  watchLayer(document.getElementById('modalRoot'), '.overlay', (overlay, swapped) => {
    const replacing = swapped || (overlayGhost && overlayGhost.isConnected);
    if (overlayGhost) { overlayGhost.remove(); overlayGhost = null; }
    if (replacing) return;
    restart(overlay, 'm-open', token('--motion-enter') + 60);
  }, overlay => {
    overlayGhost = asGhost(overlay);
    overlay.classList.remove('m-open');
    ghosts.append(overlay);
    dropLater(overlay, token('--motion-exit'));
  });
  watchLayer(document.getElementById('toastRoot'), '.toast', (node, swapped) => {
    restart(node, swapped ? 'm-replace' : 'm-enter', token('--motion-enter') + 60);
  }, node => {
    if (document.getElementById('toastRoot').querySelector('.toast')) return;
    ghosts.append(asGhost(node));
    dropLater(node, token('--motion-exit'));
  });
  watchLayer(document.getElementById('playerV2'), '.player', (node, swapped, old) => {
    if (!swapped) { restart(node, 'm-enter', token('--motion-enter') + 60); return; }
    const was = old?.querySelector('.schedule-player-state')?.textContent, state = node.querySelector('.schedule-player-state');
    if (state && was && was !== state.textContent) restart(state, 'm-tick', token('--motion-base') + 60);
  }, node => {
    node.classList.remove('m-enter');
    node.classList.add('m-exit');
    ghosts.append(asGhost(node));
    dropLater(node, token('--motion-exit'));
  });

  /* Native <dialog> sheets (space switcher): exit plays before the real close. */
  const nativeClose = HTMLDialogElement.prototype.close, nativeShowModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.close = function (value) {
    if (!this.open || this._mClosing) return this._mClosing ? undefined : nativeClose.call(this, value);
    this._mClosing = setTimeout(() => { this._mClosing = null; this.classList.remove('m-closing'); nativeClose.call(this, value); }, reduce.matches ? token('--motion-fast') : token('--motion-exit'));
    this.classList.add('m-closing');
  };
  HTMLDialogElement.prototype.showModal = function () {
    if (this._mClosing) { clearTimeout(this._mClosing); this._mClosing = null; this.classList.remove('m-closing'); nativeClose.call(this); }
    if (!this._mCancel) { this._mCancel = true; this.addEventListener('cancel', event => { if (event.cancelable) { event.preventDefault(); this.close(); } }); }
    return nativeShowModal.apply(this, arguments);
  };

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => markStrikes(), 150); });
  markStrikes();
})();
