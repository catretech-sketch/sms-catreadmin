# Contact details on Clients & Onboarding lists — design

**Date:** 2026-06-23
**Status:** Approved (pending spec review)
**Repos touched:** `sms-backend` (data + API), `sms-catreadmin` (types + UI)

## Goal

Surface per-entry contact information — **contact name, phone number, email,
and postal address** — on both the **Clients list** and the **Onboarding
pipeline**, backed by real data end-to-end.

## Current state (why this is full-stack)

- `Tenants` already stores `ContactName`, `ContactEmail`, `ContactPhone`, but the
  client list query (`ClientRepository.Cols`) never selects them, and they are
  absent from `ClientResponse`. **Address is not stored at all.**
- The **OnboardWizard already collects an address** and sends it in the create
  body, but the backend `CreateClientRequest`/`Client_Create` drop it silently —
  a latent data-loss bug this work fixes.
- `OnboardingItems` has **no contact columns**. It has a nullable `TenantId`.
  Cards are created two ways: backfilled from tenants (M0038) and auto-created
  when a client is created (`ModuleEndpoints.cs` POST `/clients` →
  `onboarding.CreateAsync`). Both paths carry a `TenantId`.
- The frontend talks to the backend directly in snake_case (no adapter layer in
  `sms-catreadmin`), so adding a field = backend DTO + frontend type + display.

## Decisions

- **Onboarding contact source:** OnboardingItems gets its **own** contact columns
  (not a JOIN). Populated from the linked tenant at card-create time and via a
  one-time backfill for existing cards. Chosen so onboarding contacts are
  self-contained and survive even if a card is ever de-linked from a tenant.
- **Clients row interaction:** add a dedicated **expand chevron** that toggles a
  contact panel. The rest of the row keeps its current behavior (navigate to
  client detail). No regression to existing navigation.
- **No new "create onboarding" UI** (YAGNI). Cards still originate from
  client-create + backfill.

## Backend design (`sms-backend`)

### Migrations

- **`M0045_Tenant_Address`** — `Alter.Table("Tenants").AddColumn("Address").AsString(300).Nullable()`.
- **`M0046_Onboarding_Contact`** — add to `OnboardingItems`:
  `ContactName(200)`, `ContactEmail(256)`, `ContactPhone(40)`, `Address(300)`,
  all nullable. Then backfill existing rows from the linked tenant:

  ```sql
  UPDATE o SET o.ContactName = t.ContactName, o.ContactEmail = t.ContactEmail,
               o.ContactPhone = t.ContactPhone, o.Address = t.Address
  FROM dbo.OnboardingItems o
  JOIN dbo.Tenants t ON t.Id = o.TenantId
  WHERE o.TenantId IS NOT NULL;
  ```
  Re-apply the updated catre-ops + catre procs so already-migrated DBs pick up
  the new proc signatures (follow the M0038 `EmbeddedProcs` pattern).

### Stored procs

- **`Client_Create.sql`** — add `@Address nvarchar(300)`; include `Address` in the
  `INSERT`; add `ContactName, ContactEmail, ContactPhone, Address` to the final
  `SELECT`.
- **`Onboarding_Create.sql`** — add `@ContactName/@ContactEmail/@ContactPhone/@Address`;
  include them in the `INSERT`.

### Contracts (`CatreContracts.cs`, `OpsContracts.cs`)

- `ClientRow` + `ClientResponse`: add `string? ContactName, string? ContactEmail,
  string? ContactPhone, string? Address`.
- `CreateClientRequest`: add `string? Address`.
- `CatreMappers.ToResponse(ClientRow)`: map the 4 new fields.
- `OnboardingItemRow` + `OnboardingItemResponse`: add the same 4 nullable fields.
- `CreateOnboardingRequest`: add the 4 nullable fields **before** the existing
  optional `TenantId = null` parameter (C# requires defaulted params last), and
  update the single call site in `ModuleEndpoints` accordingly.
- `OnboardingRepository.Compose`: thread the 4 fields into the response.

### Repositories & endpoints

- `ClientRepository.Cols`: append `ContactName, ContactEmail, ContactPhone, Address`.
  `CreateAsync`: pass `Address = r.Address`.
- `OnboardingRepository.ListAsync`/`GetAsync`: select the 4 new columns.
- `ModuleEndpoints` POST `/clients`: the auto-created onboarding card passes the
  tenant's contact fields (`req.AdminName, req.AdminEmail, req.AdminPhone,
  req.Address`) into `CreateOnboardingRequest`.

JSON serialization is snake_case (`SnakeCaseNamingPolicy`), so the wire fields are
`contact_name`, `contact_email`, `contact_phone`, `address`.

## Frontend design (`sms-catreadmin`)

### Types (`api/types.ts`)

- `Client`: add `contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; address: string | null`. The dead `contact:
  string` field — never populated by the live backend — is **left as-is** to
  avoid churn (not removed in this change).
- `OnboardingCard`: add the same four fields.
- `CONTRACT_KEYS.TENANT_KEYS`: add `contact_name, contact_email, contact_phone,
  address`. `CONTRACT_KEYS.ONBOARDING_KEYS`: add the same four.
- Update `types.test.ts` expectations accordingly.

### ClientsScreen (`screens/ClientsScreen.tsx`)

- Add a leading or trailing **chevron button** cell per row. Local state
  `expandedId: string | null`; clicking the chevron toggles it (and
  `stopPropagation` so the row's navigate-on-click is not triggered).
- When expanded, render a full-width sub-row (`<tr><td colSpan=…>`) with a compact
  contact panel: **name · phone · email · address**, each with its icon, and a
  graceful "—" when null.

### OnboardingScreen (`screens/OnboardingScreen.tsx`)

- In `Card`, add a second expander button ("Contact") beside the existing
  checklist expander, with its own local expand state. Expanded panel shows the
  four fields (icons + "—" fallbacks), styled like the existing checklist panel.

## Error handling / edge cases

- All four fields are nullable everywhere; UI renders "—" for missing values.
- Leads/cards without contact data (pre-backfill or null tenant) simply show "—".
- No new validation: address remains optional in the wizard (already the case).

## Testing

- **Backend:** repository/endpoint tests assert the new fields round-trip on
  client create (incl. address) and that the onboarding card created on
  client-create carries the contact fields. Migration applies cleanly.
- **Frontend:** `types.test.ts` contract-key check; `ClientsScreen.test.tsx`
  asserts chevron toggles the contact panel and row click still navigates;
  `OnboardingScreen.test.tsx` asserts the contact expander renders the fields and
  "—" fallbacks.

## Out of scope

- A dedicated "create onboarding card" UI.
- Editing contact details from the list (display only for now).
- Address validation / structured address fields (single free-text line).
