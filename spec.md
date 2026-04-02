# SWiSH SAFE-T

## Current State
New project — no existing application files. Building fresh from architecture document.

## Requested Changes (Diff)

### Add
- Full-stack ICP app: Motoko backend canister + React SPA frontend
- PWA configuration (manifest.json, service worker) for iPhone/Android install
- Brand colors: White (#FFFFFF), Grey (#808080), Green (#96BB1A)
- Generated SWiSH SAFE-T logo (user-uploaded logo not readable in session)

**Backend canister:**
- Stable storage for users, template blobs, audit blobs
- API: seedAppAdmin, upsertAppUser, listAppUsers, getAppUserPublic, verifyAppUserCredentials, appUserHasAdmin
- API: upsertTemplateBlob, getTemplateBlob, listTemplateBlobs
- API: upsertAuditBlob, getAuditBlob, listAuditBlobs
- Blob storage mixin for photo/file binaries (putFile, getDirectURL)
- Authorization mixin for RBAC

**Frontend routes & pages:**
- /login — LoginPage (public)
- /setup — SetupPage (public, first-time admin setup)
- /tasks — TaskListPage (all authenticated)
- /questionnaire/:siteId — QuestionnairePage (all roles)
- /clients — ClientsPage (all)
- /clients/:clientId/sites — SitesPage (all)
- /config/:clientId — ConfigPage (Admin, Manager)
- /templates — TemplatePage (Admin, Manager)
- /admin — AdminPage (Admin, Manager)
- /dashboard — DashboardPage (all)

**State management:**
- AuthContext (session, login, logout, refresh)
- lib/dataStore.ts — localStorage CRUD for users, clients, sites, templates, audits
- lib/backendSync.ts — push/pull templates and audits to/from canister
- lib/backendUserService.ts — push/pull users to/from canister
- lib/session.ts — sessionStorage-backed login session

**RBAC roles:** Admin, Manager, Reviewer, Auditor
- Temporary Admin: 24-hour elevation, auto-reverts

**Audit workflow:**
- Draft → Pending Review → Pending Approval → Completed
- Rejection path: Pending Approval → Returned for Correction → Pending Approval
- Admin can always edit/complete regardless of status

**Questionnaire/Form engine:**
- Template → Sections → Questions (radio or dropdown)
- Mandatory Remarks + optional image per question
- Critical Observations panel per section
- Power Supply Details table (3in3out / 3in1out / 1in1out)
- Photographs section (auto-generated last section)
- Auto-save with 5-second debounce
- Sections collapsed by default, only open section renders

**Photo storage:**
- Upload via blob storage → returns hash stored in audit JSON
- Display via getFileUrl(hash) → CDN URL → lazy-loaded img

**Export system:**
- Excel: CSV export (lib/exportExcel.ts)
- Word: .docx export using docx npm library (lib/exportWord.ts)
- Word includes: cover page, per-section tables, photo pages (3/row with captions), logo, site details, rejection note
- Available to Reviewer, Manager, Admin on submitted audits only

**Seed data:**
- Admin user: APA_Arun (seeded on first load)
- Sample clients, sites, and a sample safety inspection template

### Modify
- None (new project)

### Remove
- None (new project)

## Implementation Plan
1. Select Caffeine components: authorization, blob-storage
2. Generate Motoko backend with stable storage for users/templates/audits, full API surface, seeding logic
3. Generate SWiSH SAFE-T logo (green/grey/white brand)
4. Build frontend:
   a. PWA manifest + service worker
   b. Tailwind config with brand tokens (green #96BB1A, grey #808080, white #FFFFFF)
   c. AuthContext, session.ts, dataStore.ts, backendSync.ts, backendUserService.ts
   d. All 10 pages with correct route guards per role
   e. Questionnaire engine with full section/question/observation/power supply rendering
   f. Photo upload + lazy display
   g. Export: CSV (Excel) and Word (.docx)
   h. Seed data: APA_Arun admin + sample clients/sites/template
