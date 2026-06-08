/* ============================================================
   Client lifecycle actions — role-gated, with confirm + toast
   Returns the action set for a client given its status.
   ============================================================ */
function clientActionsFor(status) {
  // each: key, label, icon, perm, variant, danger, confirm{title,message,confirmLabel,requireType}, toast
  const A = window.Icon;
  const all = {
    start_trial: { key: 'clients.start_trial', label: 'Start trial', icon: A.zap, variant: 'primary',
      confirm: { title: 'Start a new trial?', message: 'A 14-day trial will begin and the client becomes active in onboarding.', confirmLabel: 'Start trial' },
      toast: { title: 'Trial started', msg: '14-day trial is now active.' } },
    activate: { key: 'clients.activate', label: 'Activate', icon: A.checkCircle, variant: 'primary',
      confirm: { title: 'Activate this client?', message: 'The subscription becomes active and billing begins on the current plan.', confirmLabel: 'Activate' },
      toast: { title: 'Client activated', msg: 'Subscription is now active.' } },
    change_plan: { key: 'clients.change_plan', label: 'Change plan', icon: A.plans, variant: 'default',
      modal: 'change_plan' },
    suspend: { key: 'clients.suspend', label: 'Suspend', icon: A.pause, variant: 'default', danger: true,
      confirm: { title: 'Suspend this client?', message: 'Users will lose access until reinstated. This is reversible. The action is logged.', confirmLabel: 'Suspend client', danger: true },
      toast: { title: 'Client suspended', msg: 'Access has been revoked.', kind: 'info' } },
    reinstate: { key: 'clients.reinstate', label: 'Reinstate', icon: A.play, variant: 'primary',
      confirm: { title: 'Reinstate this client?', message: 'Access will be restored immediately on the existing plan.', confirmLabel: 'Reinstate' },
      toast: { title: 'Client reinstated', msg: 'Access restored.' } },
    cancel: { key: 'clients.cancel', label: 'Cancel', icon: A.ban, variant: 'default', danger: true,
      confirm: { title: 'Cancel this subscription?', message: 'The subscription will be cancelled at period end. Data is retained for 90 days.', confirmLabel: 'Cancel subscription', danger: true },
      toast: { title: 'Subscription cancelled', msg: 'Cancels at period end.', kind: 'info' } },
    delete: { key: 'clients.delete', label: 'Delete', icon: A.trash, variant: 'danger', danger: true, menuOnly: true,
      confirm: { title: 'Permanently delete client?', message: 'This erases the tenant and all data. This cannot be undone.', confirmLabel: 'Delete forever', danger: true, requireType: 'DELETE' },
      toast: { title: 'Client deleted', msg: 'Tenant removed permanently.', kind: 'error' } },
    impersonate: { key: 'clients.impersonate', label: 'Impersonate', icon: A.eye, variant: 'default', impersonate: true,
      confirm: { title: 'Impersonate this school?', message: 'You’ll enter a read-only view of the client’s workspace. This session is logged and visible to the school.', confirmLabel: 'Start read-only session' } },
  };
  const byStatus = {
    trial:     ['activate', 'change_plan', 'impersonate', 'cancel'],
    active:    ['change_plan', 'impersonate', 'suspend', 'cancel'],
    suspended: ['reinstate', 'impersonate', 'cancel'],
    cancelled: ['start_trial', 'delete'],
  };
  const primaryKeys = byStatus[status] || [];
  return primaryKeys.map(k => ({ id: k, ...all[k] })).concat([{ id: 'delete', ...all.delete }].filter(x => status !== 'cancelled'));
}

/* ChangePlan modal */
function ChangePlanModal({ open, onClose, client, onDone }) {
  const { DB, fmt } = window;
  const [sel, setSel] = React.useState(client ? client.plan : null);
  React.useEffect(() => { if (client) setSel(client.plan); }, [client]);
  if (!client) return null;
  return React.createElement(window.Modal, { open, onClose },
    React.createElement('div', { className: 'modal-head' },
      React.createElement('div', { className: 'mh-ic', style: { background: 'var(--accent-ghost)', color: 'var(--accent)' } }, React.createElement(window.Icon.plans, { size: 19 })),
      React.createElement('div', { className: 'mh-text' },
        React.createElement('h3', null, 'Change plan'),
        React.createElement('p', null, client.name))),
    React.createElement('div', { className: 'modal-body' },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 9, padding: '8px 0' } },
        DB.PLANS.filter(p => p.active).map(p =>
          React.createElement('button', { key: p.id, onClick: () => setSel(p.id),
            style: { textAlign: 'left', padding: '13px 15px', borderRadius: 11, border: '1.5px solid ' + (sel === p.id ? 'var(--accent)' : 'var(--border)'), background: sel === p.id ? 'var(--accent-ghost)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' } },
            React.createElement('span', { style: { width: 10, height: 10, borderRadius: 3, background: p.color } }),
            React.createElement('div', { className: 'f1' },
              React.createElement('div', { style: { fontWeight: 650, fontSize: 14 } }, p.name, client.plan === p.id && React.createElement('span', { className: 'tiny muted', style: { fontWeight: 500 } }, '  · current')),
              React.createElement('div', { className: 'tiny muted' }, fmt.num(p.limits.students) + ' students · ' + fmt.num(p.limits.staff) + ' staff')),
            React.createElement('div', { className: 'mono', style: { fontWeight: 700 } }, fmt.money(p.price), React.createElement('span', { className: 'tiny muted' }, '/mo')))))),
    React.createElement('div', { className: 'modal-foot' },
      React.createElement(Btn, { variant: 'ghost', onClick: onClose }, 'Cancel'),
      React.createElement(Btn, { variant: 'primary', disabled: sel === client.plan, onClick: () => { onDone(DB.PLANS.find(p=>p.id===sel)); onClose(); } }, 'Update plan')));
}

window.clientActionsFor = clientActionsFor;
window.ChangePlanModal = ChangePlanModal;
