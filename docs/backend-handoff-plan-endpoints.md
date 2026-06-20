# Backend task — Fix Catre plan create / edit / publish (`/v1` API)

> Handoff from the `sms-catreadmin` (Catre admin) frontend team.
> The frontend's plan management is fully built but cannot **create**, **edit**, or
> **publish** plans: one request-contract mismatch causes a 500, and two routes the
> frontend calls do not exist. All changes are in the **Tenancy** module.

## Files to touch
| Concern | Path |
|---|---|
| Endpoints | `src/Sms.Modules.Tenancy/ModuleEndpoints.cs` (Plans section, ~line 87) |
| Repository | `src/Sms.Modules.Tenancy/Data/PlanRepository.cs` |
| Contracts | `src/Sms.Modules.Tenancy/Contracts/CatreContracts.cs` |
| Proc | `db/Sms.Migrations/procs/catre/Plan_Upsert.sql` |
| Tests | `tests/Sms.Tests.Integration/Catre/` (mirror `CatreBillingTests.cs`) |

## Exact request the frontend sends
Snake_case JSON (source of truth: `sms-catreadmin/src/api/plans.ts` + `src/api/types.ts`).
It does **not** send `tier`, `color`, or `description`. It **does** send `feature_tiers`.

```json
{
  "name": "Gold",
  "band": "Under 500",
  "pricing": "flat",
  "price": 9999,
  "per_student": 0,
  "min_students": 0,
  "period": "month",
  "limits": { "students": 1000, "staff": 100, "storage_gb": 40 },
  "features": ["attendance", "exams"],
  "feature_tiers": { "attendance": "silver", "exams": "gold" },
  "visibility": "published",
  "audience": "all",
  "offer": { "label": "Launch offer", "pct": 20 }
}
```
- For per-student plans, `pricing` is `"per_student"` with `per_student` and `min_students` set.
- `offer` may be `null`.

Every endpoint must return the saved plan inside the standard envelope
`{ "data": <PlanResponse> }`. The existing `PlanResponse` shape is correct — **do not change it**.

---

## 1. `tier` is required but never sent → 500 on create/save  *(root cause — fix first)*
`PlanUpsertRequest.Tier` is non-nullable and `dbo.Plans.Tier` is `NOT NULL`. A payload
without `tier` deserializes to `Tier = null`, and `Plan_Upsert` then inserts NULL into the
`NOT NULL` column → SQL exception → `internal_error` ("An unexpected error occurred.").
This is the error seen in the UI when saving a plan.

**Fix — accept the frontend payload as-is:**
- Make `tier` optional: `PlanUpsertRequest.Tier` → `string?`.
- Default it server-side before the proc call (e.g. `Tier = req.Tier ?? "silver"`, or derive
  from `band`). Keep `PlanResponse.tier` populated in the response.

## 2. Add `PATCH /v1/plans/{id}`  *(Edit — currently 405)*
Frontend `updatePlan(id, body)` sends the body above. Reuse the existing upsert:

```csharp
g.MapPatch("/plans/{id:guid}", async (Guid id, PlanUpsertRequest req, PlanRepository repo) =>
{
    var row = await repo.UpsertAsync(req with { Id = id });
    return row is null
        ? Results.NotFound()
        : Results.Ok(new DataEnvelope<PlanResponse>(row.ToResponse()));
});
```

## 3. Add `POST /v1/plans/{id}/publish`  *(Publish / Unpublish — currently 404)*
Frontend `publishPlan(id, publish)` sends `{ "publish": true | false }`.
`true` → `visibility = "published"`, `false` → `"draft"`. Return the updated plan.

```csharp
// CatreContracts.cs
public sealed record PublishPlanRequest(bool Publish);

// ModuleEndpoints.cs
g.MapPost("/plans/{id:guid}/publish", async (Guid id, PublishPlanRequest req, PlanRepository repo) =>
{
    var row = await repo.SetVisibilityAsync(id, req.Publish ? "published" : "draft");
    return row is null
        ? Results.NotFound()
        : Results.Ok(new DataEnvelope<PlanResponse>(row.ToResponse()));
});

// PlanRepository.cs — UPDATE then return the row (reuse the existing `Cols` constant)
public async Task<PlanRow?> SetVisibilityAsync(Guid id, string visibility, CancellationToken ct = default) =>
    (await QueryInlineAsync<PlanRow>(
        $"UPDATE dbo.Plans SET Visibility = @visibility WHERE Id = @id; " +
        $"SELECT {Cols} FROM dbo.Plans WHERE Id = @id",
        new { id, visibility }, ct)).FirstOrDefault();
```

---

## Acceptance criteria
- `POST /v1/plans` with the exact JSON above (no `tier`) → **201**, returns the created plan, **no 500**.
- `PATCH /v1/plans/{id}` → **200**, returns the updated plan; unknown id → **404**.
- `POST /v1/plans/{id}/publish` `{ "publish": false }` → plan `visibility = "draft"`;
  `{ "publish": true }` → `"published"`; unknown id → **404**.
- New integration tests in `tests/Sms.Tests.Integration/Catre/` covering create-without-tier,
  patch, and publish/unpublish (use the existing platform-auth + `SqlServerFixture` pattern).
- All existing tests still pass.

## Decision needed
`feature_tiers` is sent by the frontend but has no column today (silently dropped).
Confirm whether per-feature tiers should be persisted; if yes, add storage in a follow-up.

---

### Verification status (from the frontend side)
- Issues **#2 and #3** (routes absent) and the schema facts behind **#1** were verified
  directly against the backend repo (`ModuleEndpoints.cs`, `CatreContracts.cs`, the
  `M0005` migration, and `Plan_Upsert.sql`).
- The **#1** 500 was **not** reproduced end-to-end from the frontend side (auth could not be
  minted there), but the NULL-into-`NOT NULL` chain is concrete and the acceptance test for
  create-without-`tier` will confirm it.
