# Agent Memory & Workspace Rules — Gringotts Banking Platform

This repository houses the **Gringotts Wizarding Bank Platform (First National Bank Monorepo)**.

## 📌 Instant Architectural Memory

Refer directly to [CODEBASE_MAP.md](file:///c:/DEVELOPMENT/banking-demo/banking-demo/CODEBASE_MAP.md) for full endpoint mappings, database tables, and portal structures. Do **not** spend tokens reading all files when checking standard project locations.

### Key Portals & Where They Live
1. **Public Marketing Website & Grand Hall**:
   - Primary Express Mount: [`web/public/site/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/site/index.html) (accessible via `/site`, `/landing`, `/home`).
   - Mirrors: [`website/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/website/index.html) and [`docs/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/docs/index.html).
   - Headline: **"The Safest Vault on Earth"** (Est. 1474 · Diagon Alley).
   - Note: Whenever updating marketing site copy, sync all 3 files (`web/public/site/index.html`, `website/index.html`, and `docs/index.html`).

2. **Customer Banking Portal (Vault Sanctum)**:
   - Express Mount: [`web/public/customer/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/customer/index.html) (accessible via `/customer`).
   - Self-contained styles and live treasury dashboard for multi-currency accounts.

3. **Relationship Manager (RM) Overseer Portal**:
   - Express Mount: [`web/public/rm/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/rm/index.html) (accessible via `/rm`).
   - Styles in [`web/public/rm/rm.css`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/rm/rm.css), scripts in [`web/public/rm/rm.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/rm/rm.js).

4. **Corporate Onboarding / Sacred Covenant Portal**:
   - Express Mount: [`web/public/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/index.html) (root `/`).
   - Styles in [`web/public/css/style.css`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/css/style.css), logic in [`web/public/js/app.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/js/app.js) and [`web/public/js/api.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/js/api.js).

### Microservices Mesh (`web/services/`)
- All requests enter through Gateway on Port 3000 ([`web/gateway/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/gateway/index.js)).
- Services:
  - Auth: [`web/services/auth-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/auth-service/index.js) (`/api/v1/auth`)
  - Onboarding: [`web/services/application-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/application-service/index.js) (`/api/v1/applications`)
  - Banking & Ledger: [`web/services/banking-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/banking-service/index.js) (`/api/v1/banking`)
  - Document Base64 Vault: [`web/services/document-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/document-service/index.js) (`/api/v1/documents`)
  - Notifications & Owl Post: [`web/services/notification-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/notification-service/index.js) (`/api/v1/notifications`)
  - RM Pipeline: [`web/services/rm-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/rm-service/index.js) (`/api/v1/rm`)

### Database & Storage
- Central DB abstraction: [`web/shared/db.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/shared/db.js) with fallback hierarchy:
  1. Supabase Cloud REST client
  2. PostgreSQL TCP pool
  3. High-speed in-memory store fallback ([`web/shared/memStore.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/shared/memStore.js))

### Commands
- Start dev server: `npm start`
- Run seeds: `npm run seed:web`
- Run migrations: `npm run migrate:web`
