# SWiSH SAFE-T

## Current State
- `main.tsx` still wraps App in `InternetIdentityProvider` despite multiple claimed removals
- `useInternetIdentity.ts` is the full live DFINITY auth-client implementation (imports `AuthClient`, `DelegationIdentity`, etc.) — this causes an infinite `useEffect` re-render loop → blank screen
- `@dfinity/auth-client` is still in `package.json` dependencies
- `useActor.ts` calls `useInternetIdentity()` and `_initializeAccessControlWithSecret` (doesn't exist on backend)
- Backend sync `upsertTemplate` calls fail with `[BackendSync] Failed to flush op` — data stays local only and disappears in new tabs
- No manual sync/refresh button exists on any page
- No template export/import functionality

## Requested Changes (Diff)

### Add
- `SyncButton` shared component: triggers push-then-pull, shows spinner during sync, shows "Last synced at HH:MM" timestamp after
- Sync button to page headers of: Dashboard, Clients, Profile, Templates, Admin
- Sync error badge on templates list when a template has a pending sync op
- Template export: JSON, Excel (.xlsx via SheetJS/manual CSV), Word (.docx), PDF (via browser print/jsPDF)
- Template import: Admin and Manager only; file picker accepts JSON; name conflict prompts overwrite or save as copy

### Modify
- `main.tsx`: remove `InternetIdentityProvider` import and usage entirely — render `<App />` directly
- `useInternetIdentity.ts`: replace with a zero-import no-op stub (no `@dfinity` imports at all)
- `useActor.ts`: remove `useInternetIdentity` import and `_initializeAccessControlWithSecret` call
- `package.json`: remove `@dfinity/auth-client` from dependencies
- `backendSync.ts`: improve error logging to surface actual error message from canister; ensure actor reset on every failure
- All 5 page headers: add SyncButton

### Remove
- `InternetIdentityProvider` wrapper from `main.tsx`
- All `@dfinity/auth-client` imports from `useInternetIdentity.ts`

## Implementation Plan
1. Rewrite `useInternetIdentity.ts` as a true zero-import no-op
2. Rewrite `main.tsx` without `InternetIdentityProvider`
3. Fix `useActor.ts` to not use II
4. Remove `@dfinity/auth-client` from `package.json`
5. Improve error logging in `backendSync.ts`
6. Create `SyncButton` component with spinner + last-synced timestamp
7. Add `SyncButton` to all 5 page headers
8. Add sync error badge to unsynced templates
9. Add template export (JSON, Excel, Word, PDF) and import to TemplatePage
10. Validate build
