/* Premium Lab — shared header: language, theme and the mobile menu.
   Pages listen for `pl:lang` / `pl:theme` and re-render their own content. */
(function () {
  'use strict';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const NAV = {
    en: { home: 'Overview', learn: 'The essentials', lab: 'Your case', dash: 'My clients', studio: 'Studio', risks: 'The trade-offs', calc: 'P-Fin calculator', menu: 'Menu', theme: 'Switch light or dark theme', lang: 'Language',
      f_learn: 'Learn', f_tools: 'For agents', f_src: 'Sources', f_ia1: 'Insurance Authority: risks & complexities', f_ia2: 'Insurance Authority: smart tips',
      f_about: 'An independent guide to insurance premium financing, with a calculator for licensed agents.', f_base: 'For education only. Illustrations are not guarantees or financial advice.' },
    'zh-Hant': { home: '概覽', learn: '基本概念', lab: '個案一覽', dash: '我的客戶', studio: '互動比較', risks: '利弊權衡', calc: '保費融資計算機', menu: '選單', theme: '切換淺色或深色模式', lang: '語言',
      f_learn: '了解', f_tools: '代理人工具', f_src: '資料來源', f_ia1: '保險業監管局：風險及複雜性', f_ia2: '保險業監管局：精明貼士',
      f_about: '獨立的保費融資入門指南，並附設供持牌保險代理人使用的計算機。', f_base: '只供教育用途。所有說明並非保證，亦不構成財務建議。' },
    'zh-Hans': { home: '概览', learn: '基本概念', lab: '个案一览', dash: '我的客户', studio: '互动比较', risks: '利弊权衡', calc: '保费融资计算器', menu: '菜单', theme: '切换浅色或深色模式', lang: '语言',
      f_learn: '了解', f_tools: '代理人工具', f_src: '资料来源', f_ia1: '香港保险业监管局：风险及复杂性', f_ia2: '香港保险业监管局：精明贴士',
      f_about: '独立的保费融资入门指南，并附设供持牌保险代理人使用的计算器。', f_base: '仅供教育用途。所有说明并非保证，亦不构成财务建议。' }
  };
  const detect = () => { const n = (navigator.language || '').toLowerCase(); return n.startsWith('zh') ? (/cn|sg|hans/.test(n) ? 'zh-Hans' : 'zh-Hant') : 'en'; };
  let lang = store.get('pl-lang', null);
  if (!NAV[lang]) lang = detect();

  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;

  function paintHeader() {
    const d = NAV[lang];
    document.querySelectorAll('[data-st]').forEach(e => { e.textContent = d[e.dataset.st] || NAV.en[e.dataset.st]; });
    document.querySelectorAll('[data-st-label]').forEach(e => e.setAttribute('aria-label', d[e.dataset.stLabel]));
    document.querySelectorAll('.gh-lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }
  function setLang(l) {
    if (!NAV[l]) l = 'en';
    lang = l; store.set('pl-lang', l); root.lang = l;
    paintHeader();
    document.dispatchEvent(new CustomEvent('pl:lang', { detail: l }));
  }
  function setTheme(t) {
    root.dataset.theme = t; store.set('pl-theme', t);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#0a121c' : '#ffffff';
    document.dispatchEvent(new CustomEvent('pl:theme', { detail: t }));
  }
  // follow the OS until the visitor picks a theme
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (!root.dataset.theme) document.dispatchEvent(new CustomEvent('pl:theme')); });

  // print always uses the light palette: charts repaint from the tokens, then the visitor's theme returns
  let printPrev = null;
  addEventListener('beforeprint', () => { printPrev = root.dataset.theme || ''; root.dataset.theme = 'light'; document.dispatchEvent(new CustomEvent('pl:theme')); });
  addEventListener('afterprint', () => { if (printPrev === null) return; if (printPrev) root.dataset.theme = printPrev; else delete root.dataset.theme; printPrev = null; document.dispatchEvent(new CustomEvent('pl:theme')); });

  const css = n => getComputedStyle(root).getPropertyValue(n).trim();

  window.PL = { get lang() { return lang; }, setLang, isDark, store, css };
  root.lang = lang;

  function bind() {
    paintHeader();
    document.querySelectorAll('.gh-lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
    document.querySelectorAll('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark')));
    const gh = document.querySelector('.gh'), btn = gh && gh.querySelector('.gh-menu'), panel = gh && gh.querySelector('.gh-panel');
    if (btn && panel) {
      const open = v => { gh.classList.toggle('open', v); btn.setAttribute('aria-expanded', String(v)); if (v) panel.querySelector('a').focus(); };
      btn.addEventListener('click', () => open(!gh.classList.contains('open')));
      panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => open(false)));
      addEventListener('keydown', e => { if (e.key === 'Escape' && gh.classList.contains('open')) { open(false); btn.focus(); } });
      document.addEventListener('click', e => { if (gh.classList.contains('open') && !gh.contains(e.target)) open(false); });
    }
    // underline the section in view (home page only has [data-spy] targets)
    const spy = document.querySelectorAll('[data-spy]');
    if (spy.length && 'IntersectionObserver' in window) {
      const seen = new Map();
      const io = new IntersectionObserver(es => {
        es.forEach(e => seen.set(e.target.id, e.isIntersecting));
        let cur = null; for (const [id, v] of seen) if (v) cur = id;
        spy.forEach(a => a.classList.toggle('is-current', a.dataset.spy === cur));
      }, { rootMargin: '-45% 0px -50% 0px' });
      [...new Set([...spy].map(a => a.dataset.spy))].forEach(id => { const el = document.getElementById(id); if (el) { seen.set(id, false); io.observe(el); } });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
