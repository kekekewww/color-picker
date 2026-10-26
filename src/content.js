(() => {
  'use strict';
  // This file is also bundled on demo.html. HTTP/file pages use the isolated
  // content script; extension pages run their own local copy exactly once.
  if (!globalThis.chrome?.runtime?.id && location.protocol !== 'chrome-extension:') return;
  if (globalThis.__colorPickerLoaded) return;
  globalThis.__colorPickerLoaded = true;
  const { parseColors, MAX_TEXT, MAX_COLORS } = globalThis.ColorPickerParser;
  let settings = { enabled: true, inline: true, bareHex: false };
  let host, shadow, panel, marks, status;
  let current = null;
  let timer, frame, dragging = false;
  const textInputTypes = new Set(['text', 'search', 'url', 'tel']);

  function setup() {
    if (host?.isConnected) return;
    host = document.createElement('color-picker-overlay');
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;width:100%!important;height:100%!important;pointer-events:none!important;z-index:2147483647!important;display:block!important;color-scheme:light!important;';
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; color-scheme: light; }
      * { box-sizing: border-box; }
      .panel { position:fixed; width:278px; max-width:calc(100vw - 16px); color:#192b46; background:#fff; border:1px solid #dbe2ed; border-radius:14px; box-shadow:0 8px 32px #192b4626; pointer-events:auto; font:13px/1.5 'Segoe UI','Microsoft JhengHei',sans-serif; overflow:hidden; text-align:left; }
      header { display:flex; align-items:center; gap:8px; padding:12px 13px 9px; border-bottom:1px solid #edf0f5; }
      header strong { font-size:13px; flex:1; }
      .count { color:#64748b; font-size:11px; }
      button { font:inherit; cursor:pointer; border:0; color:inherit; background:none; }
      button:focus-visible { outline:2px solid #355fca; outline-offset:-2px; }
      .close { font-size:20px; line-height:24px; width:26px; border-radius:5px; }
      .close:hover, .row:hover { background:#f1f5fb; }
      .list { max-height:230px; overflow:auto; overscroll-behavior:contain; padding:5px; }
      .row { display:flex; align-items:center; gap:10px; width:100%; padding:8px; text-align:left; border-radius:7px; }
      .checker { background-color:#fff; background-image:conic-gradient(#dce2e9 25%,#fff 0 50%,#dce2e9 0 75%,#fff 0); background-size:8px 8px; }
      .swatch { width:34px; height:34px; border-radius:7px; flex:none; border:1px solid #192b4626; overflow:hidden; }
      .fill { display:block; width:100%; height:100%; }
      .info { min-width:0; flex:1; }
      code { display:block; font:12px/1.45 Consolas,monospace; overflow-wrap:anywhere; white-space:normal; }
      .format { display:block; color:#65758b; font-size:10px; margin-top:2px; }
      .copy { color:#718096; font-size:11px; flex:none; }
      footer { padding:7px 13px 9px; color:#65758b; font-size:11px; border-top:1px solid #edf0f5; }
      .mark { position:fixed; pointer-events:none; border-bottom:3px solid; border-radius:2px; }
      .chip { position:fixed; pointer-events:auto; padding:2px; background:#fff; border:1px solid #c7d2e0; border-radius:4px; box-shadow:0 1px 4px #192b4626; }
      .chip .checker { display:block; width:100%; height:100%; border-radius:1px; overflow:hidden; }
      @media (prefers-reduced-motion: no-preference) { .panel { animation:appear .12s ease-out; } @keyframes appear { from { opacity:0; } to { opacity:1; } } }
    `;
    marks = document.createElement('div');
    marks.setAttribute('aria-hidden', 'true');
    panel = document.createElement('section');
    panel.className = 'panel';
    panel.setAttribute('aria-label', 'Color Picker 色彩預覽');
    panel.hidden = true;
    shadow.append(style, marks, panel);
    // Preserve the page selection while clicking copy or scrolling the palette.
    panel.addEventListener('pointerdown', (event) => { if (event.target.closest('button')) event.preventDefault(); });
    host.addEventListener('pointerdown', (event) => event.stopPropagation());
    document.documentElement.append(host);
  }

  function dismiss() {
    current = null;
    if (panel) panel.hidden = true;
    marks?.replaceChildren();
  }

  function collect(range) {
    const root = range.commonAncestorContainer;
    const nodes = [];
    let text = '';
    const append = (node) => {
      if (!range.intersectsNode(node)) return;
      const start = node === range.startContainer ? range.startOffset : 0;
      const end = node === range.endContainer ? range.endOffset : node.length;
      if (end <= start) return;
      const value = node.data.slice(start, Math.min(end, start + MAX_TEXT + 1 - text.length));
      nodes.push({ node, offset: start, start: text.length, end: text.length + value.length });
      text += value;
    };
    if (root.nodeType === Node.TEXT_NODE) append(root);
    else {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        append(node);
        if (text.length > MAX_TEXT) break;
      }
    }
    return { text, nodes };
  }

  function matchRange(match, nodes) {
    const first = nodes.find((part) => match.start >= part.start && match.start < part.end);
    const last = nodes.find((part) => match.end > part.start && match.end <= part.end);
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(first.node, first.offset + match.start - first.start);
    range.setEnd(last.node, last.offset + match.end - last.start);
    return range;
  }

  function inspect() {
    if (dragging || !settings.enabled) return;
    const active = document.activeElement;
    if (active === host) return;
    let text, range, nodes, field = null, before = '', after = '';
    if (active instanceof HTMLTextAreaElement || (active instanceof HTMLInputElement && textInputTypes.has(active.type))) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      if (start === null || end === null || start === end) return dismiss();
      field = active;
      text = active.value.slice(start, end);
      before = active.value[start - 1] || '';
      after = active.value[end] || '';
    } else {
      if (active instanceof HTMLInputElement) return dismiss();
      const selection = window.getSelection();
      if (!selection?.rangeCount || selection.isCollapsed) return dismiss();
      range = selection.getRangeAt(0).cloneRange();
      if (host?.contains(range.commonAncestorContainer)) return;
      ({ text, nodes } = collect(range));
      if (range.startContainer.nodeType === Node.TEXT_NODE) before = range.startContainer.data[range.startOffset - 1] || '';
      if (range.endContainer.nodeType === Node.TEXT_NODE) after = range.endContainer.data[range.endOffset] || '';
    }
    const colors = parseColors(text, { bareHex: settings.bareHex, before, after });
    if (!colors.length) return dismiss();
    setup();
    current = { colors: colors.map((color) => ({ ...color, range: field ? null : matchRange(color, nodes) })), range, field, truncated: text.length > MAX_TEXT || colors.length >= MAX_COLORS };
    buildPanel();
    position();
  }

  async function copy(color) {
    try {
      await navigator.clipboard.writeText(color.css);
      status.textContent = `已複製 ${color.css}`;
    } catch {
      status.textContent = '無法直接複製，請使用原文的複製功能。';
    }
  }

  function swatch(color) {
    const base = document.createElement('span');
    base.className = 'checker swatch';
    const fill = document.createElement('span');
    fill.className = 'fill';
    fill.style.backgroundColor = color.css;
    base.append(fill);
    return base;
  }

  function buildPanel() {
    panel.replaceChildren();
    const header = document.createElement('header');
    const title = document.createElement('strong');
    title.textContent = 'Color Picker';
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = `${current.colors.length} 個色彩`;
    const close = document.createElement('button');
    close.className = 'close';
    close.textContent = '×';
    close.setAttribute('aria-label', '關閉色彩預覽');
    close.addEventListener('click', dismiss);
    header.append(title, count, close);
    const list = document.createElement('div');
    list.className = 'list';
    for (const color of current.colors) {
      const row = document.createElement('button');
      row.className = 'row';
      row.setAttribute('aria-label', `複製 ${color.css}`);
      const info = document.createElement('span');
      info.className = 'info';
      const code = document.createElement('code');
      code.textContent = color.raw;
      const format = document.createElement('span');
      format.className = 'format';
      format.textContent = color.format;
      const hint = document.createElement('span');
      hint.className = 'copy';
      hint.textContent = '複製';
      info.append(code, format);
      row.append(swatch(color), info, hint);
      row.addEventListener('click', () => copy(color));
      list.append(row);
    }
    status = document.createElement('footer');
    status.setAttribute('role', 'status');
    status.textContent = current.truncated ? '選取較長，僅顯示前 20,000 字元／200 個色彩。' : current.field ? '輸入欄位色彩預覽 · 點色票複製' : '點色票複製 · Esc 關閉';
    panel.append(header, list, status);
    panel.hidden = false;
  }

  function visible(rect) {
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
  }

  function position() {
    if (!current || !host?.isConnected) return;
    if (current.field ? !current.field.isConnected : !current.range?.startContainer.isConnected) return dismiss();
    marks.replaceChildren();
    const colorRects = current.colors.map((color) => ({ color, rects: color.range ? Array.from(color.range.getClientRects()).filter(visible) : [] }));
    const allRects = colorRects.flatMap((item) => item.rects);
    if (current.field) {
      const rect = current.field.getBoundingClientRect();
      if (visible(rect)) allRects.push(rect);
    }
    if (!allRects.length) { panel.hidden = true; return; }
    panel.hidden = false;
    const chips = [];
    if (settings.inline) for (const { color, rects } of colorRects) {
      if (!rects.length) continue;
      for (const rect of rects) {
        const line = document.createElement('span');
        line.className = 'mark';
        Object.assign(line.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderColor: color.css });
        marks.append(line);
      }
      const rect = rects[rects.length - 1];
      const size = current.colors.length === 1 ? 24 : 16;
      let left = Math.max(2, Math.min(innerWidth - size - 2, current.colors.length === 1 ? rect.right + 5 : rect.right - size));
      let top = Math.max(2, current.colors.length === 1 ? rect.top + (rect.height - size) / 2 : rect.top - size - 3);
      for (let attempt = 0; attempt < 10 && chips.some((c) => Math.abs(c.left - left) < size + 2 && Math.abs(c.top - top) < size + 2); attempt++) {
        top = Math.max(2, top - size - 2);
        if (top === 2) left = Math.min(innerWidth - size - 2, left + size + 2);
      }
      chips.push({ left, top });
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.tabIndex = -1;
      chip.title = `${color.raw} · 點擊複製`;
      Object.assign(chip.style, { left: `${left}px`, top: `${top}px`, width: `${size}px`, height: `${size}px` });
      const fill = swatch(color);
      fill.className = 'checker';
      chip.append(fill);
      chip.addEventListener('pointerdown', (event) => event.preventDefault());
      chip.addEventListener('click', () => copy(color));
      marks.append(chip);
    }
    const anchor = allRects[allRects.length - 1];
    const right = Math.max(...allRects.map((rect) => rect.right));
    const width = panel.offsetWidth;
    // Cap the entire panel, including its scrollable list, on short viewports.
    panel.querySelector('.list').style.maxHeight = `${Math.max(40, Math.min(230, innerHeight - 116))}px`;
    const height = panel.offsetHeight;
    let left = right + 36;
    let top = anchor.top;
    if (left + width > innerWidth - 8) {
      left = Math.max(8, Math.min(anchor.left, innerWidth - width - 8));
      top = anchor.bottom + 12;
      if (top + height > innerHeight - 8) top = Math.min(...allRects.map((rect) => rect.top)) - height - 24;
    }
    panel.style.left = `${Math.max(8, Math.min(left, innerWidth - width - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(top, innerHeight - height - 8))}px`;
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(inspect, 100); }
  document.addEventListener('selectionchange', schedule);
  document.addEventListener('select', schedule, true);
  document.addEventListener('input', schedule, true);
  document.addEventListener('pointerdown', (event) => {
    if (event.composedPath().includes(host)) return;
    dragging = true;
    dismiss();
  }, true);
  document.addEventListener('pointerup', () => { dragging = false; schedule(); }, true);
  document.addEventListener('pointercancel', () => { dragging = false; }, true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { clearTimeout(timer); dismiss(); } });
  const reposition = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  window.addEventListener('blur', () => { dragging = false; });
  if (globalThis.chrome?.storage) {
    chrome.storage.local.get(settings).then((saved) => { settings = saved; schedule(); }).catch(() => {});
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      for (const key of ['enabled', 'inline', 'bareHex']) if (changes[key]) settings[key] = changes[key].newValue ?? (key !== 'bareHex');
      if (!settings.enabled) dismiss(); else schedule();
    });
  }
})();
