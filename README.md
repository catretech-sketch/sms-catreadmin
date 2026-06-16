# Catre · Super Admin Panel (Frontend)

A polished **operator control plane** for **Catre Technology** — a multi-tenant
school-management SaaS. This is the internal web app the operator uses to run the business:
manage client schools, onboard new clients, configure plans, handle billing, run support, and
manage the internal team. India-localized (₹ currency, Razorpay, CBSE/ICSE).

Built with **Vite + React + TypeScript**, wired to the Catre backend via real email-OTP login
and a role-gated REST API.

## Run it

Requires the backend (`../sms-backend`, `docker compose up`).

    cp .env.example .env      # VITE_API_BASE_URL=http://localhost:8080/v1
    npm install
    npm run dev               # http://localhost:5173

Sign in with email-OTP as `catre.tech@gmail.com` (code is emailed by the backend).
Build: `npm run build`. Tests: `npm run test`.

## Screens

- **Login** — email-OTP authentication against the live backend
- **App shell** — dark-navy sidebar (filtered by role), top bar with account menu, breadcrumbs, light/dark toggle
- **Dashboard** — KPI cards, MRR line chart, plan donut, signups bars, usage alerts
- **Clients** — searchable/filterable/sortable/paginated table → **Client detail** (overview, subscription, usage, activity, contacts) with role-gated lifecycle actions
- **Onboard wizard** — multi-step new-client creation
- **Onboarding** — Kanban pipeline with setup checklists
- **Billing → Plans** — plan catalog with per-student pricing, offers, publish/draft state, and a per-module Silver/Gold/Platinum tier selector; **Subscriptions**; **Invoices** (mark paid, refund, past-due banners)
- **Support** — ticket list + threaded detail, system health panel
- **Team** & **Settings** — Owner-only (staff, roles, branding, feature flags, audit log)
- **Reports** — read-only analytics with client-side CSV export

## RBAC (roles & access)

Permissions are centralized in `src/auth/rbac.ts`. Six internal roles, gated two ways — nav/routes are
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
src/
  main.tsx              entry — QueryClientProvider → ToastHost → AuthProvider → App
  App.tsx               app shell — sidebar, topbar, routing, guards
  styles.css            design tokens + dark-navy theme (light/dark)
  config.ts             env-var config (VITE_API_BASE_URL, etc.)
  api/                  typed API layer (client, auth, types)
  auth/                 AuthContext, tokenStore, rbac
  components/           shared UI primitives, ToastHost
  screens/              the 10 screens
screenshots/            design reference images
api/README.md           backend API contract notes
```
