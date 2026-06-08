/* ============================================================
   Onboarding — Kanban pipeline (drag between columns + checklist)
   ============================================================ */
function OnboardingScreen() {
  const { DB, fmt, Icon, Avatar, useCan } = window;
  const nav = window.useNav();
  const toast = window.useToast();
  const can = useCan();
  const manage = can('onboarding.manage');
  const COLS = [
    { key: 'lead', title: 'Lead', color: 'var(--slate)' },
    { key: 'trial', title: 'Trial', color: 'var(--amber)' },
    { key: 'onboarding', title: 'Onboarding', color: 'var(--blue)' },
    { key: 'active', title: 'Active', color: 'var(--green)' },
  ];
  const [board, setBoard] = React.useState(() => {
    const b = {};
    COLS.forEach(c => b[c.key] = DB.ONBOARDING[c.key].map(card => ({ ...card, items: card.checklist.map((label, i) => ({ label, done: i < card.done })) })));
    return b;
  });
  const [drag, setDrag] = React.useState(null); // { card, from }
  const [dragOver, setDragOver] = React.useState(null);

  const moveCard = (cardId, from, to) => {
    if (from === to) return;
    setBoard(b => {
      const card = b[from].find(c => c.id === cardId);
      if (!card) return b;
      return { ...b, [from]: b[from].filter(c => c.id !== cardId), [to]: [{ ...card }, ...b[to]] };
    });
    toast({ title: 'Moved to ' + COLS.find(c => c.key === to).title, msg: 'Pipeline updated.' });
  };
  const toggleItem = (colKey, cardId, idx) => {
    if (!manage) return;
    setBoard(b => ({ ...b, [colKey]: b[colKey].map(c => c.id === cardId ? { ...c, items: c.items.map((it, i) => i === idx ? { ...it, done: !it.done } : it) } : c) }));
  };

  const Card = ({ card, colKey }) => {
    const doneCount = card.items.filter(i => i.done).length;
    const pct = Math.round(doneCount / card.items.length * 100);
    const [expand, setExpand] = React.useState(false);
    return React.createElement('div', {
      className: 'card', draggable: manage,
      onDragStart: (e) => { setDrag({ id: card.id, from: colKey }); e.dataTransfer.effectAllowed = 'move'; },
      onDragEnd: () => { setDrag(null); setDragOver(null); },
      style: { padding: 12, cursor: manage ? 'grab' : 'default', opacity: drag && drag.id === card.id ? 0.4 : 1, marginBottom: 9 } },
      React.createElement('div', { className: 'row jb gap8' },
        React.createElement('div', { className: 'row gap8', style: { minWidth: 0 } },
          React.createElement(Avatar, { name: card.name, size: 26, square: true }),
          React.createElement('div', { style: { minWidth: 0 } },
            React.createElement('div', { className: 'truncate', style: { fontWeight: 600, fontSize: 13 } }, card.name),
            React.createElement('div', { className: 'tiny muted mono' }, fmt.money(card.value) + '/mo'))),
        manage && React.createElement('span', { style: { color: 'var(--text-faint)', cursor: 'grab' } }, React.createElement(Icon.drag, { size: 14 }))),
      React.createElement('div', { className: 'row gap8', style: { marginTop: 10 } },
        React.createElement('div', { className: 'bar', style: { flex: 1 } }, React.createElement('span', { style: { width: pct + '%', background: pct === 100 ? 'var(--green)' : 'var(--accent)' } })),
        React.createElement('span', { className: 'tiny mono muted' }, doneCount + '/' + card.items.length)),
      React.createElement('button', { className: 'row gap6 tiny muted', style: { marginTop: 10, fontWeight: 600 }, onClick: () => setExpand(e => !e) },
        React.createElement(Icon.checkCircle, { size: 13 }), expand ? 'Hide checklist' : 'Checklist',
        React.createElement(Icon.chevDown, { size: 12, style: { transform: expand ? 'rotate(180deg)' : 'none', transition: 'transform .15s' } })),
      expand && React.createElement('div', { className: 'fc gap2', style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-soft)' } },
        card.items.map((it, i) => React.createElement('button', { key: i, className: 'row gap8', style: { padding: '5px 4px', textAlign: 'left', cursor: manage ? 'pointer' : 'default' }, onClick: () => toggleItem(colKey, card.id, i) },
          React.createElement('span', { style: { width: 16, height: 16, borderRadius: 5, flexShrink: 0, display: 'grid', placeItems: 'center', background: it.done ? 'var(--green)' : 'var(--surface-3)', border: it.done ? 'none' : '1px solid var(--border)', color: '#fff' } },
            it.done && React.createElement(Icon.check, { size: 10 })),
          React.createElement('span', { className: 'tiny', style: { color: it.done ? 'var(--text-3)' : 'var(--text-2)', textDecoration: it.done ? 'line-through' : 'none' } }, it.label)))),
      React.createElement('div', { className: 'row jb', style: { marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-soft)' } },
        React.createElement('span', { className: 'row gap6 tiny muted' }, React.createElement(Avatar, { name: card.owner, size: 18 }), card.owner.split(' ')[0]),
        React.createElement('span', { className: 'tiny muted' }, card.age + 'd')));
  };

  return React.createElement('div', { className: 'page page-wide' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, 'Onboarding pipeline'),
        React.createElement('p', { className: 'page-desc' }, manage ? 'Drag cards between stages and tick setup tasks.' : 'Read-only view of the onboarding pipeline.')),
      React.createElement('div', { className: 'page-actions' },
        window.Can({ action: 'clients.start_trial', children: React.createElement(Btn, { variant: 'primary', icon: Icon.plus, onClick: () => nav.go('onboard') }, 'New client') }))),

    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' } },
      COLS.map(col => React.createElement('div', { key: col.key,
        onDragOver: (e) => { if (manage) { e.preventDefault(); setDragOver(col.key); } },
        onDrop: (e) => { e.preventDefault(); if (drag) moveCard(drag.id, drag.from, col.key); setDragOver(null); },
        style: { background: dragOver === col.key ? 'var(--surface-2)' : 'transparent', borderRadius: 12, padding: 8, transition: 'background .12s', minHeight: 120, outline: dragOver === col.key ? '1.5px dashed var(--accent-line)' : '1.5px solid transparent' } },
        React.createElement('div', { className: 'row jb', style: { padding: '4px 8px 12px' } },
          React.createElement('span', { className: 'row gap8', style: { fontWeight: 650, fontSize: 13 } },
            React.createElement('span', { style: { width: 8, height: 8, borderRadius: 3, background: col.color } }), col.title),
          React.createElement('span', { className: 'badge badge-slate' }, board[col.key].length)),
        board[col.key].map(card => React.createElement(Card, { key: card.id, card, colKey: col.key })),
        board[col.key].length === 0 && React.createElement('div', { style: { padding: '24px 10px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', border: '1px dashed var(--border)', borderRadius: 10 } }, 'Drop here')))));
}
window.OnboardingScreen = OnboardingScreen;
