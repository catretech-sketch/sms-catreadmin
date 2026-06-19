# Catre Admin — Support (Tickets) — design

**Date:** 2026-06-19
**Status:** Approved (autonomous mandate) — ready for plan
**Sub-project:** 3 of 3 — **Slice 3d of 5**

## Summary

Bind the **Support** surface — ticket list + ticket detail (message thread, reply,
status/assignee) — to the live backend, ported 1:1 from `screen-support.jsx`. The `support`
route currently falls through to the placeholder; this slice flips it. Reuses the existing
`HealthPanel` (built in SP2) as the list sidebar.

## Decomposition context

3a ✅, 3b ✅, 3c ✅. **3d (this)** = Support. Remaining: 3e Team/Settings/Identity/Audit.

## Goals

- **Ticket list** from `GET /tickets`: priority badge, subject, id, client, message count,
  status badge, assignee, updated; filter chips (open/all/resolved/closed) + search (client-side,
  as the prototype does); `HealthPanel` sidebar (reused). Row → ticket detail.
- **Ticket detail** from `GET /tickets/{id}` (ticket + message thread). "Open client" →
  `go('client',{id:tenant_id})`. Reply box (`POST /tickets/{id}/messages`, gated `support.manage`).
- **Meta panel:** change status chips + assign-to select → `PATCH /tickets/{id}`, gated
  `support.manage`. Assign-to options come from `GET /team` (introduced here, read-only).
- Read-only roles (no `support.manage`) see thread + meta but cannot reply/patch.

## Non-goals

- **No `POST /tickets` create UI** — the prototype has no "New ticket" button.
- **No Impersonate** on the detail header — no live endpoint (deferred since 3a) → hidden.
- No Team CRUD / Settings / Identity / Audit (3e). `GET /team` read is introduced here for the
  assignee picker; 3e adds team create/edit on top (reuses `listTeam`/`useTeam`).
- No changes to shell/auth/RBAC transport or slice-3a/3b/3c code; `HealthPanel` unchanged.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| UI source | Port `SupportScreen` + `TicketDetail` from `screen-support.jsx` 1:1 | "Keep UI same"; recover from git `5660fb0^` |
| HealthPanel/HealthScreen | **Reuse existing** (SP2) — do not re-port | Already built; the prototype's copies are redundant here |
| List filter/search | **Client-side** (open = open\|pending) | Matches prototype; "open" spans two statuses → server filter awkward |
| Thread source | `GET /tickets/{id}` returns the ticket + `messages[]` | Replaces the prototype's faked hardcoded thread |
| Assignee options | `GET /team` (read-only `useTeam`, new in 3d) | Dropdown needs team members; 3e extends team |
| Impersonate | Hidden (no endpoint) | Consistent with 3a |
| Mutations | `useMutation` + invalidate + toast at call site | Same pattern as 3a–3c |

## Placement & files

```
src/api/
  tickets.ts          listTickets(params,cursor), getTicket(id),
                      patchTicket(id, body: PatchTicketBody), postMessage(id, body)
  team.ts             listTeam(): ListEnvelope<TeamMember>            // GET /team (read; 3e extends)
  queryKeys.ts        + qk.tickets.list(params), qk.tickets.detail(id), qk.team.list()
  types.ts            + Ticket, TicketDetail, TicketMessage, TeamMember, PatchTicketBody,
                        TicketStatus, TicketPriority; + TICKET_MESSAGE_KEYS
                        (SUPPORT_TICKET_KEYS, TEAM_MEMBER_KEYS already present)
  hooks/
    useTickets.ts          useInfiniteQuery(qk.tickets.list)
    useTicket.ts           useQuery(qk.tickets.detail)
    useTicketMutations.ts  usePatchTicket, usePostMessage (invalidate tickets.detail + list)
    useTeam.ts             useQuery(qk.team.list)
src/screens/
  SupportScreen.tsx   list + filters/search + HealthPanel sidebar; selects -> TicketDetailScreen
  TicketDetailScreen.tsx  thread + reply + meta (status/assign)
src/App.tsx           renderScreen(): + case 'support' → <SupportScreen/>
```

## DTOs

- `Ticket` (list row, = `SUPPORT_TICKET_KEYS`): `{ id, subject, tenant_id, tenant_name, status,
  priority, assignee, created, updated, messages_count }`. `TicketStatus =
  'open'|'pending'|'resolved'|'closed'`; `TicketPriority = 'low'|'normal'|'high'|'urgent'`
  (confirm against `PRIORITY_MAP`).
- `TicketMessage` (= `TICKET_MESSAGE_KEYS`): `{ id, author, role, body, created }`,
  `role: 'agent'|'client'`.
- `TicketDetail = Ticket & { messages: TicketMessage[] }` (the `GET /tickets/{id}` payload).
- `TeamMember` (= `TEAM_MEMBER_KEYS`): `{ id, name, email, phone, role, status, last_login, joined }`.
- `PatchTicketBody = { status?: TicketStatus; assignee?: string | null }`.

## Interaction → endpoint binding

| Interaction | Endpoint | Body |
|---|---|---|
| List | `GET /tickets` (cursor) | — |
| Open ticket | `GET /tickets/{id}` | — (returns ticket + messages) |
| Change status / assign | `PATCH /tickets/{id}` (`support.manage`) | `{ status }` or `{ assignee }` |
| Reply | `POST /tickets/{id}/messages` (`support.manage`) | `{ body }` |
| Assignee options | `GET /team` | — |

## Testing / verification

- **api:** listTickets path+cursor; getTicket path; patchTicket PATCH `{status}`/`{assignee}`;
  postMessage POST `/messages` `{body}`; listTeam GET `/team`.
- **hooks:** patchTicket/postMessage invalidate `tickets.detail(id)` + `['tickets','list']`.
- **UI:** SupportScreen renders ticket rows + filters; manager sees reply box + status/assign;
  read-only role sees the can-view-not-reply note; TicketDetail renders the thread.
- **contract:** `types.test.ts` covers `TicketMessage` keys.
- **gate:** `npm test`, `npm run typecheck`, `npm run build`.

## ⚠️ Flagged for verification

- `GET /tickets/{id}` payload shape (ticket + `messages[]`), `TicketMessage` fields
  (`author`/`role`/`body`/`created`), `PATCH /tickets/{id}` partial body, and
  `POST /tickets/{id}/messages` body (`{body}` vs `{text}`) are assumed — confirm against swagger.
- `TicketPriority` values vs the live data / `PRIORITY_MAP`.

## Out of scope

`POST /tickets`, Impersonate, Team CRUD/Settings/Identity/Audit (3e).
