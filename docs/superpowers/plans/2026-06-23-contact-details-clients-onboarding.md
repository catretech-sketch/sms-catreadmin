# Contact Details on Clients & Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show contact name, phone, email, and postal address per entry on the Clients list, the Client detail screen, and the Onboarding pipeline — backed by real data end-to-end.

**Architecture:** Backend (`sms-backend`, .NET 10 + Dapper + FluentMigrator + SQL Server) gains an `Address` column on `Tenants` and four contact columns on `OnboardingItems`, surfaced through existing DTOs/repos/endpoints. Frontend (`sms-catreadmin`, Vite + React + TS) adds the fields to its types and renders them: an expandable contact row on the Clients table, a Contact card on the detail screen, and a contact expander on each onboarding card.

**Tech Stack:** C# / xUnit / FluentAssertions / Dapper / FluentMigrator (backend); TypeScript / React / Vitest / Testing Library (frontend).

## Global Constraints

- Two repos: backend at `D:\SMS\sms-project\sms-backend`, frontend at `D:\SMS\sms-project\sms-catreadmin`. Commit within each repo separately.
- JSON wire format is snake_case (`SnakeCaseNamingPolicy`): C# `ContactName` → `contact_name`, `Address` → `address`.
- All new fields are **nullable** everywhere; UI renders `—` when null.
- Backend integration tests require SQL Server reachable at `DESKTOP-TJL4SG6` (already running). Each test run creates/drops a fresh `Sms_Test_*` DB and runs all migrations, so new migrations + updated `.sql` procs are exercised automatically.
- Migration numbers are sequential: next free numbers are **45** and **46**.
- Embedded procs: `procs/**/*.sql` are embedded resources; a `.sql` edit only reaches an already-migrated DB when a migration re-applies it via `M0003_Procs_Auth.EmbeddedProcs("procs.<area>.")`.
- Do NOT remove the dead `Client.contact: string` field on the frontend (out of scope).

---

### Task 1: Backend — client address + contact fields end-to-end

**Files:**
- Create: `db/Sms.Migrations/M0045_Tenant_Address.cs`
- Modify: `db/Sms.Migrations/procs/catre/Client_Create.sql`
- Modify: `src/Sms.Modules.Tenancy/Contracts/CatreContracts.cs`
- Modify: `src/Sms.Modules.Tenancy/Data/ClientRepository.cs`
- Modify: `src/Sms.Modules.Tenancy/ModuleEndpoints.cs:68-80`
- Test: `tests/Sms.Tests.Integration/Catre/CatreClientsTests.cs`

**Interfaces:**
- Produces: `ClientResponse` JSON now includes `contact_name`, `contact_email`, `contact_phone`, `address` (all nullable strings). `POST /v1/clients` accepts an optional `address` string.

- [ ] **Step 1: Write the failing test**

Add this `[Fact]` to `tests/Sms.Tests.Integration/Catre/CatreClientsTests.cs` (inside the class):

```csharp
[Fact]
public async Task Client_create_persists_and_returns_contact_and_address()
{
    await using var app = App();
    var client = PlatformClient(app);
    var gold = await CreatePlanAsync(client, "Gold", "gold", 14999);

    var created = await Data(await client.PostAsJsonAsync("/v1/clients", new
    {
        name = "Greenwood High", slug = $"greenwood-{Guid.NewGuid():N}", country = "Mumbai, MH",
        admin_name = "Priya Sharma", admin_email = "admin@greenwood.edu.in", admin_phone = "+91 98200 11111",
        address = "12 MG Road, Fort, Mumbai 400001", plan_id = gold, trial_days = 14
    }), HttpStatusCode.Created);

    created.GetProperty("contact_name").GetString().Should().Be("Priya Sharma");
    created.GetProperty("contact_email").GetString().Should().Be("admin@greenwood.edu.in");
    created.GetProperty("contact_phone").GetString().Should().Be("+91 98200 11111");
    created.GetProperty("address").GetString().Should().Be("12 MG Road, Fort, Mumbai 400001");

    var id = created.GetProperty("id").GetGuid();
    var got = await Data(await client.GetAsync($"/v1/clients/{id}"), HttpStatusCode.OK);
    got.GetProperty("address").GetString().Should().Be("12 MG Road, Fort, Mumbai 400001");

    var list = await Data(await client.GetAsync("/v1/clients"), HttpStatusCode.OK);
    var row = list.EnumerateArray().Single(e => e.GetProperty("id").GetGuid() == id);
    row.GetProperty("contact_email").GetString().Should().Be("admin@greenwood.edu.in");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Sms.Tests.Integration --filter Client_create_persists_and_returns_contact_and_address`
Expected: FAIL — JSON has no `contact_name`/`address` property (KeyNotFound on `GetProperty`).

- [ ] **Step 3: Add the Address column + re-apply procs (migration)**

Create `db/Sms.Migrations/M0045_Tenant_Address.cs`:

```csharp
using FluentMigrator;

namespace Sms.Migrations;

[Migration(45, "Catre: add Tenants.Address; re-apply catre procs so Client_Create persists Address + returns contact columns")]
public sealed class M0045_Tenant_Address : Migration
{
    public override void Up()
    {
        Alter.Table("Tenants").AddColumn("Address").AsString(300).Nullable();
        // Re-apply catre procs so already-migrated DBs pick up the updated Client_Create.
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.catre."))
            Execute.Sql(sql);
    }

    public override void Down()
    {
        Delete.Column("Address").FromTable("Tenants");
    }
}
```

- [ ] **Step 4: Update the Client_Create proc**

Replace `db/Sms.Migrations/procs/catre/Client_Create.sql` with:

```sql
CREATE OR ALTER PROCEDURE dbo.Client_Create
    @Name nvarchar(200), @Slug nvarchar(100), @Country nvarchar(120),
    @ContactName nvarchar(200), @ContactEmail nvarchar(256), @ContactPhone nvarchar(40),
    @Address nvarchar(300), @PlanId uniqueidentifier, @Csm nvarchar(120)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id uniqueidentifier = NEWID();
    DECLARE @PlanName nvarchar(100), @Tier nvarchar(20), @Mrr decimal(18,2),
            @LS int, @LSt int, @LStor int;

    SELECT @PlanName = p.Name, @Tier = p.Tier, @Mrr = p.Price,
           @LS = p.LimitsStudents, @LSt = p.LimitsStaff, @LStor = p.LimitsStorageGb
    FROM dbo.Plans p WHERE p.Id = @PlanId;

    INSERT dbo.Tenants (Id, Name, Slug, Status, Tier, Country, PlanId, PlanName, Mrr,
        LimitsStudents, LimitsStaff, LimitsStorageGb, ContactName, ContactEmail, ContactPhone, Address, Csm, HealthScore)
    VALUES (@Id, @Name, @Slug, 'trial', @Tier, @Country, @PlanId, @PlanName, ISNULL(@Mrr, 0),
        @LS, @LSt, @LStor, @ContactName, @ContactEmail, @ContactPhone, @Address, @Csm, 100);

    SELECT Id, Name, Slug, Country, Status, PlanId, PlanName, Tier, Mrr, StudentsCount, StaffCount, StorageGb,
           LimitsStudents, LimitsStaff, LimitsStorageGb, CreatedAt, Csm, HealthScore,
           ContactName, ContactEmail, ContactPhone, Address
    FROM dbo.Tenants WHERE Id = @Id;
END
```

- [ ] **Step 5: Add the fields to the DTOs + mapper**

In `src/Sms.Modules.Tenancy/Contracts/CatreContracts.cs`:

Change `ClientResponse` (append the 4 fields):

```csharp
public sealed record ClientResponse(
    Guid Id, string Name, string Slug, string? Country, string Status,
    Guid? PlanId, string? PlanName, string? Tier, decimal Mrr,
    int StudentsCount, int StaffCount, decimal StorageGb, ClientLimits Limits,
    DateTime Created, string? Csm, int HealthScore,
    string? ContactName, string? ContactEmail, string? ContactPhone, string? Address);
```

Change `CreateClientRequest` (append `Address`):

```csharp
public sealed record CreateClientRequest(
    string Name, string Slug, string? Country, string? AdminName, string? AdminEmail,
    string? AdminPhone, Guid PlanId, int TrialDays, string? Csm, string? Address = null);
```

Change `ClientRow` (append the 4 fields):

```csharp
public sealed record ClientRow(
    Guid Id, string Name, string Slug, string? Country, string Status, Guid? PlanId, string? PlanName,
    string? Tier, decimal Mrr, int StudentsCount, int StaffCount, decimal StorageGb,
    int? LimitsStudents, int? LimitsStaff, int? LimitsStorageGb, DateTime CreatedAt, string? Csm, int HealthScore,
    string? ContactName, string? ContactEmail, string? ContactPhone, string? Address);
```

Change `CatreMappers.ToResponse(this ClientRow r)` to pass them through:

```csharp
    public static ClientResponse ToResponse(this ClientRow r) => new(
        r.Id, r.Name, r.Slug, r.Country, r.Status, r.PlanId, r.PlanName, r.Tier, r.Mrr,
        r.StudentsCount, r.StaffCount, r.StorageGb,
        new ClientLimits(r.LimitsStudents, r.LimitsStaff, r.LimitsStorageGb),
        r.CreatedAt, r.Csm, r.HealthScore,
        r.ContactName, r.ContactEmail, r.ContactPhone, r.Address);
```

- [ ] **Step 6: Update the repository (SELECT cols + create args)**

In `src/Sms.Modules.Tenancy/Data/ClientRepository.cs`, extend the `Cols` constant:

```csharp
    private const string Cols =
        "Id, Name, Slug, Country, Status, PlanId, PlanName, Tier, Mrr, StudentsCount, StaffCount, StorageGb, " +
        "LimitsStudents, LimitsStaff, LimitsStorageGb, CreatedAt, Csm, HealthScore, " +
        "ContactName, ContactEmail, ContactPhone, Address";
```

And pass `Address` in `CreateAsync` (proc param `@Address`):

```csharp
    public Task<ClientRow?> CreateAsync(CreateClientRequest r, CancellationToken ct = default) =>
        QuerySingleProcAsync<ClientRow>("dbo.Client_Create", new
        {
            r.Name, r.Slug, r.Country,
            ContactName = r.AdminName, ContactEmail = r.AdminEmail, ContactPhone = r.AdminPhone,
            r.Address, r.PlanId, r.Csm
        }, ct);
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `dotnet test tests/Sms.Tests.Integration --filter Client_create_persists_and_returns_contact_and_address`
Expected: PASS.

- [ ] **Step 8: Run the existing client tests to confirm no regression**

Run: `dotnet test tests/Sms.Tests.Integration --filter CatreClientsTests`
Expected: PASS (all facts, including `Client_lifecycle_create_get_list_status_changeplan`).

- [ ] **Step 9: Commit (in sms-backend)**

```bash
git -C D:/SMS/sms-project/sms-backend add db/Sms.Migrations/M0045_Tenant_Address.cs db/Sms.Migrations/procs/catre/Client_Create.sql src/Sms.Modules.Tenancy/Contracts/CatreContracts.cs src/Sms.Modules.Tenancy/Data/ClientRepository.cs tests/Sms.Tests.Integration/Catre/CatreClientsTests.cs
git -C D:/SMS/sms-project/sms-backend commit -m "feat(catre): persist + return client address and contact fields"
```

(Note: `ModuleEndpoints.cs` is edited in Task 2 where the onboarding card also needs contact; the create endpoint already forwards `address` because `CreateClientRequest` binds it from the JSON body automatically. No endpoint edit is required for Task 1.)

---

### Task 2: Backend — onboarding contact columns end-to-end

**Files:**
- Create: `db/Sms.Migrations/M0047_Onboarding_Contact.cs` (proc applied inline; do NOT edit `Onboarding_Create.sql`)
- Modify: `src/Sms.Modules.Tenancy/Contracts/OpsContracts.cs`
- Modify: `src/Sms.Modules.Tenancy/Data/OnboardingRepository.cs`
- Modify: `src/Sms.Modules.Tenancy/ModuleEndpoints.cs:76-78`
- Test: `tests/Sms.Tests.Integration/Catre/CatreClientsTests.cs`

**Interfaces:**
- Consumes: `CreateClientRequest.Address` and contact fields from Task 1.
- Produces: `GET /v1/onboarding` items include `contact_name`, `contact_email`, `contact_phone`, `address` (nullable strings). `CreateOnboardingRequest` gains those four fields before its trailing `TenantId` param.

- [ ] **Step 1: Write the failing test**

Add this `[Fact]` to `CatreClientsTests.cs`:

```csharp
[Fact]
public async Task Client_create_seeds_onboarding_card_with_contact()
{
    await using var app = App();
    var client = PlatformClient(app);
    var gold = await CreatePlanAsync(client, "Gold", "gold", 14999);

    var slug = $"greenwood-{Guid.NewGuid():N}";
    await Data(await client.PostAsJsonAsync("/v1/clients", new
    {
        name = "Greenwood High", slug, country = "Mumbai, MH",
        admin_name = "Priya Sharma", admin_email = "admin@greenwood.edu.in", admin_phone = "+91 98200 11111",
        address = "12 MG Road, Fort, Mumbai 400001", plan_id = gold, trial_days = 14
    }), HttpStatusCode.Created);

    var board = await Data(await client.GetAsync("/v1/onboarding"), HttpStatusCode.OK);
    var card = board.EnumerateArray().Single(e => e.GetProperty("slug").GetString() == slug);
    card.GetProperty("contact_name").GetString().Should().Be("Priya Sharma");
    card.GetProperty("contact_email").GetString().Should().Be("admin@greenwood.edu.in");
    card.GetProperty("contact_phone").GetString().Should().Be("+91 98200 11111");
    card.GetProperty("address").GetString().Should().Be("12 MG Road, Fort, Mumbai 400001");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Sms.Tests.Integration --filter Client_create_seeds_onboarding_card_with_contact`
Expected: FAIL — onboarding JSON has no `contact_name` property.

> **IMPORTANT — learned during Task 1 (read before implementing):** The plan
> originally said migration M0046 + re-apply `EmbeddedProcs("procs.catreops.")`
> after updating `Onboarding_Create.sql`. Two corrections, both verified against
> the live DB:
> 1. **Renumber to M0047.** M0045 and M0046 are already taken (M0046 = Task 1's
>    `M0046_Tenant_Address.cs`). Next free number is **47**.
> 2. **Apply the proc INLINE; do NOT edit `Onboarding_Create.sql`.** SQL Server
>    validates columns at `CREATE PROCEDURE` time (confirmed empirically — it is
>    NOT deferred for columns of existing tables). The historical migration that
>    first creates `Onboarding_Create` from the embedded `.sql` runs on a fresh
>    install *before* this migration adds the contact columns; if the `.sql`
>    referenced `ContactName` etc., that earlier migration would fail with
>    "Invalid column name". So leave `procs/catreops/Onboarding_Create.sql` at
>    its pre-contact baseline and put the new proc body inline in M0047 (same
>    pattern Task 1 used for the client procs). `Down()` re-applies the baseline.

- [ ] **Step 3: Add onboarding contact columns + inline proc + backfill (migration)**

Create `db/Sms.Migrations/M0047_Onboarding_Contact.cs`:

```csharp
using FluentMigrator;

namespace Sms.Migrations;

[Migration(47, "Catre: add contact columns to OnboardingItems; apply Onboarding_Create inline (new cols); backfill from linked tenants")]
public sealed class M0047_Onboarding_Contact : Migration
{
    private const string OnboardingCreateInline = @"
CREATE OR ALTER PROCEDURE dbo.Onboarding_Create
    @Name nvarchar(200), @Slug nvarchar(100), @Owner nvarchar(120),
    @Value decimal(18,2), @Stage nvarchar(20),
    @ContactName nvarchar(200) = NULL, @ContactEmail nvarchar(256) = NULL,
    @ContactPhone nvarchar(40) = NULL, @Address nvarchar(300) = NULL,
    @TenantId uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id uniqueidentifier = NEWID();
    INSERT dbo.OnboardingItems (Id, TenantId, Name, Slug, Owner, Value, Stage,
        ContactName, ContactEmail, ContactPhone, Address)
    VALUES (@Id, @TenantId, @Name, @Slug, @Owner, ISNULL(@Value, 0), ISNULL(@Stage, 'lead'),
        @ContactName, @ContactEmail, @ContactPhone, @Address);

    INSERT dbo.OnboardingChecklist (OnboardingId, Seq, Label, Done) VALUES
        (@Id, 1, 'Account created', 1), (@Id, 2, 'Admin invited', 0), (@Id, 3, 'Data imported', 0),
        (@Id, 4, 'First login', 0), (@Id, 5, 'Payment set up', 0);

    SELECT @Id AS Id;
END";

    public override void Up()
    {
        Alter.Table("OnboardingItems")
            .AddColumn("ContactName").AsString(200).Nullable()
            .AddColumn("ContactEmail").AsString(256).Nullable()
            .AddColumn("ContactPhone").AsString(40).Nullable()
            .AddColumn("Address").AsString(300).Nullable();

        // Apply the new Onboarding_Create INLINE (the embedded .sql stays at the pre-contact
        // baseline so the historical proc-creation migration still succeeds on fresh installs).
        Execute.Sql(OnboardingCreateInline);

        // Backfill existing tenant-linked cards from their tenant's contact details.
        Execute.Sql(@"
UPDATE o SET o.ContactName = t.ContactName, o.ContactEmail = t.ContactEmail,
             o.ContactPhone = t.ContactPhone, o.Address = t.Address
FROM dbo.OnboardingItems o
JOIN dbo.Tenants t ON t.Id = o.TenantId
WHERE o.TenantId IS NOT NULL;");
    }

    public override void Down()
    {
        Delete.Column("ContactName").Column("ContactEmail").Column("ContactPhone").Column("Address")
            .FromTable("OnboardingItems");
        // Restore the pre-contact baseline Onboarding_Create (embedded .sql is still at baseline)
        // so the proc no longer references the dropped columns.
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.catreops."))
            Execute.Sql(sql);
    }
}
```

- [ ] **Step 4: Do NOT modify `Onboarding_Create.sql`**

Leave `db/Sms.Migrations/procs/catreops/Onboarding_Create.sql` at its current pre-contact
baseline (it is the fresh-install version the historical migration reads). The new proc body
lives inline in M0047 (Step 3). Verify you have NOT staged any change to this `.sql` file.

- [ ] **Step 5: Update onboarding DTOs**

In `src/Sms.Modules.Tenancy/Contracts/OpsContracts.cs`:

`OnboardingItemResponse` (append the 4 fields after `Age`):

```csharp
public sealed record OnboardingItemResponse(
    Guid Id, Guid? TenantId, string Name, string Slug, string? Owner, decimal Value, string Stage,
    IReadOnlyList<OnboardingChecklistItem> Checklist, int Done, int Age,
    string? ContactName, string? ContactEmail, string? ContactPhone, string? Address);
```

`OnboardingItemRow` (append the 4 fields):

```csharp
public sealed record OnboardingItemRow(
    Guid Id, Guid? TenantId, string Name, string Slug, string? Owner, decimal Value, string Stage, int Age,
    string? ContactName, string? ContactEmail, string? ContactPhone, string? Address);
```

`CreateOnboardingRequest` (4 fields BEFORE the trailing optional `TenantId`):

```csharp
public sealed record CreateOnboardingRequest(
    string Name, string Slug, string? Owner, decimal Value, string? Stage,
    string? ContactName = null, string? ContactEmail = null, string? ContactPhone = null, string? Address = null,
    Guid? TenantId = null);
```

- [ ] **Step 6: Update the onboarding repository**

In `src/Sms.Modules.Tenancy/Data/OnboardingRepository.cs`:

`CreateAsync` — pass the contact fields to the proc:

```csharp
    public async Task<Guid> CreateAsync(CreateOnboardingRequest r, CancellationToken ct = default) =>
        await QuerySingleProcAsync<Guid>("dbo.Onboarding_Create",
            new { r.Name, r.Slug, r.Owner, r.Value, r.Stage,
                  r.ContactName, r.ContactEmail, r.ContactPhone, r.Address, r.TenantId }, ct);
```

`GetAsync` — extend the SELECT column list:

```csharp
        var item = (await QueryInlineAsync<OnboardingItemRow>(
            "SELECT Id, TenantId, Name, Slug, Owner, Value, Stage, Age, " +
            "ContactName, ContactEmail, ContactPhone, Address FROM dbo.OnboardingItems WHERE Id = @id",
            new { id }, ct)).FirstOrDefault();
```

`ListAsync` — extend the SELECT column list:

```csharp
        var items = await QueryInlineAsync<OnboardingItemRow>(
            "SELECT Id, TenantId, Name, Slug, Owner, Value, Stage, Age, " +
            "ContactName, ContactEmail, ContactPhone, Address FROM dbo.OnboardingItems " +
            "WHERE (@stage IS NULL OR Stage = @stage) ORDER BY Age DESC", new { stage }, ct);
```

`Compose` — thread the new fields into the response:

```csharp
    private static OnboardingItemResponse Compose(OnboardingItemRow i, IReadOnlyList<ChecklistRow> checks)
    {
        var list = checks.Select(c => new OnboardingChecklistItem(c.Label, c.Done)).ToList();
        return new OnboardingItemResponse(i.Id, i.TenantId, i.Name, i.Slug, i.Owner, i.Value, i.Stage,
            list, list.Count(c => c.Done), i.Age,
            i.ContactName, i.ContactEmail, i.ContactPhone, i.Address);
    }
```

- [ ] **Step 7: Pass contact into the auto-created card (endpoint)**

In `src/Sms.Modules.Tenancy/ModuleEndpoints.cs`, update the onboarding create call inside `POST /clients` (currently lines 76-78):

```csharp
            // A new client enters the onboarding pipeline as a Trial card (with the default checklist).
            if (row is not null)
                await onboarding.CreateAsync(new CreateOnboardingRequest(
                    row.Name, row.Slug, row.Csm, row.Mrr, "trial",
                    req.AdminName, req.AdminEmail, req.AdminPhone, req.Address, row.Id));
```

- [ ] **Step 8: Run the new test to verify it passes**

Run: `dotnet test tests/Sms.Tests.Integration --filter Client_create_seeds_onboarding_card_with_contact`
Expected: PASS.

- [ ] **Step 9: Run the full Catre integration suite**

Run: `dotnet test tests/Sms.Tests.Integration --filter CatreClientsTests`
Expected: PASS (all facts).

- [ ] **Step 10: Commit (in sms-backend)**

```bash
git -C D:/SMS/sms-project/sms-backend add db/Sms.Migrations/M0047_Onboarding_Contact.cs src/Sms.Modules.Tenancy/Contracts/OpsContracts.cs src/Sms.Modules.Tenancy/Data/OnboardingRepository.cs src/Sms.Modules.Tenancy/ModuleEndpoints.cs tests/Sms.Tests.Integration/Catre/CatreClientsTests.cs
git -C D:/SMS/sms-project/sms-backend commit -m "feat(catre): carry contact details onto onboarding cards"
```

---

### Task 3: Frontend — types + contract keys

**Files:**
- Modify: `src/api/types.ts`
- Test: `src/api/types.test.ts`

**Interfaces:**
- Produces: `Client` and `OnboardingCard` each gain `contact_name`, `contact_email`, `contact_phone`, `address` (all `string | null`). `CONTRACT_KEYS.TENANT_KEYS` and `CONTRACT_KEYS.ONBOARDING_KEYS` include the new wire keys.

- [ ] **Step 1: Inspect the contract test to mirror its expectations**

Run: `cat src/api/types.test.ts`
Note how it asserts `CONTRACT_KEYS.TENANT_KEYS` / `ONBOARDING_KEYS` (it likely compares against an expected array). You will update both the source arrays and the test's expected arrays together.

- [ ] **Step 2: Write/adjust the failing test**

In `src/api/types.test.ts`, add the four keys to the expected `TENANT_KEYS` array and the four to the expected `ONBOARDING_KEYS` array (append `'contact_name','contact_email','contact_phone','address'` to each expected list, matching the test's existing structure).

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/api/types.test.ts`
Expected: FAIL — source `CONTRACT_KEYS` arrays don't yet contain the new keys.

- [ ] **Step 4: Update CONTRACT_KEYS**

In `src/api/types.ts`, in the `CONTRACT_KEYS` object, append to `TENANT_KEYS` and `ONBOARDING_KEYS`:

```ts
  TENANT_KEYS: ['id','name','slug','country','status','plan_id','plan_name','tier','mrr',
    'students_count','staff_count','storage_gb','limits','created','last_active_days',
    'trial_ends_days','contact','csm','health_score','gateway','usage_series',
    'contact_name','contact_email','contact_phone','address'],
```

```ts
  ONBOARDING_KEYS: ['id','name','value','owner','age','stage','checklist',
    'contact_name','contact_email','contact_phone','address'],
```

- [ ] **Step 5: Update the `Client` and `OnboardingCard` interfaces**

In `src/api/types.ts`, add to `interface Client` (after `gateway`/`usage_series`):

```ts
  contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; address: string | null;
```

Add to `interface OnboardingCard` (after `checklist`):

```ts
  contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; address: string | null;
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/api/types.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit (in sms-catreadmin)**

```bash
git -C D:/SMS/sms-project/sms-catreadmin add src/api/types.ts src/api/types.test.ts
git -C D:/SMS/sms-project/sms-catreadmin commit -m "feat(catreadmin): add contact fields to Client and OnboardingCard types"
```

---

### Task 4: Frontend — expandable contact row on Clients list

**Files:**
- Modify: `src/screens/ClientsScreen.tsx`
- Test: `src/screens/ClientsScreen.test.tsx`

**Interfaces:**
- Consumes: `Client.contact_name/contact_email/contact_phone/address` from Task 3.

- [ ] **Step 1: Write the failing test**

Replace the mocked client object in `src/screens/ClientsScreen.test.tsx` to include contact fields, and add a test that expanding the chevron reveals the email. New file contents:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientsScreen } from './ClientsScreen';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));
vi.mock('../api/hooks/useClients', () => ({
  useClients: () => ({
    isLoading: false, isError: false,
    data: { pages: [{ data: [{ id: 'c1', name: 'Greenwood High', status: 'active', tier: 'gold', plan_name: 'Gold', mrr: 50000, last_active_days: 1,
      contact_name: 'Priya Sharma', contact_email: 'admin@greenwood.edu.in', contact_phone: '+91 98200 11111', address: '12 MG Road, Mumbai' }], next_cursor: null }] },
    hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false,
  }),
}));

describe('ClientsScreen', () => {
  it('renders a client row from the first page', () => {
    render(<ClientsScreen />);
    expect(screen.getByText('Greenwood High')).toBeInTheDocument();
  });

  it('reveals contact details when the row chevron is clicked', async () => {
    render(<ClientsScreen />);
    expect(screen.queryByText('admin@greenwood.edu.in')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Show contact details'));
    expect(screen.getByText('admin@greenwood.edu.in')).toBeInTheDocument();
    expect(screen.getByText('+91 98200 11111')).toBeInTheDocument();
    expect(screen.getByText('12 MG Road, Mumbai')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/ClientsScreen.test.tsx`
Expected: FAIL — no element labelled "Show contact details".

- [ ] **Step 3: Add expand state**

In `src/screens/ClientsScreen.tsx`, add a state hook near the other `useState`s (after `const [page, setPage] = useState(1);`):

```tsx
  const [expandedId, setExpandedId] = useState<string | null>(null);
```

- [ ] **Step 4: Add a contact sub-row renderer**

Inside `ClientsScreen`, above the `return`, add a small helper component (uses existing `Icon`):

```tsx
  const ContactCell = ({ icon: I, value }: { icon: React.ComponentType<{ size?: number }>; value: string | null }) => (
    <span className="row gap6 tiny" style={{ color: value ? 'var(--text-2)' : 'var(--text-faint)' }}>
      <I size={13} />{value || '—'}
    </span>
  );
```

- [ ] **Step 5: Render the chevron + expandable row**

In the table body, change the per-client `return (...)` so the existing `<tr>` is wrapped in a fragment with an extra chevron cell and a following contact row. Replace the block starting at `return (` for each client (the `<tr key={c.id} ...>` element) with:

```tsx
                    return (
                      <React.Fragment key={c.id}>
                      <tr className="clickable" onClick={() => go('client', { id: c.id })}>
                        <td onClick={e => e.stopPropagation()} style={{ width: 28 }}>
                          <button
                            aria-label={expandedId === c.id ? 'Hide contact details' : 'Show contact details'}
                            onClick={() => setExpandedId(id => id === c.id ? null : c.id)}
                            style={{ display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
                            <Icon.chevRight size={14}
                              style={{ transform: expandedId === c.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                          </button>
                        </td>
                        <td>
                          <div className="row gap10" style={{ minWidth: 180 }}>
                            <Avatar name={c.name} size={30} square />
                            <div style={{ minWidth: 0 }}>
                              <div className="truncate" style={{ fontWeight: 600 }}>{c.name}</div>
                              {c.slug && <div className="tiny muted mono truncate">{c.slug}</div>}
                            </div>
                          </div>
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        <td><span className={tierBadgeCls(c.tier)}>{c.plan_name}</span></td>
                        <td className="num">{c.mrr ? fmt.money(c.mrr) : <span className="muted">—</span>}</td>
                        <td style={{ width: 150 }}>
                          <div style={{ width: 130 }}>
                            {limitStudents > 0
                              ? <UsageBar value={c.students_count ?? 0} limit={limitStudents} label="Students" />
                              : <span className="muted tiny">—</span>}
                          </div>
                        </td>
                        <td className="num muted tiny">{fmtDate(c.created)}</td>
                        <td className="tiny">
                          <span style={{ color: lastActiveColor(c.last_active_days) }}>{c.last_active_days}d ago</span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <Menu trigger={<Btn variant="ghost" size="sm" icon={Icon.moreH} />}>
                            <MenuItem icon={Icon.eye} onClick={() => go('client', { id: c.id })}>View details</MenuItem>
                            {can('clients.impersonate') && <MenuItem icon={Icon.login}>Impersonate</MenuItem>}
                            {can('billing.view') && <MenuItem icon={Icon.invoice} onClick={() => go('billing')}>View invoices</MenuItem>}
                          </Menu>
                        </td>
                      </tr>
                      {expandedId === c.id && (
                        <tr>
                          <td colSpan={9} style={{ background: 'var(--surface-2)' }}>
                            <div className="row gap16 fw" style={{ padding: '6px 8px' }}>
                              <ContactCell icon={Icon.user} value={c.contact_name} />
                              <ContactCell icon={Icon.phone} value={c.contact_phone} />
                              <ContactCell icon={Icon.mail} value={c.contact_email} />
                              <ContactCell icon={Icon.map} value={c.address} />
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
```

Then three small header/loading fixups for the new 9th column:
1. In `<thead>`, add a leading empty `<th style={{ width: 28 }}></th>` as the first child of the `<tr>`.
2. Change the loading skeleton `<SkeletonRows cols={8} rows={8} />` to `cols={9}`.
3. Bump the empty-state `<td colSpan={8}>` to `colSpan={9}`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/screens/ClientsScreen.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit (in sms-catreadmin)**

```bash
git -C D:/SMS/sms-project/sms-catreadmin add src/screens/ClientsScreen.tsx src/screens/ClientsScreen.test.tsx
git -C D:/SMS/sms-project/sms-catreadmin commit -m "feat(catreadmin): expandable contact row on clients list"
```

---

### Task 5: Frontend — Contact card on Client detail

**Files:**
- Modify: `src/screens/ClientDetailScreen.tsx`
- Test: `src/screens/ClientDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `Client.contact_name/contact_email/contact_phone/address` from Task 3.

- [ ] **Step 1: Write the failing test**

In `src/screens/ClientDetailScreen.test.tsx`, add the contact fields to the mocked `useClient` data (extend the existing `data` object):

```ts
    data: { id: 'c1', name: 'Greenwood High', status: 'active', plan_name: 'Gold', mrr: 50000,
      tier: 'gold', country: 'Mumbai, MH', contact: 'a@b.c', csm: 'Ravi', health_score: 88, plan_id: 'pl_gold',
      contact_name: 'Priya Sharma', contact_email: 'admin@greenwood.edu.in', contact_phone: '+91 98200 11111', address: '12 MG Road, Mumbai' } }),
```

Add a test:

```tsx
  it('renders the contact card with name, phone, email and address', () => {
    render(<NavCtx.Provider value={{ route: { name: 'client', params: { id: 'c1' } }, go: () => {} }}>
      <ToastCtx.Provider value={() => {}}><ClientDetailScreen /></ToastCtx.Provider></NavCtx.Provider>);
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('admin@greenwood.edu.in')).toBeInTheDocument();
    expect(screen.getByText('+91 98200 11111')).toBeInTheDocument();
    expect(screen.getByText('12 MG Road, Mumbai')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/ClientDetailScreen.test.tsx`
Expected: FAIL — contact values not in the document.

- [ ] **Step 3: Add the Contact card**

In `src/screens/ClientDetailScreen.tsx`, insert a Contact card between the KPI grid (`</div>` after the `kpi-grid`) and the Usage card. Add this block right after the closing `</div>` of the `kpi-grid`:

```tsx
            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Contact</b>
              <div className="row gap16 fw" style={{ marginTop: 10 }}>
                <ContactLine icon={Icon.user} value={detail.data.contact_name} />
                <ContactLine icon={Icon.phone} value={detail.data.contact_phone} href={detail.data.contact_phone ? `tel:${detail.data.contact_phone}` : undefined} />
                <ContactLine icon={Icon.mail} value={detail.data.contact_email} href={detail.data.contact_email ? `mailto:${detail.data.contact_email}` : undefined} />
                <ContactLine icon={Icon.map} value={detail.data.address} />
              </div>
            </div>
```

Then add this helper at the bottom of the file, next to `Stat`:

```tsx
function ContactLine({ icon: I, value, href }: { icon: React.ComponentType<{ size?: number }>; value: string | null; href?: string }) {
  const color = value ? 'var(--text-2)' : 'var(--text-faint)';
  const body = <span className="row gap6 tiny" style={{ color }}><I size={14} />{value || '—'}</span>;
  return href && value ? <a href={href} style={{ color }}>{body}</a> : body;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/screens/ClientDetailScreen.test.tsx`
Expected: PASS (all tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit (in sms-catreadmin)**

```bash
git -C D:/SMS/sms-project/sms-catreadmin add src/screens/ClientDetailScreen.tsx src/screens/ClientDetailScreen.test.tsx
git -C D:/SMS/sms-project/sms-catreadmin commit -m "feat(catreadmin): contact card on client detail screen"
```

---

### Task 6: Frontend — contact expander on onboarding cards

**Files:**
- Modify: `src/screens/OnboardingScreen.tsx`
- Test: `src/screens/OnboardingScreen.test.tsx`

**Interfaces:**
- Consumes: `OnboardingCard.contact_name/contact_email/contact_phone/address` from Task 3.

- [ ] **Step 1: Write the failing test**

In `src/screens/OnboardingScreen.test.tsx`, add the contact fields to the mocked card data and a test that the expander reveals them. Extend the mocked card object:

```ts
  { id: 'o1', name: 'Greenwood', value: 50000, owner: 'Ravi K', age: 3, stage: 'trial',
    checklist: [{ label: 'Kickoff', done: true }, { label: 'Import', done: false }],
    contact_name: 'Priya Sharma', contact_email: 'admin@greenwood.edu.in', contact_phone: '+91 98200 11111', address: '12 MG Road, Mumbai' },
```

Add this test (note: imports `userEvent`):

```tsx
  it('reveals contact details when the card Contact expander is clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    render(<NavCtx.Provider value={{ route: { name: 'onboarding', params: {} }, go: () => {} }}>
      <ToastCtx.Provider value={() => {}}><OnboardingScreen /></ToastCtx.Provider></NavCtx.Provider>);
    expect(screen.queryByText('admin@greenwood.edu.in')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Contact'));
    expect(screen.getByText('admin@greenwood.edu.in')).toBeInTheDocument();
    expect(screen.getByText('+91 98200 11111')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/OnboardingScreen.test.tsx`
Expected: FAIL — no "Contact" button / email not shown.

- [ ] **Step 3: Add contact expand state to the Card component**

In `src/screens/OnboardingScreen.tsx`, inside `function Card(...)`, add a state hook next to the existing `const [expand, setExpand] = useState(false);`:

```tsx
  const [showContact, setShowContact] = useState(false);
```

- [ ] **Step 4: Add the Contact expander + panel**

In `Card`, immediately before the final owner/age footer row (the `<div className="row jb" style={{ marginTop: 10, paddingTop: 8, ... }}>` block), insert:

```tsx
      <button
        className="row gap6 tiny muted"
        style={{ marginTop: 10, fontWeight: 600 }}
        onClick={() => setShowContact(s => !s)}
      >
        <Icon.user size={13} />
        Contact
        <Icon.chevDown size={12} style={{ transform: showContact ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {showContact && (
        <div className="fc gap2" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-soft)' }}>
          {([[Icon.user, card.contact_name], [Icon.phone, card.contact_phone], [Icon.mail, card.contact_email], [Icon.map, card.address]] as const).map(([I, v], k) => (
            <span key={k} className="row gap8 tiny" style={{ padding: '3px 4px', color: v ? 'var(--text-2)' : 'var(--text-faint)' }}>
              <I size={13} />{v || '—'}
            </span>
          ))}
        </div>
      )}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/screens/OnboardingScreen.test.tsx`
Expected: PASS (all tests).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Run the full frontend suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 8: Commit (in sms-catreadmin)**

```bash
git -C D:/SMS/sms-project/sms-catreadmin add src/screens/OnboardingScreen.tsx src/screens/OnboardingScreen.test.tsx
git -C D:/SMS/sms-project/sms-catreadmin commit -m "feat(catreadmin): contact expander on onboarding cards"
```

---

## Final verification

- [ ] **Backend full test pass**

Run: `dotnet test tests/Sms.Tests.Integration --filter CatreClientsTests` (from `D:/SMS/sms-project/sms-backend`)
Expected: PASS.

- [ ] **Frontend full test pass + typecheck**

Run (from `D:/SMS/sms-project/sms-catreadmin`): `npm run typecheck && npm run test`
Expected: PASS.

- [ ] **Manual smoke (both servers running)**

Restart the backend (so M0045/M0046 apply to the dev DB), reload the frontend, then: open Clients → click a row chevron → contact panel shows; open a client → Contact card shows; open Onboarding → click Contact on a card → details show. Newly created clients show their entered address.
