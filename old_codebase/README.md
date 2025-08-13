# Barn Labs Landing Page

## Development

- Install: `npm install`
- Run (frontend + worker): `npm run dev`
## Debugger (Python)

- See `debugger/README.md` for detailed instructions.
- Quick run (local Worker at 127.0.0.1:8787):

```
pip install -r debugger/requirements.txt
python debugger/run_checks.py
```

- Machine-readable JSON:

```
BARN_JSON=1 python debugger/run_checks.py
```


The dev server proxies `/api` to the local Worker at `http://127.0.0.1:8787`.

## Environment

Cloudflare Wrangler is configured via `wrangler.toml`.

- D1: `DB`
- R2: `ASSETS`
- KV: `LOGS`

Non-secret vars are under `[vars]`. Secrets should be set with Wrangler:

```bash
wrangler secret put JWT_SECRET
wrangler secret put RESEND_API_KEY
```

## Initial Admin Setup

1. Start the stack and visit `/setup`.
2. Click “Send Setup Code” to email a one-time code to `projectbarnlab@gmail.com`.
3. Enter username, password, and the code to create the first admin.

Setup is only allowed when no users exist.

## Auth

- Login: `POST /api/login` with `{ identifier, password }` where identifier is username or email.
- Protected routes use Bearer JWT in `Authorization`.

## Emails

Resend is used for password resets and admin setup code when `RESEND_API_KEY` is present. In development, tokens/codes log to console.

## Storage, URLs, and Uploads (Updated)

- Preferred URL scheme: always reference assets using the Worker proxy: `/model/{r2_key}`. This ensures auth, caching, and correct content-types in all environments.
- Public bucket domain (optional): `https://bucket1.barnlabs.net`.
  - This is exposed as `PUBLIC_BUCKET_BASE_URL` in `wrangler.toml` for reference, but the app uses the `/model/{key}` proxy by default.

### Upload flows
- Small files (<= ~95MB user, <= 25MB admin UI threshold): uploaded via a standard POST form to the Worker, streamed directly to R2.
  - Endpoints: `/api/user/asset/upload`, `/api/admin/upload`
- Large files: use R2 Multipart Upload (MPU) for reliability and low memory usage.
  - Admin endpoints:
    - `POST /api/admin/mpu/create` → `{ key, uploadId }`
    - `PUT  /api/admin/mpu/uploadpart?key=...&uploadId=...&partNumber=N` (body is chunk)
    - `POST /api/admin/mpu/complete` with `{ key, uploadId, parts, originalName, size }`
  - User endpoints:
    - `POST /api/user/mpu/create` → `{ key, uploadId }`
    - `PUT  /api/user/mpu/uploadpart?key=...&uploadId=...&partNumber=N`
    - `POST /api/user/mpu/complete` with `{ key, uploadId, parts, originalName, size }`

### Manual uploads to the bucket
- If files are added directly to the bucket (outside the app), use:
  - `GET /api/admin/sync-assets` (Admin → Assets → "Sync from R2 (Import Missing)")
- The sync job scans R2, inserts any missing rows into D1, and keeps URLs consistent (`/model/{r2_key}`).

### Model access and security
- The viewer and dashboard resolve GLB via `/model/{key}`; the Worker proxies and enforces access:
  - Authenticated access: via bearer token (`/dashboard/:username`, admin).
  - Public share access: referer check from `/share/:id` for the same user.
  - Short-lived signed URL tokens are generated server-side for loaders that cannot attach Authorization.
  
### AR/VR
- AR uses Google ARCore Scene Viewer and WebXR; GLB works on Android and iOS (via Google app) without USDZ.
- VR uses WebXR; Meta Quest (Oculus Browser) supported, mobile Safari VR support varies.

### Share pages
- Create share: `POST /api/user/share` (saves a snapshot of the user's dashboard content and metadata).
- Delete share: `DELETE /api/user/share/:id` (owner only).
- Public fetch: `GET /api/share/:id`.

### Environment
- `wrangler.toml` includes:
  - `ASSETS` (R2 bucket binding), `DB` (D1), `LOGS` (KV)
  - `PUBLIC_BUCKET_BASE_URL = "https://bucket1.barnlabs.net"`
  - All assets are still served via `/model/{key}` by default.

### Reliability notes
- Large files use MPU with 10MB parts to avoid Worker memory pressure and request timeouts.
- All URLs shown in dashboards, admin, and shares are `/model/{key}` to ensure consistent behavior, correct headers, and caching.
- Manual bucket uploads are supported via the sync endpoint.

## Production Checklist
- Configure Cloudflare bindings in `wrangler.toml` (D1, R2, KV) and set secrets:
  - `CLOUDFLARE_TOKEN` (Account-scoped, minimal permissions)
  - `JWT_SECRET`
  - Optional: `FEATURED_ASSET_KEY`
- Build and deploy:
  - `npm ci`
  - `npm run build`
  - `npm run deploy`
- Verify admin Settings tab shows green checks for required secrets and bindings.
- Test uploads (presigned and direct) with large GLB/USdz; confirm DB entries and `/model/...` access.

See `CODEBASE_OVERVIEW.md` for architecture details.
