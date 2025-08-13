# BarnLabs Enhancements Plan (v1)

## Goals

- Eliminate auth redirect loops and harden session/role handling
- Ship reliable AR/VR across iOS/Android with clear fallbacks and guidance
- Improve dashboard UX (layout, editing, assets) and admin/employee workflows
- Tighten DX, testing, and performance for production readiness (mobile and desktop)

## Known Issues and Pain Points

- Auth loop: navigating to `/admin` sometimes bounces back to sign-in
- Mixed server/client usage in tRPC + RSC can cause context/session mismatch
- Upload flow lacks progressive feedback for large files (up to 500 MB)
- Model viewer lacks robust error states, fallback poster, and performance presets
- Inconsistent UI polish and accessibility gaps (focus order, ARIA, contrast)
- Sparse test coverage; no end-to-end coverage for critical flows
- Limited observability (no error tracking, minimal structured logs)

## Proposed Improvements

### 1) Authentication, Authorization, and Bootstrap

- Remove server-side bootstrap call from `admin` layout; do session check server-side only and run bootstrap detection client-side to avoid RSC races
- Normalize auth config (JWT session, `trustHost`, cookie settings); require `NEXTAUTH_URL` to match the actual dev URL (e.g., http://localhost:3001)
- Add protected server helpers: `getRequiredSession()` and `getRequiredRole("ADMIN" | "EMPLOYEE")`
- Implement dedicated admin bootstrap page with clearer copy and rate limiting
- Roles: `USER`, `EMPLOYEE`, `ADMIN`. Employees can create users, reset passwords, and assist with dashboards

### 2) AR/VR + 3D Pipeline

- iOS: USDZ Quick Look (`rel="ar"`) with poster and alt text; HEAD-check MIME before linking
- Android: Scene Viewer intent URL with robust deep link and web fallback (no raw download)
- VR: Replace basic page with improved 360/Orbit viewer + WebXR controls, quality presets, loader
- Conversion policy: client-side conversion only for very small models (< 25 MB); for larger models, request users upload the corresponding GLB/USDZ pair and link them
- Model viewer: quality toggle, ambient occlusion, optional shadows, background presets
- Error boundaries and user-friendly fallback UI if model fails to load

### 3) Uploads and Assets

- UploadThing: chunked uploads with progress, retries, and cancel; increase limit to ~300 MB
- Client-side preflight (type/size checks, USDZ pairing guidance for large GLB)
- Image optimization for dashboard logos (transforms, size caps)
- Per-user scoping: users can only access their own uploads; admins can access all; employees follow elevated permissions to assist users
- Optional malware scanning hook via webhook or third-party

### 4) Dashboard & Share Pages

- Dashboard editor: keyboard-accessible drag, snap-to-grid, duplicate/delete
- Card library: Model, Video, PDF, Markdown, Image; consistent props schema
- Live preview with sanitized markdown; theme presets and per-card backgrounds
- Share pages: creator branding, theme, custom slug, social meta tags
- QR section: download QR image, selectable sizes, dark/light variants

### 5) Admin/Employee Experience

- Stats: system health, recent sign-ins, uploads, conversions
- User editor: search, filters, role toggle, password reset trigger
- Employee tools: create users, assist with dashboard setup, trigger password resets
- Resource manager: batch actions, previews, link GLB↔USDZ pairs
- Audit log: who did what and when (user updates, role changes, shares)

### 6) Performance & Accessibility

- Lighthouse/AXE budget; fix headings, landmarks, focus styles, contrast
- Preload critical fonts; defer non-critical scripts; image/component lazy-load
- Cache and CDN policies for static assets (GLB/USDZ with immutable hashes)

### 7) Observability & Ops

- Defer Sentry until core features are stable; keep source maps ready
- Structured logging (request ids, procedure timings, error metadata)
- Health endpoint and simple feature flags

### 8) Testing & CI/CD

- Unit: routers (auth, model, share), upload callbacks
- Component: model viewer error/loader states; dashboard cards
- E2E (Playwright): sign-in, admin bootstrap, upload, share page
- CI: lint, typecheck, unit, E2E (preview URL), Vercel deploy with checks

## Quick Wins (1–2 weeks)

- Fix auth loop: remove server bootstrap call; add `NEXTAUTH_URL`; unify cookie/session settings
- Improve AR: iOS Quick Look and Android Scene Viewer intent with fallbacks; no downloads
- Add model viewer error boundary/poster; loading skeletons
- Upload progress UI with cancel/retry; raise practical limit toward ~300 MB
- Basic Playwright smoke tests for sign-in, admin bootstrap, upload, share page

## Medium-term (2–4 weeks)

- Conversion job + progress; admin resource manager upgrades
- Dashboard card library polish; keyboard accessibility and layout persistence
- Share pages with custom slugs and better meta/OG tags

## Longer-term (4–8 weeks)

- Audit log, impersonation, rate limiting and security hardening
- Feature flags; multi-tenant readiness; i18n groundwork

## Acceptance Criteria (selected)

- Navigating to `/admin` when unauthenticated always lands on `/auth/signin` and returns to `/admin` post-login
- Uploads up to ~300 MB reliably show progress and error recovery
- iOS and Android AR launch correctly for the demo Earth model and uploaded assets
- At least 10 core E2E tests are green in CI; no unhandled errors in normal flows

## Risks & Mitigations

- Library type mismatches (React 19, drei/three): pin versions; add shims sparingly
- Large file handling: ensure chunking, timeouts, and CDN tuning
- Conversion pipeline cost/latency: make opt-in; queue + retries

## Decisions Captured

- Branding later; focus on core functionality first
- Conversion: only for very small models (< 25 MB). For larger, request corresponding USDZ/GLB upload and link
- Upload size target: ~300 MB per file (customer models up to ~275 MB)
- Emails: unbranded for now; make the sender clear
- Roles: `USER`, `EMPLOYEE`, `ADMIN`. Employees can create users and help with dashboards and passwords
- Access control: strict per-user scoping; admins access all; employees have elevated assistance permissions
- Analytics: minimal initial events (uploads, AR opens, share views) to be defined later
- Language: English only for now
- Optimization focus: performance across mobile and desktop; improve VR/AR experience
- Error tracking: add later after core roles/dashboards/viewers are complete
- Conversion: prefer client-side for tiny models; add a self-hosting guide for server conversion
- VR: move toward a richer WebXR experience with mobile headset compatibility

## Next Steps

- Confirm answers to Open Questions
- Lock a 2–4 week milestone scope from Quick Wins + Medium-term
- Create issues per task; wire CI for tests; begin incremental delivery
