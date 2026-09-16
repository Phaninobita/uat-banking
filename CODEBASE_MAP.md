# Gringotts Banking Platform — Codebase Map & Assistant Memory

> **Memory & Architecture Reference Guide**: Use this document to instantly locate components, routes, styles, microservices, and database layers across the repository without needing to read every file.

---

## 🏛️ Quick Navigation: Portals & UI Entry Points

| Portal / Route | Express Route Mount | Primary HTML File | Supporting Styles & Scripts | Purpose & Key Features |
| :--- | :--- | :--- | :--- | :--- |
| **Marketing Website & Grand Hall** | `/site`, `/landing`, `/home` | [`web/public/site/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/site/index.html) *(copies: [`website/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/website/index.html), [`docs/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/docs/index.html))* | Inline CSS & JS (dust canvas, Cinzel font) | Public landing site. Hero: *"The Safest Vault on Earth"*, vault tiers, exchange calculator, animated particles. |
| **Customer Vault Portal** | `/customer` | [`web/public/customer/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/customer/index.html) | Self-contained styles & client logic | Customer Treasury Dashboard: multi-currency accounts (Galleons, Sickles, Knuts, USD, EUR, GBP), live FX, transaction feeds, biometric login. |
| **Goblin RM Overseer Portal** | `/rm` | [`web/public/rm/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/rm/index.html) | [`web/public/rm/rm.css`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/rm/rm.css), [`web/public/rm/rm.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/rm/rm.js) | Relationship Manager suite: onboarding pipeline kanban, application review/approval, customer invitation dispatch, audit logs. |
| **Sacred Covenant Induction** | `/` (root / fallback) | [`web/public/index.html`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/index.html) | [`web/public/css/style.css`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/css/style.css), [`web/public/js/app.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/js/app.js), [`web/public/js/api.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/js/api.js) | Multi-step corporate induction wizard, KYC document upload, blood-binding oath signature, verification steps. |

---

## 🧭 Directory Structure

```
banking-demo/
├── CODEBASE_MAP.md              # 📍 THIS FILE: Instant assistant memory & codebase index
├── AGENTS.md                    # 🤖 Antigravity workspace rules & persistent guidance
├── README.md                    # Project monorepo overview
├── nixpacks.toml                # Deployment buildpack configuration
├── package.json                 # Monorepo scripts (routes npm start to web/)
│
├── docs/                        # Static GitHub Pages deployment mirror
│   ├── index.html               # Public landing mirror (Hero: "The Safest Vault on Earth")
│   └── *.png                    # Crest assets
│
├── website/                     # Standalone marketing site mirror
│   ├── index.html               # Public landing mirror (Hero: "The Safest Vault on Earth")
│   └── *.png                    # Dragon & gold bank crests
│
└── web/                         # 🚀 Core Node.js Web Server & Microservices Mesh
    ├── server.js                # Microservices mesh bootloader & entry point (port 3000)
    │
    ├── gateway/                 # Unified API Gateway & Reverse Proxy
    │   └── index.js             # Route dispatch, Helmet security, rate limiter, health telemetry
    │
    ├── services/                # Backend Microservice Modules
    │   ├── auth-service/        # OTP generation, verification, JWT tokens, mobile biometric auth
    │   ├── application-service/ # Corporate onboarding state machine, draft saving, stage validation
    │   ├── banking-service/     # Multi-currency balances, transactions, transfers, FX rates
    │   ├── document-service/    # Base64 document storage (application_documents), upload/download, OCR
    │   ├── notification-service/# Owl post dispatch, email simulation, Yopmail sender integration
    │   └── rm-service/          # RM application pipeline, reviewer comments, customer invitations
    │
    ├── shared/                  # Cross-service shared utilities
    │   ├── config.js            # Environment settings, service ports, secrets
    │   ├── db.js                # Tri-tier DB connector (Supabase REST -> PostgreSQL Pool -> In-Memory)
    │   ├── memStore.js          # In-memory metrics, session storage, and mock fallbacks
    │   ├── audit.js             # Tamper-evident corporate audit trail logging
    │   ├── security.js          # Password hashing and token utilities
    │   └── supabaseClient.js    # Supabase cloud REST client
    │
    ├── db/                      # Database Schemas & Migrations
    │   ├── schema.sql           # Primary PostgreSQL schema (accounts, transactions, onboarding)
    │   ├── rm_schema.sql        # RM schema (invitations, reviewer notes, stage history)
    │   ├── 02_create_stage_tables.sql # Granular stage-by-stage tables
    │   ├── migrate.js           # Migration runner
    │   └── seed.js              # Database seeder with sample accounts & applicants
    │
    └── public/                  # Frontend static files served by Gateway
        ├── index.html           # Onboarding / Sacred Covenant Portal (Root `/`)
        ├── customer/            # Customer Banking Portal (`/customer`)
        ├── rm/                  # RM Executive Portal (`/rm`)
        ├── site/                # Marketing Landing Website (`/site`, `/landing`, `/home`)
        ├── css/style.css        # Main stylesheet for Onboarding Portal
        ├── js/                  # Frontend JavaScript modules
        │   ├── app.js           # Onboarding UI controller & state management
        │   ├── api.js           # API gateway client for onboarding
        │   ├── live-banking.js  # Live banking widget updates
        │   └── mobile-app.js    # Mobile responsive helpers
        └── images/              # Crests, logos, dragon icons
```

---

## ⚡ API Endpoint Reference

All endpoints are mounted through the unified Gateway on port `3000`:

| Prefix | Handler File | Key Endpoints | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/gateway/health` | [`web/gateway/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/gateway/index.js) | `GET /api/v1/gateway/health` | System health, service mesh status, DB engine info, request counters |
| `/api/v1/auth` | [`web/services/auth-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/auth-service/index.js) | `POST /request-otp`<br>`POST /verify-otp`<br>`POST /mobile/biometric` | Two-factor authentication, session management |
| `/api/v1/applications` | [`web/services/application-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/application-service/index.js) | `GET /current`<br>`POST /save`<br>`GET /list` | Onboarding applications, draft saving, progression through stages |
| `/api/v1/banking` | [`web/services/banking-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/banking-service/index.js) | `GET /accounts`<br>`GET /transactions`<br>`GET /fx-rates`<br>`POST /transfer` | Treasury accounts, ledger history, FX exchange rate calculation, transfers |
| `/api/v1/documents` | [`web/services/document-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/document-service/index.js) | `POST /upload`<br>`GET /list`<br>`GET /download/:id` | Base64 document upload, PDF attachments, KYC document repository |
| `/api/v1/notifications` | [`web/services/notification-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/notification-service/index.js) | `GET /emails`<br>`POST /simulate`<br>`POST /push` | Owl post & email alerts, notification log |
| `/api/v1/rm` | [`web/services/rm-service/index.js`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/services/rm-service/index.js) | `POST /login`<br>`GET /pipeline`<br>`POST /review`<br>`POST /invite` | RM pipeline management, application approvals, invitations |

---

## 🎨 Theme & Branding Memory

- **Hero Title**: `"The Safest Vault on Earth"`
  - Styled with Cinzel serif font, uppercase, golden glowing animation (`heroTitleGlow`).
  - Animated with interactive character splitting (`splitChars($('#heroTitle'))`).
- **Badge**: `"Est. 1474 · Diagon Alley"` with cyan pulsing dot indicator.
- **Color Palettes**:
  - **Electric Cyan & Azure** (Default): `--brand-primary: #00d2ff`, `--brand-secondary: #0ea5e9`, `--brand-tertiary: #38bdf8`.
  - **Imperial Gold**: `--brand-primary: #fbbf24`, `--brand-secondary: #f59e0b`, `--brand-tertiary: #fde047`.
- **Logos & Crests**:
  - Primary Dragon Crest: [`web/public/images/bank-logo-dragon.png`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/images/bank-logo-dragon.png)
  - Gold Crest: [`web/public/images/bank-logo-gold.png`](file:///c:/DEVELOPMENT/banking-demo/banking-demo/web/public/images/bank-logo-gold.png)

---

## 🛠️ CLI Quick Commands

| Task | Command |
| :--- | :--- |
| **Start Gateway & Full Mesh** | `npm start` *(or `npm run start:web`)* |
| **Seed Test Data** | `npm run seed:web` |
| **Run Database Migrations** | `npm run migrate:web` |
| **Run Stage Migrations** | `npm run migrate:stages` |
| **Test Yopmail Notification** | `npm run send:yopmail -- test@yopmail.com` |
