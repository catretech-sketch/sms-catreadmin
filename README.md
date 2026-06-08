# Catre · Super Admin Panel (Frontend)

A polished, frontend-only **operator control plane** for **Catre Technology** — a multi-tenant
school-management SaaS. This is the internal web app the operator uses to run the business:
manage client schools, onboard new clients, configure plans, handle billing, run support, and
manage the internal team. India-localized (₹ currency, Razorpay, CBSE/ICSE).

It is built as a self-contained **React prototype** — no build step and no backend. React and
Babel are loaded from a CDN, and the screens are plain `.jsx` files compiled in the browser.
All data is mock/seed data baked into `data.jsx`.

## Run it

A static web server is required (opening `index.html` via `file://` won't work, because the
browser blocks fetching the `.jsx` files over `file://`).

```bash
# from the repo root — any static server works:
npx serve .
# then open the printed local URL (e.g. http://localhost:3000)
```

Other options: `python -m http.server`, the VS Code "Live Server" extension, etc.

### Demo logins

The login screen has one-click demo logins. Use the **role switcher** in the top bar to act as
any role and see the access differences live.

## Screens

- **Login** — demo logins per role
- **App shell** — dark-navy sidebar (filtered by role), top bar with role switcher, breadcrumbs, light/dark toggle
- **Dashboard** — KPI cards, MRR line chart, plan donut, signups bars, usage alerts
- **Clients** — searchable/filterable/sortable/paginated table → **Client detail** (overview, subscription, usage, activity, contacts) with role-gated lifecycle actions
- **Onboard wizard** — multi-step new-client creation
- **Onboarding** — Kanban pipeline with setup checklists
- **Billing → Plans** — plan catalog with per-student pricing, offers, publish/draft state, and a per-module Silver/Gold/Platinum tier selector mirroring the real school-admin modules; **Subscriptions**; **Invoices** (mark paid, refund, past-due banners)
- **Support** — ticket list + threaded detail, system health panel
- **Team** & **Settings** — Owner-only (staff, roles, branding, feature flags, audit log)
- **Reports** — read-only analytics with client-side CSV export

## RBAC (roles & access)

Permissions are centralized in `data.jsx`. Six internal roles, gated two ways — nav/routes are
hidden **and** route elements are guarded.

| Role | Access |
|---|---|
| **Owner** | Everything, incl. Team, Settings, delete client, plan config |
| **Admin** | Clients lifecycle, billing, support, onboarding, plan management |
| **Support** | View clients, read-only impersonate, full tickets — no money, no lifecycle |
| **Sales** | Start trials, run onboarding, billing read-only — no suspend/cancel |
| **Finance** | Plans, subscriptions, invoices, refunds — no client suspend, no team |
| **Analyst** | Dashboards + reports only |

## Project structure

```
index.html              entry — loads CDN React/Babel, then the files below in order
styles.css              design tokens + dark-navy theme (light/dark)
lib.jsx                 icons, SVG charts, low-level helpers
data.jsx                seed data, plans/feature catalog, RBAC permission matrix
ui.jsx                  shared UI primitives + navigation context + <Can> wrapper
client-actions.jsx      client lifecycle action helpers (suspend/activate/etc.)
screen-*.jsx            the 10 screens
app.jsx                 app shell — sidebar, topbar, role switcher, routing, guards
screenshots/            design reference images
```

## Notes

This is the **design prototype** (HTML/React). It maps cleanly onto a production build
(Vite + React + TypeScript + the documented REST API) when the backend is wired up.
