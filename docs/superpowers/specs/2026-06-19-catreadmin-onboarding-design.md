# Catre Admin — Onboarding Kanban — design

**Date:** 2026-06-19
**Status:** Approved (autonomous mandate — user: "complete it end to end") — ready for plan
**Area:** Catre Super Admin Panel (frontend, `sms-catreadmin`)
**Sub-project:** 3 of 3 — **Slice 3c of 5**

## Summary

Bind the **Onboarding pipeline** (a 4-stage Kanban: Lead → Trial → Onboarding → Active)
to the live backend, ported 1:1 from `screen-onboarding.jsx`. Cards drag between stages
(→ `POST /onboarding/{id}/advance`) and carry a setup checklist toggled per item
(→ `PATCH /onboarding/{id}/checklist`). The `onboarding` route currently falls through to
the placeholder in `App.tsx`; this slice flips it. Reuses the 3a/3b mutation→invalidation→
toast pattern.

## Decomposition context

3a ✅ (client writes), 3b ✅ (billing). **3c (this)** = Onboarding. Remaining: 3d Support, 3e Team/Settings/Identity/Audit.

## Goals

- **Kanban board** from `GET /onboarding`: 4 columns, each a stack of client cards with name,
  monthly value, owner, age, and a checklist with done-count + progress bar.
- **Drag a card to another column** → `POST /onboarding/{id}/advance` (move to the dropped
  stage); on success invalidate the board; on error toast + the optimistic move reverts via
  invalidation. Gated `onboarding.manage`.
- **Toggle a checklist item** → `PATCH /onboarding/{id}/checklist`; gated `onboarding.manage`.
- **New client** button → `go('onboard')` (reuses the 3a wizard); gated `clients.start_trial`.
- Read-only roles (no `onboarding.manage`) see the board without drag/toggle.

## Non-goals

- **No `POST /onboarding` create UI** — the prototype's "New client" reuses the onboard wizard
  (`POST /clients`); there is no separate create-card surface.
- No Support / Team / Settings / Identity (3d–3e).
- No changes to shell/auth/RBAC transport, slice-3a/3b code.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| UI source | Port `screen-onboarding.jsx` 1:1 | "Keep UI same"; recover from git `5660fb0^` |
| Board grouping | Group the `GET /onboarding` list client-side by `stage` into the 4 columns | Backend returns cards; UI arranges the board |
| Drag → advance | Drop on a column calls `advanceOnboarding(id, stage)` | Maps the prototype's free drag to the `/advance` endpoint |
| Optimistic move | **No optimistic update** — invalidate on success; the card snaps after refetch | Simpler + honest; matches the slice-3a invalidate-on-success rule |
| Checklist toggle | `patchChecklist(id, index, done)` per item | Matches the prototype's per-item toggle |
| Create | "New client" → `go('onboard')` (no `POST /onboarding`) | Prototype reuses the wizard |

## Placement & files

```
src/api/
  onboarding.ts       getOnboarding(): ListEnvelope<OnboardingCard>
                      advanceOnboarding(id, stage): OnboardingCard   // POST /onboarding/{id}/advance
                      patchChecklist(id, index, done): OnboardingCard // PATCH /onboarding/{id}/checklist
  queryKeys.ts        + qk.onboarding.list()
  types.ts            + OnboardingCard, OnboardingStage, ChecklistItem; + ONBOARDING_KEYS
  hooks/
    useOnboarding.ts        useQuery(qk.onboarding.list)
    useOnboardingMutations.ts  useAdvanceOnboarding, usePatchChecklist (invalidate onboarding.list)
src/screens/
  OnboardingScreen.tsx   Kanban port (columns, drag→advance, checklist→patch, QueryBoundary)
src/App.tsx            renderScreen(): + case 'onboarding' → <OnboardingScreen/>
```

## DTO

`OnboardingCard`: `{ id, name, value, owner, age, stage, checklist }` where
`checklist: ChecklistItem[]`, `ChecklistItem = { label: string; done: boolean }`,
`OnboardingStage = 'lead' | 'trial' | 'onboarding' | 'active'`. `ONBOARDING_KEYS` added to
`CONTRACT_KEYS`; `types.test.ts` covers it.

## Board → endpoint binding

| Interaction | Endpoint | Body (assumed snake_case) |
|---|---|---|
| Load board | `GET /onboarding` | — (list of cards, each with `stage`) |
| Drag to column | `POST /onboarding/{id}/advance` | `{ stage }` (the dropped column) |
| Toggle checklist item | `PATCH /onboarding/{id}/checklist` | `{ index, done }` |

## Testing / verification

- **Unit (api):** `getOnboarding` GET path; `advanceOnboarding` POST `/advance` with `{stage}`;
  `patchChecklist` PATCH `/checklist` with `{index,done}`.
- **Unit (hooks):** advance/checklist mutations invalidate `onboarding.list`.
- **Unit (UI):** board groups cards into 4 columns from the query; manager sees draggable
  cards + toggle; read-only role does not; checklist progress renders.
- **Contract:** `types.test.ts` covers `OnboardingCard` keys.
- **Build/gate:** `npm test`, `npm run typecheck`, `npm run build`.

## ⚠️ Flagged for verification

- `GET /onboarding` response shape (flat list with `stage` vs grouped) and the `advance`/
  `checklist` body shapes (`{stage}`, `{index,done}`) are assumed — confirm against swagger;
  adjust DTO/api if different.
- Backward drag (e.g. Active→Lead) may be rejected by `/advance` (forward-only) — surfaces as
  an error toast; acceptable.

## Out of scope

`POST /onboarding` create-card, Support (3d), Team/Settings/Identity/Audit (3e).
