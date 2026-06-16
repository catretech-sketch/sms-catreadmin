import React from 'react';

const L = (x1: number, y1: number, x2: number, y2: number) => React.createElement('line', { x1, y1, x2, y2 });

type DonutDatum = { value: number; color: string; label: string };

export type ChartsType = {
  Line: (props: { data: number[]; height?: number; color?: string; area?: boolean; format?: (v: number) => string | number; labels?: string[] }) => React.ReactElement;
  Bars: (props: { data: number[]; height?: number; color?: string; format?: (v: number) => string | number; labels?: string[] }) => React.ReactElement;
  Donut: (props: { data: DonutDatum[]; size?: number; thickness?: number }) => React.ReactElement;
  Spark: (props: { data: number[]; color?: string; w?: number; h?: number }) => React.ReactElement;
};

const Charts = {} as ChartsType;

Charts.Line = function ({ data, height = 200, color = 'var(--accent)', area = true, format = (v: number) => v, labels }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(600);
  const [hover, setHover] = React.useState<number | null>(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const padL = 44, padR = 12, padT = 12, padB = 24;
  const W = w, H = height;
  const max = Math.max(...data) * 1.12, min = Math.min(...data, 0) * 0.98;
  const x = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const pts = data.map((d, i) => [x(i), y(d)]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaPath = path + ` L${x(data.length-1).toFixed(1)} ${H-padB} L${padL} ${H-padB} Z`;
  const gid = 'lg' + React.useId().replace(/:/g,'');
  const ticks = 4;
  return React.createElement('div', { ref, style: { width: '100%' } },
    React.createElement('svg', { className: 'chart-svg', height: H, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none',
      onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W; let bi = 0, bd = 1e9; pts.forEach((p,i)=>{ const dd=Math.abs(p[0]-px); if(dd<bd){bd=dd;bi=i;} }); setHover(bi); },
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

Charts.Bars = function ({ data, height = 200, color = 'var(--accent)', format = (v: number) => v, labels }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(600);
  const [hover, setHover] = React.useState<number | null>(null);
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
  const [hover, setHover] = React.useState<number | null>(null);
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
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
  const path = data.map((d, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d).toFixed(1)).join(' ');
  return React.createElement('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` },
    React.createElement('path', { d: path, fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }));
};

export { Charts };
