# SentinelDMS — Frontend

Role-based frontend for SentinelDMS, built per the working doc: React 18 + TypeScript (Vite), Redux Toolkit (auth/session), React Query (server data), MUI + Tailwind, React Router v6, Recharts.

## Status
**Pure frontend — no backend connected.** Every screen runs on realistic mock data in `src/mocks/data.ts`, served through a service layer (`src/services/`) that mirrors what Balavignesh's real API will look like.

## Run it
```bash
npm install
npm run dev
```
Open the printed local URL. On the login screen, any email/password works — pick a **demo role** (Officer / Judge / Forensic / Admin) to see how the sidebar and dashboard change per role. MFA step accepts any 6 digits.

## Switching to the real backend
Each file in `src/services/` has a `USE_MOCKS` flag (from `src/services/delay.ts`). Once Balavignesh's `/api-docs` is live:
1. Set `VITE_API_BASE_URL` in a `.env` file to the real base URL.
2. Flip `USE_MOCKS` to `false` (or wire it per-service as endpoints come online).
3. The `api` axios instance (`src/services/axiosInstance.ts`) already attaches the JWT and redirects to `/login` on 401 — no changes needed there.
4. Confirm response shapes against `src/types/index.ts` and adjust if Balavignesh's DTOs differ.

## Screens implemented
- Login / MFA (2-step, role picker for demo purposes)
- Dashboard (role-aware: Admin sees system-wide stats, others see their own)
- Document Upload (drag-and-drop, mock classification + override)
- Document Search / List (keyword + status + type filters)
- Document Detail / Viewer (blockchain verify, sign, version history, audit trail — the "trust showcase" screen)
- Case Management (list, create, detail with linked documents + status control)
- Audit & Compliance Dashboard (Recharts line/bar charts, filterable log, export button stub)
- User & Role Management (Admin only — invite, role assignment, MFA reset)
- Floating AI Assistant widget (mock responses with source citation chips)
- Notifications panel (bell icon, unread count, mark-as-read)

## Design system
This build includes a complete, custom design system — grounded in what SentinelDMS actually is: a chain-of-custody evidence and case-file registry, not a generic SaaS dashboard.

**Color** (`src/theme.ts`):
- `ink` `#10192B` — official navy-black (sidebar, hero panel)
- `paper` `#F2F1E8` — ledger/bond-paper background
- `registry` `#24365C` — judicial indigo, all primary actions/links/active nav
- `seal` `#9C7A3E` — brass/bronze, reserved *only* for the verification/trust motif (see below) — not used for general UI
- Status colors (badges only): `verified` forest green, `tampered` brick red, `pending` ochre, `unsigned` slate

**Type**: Fraunces (serif, page titles & dialog headings) + IBM Plex Sans (UI/body) + IBM Plex Mono (case IDs, hashes, timestamps).

**Signature element**: a custom seal/rosette mark (`src/components/Seal.tsx`) used only where the product is actually asserting trust — the login hero panel, the Verified status badge, and the Blockchain Integrity card on Document Detail. Everywhere else stays plain and functional on purpose.

**Login page** is the one "hero" screen: a split layout with a dark ledger-lined registry panel (large seal mark, mission statement) beside a plain paper-toned sign-in form.

## Quality & polish
- **Loading states**: every data-fetching screen shows skeleton placeholders (`src/components/Skeletons.tsx`) instead of plain "Loading…" text.
- **Error states**: failed queries show a retry-capable error panel (`src/components/ErrorState.tsx`); unexpected render errors are caught app-wide by `src/components/AppErrorBoundary.tsx`.
- **Empty states**: zero-result tables/lists show a proper empty state (`src/components/EmptyState.tsx`) instead of a blank table.
- **Code-splitting**: every route is lazy-loaded (`React.lazy` + `Suspense` in `App.tsx`), and vendor libraries (MUI, Recharts, React Query/Redux) are split into separate chunks via `vite.config.ts` — the login screen no longer waits on the whole app bundle (including Recharts) to load.
- **Responsive**: the sidebar becomes a slide-in drawer with a hamburger trigger below the `md` breakpoint instead of staying permanently docked; the top bar search field, the AI assistant widget, and every data table adapt down to small phone widths.
- **Tests**: a Vitest + React Testing Library suite (`src/test/`) covers the auth slice, role-based nav config, the `StatusBadge` and `Seal` components, and an app-level smoke test (unauthenticated → redirected to login). Run with `npm test`.

## Known placeholders (by design, per the working doc)
- **Document preview pane** renders a simulated typed page (deterministic per document, with page navigation) since there's no real file storage yet — swap for an actual PDF/image renderer once backend file storage is connected.
- File upload now validates type (PDF/JPG/PNG/TIFF) and a 25 MB size cap client-side, with a real percentage progress bar.
- Documents screen supports keyword vs. semantic search mode toggle, full filter set (status, type, case, uploader, date range), and a list/grid view toggle.
- Audit & Compliance page filters by role, action type, and date range, and "Export Report" downloads a real CSV of the filtered rows.
- Document Detail has a distinct "Who viewed / edited" audit trail panel separate from version history.

