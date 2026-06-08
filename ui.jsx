/* ============================================================
   Shared UI primitives + helpers + RBAC wrappers
   ============================================================ */
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

/* ---- formatters ---- */
const fmt = {
  money: (n, dp=0) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp }),
  num: (n) => Number(n).toLocaleString('en-IN'),
  pct: (n) => n + '%',
  k: (n) => n >= 1000 ? '₹' + (n/1000).toFixed(1) + 'k' : '₹' + n,
};
const initials = (name) => name.split(' ').map(w=>w[0]).slice(0,2).join('');
// deterministic avatar color
const AV_COLORS = ['#7c74ff','#3ecf8e','#f0b429','#4ca6ff','#b07cff','#f7686b','#2dd4bf','#fb923c'];
const avColor = (str) => AV_COLORS[[...str].reduce((a,c)=>a+c.charCodeAt(0),0) % AV_COLORS.length];

function Avatar({ name, size = 28, square = false }) {
  return React.createElement('div', { className: 'avatar' + (square ? ' avatar-sq' : ''),
    style: { width: size, height: size, fontSize: size*0.4, background: `linear-gradient(140deg, ${avColor(name)}, ${avColor(name+'x')})` } }, initials(name));
}

/* ---- status helpers ---- */
const STATUS_MAP = {
  active:    { cls: 'badge-green', dot: true, label: 'Active' },
  trial:     { cls: 'badge-amber', dot: true, label: 'Trial' },
  suspended: { cls: 'badge-red',   dot: true, label: 'Suspended' },
  cancelled: { cls: 'badge-slate', dot: true, label: 'Cancelled' },
  operational:{ cls: 'badge-green', dot: true, label: 'Operational' },
  degraded:  { cls: 'badge-amber', dot: true, label: 'Degraded' },
  down:      { cls: 'badge-red',   dot: true, label: 'Down' },
  paid:      { cls: 'badge-green', label: 'Paid' },
  open:      { cls: 'badge-blue',  label: 'Open' },
  past_due:  { cls: 'badge-red',   label: 'Past due' },
  resolved:  { cls: 'badge-green', label: 'Resolved' },
  closed:    { cls: 'badge-slate', label: 'Closed' },
  pending:   { cls: 'badge-amber', label: 'Pending' },
  invited:   { cls: 'badge-blue',  label: 'Invited' },
  deactivated:{ cls: 'badge-slate', label: 'Deactivated' },
};
const PRIORITY_MAP = {
  urgent: { cls: 'badge-red', label: 'Urgent' },
  high:   { cls: 'badge-amber', label: 'High' },
  normal: { cls: 'badge-blue', label: 'Normal' },
  low:    { cls: 'badge-slate', label: 'Low' },
};
function StatusBadge({ status, map = STATUS_MAP }) {
  const s = map[status] || { cls: 'badge-slate', label: status };
  return React.createElement('span', { className: 'badge ' + s.cls + (s.dot ? ' badge-dot-' + s.cls.split('-')[1] : '') },
    s.dot && React.createElement('span', { className: 'dot' }), s.label);
}

/* ---- buttons ---- */
function Btn({ variant = 'default', size, icon: IcComp, children, className = '', ...rest }) {
  const cls = ['btn', 'btn-' + variant, size === 'sm' ? 'btn-sm' : '', !children ? 'btn-icon' : '', className].filter(Boolean).join(' ');
  return React.createElement('button', { className: cls, ...rest },
    IcComp && React.createElement(IcComp, { size: size==='sm'?14:16 }), children);
}

/* ---- navigation context (provided by App) ---- */
const NavCtx = createContext({ route: { name: 'dashboard', params: {} }, go: () => {} });
const useNav = () => useContext(NavCtx);

/* ---- RBAC context + wrappers ---- */
const RoleCtx = createContext({ role: 'owner', can: () => true });
const useRole = () => useContext(RoleCtx);
const useCan = () => { const { role } = useRole(); return (action) => window.RBAC.can(role, action); };
function Can({ action, children, fallback = null }) {
  const can = useCan();
  return can(action) ? children : fallback;
}

/* ---- toast system ---- */
const ToastCtx = createContext(() => {});
const useToast = () => useContext(ToastCtx);
function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, ...t }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), t.duration || 3600);
  }, []);
  const ICONS = { success: Icon.checkCircle, error: Icon.warn, info: Icon.info };
  const TINT = { success: 'var(--green)', error: 'var(--red)', info: 'var(--blue)' };
  return React.createElement(ToastCtx.Provider, { value: push },
    children,
    React.createElement('div', { className: 'toast-wrap' }, toasts.map(t => {
      const IcC = ICONS[t.kind || 'success'];
      return React.createElement('div', { className: 'toast', key: t.id },
        React.createElement('div', { className: 't-ic', style: { background: 'color-mix(in srgb,'+TINT[t.kind||'success']+' 16%, transparent)', color: TINT[t.kind||'success'] } },
          React.createElement(IcC, { size: 14 })),
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { className: 't-title' }, t.title),
          t.msg && React.createElement('div', { className: 't-msg' }, t.msg)));
    })));
}

/* ---- modal ---- */
function Modal({ open, onClose, children, size }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return React.createElement('div', { className: 'modal-overlay', onMouseDown: (e) => e.target === e.currentTarget && onClose && onClose() },
    React.createElement('div', { className: 'modal' + (size === 'lg' ? ' modal-lg' : ''), role: 'dialog', 'aria-modal': 'true' }, children));
}

/* ---- confirm dialog ---- */
function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, icon: IcComp = Icon.warn, requireType }) {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (open) setTyped(''); }, [open]);
  const ok = !requireType || typed.trim().toLowerCase() === requireType.toLowerCase();
  const tint = danger ? 'var(--red)' : 'var(--accent)';
  return React.createElement(Modal, { open, onClose },
    React.createElement('div', { className: 'modal-head' },
      React.createElement('div', { className: 'mh-ic', style: { background: danger ? 'var(--red-bg)' : 'var(--accent-ghost)', color: tint } },
        React.createElement(IcComp, { size: 19 })),
      React.createElement('div', { className: 'mh-text' },
        React.createElement('h3', null, title),
        React.createElement('p', null, message))),
    requireType && React.createElement('div', { className: 'modal-body' },
      React.createElement('div', { className: 'field' },
        React.createElement('label', null, 'Type ', React.createElement('b', { className: 'mono', style: { color: 'var(--text)' } }, requireType), ' to confirm'),
        React.createElement('input', { className: 'input', value: typed, onChange: e => setTyped(e.target.value), autoFocus: true, placeholder: requireType }))),
    React.createElement('div', { className: 'modal-foot' },
      React.createElement(Btn, { variant: 'ghost', onClick: onClose }, 'Cancel'),
      React.createElement(Btn, { variant: danger ? 'danger' : 'primary', disabled: !ok, onClick: () => { onConfirm(); onClose(); } }, confirmLabel)));
}

/* ---- dropdown menu ---- */
function Menu({ trigger, children, align = 'right', width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return React.createElement('div', { ref, style: { position: 'relative' } },
    React.createElement('div', { onClick: () => setOpen(o => !o) }, trigger),
    open && React.createElement('div', { className: 'menu', style: { position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, zIndex: 50, minWidth: width || 200 },
      onClick: () => setOpen(false) }, children));
}
function MenuItem({ icon: IcComp, children, danger, disabled, ...rest }) {
  return React.createElement('button', { className: 'menu-item' + (danger ? ' danger' : ''), disabled, ...rest },
    IcComp && React.createElement(IcComp, { size: 15 }), children);
}

/* ---- skeleton table ---- */
function SkeletonRows({ cols = 5, rows = 6 }) {
  return React.createElement('tbody', null, Array.from({ length: rows }).map((_, r) =>
    React.createElement('tr', { key: r }, Array.from({ length: cols }).map((_, c) =>
      React.createElement('td', { key: c }, React.createElement('div', { className: 'skel', style: { height: 14, width: c === 0 ? '70%' : (40 + (r*7+c*13)%40) + '%' } }))))));
}

/* ---- empty state ---- */
function Empty({ icon: IcComp = Icon.search, title, children, action }) {
  return React.createElement('div', { className: 'empty' },
    React.createElement('div', { className: 'e-ic' }, React.createElement(IcComp, { size: 24 })),
    React.createElement('h4', null, title),
    children && React.createElement('p', null, children),
    action && React.createElement('div', { style: { marginTop: 16 } }, action));
}

/* ---- forbidden / 403 ---- */
function Forbidden({ action }) {
  return React.createElement('div', { className: 'page' },
    React.createElement('div', { className: 'card', style: { maxWidth: 460, margin: '60px auto', textAlign: 'center', padding: '40px 32px' } },
      React.createElement('div', { style: { width: 56, height: 56, borderRadius: 14, background: 'var(--red-bg)', color: 'var(--red)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' } },
        React.createElement(Icon.shieldOff, { size: 26 })),
      React.createElement('h3', { style: { fontSize: 19, fontWeight: 700 } }, 'Access restricted'),
      React.createElement('p', { className: 'muted', style: { marginTop: 8, fontSize: 13.5 } },
        'Your role doesn’t have permission to view this area. ',
        action && React.createElement('span', null, 'Required: ', React.createElement('code', { className: 'mono', style: { color: 'var(--text-2)' } }, action))),
      React.createElement('p', { className: 'tiny muted', style: { marginTop: 14 } }, 'Switch role using the badge in the top bar to explore other access levels.')));
}

/* ---- usage bar ---- */
function UsageBar({ value, limit, label, compact }) {
  const pct = Math.min(100, Math.round(value / limit * 100));
  const cls = pct >= 95 ? 'crit' : pct >= 80 ? 'warn' : '';
  return React.createElement('div', { style: { width: '100%' } },
    !compact && React.createElement('div', { className: 'row jb', style: { marginBottom: 5, fontSize: 12 } },
      React.createElement('span', { className: 'muted' }, label),
      React.createElement('span', { className: 'mono', style: { color: pct>=80?'var(--'+(pct>=95?'red':'amber')+')':'var(--text-2)' } }, fmt.num(value) + ' / ' + fmt.num(limit))),
    React.createElement('div', { className: 'bar ' + cls }, React.createElement('span', { style: { width: pct + '%' } })),
    compact && React.createElement('div', { className: 'tiny mono muted', style: { marginTop: 3 } }, pct + '%'));
}

/* ---- segmented control ---- */
function Segmented({ options, value, onChange }) {
  return React.createElement('div', { className: 'segmented' }, options.map(o =>
    React.createElement('button', { key: o.value, className: value === o.value ? 'active' : '', onClick: () => onChange(o.value) }, o.label)));
}

/* ---- pagination ---- */
function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return React.createElement('div', { className: 'row jb', style: { padding: '12px 16px', fontSize: 12.5 } },
    React.createElement('span', { className: 'muted' }, total + ' results'));
  return React.createElement('div', { className: 'row jb', style: { padding: '12px 16px' } },
    React.createElement('span', { className: 'muted tiny' }, 'Page ' + page + ' of ' + pages + ' · ' + total + ' results'),
    React.createElement('div', { className: 'row gap6' },
      React.createElement(Btn, { variant: 'default', size: 'sm', icon: Icon.chevLeft, disabled: page <= 1, onClick: () => onPage(page - 1) }),
      Array.from({ length: pages }).slice(0, 7).map((_, i) =>
        React.createElement('button', { key: i, className: 'btn btn-sm ' + (page === i+1 ? 'btn-primary' : 'btn-default'), style: { width: 30, padding: 0 }, onClick: () => onPage(i+1) }, i+1)),
      React.createElement(Btn, { variant: 'default', size: 'sm', icon: Icon.chevRight, disabled: page >= pages, onClick: () => onPage(page + 1) })));
}

/* ---- mock async hook (loading + data) ---- */
function useMock(factory, deps = [], delay = 480) {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null });
    const t = setTimeout(() => { if (alive) setState({ loading: false, data: factory() }); }, delay);
    return () => { alive = false; clearTimeout(t); };
  }, deps); // eslint-disable-line
  return state;
}

Object.assign(window, {
  fmt, initials, avColor, Avatar, StatusBadge, STATUS_MAP, PRIORITY_MAP,
  Btn, RoleCtx, useRole, useCan, Can, ToastCtx, useToast, ToastHost,
  Modal, ConfirmDialog, Menu, MenuItem, SkeletonRows, Empty, Forbidden,
  UsageBar, Segmented, Pagination, useMock, NavCtx, useNav,
});
