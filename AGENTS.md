# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

**66 Vizite** — a Turkish-language web app (vehicle QR "visit card" service). Users register, add vehicles, and generate QR codes that let anyone who scans the code reach the vehicle owner (call / WhatsApp / SMS) without exposing their phone number. All UI text, user-facing messages, and comments are **Turkish (UTF-8)** — keep new strings Turkish unless told otherwise.

Stack: plain **PHP 8 backend** + **vanilla HTML/CSS/JS frontend**. No Composer, no npm, no frameworks, no build step, no tests, no linters, no CI. SQLite via PDO is the only store. Target deployment is **shared hosting (Apache + `.htaccess`)**; Docker is local-testing-only via `baslat.sh`.

## Running the App

```bash
./baslat.sh          # Docker tabanli (tek dosyada tanimli; acik sunucuyu kapatip yeniden baslatir)
./baslat.sh dur       # stop / durum / log komutlari da vardir
php -S 0.0.0.0:8000 -t frontend backend/router.php   # Docker'siz altarnatif
```

- `baslat.bat` remains the Windows launcher (probes Laragon/XAMPP).
- On shared hosting, `.htaccess` (repo root) routes `/api/*` → `backend/api/index.php` and serves everything else from `frontend/`. **There is exactly ONE route table: `$routes` in `backend/api/index.php`.** `router.php` (built-in dev server) delegates all `/api/*` to it; adding an API endpoint means adding one line there plus the PHP file — nothing else.
- Binding to `0.0.0.0` is intentional: phones on the LAN must be able to open scanned QR URLs.
- Requires PHP >= 8.0 (`str_starts_with` era; dev uses 8.3), `pdo_sqlite`, standard `session`. `mail()` is used only for password-reset on the hosting target (returns false in containers — that's expected in dev).

## Architecture

### Auth (server-side, session-based)

- `backend/auth.php` is the auth core: `ensure_session()` (HttpOnly + SameSite=Lax cookie, named `vizite_session`), `current_user()`, `require_user()` (401 JSON), `require_admin()` (403 JSON), `login_session()`, `logout_session()`, plus shared helpers `json_response()`, `read_json_body()`, `rate_limit($scope,$max,$window)` and `handle_api_error()` (logs details via `error_log`, returns a **generic** 500 message — never leak `$e->getMessage()` to clients).
- **No client-trust anymore:** endpoints never act on a client-supplied `user_id`. The only exception: `/api/user/update-plan` accepts `user_id` **only when the session user is an admin** (used by the admin panel).
- Registration hard-codes `role='user'` and `plan='free'` server-side; role changes happen only via admin panel/SQL. Login/register are rate-limited per IP (`login_attempts` table, hashed key).
- **Passwords**: bcrypt via `password_hash()` on register/profile-change. `authenticateUser()` still falls back to legacy PBKDF2-SHA512 (100k it., 128 len, `salt` column) via `hash_equals()` so old accounts keep working — keep both paths. Users 1..N in the committed DB may use either.
- Password reset: `POST /api/auth/forgot` (always the same generic response; creates single-use SHA-256-hashed token in `password_resets`, 1h TTL) → link to `frontend/sifre_sifirla.html?token=...` → `POST /api/auth/reset`.

### Routing

- `/api/*` → single route table (see above). Everything else resolves to a file in `frontend/` (dev router serves with `-t frontend` docroot; Apache rewrites `^(.*)$ frontend/$1` when the file doesn't exist at the root; DirectoryIndex is `frontend/index.html`). No auto-discovery is possible in either engine.
- `.htaccess` also `RewriteRule ^backend(/|$) - [F]` and denies `*.db`, `*.sql`, `*.log`, `*.md` — never put secrets in `backend/` without adding deny rules.

### Data layer (backend/database/)

- `db.php` is the **only** data layer (PDO + SQLite). `getDbConnection()` is a per-request static singleton; it applies `schema.sql` (all `CREATE ... IF NOT EXISTS`) on first connect — schema changes must stay idempotent **and** tolerate the committed `.db` file's existing rows (e.g. the duplicate `TEST123` plates predate the per-user plate-uniqueness API check; no UNIQUE index was added for that reason).
- `PRAGMA foreign_keys = ON` per connection. Cascades: users→vehicles→qr_codes (DELETE CASCADE), purchases→qr_codes (SET NULL).
- Timestamps: SQLite `CURRENT_TIMESTAMP` is **UTC**; any PHP-computed datetime stored for comparison must use `gmdate()`.
- Rate-limit counters live in `login_attempts` (hash of scope+IP), cleaned opportunistically.

### API endpoint pattern

Every endpoint file: `declare(strict_types=1);` → `require_once __DIR__ . '/../auth.php';` (which pulls db.php; `/../../auth.php` from `api/auth/`) → method checks → `try { ... } catch (InvalidArgumentException $e) { json_response([...],400/401); } catch (Throwable $e) { handle_api_error(...); }`.

Conventions:

- **Response envelope**: `{ success: bool, message: string, ...payload }`. Frontend checks `result.success` and alerts `result.message`. HTTP codes: 200/201 create, 400 validation, 401 unauthenticated (or wrong current password), 403 non-admin, 404 not-owned/missing (also used for "changed 0 rows"), 405 wrong method, 429 rate-limited.
- **Input parsing**: `read_json_body()` (JSON body with `$_POST` fallback). **Field aliasing is pervasive**: snake_case/camelCase both accepted (`vehicle_id`/`vehicleId`, `plateNumber`/`plate_number`, plus Turkish fallbacks `telefon`, `mesaj`). Frontend reads responses with the same duality. Preserve it.
- **Ownership**: mutations affecting vehicles/QR rows must filter `user_id` in SQL (see `setQrActive`, `deleteQrCodeByOwner`, `rotateQrToken`) and check `rowCount()`; missing rows → 404, not success-with-no-op.
- **Error messages are user-facing Turkish strings** thrown as `InvalidArgumentException` from db.php.

### Domain flow (users → vehicles → purchases → qr_codes)

1. `POST /api/auth/register` (auto-login session) / `POST /api/auth/login` → user object; frontend stores it in `localStorage` **for UI display only** — authority is the session cookie.
2. `POST /api/vehicles` — per-user plate uniqueness is enforced at API level (`findVehicleByPlate`); 20-char limit on plates.
3. Plan gating is client-side BUT `/api/user/update-plan` validates `plan ∈ free|pro|business`; it upgrades **only when the plan actually changes** (`changed:true/false`) and writes one 299.00 'completed' purchase row per real change. No payment provider exists (mock purchase).
4. `POST /api/qr-codes` — ownership-checked vehicle; auto-links latest completed purchase; QR lifecycle: `PATCH /api/qr-codes {id, action:'toggle', is_active}` / `{action:'rotate'}` (new token, old printed cards die), `DELETE /api/qr-codes {id}`.
5. `GET /api/qr?token=...` — **public**, resolves only `is_active = 1` rows, increments `scan_count`, and returns the post-increment row.
6. `GET /api/dashboard` — one-shot aggregator (user + vehicles + purchases + qrCodes + `lanUrl`).
7. Admin: `GET /api/admin/users` (stats + user list), `POST /api/admin/users {action:'update'|'delete', user_id, role?, plan_tier?}` — cannot demote or delete self.

### `lanUrl` / phone scan flow (important)

QR payloads must be scannable **by phones on the same network** in dev: `dashboard.js getQrLinks()` swaps in the server-provided `lanUrl` when the browser host is `localhost/127.0.0.1`. `dashboard.php` computes it from `getenv('LAN_IP')` (set by `baslat.sh`; inside a plain container `gethostbyname(gethostname())` would return the container IP and phones can't reach it), fallback `gethostbyname(gethostname())`. On shared hosting the QR URL is just the site origin — don't "fix" this logic to something domain-aware without a deployment plan.

### Frontend (frontend/)

- Pages: `index.html` (landing + login/register modal, `script.js`), `register.html`, `dashboard.html` (`dashboard.js`), `admin.html` (`admin.js`), `qr.html` (`qr.js`), `sifre_sifirla.html` (reset page, inline JS). Shared `style.css` (dark theme, CSS vars in `:root`, Plus Jakarta Sans).
- **Vehicle colors are a fixed palette, not free text**: the shared list lives in `frontend/renkler.js` (`ARAC_RENKLERI`, name + display hex) and must stay in sync with `gecerliAracRenkleri()` in `backend/database/db.php`. Forms render a `<select>` via `aracRenkSecenekleri()`; API rejects unknown colors with 400. Display uses the `renk-dot` swatch helper (`renkGorselHtml`) in dashboard.js/qr.js; legacy non-palette values still render as plain text.
- **Vehicle/QR data is rendered via `escapeHtml()`** (dashboard.js, admin.js, qr.js) into `innerHTML` — never bypass escaping or inject a new `innerHTML` with API data. Event handlers use `data-*` attributes + delegation, not inline `onclick` with user data.
- **QR images are generated OFFLINE** by `frontend/vendor/qrcode.min.js` (qrcode-generator 1.4.4, MIT, header comment preserved) drawn to canvas → PNG data URL. `api.qrserver.com` was removed deliberately; do not reintroduce an external QR service (privacy + offline).
- dashboard.js section switching: sidebar `data-section="x"` toggles `#section-<x>` ids. Current sections: `profile`, `vehicles`, `qr-create`, `packages`, `qr-all`.
- **Panel layout system** (dashboard + admin) is class-based in style.css (`panel-page`, `panel-sidebar`, `panel-menu`, `panel-content`, `panel-section`, `panel-head`, `panel-body`, `panel-grid` + `--form/--narrow/--qr` variants, `stat-grid/stat-card`, `data-card/data-table`, `btn-sm`, `row-actions`, `veh-card`). Page-specific QR-card/badge/print CSS stays inline in dashboard.html `<style>`. Build new panel UI from these classes instead of inline style soup.
- Print styles live **inline in dashboard.html** `<style>` (`.printable-qr-card`, `.no-print`, `@media print`), not in style.css.
- All fetches use relative `/api/...` URLs with session cookies (same-origin).

## Commands

There are no build/test/lint commands. Useful operations:

```bash
# Yerlesik sunucu (Docker'siz)
php -S 0.0.0.0:8000 -t frontend backend/router.php

# API smoke (oturum gerektirir; genel 401 beklenir)
curl -s localhost:8000/api/dashboard

# SQLite DB incelemesi
sqlite3 backend/database/66Vizite.db ".tables"

# Sema sifirlama (ilk istekte kendini yeniden kurar)
rm backend/database/66Vizite.db
```

## Conventions & Gotchas Summary

- Route registration in `backend/api/index.php` is mandatory for new endpoints.
- `/api/users` and `/api/admin/users` require an admin **session**; registration can never produce an admin — seed admins via SQL (see README).
- Keep bcrypt + PBKDF2 dual-path auth intact, or committed-DB users break.
- UTC discipline: SQLite `CURRENT_TIMESTAMP` vs PHP `gmdate()` (password_resets, login_attempts).
- Git history shows the SQLite binary `.db` is committed deliberately; don't load real user data, and don't be surprised by binary diffs.
- **Turkish text edits can be byte-sensitive** (dotless ı `ı` vs `i`, `ü` vs `Ü`, "Vizit" vs "Vizite" spellings vary across files). When an exact-match edit with Turkish text fails, hex-dump the line (`sed -n 'Np' f | hexdump -C`) before retrying; prefer `python3` scripts over `edit` for such strings.
- When writing HTML-entity strings through tooling, verify the entities survived (raw `&` etc. can be mangled); a `\u0026` escape inside JS string literals is the reliable pattern (see `escapeHtml`).
- `docs/` holds product screenshots referenced from the README table (committed; refresh them after big UI changes via Playwright). The `.playwright-mcp/` scratch directory that captures them is gitignored.
- The root `.crush/` directory is agent tooling state, not part of the application; `baslat.sh` is the intended dev entrypoint and Docker stays outside the project files.
