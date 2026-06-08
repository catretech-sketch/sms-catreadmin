/* ============================================================
   Icons (inline SVG, stroke-based) + lightweight charts
   Exposed on window.Icon and window.Charts
   ============================================================ */
const Ic = (paths, opts = {}) => (props) => {
  const { size = 18, ...rest } = props || {};
  const kids = (Array.isArray(paths) ? paths : [paths]).map((p, i) => p && p.key == null ? React.cloneElement(p, { key: i }) : p);
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: opts.fill || 'none',
    stroke: opts.fill ? 'none' : 'currentColor', strokeWidth: opts.sw || 1.8,
    strokeLinecap: 'round', strokeLinejoin: 'round', ...rest
  }, kids);
};
const P = (d, extra) => React.createElement('path', { d, ...(extra || {}) });
const C = (cx, cy, r) => React.createElement('circle', { cx, cy, r });
const L = (x1, y1, x2, y2) => React.createElement('line', { x1, y1, x2, y2 });
const R = (x, y, w, h, rx) => React.createElement('rect', { x, y, width: w, height: h, rx });

const Icon = {
  dashboard: Ic([R(3,3,7,9,1.5), R(14,3,7,5,1.5), R(14,12,7,9,1.5), R(3,16,7,5,1.5)]),
  clients:   Ic([P('M3 21V8l9-5 9 5v13'), P('M9 21v-6h6v6'), L(3,21,21,21)]),
  building:  Ic([R(4,3,16,18,2), L(9,8,9,8.01), L(15,8,15,8.01), L(9,12,9,12.01), L(15,12,15,12.01), P('M9 21v-4h6v4')]),
  onboard:   Ic([R(3,5,18,14,2), L(3,9,21,9), C(8,14,1.6), P('M13 13h5 M13 16h3')]),
  billing:   Ic([R(2,5,20,14,2.5), L(2,10,22,10), L(6,15,9,15)]),
  plans:     Ic([P('M3.5 8 12 3l8.5 5v8L12 21 3.5 16z'), P('M3.5 8 12 13l8.5-5'), L(12,13,12,21)]),
  support:   Ic([P('M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')]),
  team:      Ic([C(9,8,3.2), P('M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5'), P('M16 4.5a3 3 0 0 1 0 6.5'), P('M18 14.5c2 .6 3.5 2 3.5 5')]),
  settings:  Ic([C(12,12,3), P('M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V22a2 2 0 0 1-4 0v-.2A1.6 1.6 0 0 0 6 20.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2 15a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 3.6 8.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 5.6V5a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 .9 2.8H22a2 2 0 0 1 0 4z')]),
  reports:   Ic([P('M3 3v18h18'), P('M7 14l3-4 3 3 4-6')]),
  chart:     Ic([L(18,20,18,10), L(12,20,12,4), L(6,20,6,14)]),
  search:    Ic([C(11,11,7), L(21,21,16.5,16.5)]),
  bell:      Ic([P('M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9'), P('M13.7 21a2 2 0 0 1-3.4 0')]),
  plus:      Ic([L(12,5,12,19), L(5,12,19,12)]),
  check:     Ic([P('M20 6 9 17l-5-5')]),
  checkCircle: Ic([C(12,12,9), P('M8.5 12l2.5 2.5 5-5')]),
  x:         Ic([L(18,6,6,18), L(6,6,18,18)]),
  chevDown:  Ic([P('M6 9l6 6 6-6')]),
  chevRight: Ic([P('M9 6l6 6-6 6')]),
  chevLeft:  Ic([P('M15 6l-6 6 6 6')]),
  arrowUp:   Ic([L(12,19,12,5), P('M5 12l7-7 7 7')]),
  arrowRight:Ic([L(5,12,19,12), P('M12 5l7 7-7 7')]),
  trendUp:   Ic([P('M3 17l6-6 4 4 8-8'), P('M21 7v6h-6')]),
  trendDown: Ic([P('M3 7l6 6 4-4 8 8'), P('M21 17v-6h-6')]),
  external:  Ic([P('M15 3h6v6'), P('M10 14 21 3'), P('M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5')]),
  filter:    Ic([P('M3 5h18l-7 8v6l-4-2v-4z')]),
  sort:      Ic([P('M7 4v16M7 4 4 7M7 4l3 3'), P('M17 20V4M17 20l-3-3M17 20l3-3')]),
  more:      Ic([C(12,5,1), C(12,12,1), C(12,19,1)], { fill: true }),
  moreH:     Ic([C(5,12,1.4), C(12,12,1.4), C(19,12,1.4)], { fill: true }),
  user:      Ic([C(12,8,3.5), P('M5 20c0-3.5 3-6 7-6s7 2.5 7 6')]),
  userPlus:  Ic([C(9,8,3.2), P('M3 20c0-3.3 2.7-5.5 6-5.5'), L(17,9,17,15), L(14,12,20,12)]),
  logout:    Ic([P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), P('M16 17l5-5-5-5'), L(21,12,9,12)]),
  login:     Ic([P('M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4'), P('M10 17l5-5-5-5'), L(15,12,3,12)]),
  lock:      Ic([R(4,11,16,10,2), P('M8 11V7a4 4 0 0 1 8 0v4')]),
  unlock:    Ic([R(4,11,16,10,2), P('M8 11V7a4 4 0 0 1 7.5-2')]),
  eye:       Ic([P('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7'), C(12,12,3)]),
  eyeOff:    Ic([P('M10.6 6.1A9 9 0 0 1 12 6c6.5 0 10 7 10 7a13 13 0 0 1-2 2.7M6.6 6.6A13 13 0 0 0 2 13s3.5 7 10 7a9 9 0 0 0 4.4-1.1'), L(4,4,20,20), P('M9.9 9.9a3 3 0 0 0 4.2 4.2')]),
  sun:       Ic([C(12,12,4), P('M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19')]),
  moon:      Ic([P('M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z')]),
  menu:      Ic([L(3,6,21,6), L(3,12,21,12), L(3,18,21,18)]),
  panelLeft: Ic([R(3,4,18,16,2), L(9,4,9,20)]),
  trash:     Ic([P('M3 6h18'), P('M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2'), P('M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14')]),
  edit:      Ic([P('M12 20h9'), P('M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z')]),
  warn:      Ic([P('M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z'), L(12,9,12,13), L(12,17,12,17.01)]),
  info:      Ic([C(12,12,9), L(12,11,12,16), L(12,8,12,8.01)]),
  shield:    Ic([P('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'), P('M9 12l2 2 4-4')]),
  shieldOff: Ic([P('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'), L(8,12,16,12)]),
  zap:       Ic([P('M13 2 4 14h7l-1 8 9-12h-7z')], { fill: 'currentColor' }),
  clock:     Ic([C(12,12,9), P('M12 7v5l3 2')]),
  calendar:  Ic([R(3,5,18,16,2), L(3,9,21,9), L(8,3,8,7), L(16,3,16,7)]),
  refund:    Ic([P('M3 12a9 9 0 1 0 3-6.7L3 8'), P('M3 3v5h5')]),
  card:      Ic([R(2,5,20,14,2.5), L(2,10,22,10)]),
  dollar:    Ic([L(12,2,12,22), P('M17 6.5C17 4.5 14.8 3.5 12 3.5S7 4.8 7 7s2.5 3 5 3.5 5 1.3 5 3.5-2.2 3.5-5 3.5-5-1-5-3')]),
  invoice:   Ic([P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), P('M14 2v6h6'), L(8,13,16,13), L(8,17,13,17)]),
  download:  Ic([P('M12 3v12'), P('M7 11l5 4 5-4'), P('M5 21h14')]),
  upload:    Ic([P('M12 21V9'), P('M7 13l5-4 5 4'), P('M5 3h14')]),
  copy:      Ic([R(9,9,12,12,2), P('M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1')]),
  link:      Ic([P('M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5'), P('M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5')]),
  mail:      Ic([R(2,4,20,16,2), P('M2 6l10 7L22 6')]),
  phone:     Ic([P('M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z')]),
  globe:     Ic([C(12,12,9), L(3,12,21,12), P('M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18')]),
  flag:      Ic([P('M4 22V4s1.5-1 4-1 4 2 7 2 4-1 4-1v9s-1.5 1-4 1-4-2-7-2-4 1-4 1'), L(4,22,4,15)]),
  activity:  Ic([P('M22 12h-4l-3 9L9 3l-3 9H2')]),
  pause:     Ic([R(6,4,4,16,1), R(14,4,4,16,1)]),
  play:      Ic([P('M5 3l16 9-16 9z')], { fill: 'currentColor' }),
  ban:       Ic([C(12,12,9), L(5.6,5.6,18.4,18.4)]),
  rocket:    Ic([P('M5 13c-1.5.5-3 2-3 6 4 0 5.5-1.5 6-3'), P('M12 15l-3-3a14 14 0 0 1 8-9c2 0 4 2 4 4a14 14 0 0 1-9 8z'), C(15,9,1.2)]),
  star:      Ic([P('M12 3l2.6 5.6 6 .7-4.5 4.2 1.2 6L12 17.8 6.7 19.5l1.2-6L3.4 9.3l6-.7z')]),
  grid:      Ic([R(3,3,7,7,1.5), R(14,3,7,7,1.5), R(3,14,7,7,1.5), R(14,14,7,7,1.5)]),
  list:      Ic([L(8,6,21,6), L(8,12,21,12), L(8,18,21,18), L(3,6,3.01,6), L(3,12,3.01,12), L(3,18,3.01,18)]),
  drag:      Ic([C(9,6,1), C(9,12,1), C(9,18,1), C(15,6,1), C(15,12,1), C(15,18,1)], { fill: 'currentColor' }),
  server:    Ic([R(2,4,20,6,2), R(2,14,20,6,2), L(6,7,6.01,7), L(6,17,6.01,17)]),
  pulse:     Ic([P('M3 12h4l2-7 4 14 2-7h6')]),
  key:       Ic([C(8,15,4), L(11,12,21,2), L(17,6,20,9), L(15,8,18,11)]),
  send:      Ic([P('M22 2 11 13'), P('M22 2 15 22l-4-9-9-4z')]),
  message:   Ic([P('M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-4-1L3 21l1.1-5A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z')]),
  paint:     Ic([R(3,3,18,12,2), P('M7 19h10'), L(12,15,12,19)]),
  megaphone: Ic([P('M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z'), P('M16 8a4 4 0 0 1 0 8'), L(20,7,20,17)]),
  toggle:    Ic([R(2,7,20,10,5), C(8,12,2.5)]),
  sliders:   Ic([L(4,21,4,14), L(4,10,4,3), L(12,21,12,12), L(12,8,12,3), L(20,21,20,16), L(20,12,20,3), L(1,14,7,14), L(9,8,15,8), L(17,16,23,16)]),
  database:  Ic([R(4,3,16,5,8), P('M4 8v5c0 1.7 3.6 3 8 3s8-1.3 8-3V8'), P('M4 13v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5')]),
  bookOpen:  Ic([P('M2 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z'), P('M22 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z')]),
  cap:       Ic([P('M22 9 12 5 2 9l10 4 10-4z'), P('M6 11v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5'), L(22,9,22,15)]),
  dots:      Ic([C(5,12,1.4), C(12,12,1.4), C(19,12,1.4)], { fill: 'currentColor' }),
};

/* ---------------- CHARTS ---------------- */
const Charts = {};

Charts.Line = function ({ data, height = 200, color = 'var(--accent)', area = true, format = (v)=>v, labels }) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(600);
  const [hover, setHover] = React.useState(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const padL = 44, padR = 12, padT = 12, padB = 24;
  const W = w, H = height;
  const max = Math.max(...data) * 1.12, min = Math.min(...data, 0) * 0.98;
  const x = (i) => padL + (i / (data.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const pts = data.map((d, i) => [x(i), y(d)]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaPath = path + ` L${x(data.length-1).toFixed(1)} ${H-padB} L${padL} ${H-padB} Z`;
  const gid = 'lg' + React.useId().replace(/:/g,'');
  const ticks = 4;
  return React.createElement('div', { ref, style: { width: '100%' } },
    React.createElement('svg', { className: 'chart-svg', height: H, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none',
      onMouseMove: (e) => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W; let bi = 0, bd = 1e9; pts.forEach((p,i)=>{ const dd=Math.abs(p[0]-px); if(dd<bd){bd=dd;bi=i;} }); setHover(bi); },
      onMouseLeave: () => setHover(null) },
      React.createElement('defs', null, React.createElement('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
        React.createElement('stop', { offset: '0%', stopColor: color, stopOpacity: 0.22 }),
        React.createElement('stop', { offset: '100%', stopColor: color, stopOpacity: 0 }))),
      React.createElement('g', { className: 'chart-grid' },
        Array.from({ length: ticks + 1 }).map((_, i) => {
          const gy = padT + (i / ticks) * (H - padT - padB);
          const val = max - (i / ticks) * (max - min);
          return React.createElement('g', { key: i },
            L(padL, gy, W - padR, gy),
            React.createElement('text', { className: 'chart-axis', x: padL - 8, y: gy + 3, textAnchor: 'end' }, format(Math.round(val))));
        })),
      labels && labels.map((lb, i) => i % Math.ceil(labels.length/6) === 0 &&
        React.createElement('text', { key: i, className: 'chart-axis', x: x(i), y: H - 6, textAnchor: 'middle' }, lb)),
      area && React.createElement('path', { d: areaPath, fill: `url(#${gid})` }),
      React.createElement('path', { d: path, fill: 'none', stroke: color, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      hover != null && React.createElement('g', null,
        L(pts[hover][0], padT, pts[hover][0], H - padB).props ? React.createElement('line', { x1: pts[hover][0], y1: padT, x2: pts[hover][0], y2: H-padB, stroke: 'var(--border-strong)', strokeWidth: 1, strokeDasharray: '3 3' }) : null,
        React.createElement('circle', { cx: pts[hover][0], cy: pts[hover][1], r: 4.5, fill: color, stroke: 'var(--surface)', strokeWidth: 2.5 }),
        React.createElement('g', { transform: `translate(${Math.min(Math.max(pts[hover][0], padL+30), W-padR-30)}, ${Math.max(pts[hover][1]-14, 14)})` },
          React.createElement('rect', { x: -32, y: -16, width: 64, height: 22, rx: 6, fill: 'var(--surface-3)', stroke: 'var(--border-strong)' }),
          React.createElement('text', { x: 0, y: -1, textAnchor: 'middle', fill: 'var(--text)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)' }, format(data[hover])))
      )));
};

Charts.Bars = function ({ data, height = 200, color = 'var(--accent)', format = (v)=>v, labels }) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(600);
  const [hover, setHover] = React.useState(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const padL = 44, padR = 12, padT = 12, padB = 24;
  const W = w, H = height, max = Math.max(...data) * 1.14;
  const bw = (W - padL - padR) / data.length;
  const ticks = 4;
  return React.createElement('div', { ref, style: { width: '100%' } },
    React.createElement('svg', { className: 'chart-svg', height: H, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' },
      React.createElement('g', { className: 'chart-grid' },
        Array.from({ length: ticks + 1 }).map((_, i) => {
          const gy = padT + (i / ticks) * (H - padT - padB);
          const val = max - (i / ticks) * max;
          return React.createElement('g', { key: i }, L(padL, gy, W - padR, gy),
            React.createElement('text', { className: 'chart-axis', x: padL - 8, y: gy + 3, textAnchor: 'end' }, format(Math.round(val))));
        })),
      data.map((d, i) => {
        const bh = (d / max) * (H - padT - padB);
        const bx = padL + i * bw + bw * 0.18;
        const realBw = bw * 0.64;
        return React.createElement('g', { key: i, onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null) },
          React.createElement('rect', { x: bx, y: H - padB - bh, width: realBw, height: bh, rx: Math.min(4, realBw/3),
            fill: hover === i ? 'var(--accent-2)' : color, opacity: hover==null||hover===i?1:0.55, style: { transition: 'opacity .12s' } }),
          labels && React.createElement('text', { className: 'chart-axis', x: bx + realBw/2, y: H - 6, textAnchor: 'middle' }, labels[i]),
          hover === i && React.createElement('text', { x: bx + realBw/2, y: H - padB - bh - 6, textAnchor: 'middle', fill: 'var(--text)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)' }, format(d)));
      })));
};

Charts.Donut = function ({ data, size = 168, thickness = 26 }) {
  const [hover, setHover] = React.useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' } },
    React.createElement('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
      React.createElement('circle', { cx, cy, r, fill: 'none', stroke: 'var(--surface-3)', strokeWidth: thickness }),
      data.map((d, i) => {
        const frac = d.value / total;
        const len = frac * circ;
        const el = React.createElement('circle', { key: i, cx, cy, r, fill: 'none', stroke: d.color, strokeWidth: hover === i ? thickness + 4 : thickness,
          strokeDasharray: `${len} ${circ - len}`, strokeDashoffset: -offset, transform: `rotate(-90 ${cx} ${cy})`,
          style: { transition: 'stroke-width .14s', cursor: 'pointer' }, onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null),
          strokeLinecap: 'butt' });
        offset += len; return el;
      }),
      React.createElement('text', { x: cx, y: cy - 4, className: 'donut-center', fill: 'var(--text)', fontSize: 24, fontWeight: 750, fontFamily: 'var(--mono)' }, hover != null ? data[hover].value : total),
      React.createElement('text', { x: cx, y: cy + 15, className: 'donut-center', fill: 'var(--text-3)', fontSize: 11, fontWeight: 600 }, hover != null ? data[hover].label : 'Total')),
    React.createElement('div', { className: 'legend' }, data.map((d, i) =>
      React.createElement('div', { className: 'legend-item', key: i, onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null), style: { cursor: 'pointer', opacity: hover==null||hover===i?1:0.5 } },
        React.createElement('span', { className: 'lg-dot', style: { background: d.color } }),
        React.createElement('span', null, d.label),
        React.createElement('span', { className: 'lg-val' }, d.value)))));
};

Charts.Spark = function ({ data, color = 'var(--accent)', w = 80, h = 28 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const x = (i) => (i / (data.length - 1)) * w;
  const y = (v) => h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
  const path = data.map((d, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d).toFixed(1)).join(' ');
  return React.createElement('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` },
    React.createElement('path', { d: path, fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }));
};

window.Icon = Icon;
window.Charts = Charts;
