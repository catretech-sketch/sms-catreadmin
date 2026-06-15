/* ============================================================
   App shell + router + role switcher + theme + impersonation
   ============================================================ */
const { useState: aUseState, useEffect: aUseEffect } = React;

const NAV = [
  { group: 'Overview', items: [
    { key: 'dashboard', label: 'Dashboard', icon: Icon.dashboard, perm: 'dashboard.view', route: 'dashboard' },
  ]},
  { group: 'Clients', items: [
    { key: 'clients', label: 'Clients', icon: Icon.building, perm: 'clients.view', route: 'clients', match: ['clients','client','onboard'] },
    { key: 'onboarding', label: 'Onboarding', icon: Icon.onboard, perm: 'onboarding.view', route: 'onboarding' },
  ]},
  { group: 'Revenue', items: [
    { key: 'plans', label: 'Plans', icon: Icon.plans, perm: 'plans.view', route: 'plans' },
    { key: 'billing', label: 'Billing', icon: Icon.billing, perm: 'billing.view', route: 'billing', match: ['billing'] },
    { key: 'reports', label: 'Reports', icon: Icon.reports, perm: 'reports.view', route: 'reports' },
  ]},
  { group: 'Operations', items: [
    { key: 'support', label: 'Support', icon: Icon.support, perm: 'support.view', route: 'support', match: ['support','health'], badge: () => DB.TICKETS.filter(t=>t.status==='open'||t.status==='pending').length },
  ]},
  { group: 'Admin', items: [
    { key: 'identity', label: 'Identity & Access', icon: Icon.shield, perm: 'identity.view', route: 'identity' },
    { key: 'team', label: 'Team', icon: Icon.team, perm: 'team.view', route: 'team' },
    { key: 'settings', label: 'Settings', icon: Icon.settings, perm: 'settings.view', route: 'settings' },
  ]},
];

const ROUTE_PERM = {
  dashboard: 'dashboard.view', clients: 'clients.view', client: 'clients.view', onboard: 'clients.view',
  onboarding: 'onboarding.view', billing: 'billing.view', plans: 'plans.view', reports: 'reports.view',
  support: 'support.view', health: 'support.view', team: 'team.view', settings: 'settings.view',
  identity: 'identity.view',
};

const CRUMB = {
  dashboard: ['Dashboard'], clients: ['Clients'], client: ['Clients', 'Detail'], onboard: ['Clients', 'Onboard'],
  onboarding: ['Onboarding'], billing: ['Billing'], plans: ['Plans'], reports: ['Reports'], support: ['Support'],
  health: ['Support', 'System health'], team: ['Team'], settings: ['Settings'],
  identity: ['Identity & Access'],
};

function App() {
  const [authed, setAuthed] = aUseState(false);
  const [role, setRole] = aUseState(() => { const s = localStorage.getItem('sm_role'); return (window.RBAC.DEMO_ROLES.includes(s) ? s : 'admin'); });
  const [theme, setTheme] = aUseState(() => localStorage.getItem('sm_theme') || 'dark');
  const [route, setRoute] = aUseState(() => ({ name: 'dashboard', params: {} }));
  const [impersonating, setImpersonating] = aUseState(null);
  const [collapsed, setCollapsed] = aUseState(false);
  const [mobileNav, setMobileNav] = aUseState(false);

  aUseEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('sm_theme', theme); }, [theme]);
  aUseEffect(() => { localStorage.setItem('sm_role', role); }, [role]);

  const can = (action) => window.RBAC.can(role, action);
  const go = (name, params = {}) => { setRoute({ name, params }); setMobileNav(false); document.querySelector('.content') && (document.querySelector('.content').scrollTop = 0); };

  // if role loses access to current route, bounce to dashboard
  aUseEffect(() => {
    const perm = ROUTE_PERM[route.name];
    if (perm && !can(perm)) go('dashboard');
  }, [role]); // eslint-disable-line

  const impersonate = (client) => { setImpersonating(client); go('client', { id: client.id }); };
  const navValue = { route, go, impersonate, stopImpersonate: () => setImpersonating(null), impersonating, role, setRole };

  if (!authed) return React.createElement(window.ToastHost, null,
    React.createElement(window.LoginScreen, { onLogin: (r) => { setRole(r); setAuthed(true); go('dashboard'); } }));

  const currentUser = DB.TEAM.find(u => u.role === role && u.status === 'active') || { name: window.RBAC.ROLES[role].name + ' User', email: role + '@catre.io' };

  const renderScreen = () => {
    const perm = ROUTE_PERM[route.name];
    if (perm && !can(perm)) return React.createElement(window.Forbidden, { action: perm });
    switch (route.name) {
      case 'dashboard': return React.createElement(window.Dashboard);
      case 'clients': return React.createElement(window.ClientsScreen);
      case 'client': return React.createElement(window.ClientDetail, { id: route.params.id });
      case 'onboard': return React.createElement(window.OnboardWizard);
      case 'onboarding': return React.createElement(window.OnboardingScreen);
      case 'billing': return React.createElement(window.BillingScreen, { tab: route.params.tab });
      case 'plans': return React.createElement(window.BillingScreen, { tab: 'plans', plansOnly: true });
      case 'reports': return React.createElement(window.ReportsScreen);
      case 'support': return React.createElement(window.SupportScreen);
      case 'health': return React.createElement(window.HealthScreen);
      case 'team': return React.createElement(window.TeamScreen);
      case 'settings': return React.createElement(window.SettingsScreen);
      case 'identity': return React.createElement(window.IdentityScreen);
      default: return React.createElement(window.Dashboard);
    }
  };

  return React.createElement(window.ToastHost, null,
    React.createElement(window.NavCtx.Provider, { value: navValue },
      React.createElement(window.RoleCtx.Provider, { value: { role, can } },
        React.createElement('div', { className: 'app' },
          mobileNav && React.createElement('div', { className: 'scrim', onClick: () => setMobileNav(false) }),
          React.createElement(Sidebar, { role, collapsed, route, go, onToggle: () => setCollapsed(c => !c), mobileNav, theme, setTheme }),
          React.createElement('div', { className: 'main' },
            impersonating && React.createElement('div', { className: 'banner banner-impersonate' },
              React.createElement(Icon.eye, {}),
              React.createElement('span', null, 'Impersonating ', React.createElement('b', null, impersonating.name), ' · read-only session'),
              React.createElement('div', { className: 'banner-act' },
                React.createElement(Btn, { variant: 'ghost', size: 'sm', onClick: () => setImpersonating(null) }, 'Exit'))),
            React.createElement(Topbar, { route, role, setRole, currentUser, theme, setTheme, onMenu: () => setMobileNav(true), go,
              onLogout: () => { setAuthed(false); setImpersonating(null); } }),
            React.createElement('div', { className: 'content' }, renderScreen()))))));
}

function Sidebar({ role, collapsed, route, go, onToggle, mobileNav, theme, setTheme }) {
  const can = (a) => window.RBAC.can(role, a);
  const isActive = (item) => (item.match || [item.route]).includes(route.name);
  return React.createElement('aside', { className: 'sidebar' + (collapsed ? ' collapsed' : '') + (mobileNav ? ' open' : ''), style: window.innerWidth <= 1100 ? { left: mobileNav ? 0 : -260, top: 0, transition: 'left .2s' } : null },
    React.createElement('div', { className: 'brand' },
      React.createElement('div', { className: 'brand-mark' }, 'C'),
      !collapsed && React.createElement('div', { style: { minWidth: 0 } },
        React.createElement('div', { className: 'brand-name' }, 'Catre'),
        React.createElement('div', { className: 'brand-sub' }, 'Technology'))),
    React.createElement('nav', { className: 'nav' },
      NAV.map(grp => {
        const items = grp.items.filter(it => can(it.perm));
        if (items.length === 0) return null;
        return React.createElement('div', { key: grp.group },
          !collapsed && React.createElement('div', { className: 'nav-group-label' }, grp.group),
          items.map(it => React.createElement('button', { key: it.key, className: 'nav-item' + (isActive(it) ? ' active' : ''), onClick: () => go(it.route), title: collapsed ? it.label : null },
            React.createElement(it.icon, { size: 17 }),
            React.createElement('span', { className: 'nav-item-label' }, it.label),
            it.badge && it.badge() > 0 && React.createElement('span', { className: 'nav-badge' }, it.badge()))));
      })),
    React.createElement('div', { className: 'sidebar-foot' },
      React.createElement('button', { className: 'nav-item', onClick: onToggle, title: 'Collapse' },
        React.createElement(Icon.panelLeft, { size: 17 }), !collapsed && React.createElement('span', { className: 'nav-item-label' }, 'Collapse'))));
}

function Topbar({ route, role, setRole, currentUser, theme, setTheme, onMenu, go, onLogout }) {
  const { ROLES } = window.RBAC;
  const crumbs = CRUMB[route.name] || ['Dashboard'];
  const roleInfo = ROLES[role];
  return React.createElement('header', { className: 'topbar' },
    React.createElement('button', { className: 'btn btn-ghost btn-icon', style: { display: window.innerWidth <= 1100 ? 'grid' : 'none' }, onClick: onMenu }, React.createElement(Icon.menu, { size: 18 })),
    React.createElement('div', { className: 'crumbs' }, crumbs.map((c, i) =>
      React.createElement('span', { key: i, className: 'row gap6' }, i > 0 && React.createElement('span', { className: 'sep' }, React.createElement(Icon.chevRight, { size: 13 })),
        i === crumbs.length - 1 ? React.createElement('b', null, c) : React.createElement('span', null, c)))),
    React.createElement('div', { className: 'topbar-spacer' }),
    React.createElement('div', { className: 'search-box' }, React.createElement(Icon.search, { size: 15 }),
      React.createElement('input', { placeholder: 'Search…' }), React.createElement('span', { className: 'kbd' }, '⌘K')),

    /* role switcher (demo control) */
    React.createElement(window.Menu, { width: 260, trigger:
      React.createElement('button', { className: 'chip', style: { height: 36, paddingRight: 8 }, title: 'Switch role (demo)' },
        React.createElement('span', { style: { width: 8, height: 8, borderRadius: 3, background: roleInfo.color } }),
        React.createElement('span', { className: 'tiny muted', style: { fontWeight: 500 } }, 'Acting as'),
        React.createElement('span', { style: { fontWeight: 700 } }, roleInfo.name),
        React.createElement(Icon.chevDown, { size: 14, style: { color: 'var(--text-3)' } })) },
      React.createElement('div', { className: 'menu-label' }, 'Switch role · demo'),
      window.RBAC.DEMO_ROLES.map(rk => ROLES[rk]).map(r => React.createElement('button', { key: r.key, className: 'menu-item', onClick: () => setRole(r.key) },
        React.createElement('span', { style: { width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 } }),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } }, React.createElement('div', { style: { fontWeight: 600 } }, r.name),
          React.createElement('div', { className: 'tiny muted truncate' }, r.desc)),
        role === r.key && React.createElement(Icon.check, { size: 15, style: { color: 'var(--accent)' } })))),

    React.createElement('button', { className: 'btn btn-ghost btn-icon', onClick: () => setTheme(t => t === 'dark' ? 'light' : 'dark'), title: 'Toggle theme' },
      React.createElement(theme === 'dark' ? Icon.sun : Icon.moon, { size: 17 })),

    React.createElement('button', { className: 'btn btn-ghost btn-icon', title: 'Notifications', style: { position: 'relative' } },
      React.createElement(Icon.bell, { size: 17 }),
      React.createElement('span', { style: { position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', border: '1.5px solid var(--bg)' } })),

    /* account menu */
    React.createElement(window.Menu, { width: 230, trigger:
      React.createElement('button', { className: 'row gap8', style: { padding: '4px 4px 4px 8px', borderRadius: 9 } },
        React.createElement(window.Avatar, { name: currentUser.name, size: 30 }),
        React.createElement(Icon.chevDown, { size: 14, style: { color: 'var(--text-3)' } })) },
      React.createElement('div', { style: { padding: '8px 10px 10px' } },
        React.createElement('div', { className: 'row gap10' }, React.createElement(window.Avatar, { name: currentUser.name, size: 34 }),
          React.createElement('div', { style: { minWidth: 0 } }, React.createElement('div', { style: { fontWeight: 650, fontSize: 13 } }, currentUser.name),
            React.createElement('div', { className: 'tiny muted truncate' }, currentUser.email))),
        React.createElement('span', { className: 'role-badge', style: { marginTop: 10, display: 'inline-block', background: roleInfo.color + '22', color: roleInfo.color } }, roleInfo.name)),
      React.createElement('div', { className: 'menu-sep' }),
      React.createElement(window.MenuItem, { icon: Icon.user }, 'My profile'),
      window.RBAC.can(role, 'settings.view') && React.createElement(window.MenuItem, { icon: Icon.settings, onClick: () => go('settings') }, 'Settings'),
      React.createElement(window.MenuItem, { icon: theme === 'dark' ? Icon.sun : Icon.moon, onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark') }, theme === 'dark' ? 'Light mode' : 'Dark mode'),
      React.createElement('div', { className: 'menu-sep' }),
      React.createElement(window.MenuItem, { icon: Icon.logout, danger: true, onClick: onLogout }, 'Sign out')));
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
