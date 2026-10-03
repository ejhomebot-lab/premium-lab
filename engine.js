/* Premium Lab — one model for every page: the case (plans × banks), the maths, and a line chart.
   PortfoPlus-style accounting, verified against its published screens:
     own cash = premium − loan − first-year discount
     return(N) = cash value(N) − loan − own cash − interest & fees paid to N
     return on own cash = return / own cash
   Prepaid (multi-year) plans: loan = LTV % × Day-1 policy value; own cash = total premium after discount − loan;
   years inside the payment period show no returns (same as the insurer's premium-financing calculator sheet).
   Prepayment penalty = penPct % of the loan when it is repaid within the first penYears years.
   Loan rate: P (bank prime rate) − spread, or HIBOR + spread.
   Upfront = flat fee + handling fee % of the loan − the bank's cash rebate (can be negative).
   IRR (same method as the team's premium-financing Excel): yearly cash flows —
   year 0: −own cash (plus any upfront fee); years 1…N: −that year's loan interest (plus annual fee);
   year N also gets + (cash value − loan − any early-repayment penalty). IRR = the rate that makes these net to zero. */
(function () {
  'use strict';
  const E = {};
  const KEY = 'pl-draft';

  /* ------------------------------------------------------------ case */
  E.defaults = () => ({
    v: 2, name: '', currency: 'HKD', fulfil: 1, metric: 'gain', shift: 0,
    plans: [{ id: 'p1', name: 'Plan A', premium: 1575000, discount: 186542, day1: 1380000,
      cvs: [{ y: 8, cv: 1852239, g: 1350000 }, { y: 9, cv: 2069496, g: 1420000 }, { y: 10, cv: 2153616, g: 1490000 }] }],
    banks: [{ id: 'b1', bank: 'Bank A', ratio: 1062482 / 1575000 * 100, rateType: 'fixed', rate: 2.6, prime: 5.25, pspread: 2.65, hibor: 3.0, spread: 1.3, penPct: 0, penYears: 0, upfront: 0, feePct: 0, rebate: 0, annualFee: 0, maxLtv: 90 }],
    sel: { plan: 'p1', bank: 'b1' },
    picks: [['p1', 'b1']]
  });
  // a new case starts with empty surrender values for policy years 5 to 10
  // prepaid (multi-year) plans start with policy years 1 to 10, so the payment period shows too
  E.blankCvs = type => (type === 'prepaid' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [5, 6, 7, 8, 9, 10]).map(y => ({ y, cv: NaN, g: NaN }));
  const num = (v, d) => Number.isFinite(+v) && v !== null && v !== '' ? +v : d;
  // P − spread: cases saved with a single fixed rate keep that rate (P 5.25% less the matching spread)
  const primeOf = b => {
    let prime = num(b.prime, NaN), pspread = num(b.pspread, NaN);
    if (!Number.isFinite(prime) || !Number.isFinite(pspread)) { const r = num(b.rate, 0); prime = r <= 5.25 ? 5.25 : r; pspread = +(prime - r).toFixed(3); }
    return { prime, pspread, rate: +(prime - pspread).toFixed(3) };
  };
  // Accepts the current shape and the first calculator's {premium, offers[], cvs} shape.
  E.migrate = c => {
    if (!c || typeof c !== 'object') return null;
    if (c.v === 2) {
      if (!Array.isArray(c.plans) || !c.plans.length || !Array.isArray(c.banks) || !c.banks.length) return null;
      const s = { ...E.defaults(), ...c };
      s.plans = c.plans.map((p, i) => ({ id: String(p.id || 'p' + (i + 1)), name: String(p.name || ''), type: p.type === 'prepaid' ? 'prepaid' : 'single', annual: num(p.annual, 0), payYears: Math.max(0, Math.round(num(p.payYears, 0))), premium: num(p.premium, 0), discount: num(p.discount, 0), day1: num(p.day1, 0),
        cvs: (Array.isArray(p.cvs) ? p.cvs : []).map(x => ({ y: Math.round(num(x.y, 0)), cv: num(x.cv, NaN), g: num(x.g, NaN) })) }));
      s.banks = c.banks.map((b, i) => ({ id: String(b.id || 'b' + (i + 1)), bank: String(b.bank || ''), ratio: num(b.ratio, 0), rateType: b.rateType === 'hibor' ? 'hibor' : 'fixed',
        ...primeOf(b), hibor: num(b.hibor, 0), spread: num(b.spread, 0), penPct: num(b.penPct, 0), penYears: Math.max(0, Math.round(num(b.penYears, 0))), upfront: num(b.upfront, 0), feePct: num(b.feePct, 0), rebate: num(b.rebate, 0), annualFee: num(b.annualFee, 0), maxLtv: num(b.maxLtv, 90) }));
      const pid = new Set(s.plans.map(p => p.id)), bid = new Set(s.banks.map(b => b.id));
      if (!s.sel || !pid.has(s.sel.plan)) s.sel = { ...s.sel, plan: s.plans[0].id };
      if (!bid.has(s.sel.bank)) s.sel.bank = s.banks[0].id;
      s.picks = (Array.isArray(c.picks) ? c.picks : []).filter(k => Array.isArray(k) && pid.has(k[0]) && bid.has(k[1]));
      return s;
    }
    if (!Number.isFinite(c.premium) || !Array.isArray(c.offers) || !c.offers.length || !Array.isArray(c.cvs)) return null;
    const P = c.premium;
    const banks = c.offers.map((o, i) => ({ id: 'b' + (i + 1), bank: o.bank || '', ratio: P > 0 ? num(o.loan, 0) / P * 100 : 0, rateType: o.rateType, rate: o.rate,
      hibor: o.hibor, spread: o.spread, upfront: o.upfront, annualFee: o.annualFee, maxLtv: num(c.maxLtv, 90) }));
    const sel = banks[Math.min(Math.max(0, c.sel || 0), banks.length - 1)].id;
    return E.migrate({ v: 2, name: c.name || '', currency: c.currency || 'HKD', fulfil: num(c.fulfil, 1),
      plans: [{ id: 'p1', name: 'Plan A', premium: P, discount: c.discount, day1: c.day1, cvs: c.cvs }],
      banks, sel: { plan: 'p1', bank: sel }, picks: banks.map(b => ['p1', b.id]) });
  };
  const get = k => { try { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); } catch (e) { return null; } };
  E.load = () => E.migrate(get(KEY)) || E.defaults();
  E.save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  // fires when another tab saves the case
  E.onChange = cb => addEventListener('storage', e => { if (e.key === KEY) cb(E.load()); });
  // share links carry numbers, never client names
  E.encode = c => { c = { ...c }; delete c.name; delete c.client; return btoa(unescape(encodeURIComponent(JSON.stringify(c)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  E.decode = h => { try { return JSON.parse(decodeURIComponent(escape(atob(h.replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; } };
  E.plan = (s, id) => s.plans.find(p => p.id === id) || s.plans[0];
  E.bank = (s, id) => s.banks.find(b => b.id === id) || s.banks[0];
  E.uid = (list, prefix) => { let n = list.length + 1; while (list.some(x => x.id === prefix + n)) n++; return prefix + n; };

  /* ----------------------------------------------------------- maths */
  // the loan rate: HIBOR + spread, or P (prime) − spread
  E.baseRate = b => b.rateType === 'hibor' ? (b.hibor + b.spread) : ((Number.isFinite(b.prime) ? b.prime : (b.rate || 0)) - (Number.isFinite(b.pspread) ? b.pspread : 0));
  E.offerRate = b => E.baseRate(b);
  // a slider sets the loan rate: HIBOR moves for HIBOR loans, the spread below P for P − spread loans
  E.setRate = (b, v) => {
    if (b.rateType === 'hibor') b.hibor = Math.max(0, +(v - b.spread).toFixed(3));
    else { if (!Number.isFinite(b.prime)) b.prime = 5.25; b.pspread = +(b.prime - v).toFixed(3); }
    b.rate = +E.baseRate(b).toFixed(3);
  };
  // single premium: the loan is a % of the premium; prepaid: a % (LTV) of the Day-1 policy value
  E.loanBase = p => p.type === 'prepaid' ? (p.day1 || 0) : p.premium;
  E.loanOf = (p, b) => E.loanBase(p) * (b.ratio || 0) / 100;
  E.payYears = p => p.type === 'prepaid' ? (p.payYears || 0) : 0;
  // monthly is paid every month; from `skip` months on, `later` is paid on top (interest after an interest-free period)
  E.irrMonthly = (c0, monthly, months, terminal, later = 0, skip = 0) => {
    const ann = (m, n) => Math.abs(m) < 1e-12 ? n : (1 - Math.pow(1 + m, -n)) / m;
    const npv = m => -c0 - monthly * ann(m, months) - later * (ann(m, months) - ann(m, Math.min(skip, months))) + terminal * Math.pow(1 + m, -months);
    let lo = -0.0833, hi = 0.2; const flo = npv(lo), fhi = npv(hi);
    if (!(flo > 0 && fhi < 0)) return NaN;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (npv(mid) > 0) lo = mid; else hi = mid; }
    return Math.pow(1 + (lo + hi) / 2, 12) - 1;
  };
  // annual IRR of cash flows cf[0..n] (cf[t] at end of year t); NaN when there is no sign change (Excel shows N/A)
  E.irrAnnual = cf => {
    const npv = r => cf.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
    let lo = -0.9999, hi = 10; const flo = npv(lo), fhi = npv(hi);
    if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return NaN;
    for (let i = 0; i < 300; i++) { const mid = (lo + hi) / 2, fm = npv(mid); if ((fm > 0) === (flo > 0)) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  E.hasYears = p => p.premium > 0 && p.cvs.some(c => c.y > E.payYears(p) && Number.isFinite(c.cv) && c.cv > 0);
  // opt.rate overrides the bank's rate (rate stress); opt.shift adds to it; opt.fulfil = share of the non-guaranteed part paid
  E.compute = (p, b, opt = {}) => {
    const P = p.premium, D = p.discount || 0, L = E.loanOf(p, b), fulfil = Number.isFinite(opt.fulfil) ? opt.fulfil : 1;
    const rate = ((opt.rate ?? E.baseRate(b)) + (opt.shift || 0)) / 100;
    const own = P - L - D, fee = (b.upfront || 0) + L * (b.feePct || 0) / 100, rebate = b.rebate || 0, upfront = fee - rebate, aFee = b.annualFee || 0;
    const yearCost = L * rate + aFee;
    const intMonths = y => y * 12; // months of interest charged by year y
    const py = E.payYears(p), valOf = c => Number.isFinite(c.g) && c.g > 0 ? c.g + fulfil * (c.cv - c.g) : c.cv;
    const all = p.cvs.filter(c => c.y > 0 && Number.isFinite(c.cv)).sort((a, z) => a.y - z.y);
    // prepaid plans: years inside the payment period carry a value but no return figures
    const payRows = all.filter(c => c.y <= py).map(c => ({ y: c.y, val: valOf(c), g: c.g, inPay: true }));
    const rows = all.filter(c => c.y > py).map(c => {
      const val = valOf(c);
      const pen = c.y <= (b.penYears || 0) ? L * (b.penPct || 0) / 100 : 0; // paid when the loan is repaid in year y
      const cost = upfront + aFee * c.y + L * rate / 12 * intMonths(c.y) + pen;
      const net = val - L, gain = net - own - cost, paid = own + cost;
      const cf = [-(own + upfront)]; for (let k = 1; k <= c.y; k++) cf.push(-(L * rate + aFee));
      cf[c.y] += val - L - pen;
      const irr = own > 0 ? E.irrAnnual(cf) : NaN;
      const selfIrr = Math.pow(val / (P - D), 1 / c.y) - 1;
      const be = L > 0 && intMonths(c.y) > 0 ? (net - own - upfront - aFee * c.y - pen) / (L * intMonths(c.y) / 12) : NaN; // loan rate where gain = 0
      const roc = gain / own, ann = roc / c.y; // average annual return = return on own cash ÷ years
      return { y: c.y, val, net, paid, cost, pen, gain, roc, roa: gain / paid, ann, irr, selfIrr, be, ltv: L / val };
    });
    return { P, D, L, own, rate, monthly: L * rate / 12, yearCost, rows, payRows, upfront, fee, rebate, aFee, prepaid: p.type === 'prepaid', payYears: py, day1: p.day1 || 0 };
  };

  /* ------------------------------------------------------ formatting */
  const SYM = { HKD: 'HK$', USD: 'US$', SGD: 'S$', CNY: '¥' };
  E.fmtInt = v => new Intl.NumberFormat('en-HK', { maximumFractionDigits: 0 }).format(Math.round(v));
  E.money = (v, cur) => (SYM[cur] || 'HK$') + E.fmtInt(v);
  E.moneyS = (v, cur) => (v < 0 ? '−' : '') + E.money(Math.abs(v), cur);
  E.wan = (v, lang) => { // compact: 萬 / 万 for Chinese UIs, k / m for English
    const a = Math.abs(v), sg = v < 0 ? '−' : '';
    if (lang && lang !== 'en') return sg + (a >= 1e4 ? (a / 1e4).toFixed(a >= 1e6 ? 0 : 1).replace(/\.0$/, '') + (lang === 'zh-Hans' ? '万' : '萬') : E.fmtInt(a));
    return sg + (a >= 1e6 ? (a / 1e6).toFixed(2).replace(/0$/, '') + 'm' : a >= 1e3 ? Math.round(a / 1e3) + 'k' : E.fmtInt(a));
  };
  E.pct = (v, d = 2) => Number.isFinite(v) ? (v * 100).toFixed(d) + '%' : '–';
  E.pctS = (v, d = 2) => Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(d) + '%' : '–';
  E.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  E.css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  E.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------ line chart
     lineChart(box, { series:[{id,label,color,points:[{x,y}]}], fmtY, fmtX, endLabels, band:[idA,idB], zero, focusX, hi,
                      onInspect(x|null), onHover(id|null), instant })
     Lines tween from their previous values; the y scale follows the target so it never wobbles. */
  E.lineChart = (box, o) => {
    const st = box._lc || (box._lc = { prev: new Map(), raf: 0 });
    cancelAnimationFrame(st.raf);
    const from = st.prev, to = new Map();
    o.series.forEach(s => s.points.forEach(p => to.set(s.id + '@' + p.x, p.y)));
    st.prev = to; st.opts = o;
    const ys = [...to.values()].filter(Number.isFinite), xs = [...new Set(o.series.flatMap(s => s.points.map(p => p.x)))].sort((a, z) => a - z);
    if (!xs.length) { box.innerHTML = ''; return; }
    let min = Math.min(o.zero ? 0 : Infinity, ...ys), max = Math.max(o.zero ? 0 : -Infinity, ...ys);
    if (!(max > min)) { max = min + 1; min -= 1; }
    const pad = (max - min) * .1; max += pad; if (min < 0 || !o.zero) min -= pad;
    const same = from.size === to.size && [...to].every(([k, v]) => from.get(k) === v || (isNaN(v) && isNaN(from.get(k))));
    const dur = o.instant || same || E.reducedMotion ? 0 : 480, t0 = performance.now();
    const step = now => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      const base = o.zero ? 0 : min;
      const frame = o.series.map(s => ({ ...s, points: s.points.map(p => { const a = from.get(s.id + '@' + p.x); const a0 = Number.isFinite(a) ? a : base; return { x: p.x, y: Number.isFinite(p.y) ? a0 + (p.y - a0) * e : NaN }; }) }));
      paint(box, o, frame, xs, min, max);
      if (k < 1) st.raf = requestAnimationFrame(step);
    };
    step(t0);
  };
  function paint(box, o, frame, xs, min, max) {
    const C = { grid: E.css('--line'), grid0: E.css('--line-strong'), axis: E.css('--faint'), ink: E.css('--ink'), surface: E.css('--surface'), gain: E.css('--c-gain'), loss: E.css('--c-short') };
    const W = Math.max(280, Math.round(E.printW || box.clientWidth || 720)), narrow = W < 560, labels = o.endLabels && !narrow;
    const H = o.height || (narrow ? 280 : 340), padL = narrow ? 46 : 60, padR = labels ? 128 : 18, padT = 22, padB = 34;
    const x0 = xs[0], x1 = xs[xs.length - 1], span = x1 - x0 || 1;
    const X = v => xs.length === 1 ? (padL + W - padR) / 2 : padL + (v - x0) / span * (W - padL - padR);
    const Y = v => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
    const path = pts => pts.filter(p => Number.isFinite(p.y)).map((p, j) => (j ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
    let h = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${E.esc(o.aria || '')}"><defs>`;
    if (o.band) {
      const a = frame.find(s => s.id === o.band[0]), b = frame.find(s => s.id === o.band[1]);
      if (a && b) {
        const pb = path(b.points), poly = path(a.points) + b.points.slice().reverse().filter(p => Number.isFinite(p.y)).map(p => 'L' + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join('') + 'Z';
        h += `<clipPath id="lcUp"><path d="${pb}L${W} ${Y(b.points[b.points.length - 1].y)}L${W} 0L0 0L0 ${Y(b.points[0].y)}Z"/></clipPath><clipPath id="lcDn"><path d="${pb}L${W} ${Y(b.points[b.points.length - 1].y)}L${W} ${H}L0 ${H}L0 ${Y(b.points[0].y)}Z"/></clipPath></defs>`;
        h += `<path d="${poly}" fill="${C.gain}" fill-opacity=".16" clip-path="url(#lcUp)"/><path d="${poly}" fill="${C.loss}" fill-opacity=".14" clip-path="url(#lcDn)"/>`;
      } else h += '</defs>';
    } else h += '</defs>';
    for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4, yy = Y(v);
      h += `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="${C.grid}"/><text x="${padL - 9}" y="${yy + 4}" text-anchor="end" font-size="11.5" fill="${C.axis}">${E.esc(o.fmtY(v, true))}</text>`; }
    if (min < 0 && max > 0) h += `<line x1="${padL}" x2="${W - padR}" y1="${Y(0)}" y2="${Y(0)}" stroke="${C.grid0}" stroke-dasharray="3 4"/>`;
    // x labels: drop any that would collide with the one before (CJK glyphs count double)
    let lastEnd = -Infinity; const lw = s => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 12 : 6.5), 0);
    xs.forEach((x, i) => { const s = o.fmtX(x), w = lw(s), cx = X(x);
      if (cx - w / 2 < lastEnd + 6 && i !== xs.length - 1) return;
      if (cx - w / 2 < lastEnd + 6) return;
      lastEnd = cx + w / 2; h += `<text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="12" fill="${C.axis}">${E.esc(s)}</text>`; });
    if (o.focusX !== undefined && o.focusX !== null) h += `<line x1="${X(o.focusX)}" x2="${X(o.focusX)}" y1="${padT}" y2="${H - padB}" stroke="${C.ink}" stroke-opacity=".35" stroke-dasharray="3 4"/>`;
    const dim = id => o.hi && o.hi !== id;
    frame.forEach(s => {
      const op = dim(s.id) ? .22 : 1, w = o.hi === s.id ? 3.2 : 2.2;
      h += `<g class="ln" data-id="${E.esc(s.id)}" opacity="${op}"><path d="${path(s.points)}" fill="none" stroke="${s.color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${s.dash ? ' stroke-dasharray="6 5"' : ''}/>`;
      s.points.forEach(p => { if (Number.isFinite(p.y)) h += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.x === o.focusX ? 5 : 3.2}" fill="${s.color}" stroke="${C.surface}" stroke-width="1.5"/>`; });
      h += '</g>';
    });
    if (labels) { // end labels, nudged apart so they never overlap
      const ends = frame.map(s => { const pts = s.points.filter(p => Number.isFinite(p.y)); const p = pts[pts.length - 1]; return p && { s, p, y: Y(p.y) }; }).filter(Boolean).sort((a, z) => a.y - z.y);
      for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
      ends.forEach(({ s, p, y }) => { const tx = W - padR + 10;
        h += `<g opacity="${dim(s.id) ? .3 : 1}"><line x1="${X(p.x) + 4}" x2="${tx - 3}" y1="${Y(p.y)}" y2="${y}" stroke="${s.color}" stroke-opacity=".5"/><text x="${tx}" y="${y + 4}" font-size="12" font-weight="600" fill="${s.color}">${E.esc(o.fmtY(p.y))}</text></g>`; });
    }
    h += `<rect class="hit" x="${padL}" y="${padT}" width="${W - padL - padR}" height="${H - padT - padB}" fill="transparent" tabindex="0" aria-label="${E.esc(o.inspectLabel || '')}"/></svg>`;
    const hadFocus = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('hit') && box.contains(document.activeElement);
    const keep = [...box.children].filter(n => n.tagName !== 'svg');
    box.innerHTML = h; keep.forEach(n => box.appendChild(n));
    const svg = box.querySelector('svg'), hit = svg.querySelector('.hit');
    if (hadFocus) hit.focus({ preventScroll: true });
    const near = cx => { const r = svg.getBoundingClientRect(), px = (cx - r.left) / r.width * W; return xs.reduce((a, x) => Math.abs(X(x) - px) < Math.abs(X(a) - px) ? x : a, xs[0]); };
    if (o.onInspect) {
      hit.addEventListener('pointermove', e => {
        const x = near(e.clientX);
        if (o.onHover) { // the line nearest the pointer at that year, within 16px
          const r = svg.getBoundingClientRect(), py = (e.clientY - r.top) / r.height * H;
          let best = null, d = 16; frame.forEach(s => { const p = s.points.find(q => q.x === x); if (p && Number.isFinite(p.y) && Math.abs(Y(p.y) - py) < d) { d = Math.abs(Y(p.y) - py); best = s.id; } });
          if (best !== (o.hi || null)) o.onHover(best);
        }
        if (x !== o.focusX) o.onInspect(x);
      });
      hit.addEventListener('pointerleave', () => { if (o.onHover && o.hi) o.onHover(null); if (o.onLeave) o.onLeave(); });
      hit.addEventListener('pointerdown', e => o.onInspect(near(e.clientX)));
      hit.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault();
        const i = Math.max(0, xs.indexOf(o.focusX)), j = Math.min(xs.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1))); o.onInspect(xs[j]); });
    }
  }

  window.PLE = E;
})();
