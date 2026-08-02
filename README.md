# DBoard

**Build admin panels and dashboards for any database — zero code, AI-powered.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/dboard/dboard/actions/workflows/ci.yml/badge.svg)](https://github.com/dboard/dboard/actions)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://typescriptlang.org)

DBoard connects to your existing database and uses AI to instantly generate admin panels, dashboards, forms, and queries from a simple natural language prompt. No coding required.

Connect PostgreSQL, MySQL, MongoDB, SQLite, or Supabase — describe what you want in plain English — and DBoard builds it. Edit rows with validated forms, visualize data with auto-generated charts, run queries with a built-in SQL console, and share dashboards with your team.

---

## Screenshots

<!-- Replace these placeholders with actual screenshots -->

![Dashboard](./docs/screenshot-dashboard.png)
*Dashboard with charts, metrics, and real-time data*

![Query Editor](./docs/screenshot-query-editor.png)
*SQL query editor with syntax highlighting and saved queries*

![DB Monitor](./docs/screenshot-db-monitor.png)
*Database monitoring with live metrics and table inventory*

![Schema Diff](./docs/screenshot-schema-diff.png)
*Schema comparison between two databases*

---

## Features

- **Zero-Code Admin Panels** — Generate full CRUD interfaces from a natural language prompt — no templates, no configuration
- **AI-Powered Dashboards** — "Show me monthly revenue by product category" → instant chart with no SQL needed
- **Multi-Database** — Connect PostgreSQL, MySQL, SQLite, MongoDB, Supabase, or SQL Server through one unified interface
- **Database-First** — Works with your existing database. No data migration, no vendor lock-in, no schema redesign
- **SQL Console** — Write and execute queries with syntax highlighting, saved queries, history, and AI-powered generation
- **Data Grid** — Browse, search, filter, sort, inline edit, bulk delete, and import/export (CSV, JSON, Excel, PDF)
- **Schema Diff** — Compare schemas across two databases and visualize differences instantly
- **DB Monitor** — Real-time health checks, table inventory, row counts, and performance metrics
- **Sharing & Collaboration** — Share connections and dashboards with read/write/admin permissions
- **Webhooks** — Send real-time notifications to Slack, Discord, PagerDuty, or custom HTTP endpoints
- **API Keys** — Generate scoped API keys for programmatic access to your databases
- **Secure** — CSRF protection, SSRF guard, AES-256-GCM encryption at rest, rate limiting, audit logs
- **Self-Hosted** — Your data never leaves your server. Deploy with Docker in one command
- **Dark Mode** — Eye-friendly dark theme with 6 built-in color presets and full customization

---

## Supported Databases

| Database   | Status | Default Port | Adapter    | Notes                              |
|------------|--------|--------------|------------|-------------------------------------|
| PostgreSQL | ✅     | 5432         | SQL (Knex) | Full support including pg_stat views |
| MySQL      | ✅     | 3306         | SQL (Knex) | Full support                        |
| SQLite     | ✅     | —            | SQL (Knex) | File-based, no network config       |
| MongoDB    | ✅     | 27017        | Native     | Document introspection, aggregation |
| Supabase   | ✅     | —            | REST API   | Uses Supabase JS client             |
| SQL Server | ✅     | 1433         | SQL (Knex) | Full support via mssql driver       |

---

## Quick Start

### Prerequisites

- Node.js 20+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm, yarn, or pnpm
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/dboard/dboard.git
cd dboard

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Generate secrets (paste output into .env)
openssl rand -base64 32   # Use for NEXTAUTH_SECRET
openssl rand -base64 32   # Use for ENCRYPTION_KEY

# 5. Initialize the database
npx prisma generate
npx prisma db push

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register your first account.

### Docker Quick Start

```bash
# Set secrets in your shell
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)

# Start with Docker Compose
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | SQLite URL for Prisma (application metadata) | Yes | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js session encryption | Yes | — |
| `NEXTAUTH_URL` | Canonical URL for NextAuth.js | Yes | `http://localhost:3000` |
| `ENCRYPTION_KEY` | Key for encrypting database passwords and API keys (AES-256-GCM) | Yes | — |
| `ALLOW_PRIVATE_DB_HOSTS` | Set to `1` to allow connections to localhost/private IPs (dev only) | No | `0` |

> **Production:** Generate strong secrets with `openssl rand -base64 32`. Never use default or placeholder values.

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Database ORM | Prisma 5 |
| Authentication | NextAuth.js 4 (Credentials + JWT) |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS) |
| State Management | TanStack React Query 5 |
| Table Grid | TanStack React Table 8 |
| Drag & Drop | @dnd-kit |
| Command Palette | cmdk |
| Charts | Custom SVG (Bar, Line, Pie, Sparkline, Heatmap) |
| Testing | Vitest (unit) + Playwright (E2E) |
| Linting | ESLint + eslint-plugin-security |
| Dead Code Detection | Knip |

### Project Structure

```
dboard/
├── .github/
│   └── workflows/ci.yml       # CI/CD pipeline (7 jobs)
├── docs/                       # Screenshots and documentation assets
├── e2e/                        # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── connections.spec.ts
│   ├── dashboard.spec.ts
│   ├── data-browse.spec.ts
│   └── query.spec.ts
├── prisma/
│   ├── schema.prisma           # Database schema (16 models)
│   └── seed.ts                 # Database seed script
├── public/                     # Static assets (logos, favicon)
├── scripts/
│   └── seed-demo-db.sql        # Demo database seed SQL
├── src/
│   ├── app/
│   │   ├── (auth)/             # Auth route group
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/        # Dashboard route group
│   │   │   ├── connections/    # Connection management
│   │   │   │   ├── page.tsx    # List connections
│   │   │   │   └── [id]/       # Connection detail
│   │   │   │       ├── tables/ # Browse tables
│   │   │   │       ├── query/  # SQL editor
│   │   │   │       ├── schema/ # Schema viewer
│   │   │   │       ├── settings/# Connection settings
│   │   │   │       └── edit/   # Edit connection
│   │   │   ├── dashboards/     # Dashboard management
│   │   │   │   ├── page.tsx    # List dashboards
│   │   │   │   └── [id]/       # Dashboard detail
│   │   │   ├── admin-pages/    # Admin page management
│   │   │   ├── settings/       # Application settings
│   │   │   │   ├── ai/         # AI provider config
│   │   │   │   ├── profile/    # User profile
│   │   │   │   ├── theme/      # Theme editor
│   │   │   │   ├── plugins/    # Plugin manager
│   │   │   │   ├── audit-logs/ # Audit log viewer
│   │   │   │   ├── notifications/
│   │   │   │   ├── templates/  # Dashboard templates
│   │   │   │   └── backup/     # Backup & restore
│   │   │   ├── db-monitor/     # Database monitoring
│   │   │   ├── ai/             # AI generation page
│   │   │   ├── schema-diff/    # Schema comparison
│   │   │   └── profile/        # User profile page
│   │   ├── api/                # API routes (80 endpoints)
│   │   │   ├── auth/           # Authentication
│   │   │   ├── connections/    # Connection CRUD + health + info
│   │   │   ├── dashboards/     # Dashboard CRUD + charts + shares
│   │   │   ├── data/           # Table data CRUD + bulk operations
│   │   │   ├── query/          # SQL execution + saved + history + AI
│   │   │   ├── schema/         # Introspection + diff + config
│   │   │   ├── ai/             # AI generation + providers
│   │   │   ├── settings/       # Profile + notifications
│   │   │   ├── admin-pages/    # Admin page CRUD
│   │   │   ├── views/          # Saved views
│   │   │   ├── favorites/      # Favorite toggle
│   │   │   ├── shares/         # Connection sharing
│   │   │   ├── webhooks/       # Webhook CRUD + actions
│   │   │   ├── api-keys/       # API key CRUD
│   │   │   ├── activity/       # Activity feed
│   │   │   ├── audit-logs/     # Audit log viewer
│   │   │   ├── alerts/         # Alert management
│   │   │   ├── plugins/        # Plugin registry
│   │   │   ├── theme/          # Theme presets
│   │   │   ├── csrf/           # CSRF token
│   │   │   ├── export/         # Data export
│   │   │   ├── import/         # Data import
│   │   │   └── dashboard-templates/
│   │   ├── layout.tsx          # Root layout
│   │   ├── providers.tsx       # React Query + Theme providers
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   │   ├── DashboardShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopNav.tsx
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── shared/             # Shared components
│   │   ├── dashboard/          # Dashboard components
│   │   ├── data-grid/          # Data grid components
│   │   ├── connections/        # Connection components
│   │   ├── query/              # Query editor components
│   │   ├── schema/             # Schema components
│   │   ├── settings/           # Settings components
│   │   ├── ai/                 # AI components
│   │   └── db-monitor/         # Database monitoring components
│   ├── hooks/                  # 20 custom React hooks
│   ├── lib/
│   │   ├── ai/                 # AI providers and generation
│   │   ├── db/
│   │   │   ├── drivers/        # Database adapters
│   │   │   ├── encryption.ts   # AES-256-GCM encryption
│   │   │   ├── ssrf-guard.ts   # SSRF protection
│   │   │   └── plugins/        # Adapter plugin system
│   │   ├── theme/              # Theme system
│   │   ├── widgets/            # Widget plugin registry
│   │   ├── webhooks/           # Webhook plugin registry
│   │   ├── schema/             # Schema caching
│   │   ├── crud/               # Query builder
│   │   ├── auth.ts             # Authentication config
│   │   ├── auth-helpers.ts     # Auth utilities
│   │   ├── csrf.ts             # CSRF protection
│   │   ├── permissions.ts      # Permission system
│   │   ├── api-keys.ts         # API key management
│   │   ├── audit.ts            # Audit logging
│   │   ├── rate-limit.ts       # Rate limiting
│   │   ├── with-rate-limit.ts  # Rate limit middleware
│   │   ├── login-rate-limit.ts # Login rate limiting
│   │   ├── sql-guard.ts        # SQL write detection
│   │   ├── prisma.ts           # Prisma client
│   │   └── utils.ts            # Utility functions
│   ├── types/                  # TypeScript type definitions
│   └── generated/              # Prisma generated client
├── tests/                      # Unit/integration tests
├── .env.example                # Environment template
├── .eslintrc.json              # ESLint config
├── .gitignore                  # Git ignore rules
├── .gitleaks.toml              # Secret scanning config
├── components.json             # shadcn/ui config
├── docker-compose.yml          # Docker Compose config
├── Dockerfile                  # Multi-stage Docker build
├── knip.json                   # Dead code detection config
├── next.config.mjs             # Next.js config + security headers
├── package.json                # Dependencies and scripts
├── playwright.config.ts        # E2E test config
├── postcss.config.mjs          # PostCSS config
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Vitest test config
├── CONTRIBUTING.md             # Contributing guidelines
├── CODE_OF_CONDUCT.md          # Code of conduct
├── LICENSE                     # MIT License
├── SECURITY.md                 # Security policy
├── CHANGELOG.md                # Version history
└── README.md                   # This file
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       DashboardShell                         │
│  ┌──────────┐  ┌──────────────────────────────────────────┐ │
│  │          │  │              TopNav                        │ │
│  │ Sidebar  │  │  [Menu] [Page Title] [Search⌘K] [🌙] [▼] │ │
│  │          │  ├──────────────────────────────────────────┤ │
│  │ [Dash]   │  │                                          │ │
│  │ [Admin]  │  │              Page Content                 │ │
│  │ [Settings│  │         (children prop)                   │ │
│  │ [DB Mon] │  │                                          │ │
│  │          │  │                                          │ │
│  │ ──────── │  │                                          │ │
│  │ ★ Favs   │  │                                          │ │
│  │          │  │                                          │ │
│  │ ──────── │  │                                          │ │
│  │ [User]   │  │                                          │ │
│  │ [🌙][≡]  │  │                                          │ │
│  └──────────┘  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Browser Request
      │
      ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Next.js    │───▶│  Auth Check  │───▶│  CSRF Check  │
│  Middleware  │    │  (JWT/API Key)│    │  (Origin)    │
└─────────────┘    └──────────────┘    └──────────────┘
                                                │
                                                ▼
                   ┌──────────────┐    ┌──────────────┐
                   │  Rate Limit  │───▶│  Route       │
                   │  (IP+Path)   │    │  Handler     │
                   └──────────────┘    └──────────────┘
                                                │
                                                ▼
                   ┌──────────────┐    ┌──────────────┐
                   │  Prisma      │───▶│  SQLite      │
                   │  (Metadata)  │    │  (App DB)    │
                   └──────────────┘    └──────────────┘
                                                │
                                                ▼
                   ┌──────────────┐    ┌──────────────┐
                   │  Adapter     │───▶│  Target DB   │
                   │  (PG/MySQL/..)   │  (User's DB) │
                   └──────────────┘    └──────────────┘
```

---

## Database Schema

DBoard uses SQLite (via Prisma) to store application metadata. The schema contains 16 models:

### User

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| email | String | `@unique` |
| name | String? | |
| password | String? | PBKDF2 hash (salt:hash) |
| role | String | `@default("editor")` — viewer, editor, admin |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

**Relations:** connections, dashboards, adminPages, apiKeys, auditLogs, queryHistory, savedViews, alerts, aiProviders, favorites, connectionShares, dashboardShares

### Connection

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| name | String | Display name |
| type | String | `@default("postgresql")` — postgresql, mysql, sqlite, mongodb, supabase, mssql |
| host | String | `@default("localhost")` |
| port | Int | `@default(5432)` |
| database | String | Database name |
| username | String | |
| encryptedPassword | String? | AES-256-GCM encrypted |
| ssl | Boolean | `@default(false)` |
| readOnly | Boolean | `@default(false)` |
| poolMin | Int | `@default(0)` |
| poolMax | Int | `@default(10)` |
| poolIdleTimeout | Int | `@default(30000)` |
| queryTimeoutMs | Int | `@default(30000)` |
| userId | String | Owner |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

### Dashboard

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| name | String | |
| description | String? | |
| userId | String | Owner |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

### DashboardChart

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| dashboardId | String | |
| title | String | |
| type | String | `@default("bar")` — bar, line, pie, table, sparkline, heatmap |
| connectionId | String | |
| query | String | SQL query |
| config | String | `@default("{}")` — JSON config |
| width | Int | `@default(1)` — grid columns |
| height | Int | `@default(1)` — grid rows |
| x | Int | `@default(0)` — grid position |
| y | Int | `@default(0)` — grid position |

### ApiKey

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| name | String | |
| key | String | `@unique` — `dbo_` + 64 hex chars |
| lastChars | String | Last 8 chars for display |
| permissions | String | `@default("read")` — read, write, admin |
| connectionId | String | Scoped to one connection |
| userId | String | Owner |
| expiresAt | DateTime? | |
| lastUsedAt | DateTime? | Fire-and-forget update |

### QueryHistory

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| connectionId | String | |
| userId | String | |
| sql | String | |
| durationMs | Int | `@default(0)` |
| rowCount | Int | `@default(0)` |
| error | String? | |
| saved | Boolean | `@default(false)` |
| createdAt | DateTime | `@default(now())` |

### SchemaConfig

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| connectionId | String | `@unique` |
| config | String | JSON schema configuration |

### AuditLog

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| connectionId | String | |
| userId | String | |
| action | String | e.g., "connection.created", "row.updated" |
| tableName | String? | |
| recordId | String? | |
| details | String? | JSON details |
| ip | String? | |
| dashboardId | String? | |

### Webhook

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| name | String | |
| url | String | Target URL |
| events | String | `@default("row.created,row.updated,row.deleted")` |
| connectionId | String | |
| enabled | Boolean | `@default(true)` |
| secret | String? | For signature verification |

### ConnectionShare

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| connectionId | String | |
| sharedWithId | String | |
| sharedById | String | |
| permission | String | `@default("read")` — read, write, admin |
| | | `@@unique([connectionId, sharedWithId])` |

### DashboardShare

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| dashboardId | String | |
| sharedWithId | String | |
| sharedById | String | |
| permission | String | `@default("read")` |
| | | `@@unique([dashboardId, sharedWithId])` |

### SavedView

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| name | String | |
| connectionId | String | |
| tableName | String | |
| config | String | JSON view configuration |
| userId | String | |

### AiProvider

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| userId | String | |
| name | String | `@default("chatgpt")` |
| displayName | String | `@default("ChatGPT / OpenAI")` |
| encryptedApiKey | String? | AES-256-GCM encrypted |
| baseUrl | String? | |
| isEnabled | Boolean | `@default(true)` |
| sortOrder | Int | `@default(0)` |
| | | `@@unique([userId, name])` |

### AiModel

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| providerId | String | |
| modelId | String | |
| displayName | String | |
| isDefault | Boolean | `@default(false)` |
| sortOrder | Int | `@default(0)` |
| | | `@@unique([providerId, modelId])` |

### Alert

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| name | String | |
| connectionId | String | |
| tableName | String | |
| condition | String | Alert condition |
| enabled | Boolean | `@default(true)` |
| webhookUrl | String? | |
| email | String? | |
| lastTriggeredAt | DateTime? | |
| userId | String | |

### AdminPage

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| name | String | |
| description | String? | |
| userId | String | |
| connectionId | String | |
| config | String | `@default("{}")` — JSON page config |

### Favorite

| Field | Type | Attributes |
|-------|------|------------|
| id | String | `@id @default(cuid())` |
| userId | String | |
| kind | String | "dashboard" or "adminPage" |
| targetId | String | |
| | | `@@unique([userId, kind, targetId])` |

---

## Security

DBoard implements multiple layers of security to protect your data:

### SSRF Protection

**File:** `src/lib/db/ssrf-guard.ts`

All outbound database and webhook connections are validated against Server-Side Request Forgery:

- **Private IP blocking** — Blocks RFC 1918 addresses (10.x, 172.16-31.x, 192.168.x), loopback (127.x), link-local (169.254.x), and IPv6 ULA/link-local
- **DNS validation** — Resolves hostnames before connecting; blocks connections if any resolved address is private
- **DNS rebinding protection** — Validates resolved addresses match expectations
- **Protocol enforcement** — Only HTTP/HTTPS allowed for webhooks

**Configuration:** Set `ALLOW_PRIVATE_DB_HOSTS=1` in `.env` to allow localhost connections (development only).

### Encryption

**File:** `src/lib/db/encryption.ts`

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM (authenticated encryption) |
| Key Derivation | `crypto.scryptSync()` with salt `"dboard-v1"` |
| IV | 16 random bytes per encryption |
| Output Format | `hex(iv):hex(authTag):hex(ciphertext)` |

Used to encrypt:
- Database passwords (`Connection.encryptedPassword`)
- AI provider API keys (`AiProvider.encryptedApiKey`)

### CSRF Protection

**File:** `src/lib/csrf.ts`

All state-changing endpoints (POST/PUT/DELETE) validate that the `Origin` header matches the `Host` header. Skipped for API key authentication (non-browser clients).

### Authentication

**File:** `src/lib/auth.ts`

| Property | Value |
|----------|-------|
| Password Hashing | PBKDF2 with SHA-512 |
| Iterations | 600,000 |
| Salt | 16 random bytes per password |
| Comparison | `crypto.timingSafeEqual()` (timing-attack resistant) |
| Session Strategy | JWT with 24-hour max age |
| Custom Login Page | `/login` |

### Rate Limiting

**Login Rate Limiting** (`src/lib/login-rate-limit.ts`):

| Track | Max Attempts | Window | Lockout |
|-------|-------------|--------|---------|
| Per-account (email) | 5 | 15 min | 15 min |
| Per-IP | 30 | 15 min | 15 min |

**General Rate Limiting** (`src/lib/with-rate-limit.ts`):

- Default: 100 requests per 60-second window per IP+path
- Configurable per-route (5–30 requests per 60 seconds)
- Returns `429 Too Many Requests` with `Retry-After` header

### SQL Guard

**File:** `src/lib/sql-guard.ts`

Protects read-only connections from write operations:

- **`isWriteQuery(sql)`** — Detects INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, and 15+ other write keywords
- **`isReadQuery(sql)`** — Validates query starts with SELECT, WITH, SHOW, DESCRIBE, EXPLAIN, or PRAGMA
- **Literal stripping** — Removes string literals before checking to prevent false positives from data values

### Permissions System

**File:** `src/lib/permissions.ts`

| Role | Hierarchy | Capabilities |
|------|-----------|--------------|
| viewer | 1 | Read-only access to connection data |
| editor | 2 | Read + write access (default for new users) |
| admin | 3 | Full access including sharing and deletion |

**Connection access logic:**
1. Admin role can access everything
2. Owner (created the connection) gets access; write blocked if `readOnly` is set
3. Shared access via `ConnectionShare` with read/write/admin permission levels

### API Key System

**File:** `src/lib/api-keys.ts`

- **Format:** `dbo_` prefix + 64 hex characters (32 random bytes)
- **Scope:** Each key is scoped to a single connection
- **Permissions:** `read` (1) < `write` (2) < `admin` (3)
- **Authentication:** `X-API-Key` header or `Authorization: Bearer dbo_*`
- **CSRF:** Skipped for API key requests (non-browser clients)
- **Expiry:** Optional expiration date; checked on every request
- **Tracking:** `lastUsedAt` updated on each use

---

## AI Integration

### Supported Providers

| Provider | API Format | Base URL | Auth | Free Tier |
|----------|-----------|----------|------|-----------|
| ChatGPT / OpenAI | OpenAI Chat | `https://api.openai.com/v1` | Bearer token | No |
| Groq | OpenAI Chat | `https://api.groq.com/openai/v1` | Bearer token | Yes |
| Google Gemini | Gemini Content | `https://generativelanguage.googleapis.com/v1beta` | Query key | Yes |
| Ollama | OpenAI Chat | `http://localhost:11434` | None | Yes (local) |
| OpenRouter | OpenAI Chat | `https://router.ai/api/v1` | Bearer token | Varies |

### Available Models

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4 Turbo, o3-mini |
| Groq | GPT-OSS 120B, Llama 3 70B, Llama 3 8B, Mixtral 8x7B, Gemma 2 9B |
| Gemini | Gemini 2.0 Flash, Gemini 2.0 Flash Lite, Gemini 2.5 Pro |
| Ollama | Llama 3, Llama 3.1, Mistral, CodeLlama |
| OpenRouter | GPT-4o Mini, GPT-4o, Claude 3.5 Sonnet, Llama 3.3 70B, DeepSeek Chat |

### Generation Capabilities

| Type | Description | Output |
|------|-------------|--------|
| `query` | Generate SQL from natural language | Raw SQL string |
| `dashboard` | Generate a multi-chart dashboard | Dashboard + chart configs |
| `panel` | Generate a CRUD admin panel | Panel config with columns, filters, actions |
| `form` | Generate form fields from schema | Form field configuration |

### Configuration

1. Navigate to **Settings → AI**
2. Select a provider (e.g., Groq for free usage)
3. Enter your API key (encrypted at rest with AES-256-GCM)
4. Set a default model
5. Use in the SQL editor (AI tab) or AI generation page

---

## Plugin System

DBoard supports three types of plugins:

### Adapter Plugins

Connect to databases beyond the built-in six. Each adapter must implement the `DatabaseAdapter` interface:

```typescript
interface DatabaseAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  test(config: ConnectionConfig): Promise<boolean>;
  introspect(): Promise<SchemaResult>;
  executeRaw(query: string, params?: unknown[]): Promise<QueryResult>;
  list(table: string, options: ListOptions, columns: ColumnMeta[]): Promise<PaginatedResult>;
  get(table: string, pkValue: string, pkColumn: string): Promise<Record<string, unknown> | null>;
  create(table: string, data: Record<string, unknown>, columns: ColumnMeta[]): Promise<Record<string, unknown>>;
  update(table: string, pkValue: string, pkColumn: string, data: Record<string, unknown>, columns: ColumnMeta[]): Promise<Record<string, unknown>>;
  delete(table: string, pkValue: string, pkColumn: string): Promise<void>;
  bulkDelete(table: string, pkValues: string[], pkColumn: string): Promise<void>;
}
```

**NPM naming:** `@dboard/adapter-<name>` or `dboard-adapter-<name>`

**Built-in adapters:** PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, Supabase

**External adapter examples:** ClickHouse, DynamoDB, Firestore, Redis, Cassandra

### Widget Plugins

Create custom chart and visualization types for dashboards:

```typescript
interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: "chart" | "visualization" | "table" | "custom";
  icon: string;
  renderer: ComponentType<WidgetRendererProps>;
  defaultConfig?: Record<string, unknown>;
  configSchema?: WidgetConfigField[];
}
```

**NPM naming:** `@dboard/widget-<name>` or `dboard-widget-<name>`

**Built-in widgets:** Bar Chart, Pie Chart, Line Chart, Data Table, Sparkline, Heatmap

**External widget examples:** Geo Map, Network Graph, Gauge, Treemap

### Webhook Plugins

Create custom notification targets for data change events:

```typescript
interface WebhookAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  configFields: WebhookConfigField[];
  deliver(url: string, payload: WebhookPayload, config: Record<string, unknown>): Promise<WebhookDeliveryResult>;
}
```

**NPM naming:** `@dboard/webhook-<name>` or `dboard-webhook-<name>`

**Built-in actions:** Slack, Discord, PagerDuty, Custom HTTP

**External webhook examples:** Email, Jira, Microsoft Teams

---

## API Reference

### Authentication

DBoard supports two authentication methods:

**Session-based (browser):**
```bash
# Login via NextAuth to get session cookie
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=user@example.com&password=secret" \
  -c cookies.txt
```

**API key (programmatic):**
```bash
# Using X-API-Key header
curl -H "X-API-Key: dbo_your_api_key_here" http://localhost:3000/api/data/conn_123/users

# Using Authorization header
curl -H "Authorization: Bearer dbo_your_api_key_here" http://localhost:3000/api/data/conn_123/users
```

### Request/Response Format

- **Content-Type:** `application/json` (unless noted otherwise)
- **Error format:** `{ "error": "Error message" }`
- **Success format:** Resource object or `{ "success": true }`
- **Rate limit headers:** `X-RateLimit-Remaining`, `Retry-After` (on 429)

### Rate Limits

All rate limits are per IP + path, per 60-second window:

| Limit | Endpoints |
|-------|-----------|
| 5 req | Register, AI reset |
| 10 req | Connection test, API key create, schema diff, export, import, dashboard duplicate |
| 15 req | AI generate |
| 20 req | Connection create/update/delete, admin pages, shares, webhooks, charts, alerts, settings |
| 30 req | Data CRUD, query execute, dashboard CRUD, views, favorites, activity, API keys |
| 100 req | Default (GET-heavy routes) |

---

### Auth Routes

#### `POST /api/auth/register`

Register a new user account.

**Rate Limit:** 5 req/hour per IP

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"Alice","password":"securepass"}'
```

**Response (200):**
```json
{ "id": "clx123...", "email": "user@example.com", "name": "Alice" }
```

---

### Connection Routes

#### `GET /api/connections`

List all connections for the current user.

```bash
curl -b cookies.txt http://localhost:3000/api/connections
```

**Response (200):**
```json
[
  {
    "id": "clx123...",
    "name": "My PostgreSQL",
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "username": "postgres",
    "ssl": false,
    "readOnly": false,
    "createdAt": "2026-08-02T00:00:00.000Z"
  }
]
```

#### `POST /api/connections`

Create a new database connection.

**CSRF Required | Rate Limit:** 20 req/60s

```bash
curl -X POST http://localhost:3000/api/connections \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Production DB","type":"postgresql","host":"db.example.com","port":5432,"database":"prod","username":"admin","password":"secret","ssl":true}'
```

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | Yes | — | Display name |
| type | string | No | `"postgresql"` | Database type |
| host | string | No | `"localhost"` | Hostname or IP |
| port | number | No | 5432 | Port number |
| database | string | Yes | — | Database name |
| username | string | No | `""` | Username |
| password | string | No | — | Password (encrypted at rest) |
| ssl | boolean | No | `false` | Use SSL connection |
| readOnly | boolean | No | `false` | Read-only mode |

**Response (200):** Connection object (without password)

#### `POST /api/connections/test`

Test a connection without saving it.

**CSRF Required | Rate Limit:** 10 req/60s

```bash
curl -X POST http://localhost:3000/api/connections/test \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"type":"postgresql","host":"localhost","port":5432,"database":"test","username":"postgres","password":"secret"}'
```

**Response (200):** `{ "success": true, "message": "Connection successful" }`

#### `GET /api/connections/[id]`

Get a single connection by ID.

```bash
curl -b cookies.txt http://localhost:3000/api/connections/clx123...
```

#### `PUT /api/connections/[id]`

Update an existing connection.

**CSRF Required | Rate Limit:** 30 req/60s

```bash
curl -X PUT http://localhost:3000/api/connections/clx123... \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","ssl":true}'
```

#### `DELETE /api/connections/[id]`

Delete a connection.

**CSRF Required | Rate Limit:** 30 req/60s

```bash
curl -X DELETE http://localhost:3000/api/connections/clx123... -b cookies.txt
```

#### `GET /api/connections/[id]/health`

Health-check a connection (measures latency).

```bash
curl -b cookies.txt http://localhost:3000/api/connections/clx123.../health
```

**Response (200):** `{ "status": "online", "latencyMs": 12 }`
**Response (500):** `{ "status": "offline", "error": "...", "latencyMs": null }`

#### `GET /api/connections/[id]/info`

Get detailed database metadata (version, size, tables, row counts, cache hit ratio, uptime).

```bash
curl -b cookies.txt http://localhost:3000/api/connections/clx123.../info
```

**Response (200):**
```json
{
  "connectionId": "clx123...",
  "status": "online",
  "version": "PostgreSQL 16.2",
  "databaseSize": "15 MB",
  "tableCount": 12,
  "totalRecords": 45230,
  "activeConnections": 3,
  "cacheHitRatio": 99.8,
  "uptime": "14 days",
  "tables": [
    { "name": "users", "type": "table", "rowCount": 1500, "totalSize": "240 kB", "indexCount": 3 }
  ]
}
```

---

### Dashboard Routes

#### `GET /api/dashboards`

List all dashboards for the current user.

```bash
curl -b cookies.txt http://localhost:3000/api/dashboards
```

#### `POST /api/dashboards`

Create a new dashboard.

**CSRF Required | Rate Limit:** 30 req/60s

```bash
curl -X POST http://localhost:3000/api/dashboards \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Sales Dashboard","description":"Revenue tracking"}'
```

#### `GET /api/dashboards/[id]`

Get a dashboard with its charts.

```bash
curl -b cookies.txt http://localhost:3000/api/dashboards/clx456...
```

#### `DELETE /api/dashboards/[id]`

Delete a dashboard.

**CSRF Required | Rate Limit:** 20 req/60s

```bash
curl -X DELETE http://localhost:3000/api/dashboards/clx456... -b cookies.txt
```

#### `POST /api/dashboards/[id]/charts`

Add a chart to a dashboard.

**CSRF Required | Rate Limit:** 20 req/60s

```bash
curl -X POST http://localhost:3000/api/dashboards/clx456.../charts \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"title":"User Count","type":"bar","connectionId":"clx123...","query":"SELECT count(*) FROM users"}'
```

#### `DELETE /api/dashboards/[id]/charts?chartId=xxx`

Delete a chart from a dashboard.

#### `PATCH /api/dashboards/[id]/charts?chartId=xxx`

Update a chart in a dashboard.

#### `POST /api/dashboards/[id]/duplicate`

Duplicate a dashboard with all its charts.

**CSRF Required | Rate Limit:** 10 req/60s

```bash
curl -X POST http://localhost:3000/api/dashboards/clx456.../duplicate -b cookies.txt
```

#### `GET /api/dashboards/[id]/shares`

List all shares for a dashboard.

#### `POST /api/dashboards/[id]/shares`

Share a dashboard with another user.

**CSRF Required | Rate Limit:** 30 req/60s

```bash
curl -X POST http://localhost:3000/api/dashboards/clx456.../shares \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"sharedWithEmail":"bob@example.com","permission":"read"}'
```

#### `DELETE /api/dashboards/[id]/shares?shareId=xxx`

Remove a dashboard share.

---

### Data Routes

#### `GET /api/data/[connectionId]/[table]`

List rows from a table with pagination, sorting, and search.

```bash
curl -b cookies.txt "http://localhost:3000/api/data/clx123.../users?page=1&pageSize=20&sortBy=created_at&sortDir=desc&search=alice"
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| pageSize | number | 20 | Rows per page (max 100) |
| sortBy | string | — | Column to sort by |
| sortDir | string | `"asc"` | Sort direction: asc, desc |
| search | string | — | Search across string columns |
| * | string | — | Custom column filters (column=value) |

**Response (200):**
```json
{
  "data": [{ "id": 1, "name": "Alice", "email": "alice@example.com" }],
  "columns": [{ "name": "id", "dataType": "integer", "isPrimaryKey": true }],
  "tableName": "users",
  "isView": false,
  "page": 1,
  "pageSize": 20,
  "total": 150,
  "totalPages": 8
}
```

#### `POST /api/data/[connectionId]/[table]`

Insert a new row.

**CSRF Required (skipped for API key) | Rate Limit:** 30 req/60s

```bash
curl -X POST http://localhost:3000/api/data/clx123.../users \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","email":"bob@example.com"}'
```

#### `GET /api/data/[connectionId]/[table]/[pk]`

Get a single row by primary key.

```bash
curl -b cookies.txt http://localhost:3000/api/data/clx123.../users/42
```

#### `PUT /api/data/[connectionId]/[table]/[pk]`

Update a row by primary key.

**CSRF Required (skipped for API key) | Rate Limit:** 30 req/60s

```bash
curl -X PUT http://localhost:3000/api/data/clx123.../users/42 \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob Updated"}'
```

#### `DELETE /api/data/[connectionId]/[table]/[pk]`

Delete a row by primary key.

**CSRF Required (skipped for API key) | Rate Limit:** 30 req/60s

```bash
curl -X DELETE http://localhost:3000/api/data/clx123.../users/42 -b cookies.txt
```

#### `POST /api/data/[connectionId]/[table]/bulk-delete`

Bulk delete rows by IDs (max 1000).

**CSRF Required (skipped for API key) | Rate Limit:** 30 req/60s

```bash
curl -X POST http://localhost:3000/api/data/clx123.../users/bulk-delete \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"ids":[1,2,3,4,5]}'
```

**Response (200):** `{ "success": true, "deleted": 5 }`

---

### Query Routes

#### `POST /api/query/[connectionId]`

Execute a raw SQL query.

**CSRF Required (skipped for API key)**

```bash
curl -X POST http://localhost:3000/api/query/clx123... \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM users WHERE created_at > '\''2026-01-01'\''"}'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sql | string | Yes | SQL query to execute |
| dateFrom | string | No | Start date for date-range injection |
| dateTo | string | No | End date for date-range injection |

**Response (200):**
```json
{
  "columns": ["id", "name", "email"],
  "data": [{ "id": 1, "name": "Alice", "email": "alice@example.com" }],
  "rowCount": 1,
  "totalRows": 1,
  "truncated": false,
  "durationMs": 12,
  "isReadQuery": true
}
```

#### `GET /api/query/[connectionId]/saved`

List saved queries for a connection (max 50).

```bash
curl -b cookies.txt http://localhost:3000/api/query/clx123.../saved
```

#### `POST /api/query/[connectionId]/saved`

Save a query.

```bash
curl -X POST http://localhost:3000/api/query/clx123.../saved \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT count(*) FROM users"}'
```

#### `DELETE /api/query/[connectionId]/saved?id=xxx`

Delete a saved query.

#### `GET /api/query/[connectionId]/history?limit=50`

List query execution history (max 200).

```bash
curl -b cookies.txt "http://localhost:3000/api/query/clx123.../history?limit=20"
```

#### `POST /api/query/[connectionId]/ai`

Generate SQL from natural language using AI.

**CSRF Required**

```bash
curl -X POST http://localhost:3000/api/query/clx123.../ai \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Show me all users who signed up this week","modelId":"gpt-4o-mini"}'
```

**Response (200):** `{ "sql": "SELECT * FROM users WHERE created_at >= date('now', '-7 days')" }`

---

### Schema Routes

#### `POST /api/schema/introspect`

Introspect a connection's database schema (cached for 60 seconds).

```bash
curl -X POST http://localhost:3000/api/schema/introspect \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"clx123..."}'
```

#### `POST /api/schema/diff`

Compare schemas between two connections.

**CSRF Required | Rate Limit:** 10 req/60s

```bash
curl -X POST http://localhost:3000/api/schema/diff \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"sourceConnectionId":"clx123...","targetConnectionId":"clx456..."}'
```

**Response (200):**
```json
{
  "onlyInSource": ["legacy_users"],
  "onlyInTarget": ["new_table"],
  "columnDiffs": [{ "table": "users", "added": ["avatar"], "removed": [] }],
  "sourceTableCount": 12,
  "targetTableCount": 11
}
```

#### `POST /api/schema/config`

Save schema configuration (column-level metadata).

#### `GET /api/schema/config/[connectionId]`

Get schema configuration for a connection.

---

### AI Routes

#### `POST /api/ai/generate`

Generate structured content from a prompt.

**CSRF Required | Rate Limit:** 15 req/60s

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a user management panel","connectionId":"clx123...","type":"panel","modelId":"gpt-4o-mini"}'
```

**Types:** `panel`, `dashboard`, `form`, `query`

#### `POST /api/ai/test`

Test an AI provider connection.

**CSRF Required | Rate Limit:** 10 req/60s

```bash
curl -X POST http://localhost:3000/api/ai/test \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"providerId":"chatgpt","modelId":"gpt-4o-mini"}'
```

#### `GET /api/ai/providers`

List all AI providers and models (API keys masked).

```bash
curl -b cookies.txt http://localhost:3000/api/ai/providers
```

#### `PUT /api/ai/providers/[id]`

Update an AI provider (API key, base URL, enabled status).

#### `POST /api/ai/providers/reset`

Reset all AI providers to defaults. **Rate Limit:** 5 req/60s

#### `PUT /api/ai/default-model`

Set the global default AI model.

---

### Settings Routes

#### `PUT /api/settings/profile`

Update user profile (name).

```bash
curl -X PUT http://localhost:3000/api/settings/profile \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Smith"}'
```

#### `GET /api/settings/notifications`

Get notification preferences.

#### `PUT /api/settings/notifications`

Update notification preferences.

---

### Admin Page Routes

#### `GET /api/admin-pages`

List all admin pages.

#### `POST /api/admin-pages`

Create a new admin page.

```bash
curl -X POST http://localhost:3000/api/admin-pages \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"User Management","connectionId":"clx123...","config":{}}'
```

#### `GET /api/admin-pages/[id]`

Get a single admin page.

#### `PUT /api/admin-pages/[id]`

Update an admin page.

#### `DELETE /api/admin-pages/[id]`

Delete an admin page.

---

### View Routes

#### `GET /api/views/[connectionId]`

List saved views for a connection.

#### `POST /api/views/[connectionId]`

Create a saved view.

```bash
curl -X POST http://localhost:3000/api/views/clx123... \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Active Users","tableName":"users","config":{"filters":{"status":"active"}}}'
```

#### `DELETE /api/views/[connectionId]?viewId=xxx`

Delete a saved view.

---

### Favorite Routes

#### `GET /api/favorites`

List all favorites for the current user.

#### `POST /api/favorites`

Toggle a favorite.

```bash
curl -X POST http://localhost:3000/api/favorites \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"kind":"dashboard","targetId":"clx456..."}'
```

**Response (200):** `{ "favorited": true }` or `{ "favorited": false }`

---

### Share Routes

#### `GET /api/shares`

List connection shares. Optional: `?connectionId=xxx`

#### `POST /api/shares`

Share a connection with another user.

**CSRF Required | Rate Limit:** 30 req/60s

```bash
curl -X POST http://localhost:3000/api/shares \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"connectionId":"clx123...","sharedWithEmail":"bob@example.com","permission":"read"}'
```

#### `DELETE /api/shares?id=xxx`

Remove a connection share.

---

### Webhook Routes

#### `GET /api/webhooks`

List webhooks. Optional: `?connectionId=xxx`

#### `POST /api/webhooks`

Create a webhook.

**CSRF Required | Rate Limit:** 30 req/60s

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Slack Notify","url":"https://hooks.slack.com/...","events":"row.created,row.updated","connectionId":"clx123..."}'
```

#### `PUT /api/webhooks`

Update a webhook.

#### `DELETE /api/webhooks?id=xxx`

Delete a webhook.

#### `GET /api/webhooks/actions`

List available webhook action types (no auth required).

---

### API Key Routes

#### `GET /api/api-keys`

List all API keys. Optional: `?connectionId=xxx`

```bash
curl -b cookies.txt http://localhost:3000/api/api-keys
```

#### `POST /api/api-keys`

Create a new API key (shown only once).

**CSRF Required | Rate Limit:** 10 req/60s

```bash
curl -X POST http://localhost:3000/api/api-keys \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"CI Pipeline","connectionId":"clx123...","permissions":"read","expiresInDays":90}'
```

**Response (200):**
```json
{
  "id": "clx789...",
  "name": "CI Pipeline",
  "key": "dbo_a1b2c3d4e5f6...",
  "lastChars": "...f6g7h8i9",
  "permissions": "read",
  "expiresAt": "2026-11-01T00:00:00.000Z"
}
```

> **Note:** The full API key is shown only in this response. Store it securely.

#### `DELETE /api/api-keys?id=xxx`

Delete an API key.

---

### Activity & Audit Routes

#### `GET /api/activity?limit=50`

List the current user's activity feed (max 200).

```bash
curl -b cookies.txt "http://localhost:3000/api/activity?limit=20"
```

#### `GET /api/audit-logs?connectionId=xxx&limit=100`

List audit logs. Optional connection filter.

```bash
curl -b cookies.txt "http://localhost:3000/api/audit-logs?limit=50"
```

---

### Alert Routes

#### `GET /api/alerts/[connectionId]`

List alerts for a connection.

#### `POST /api/alerts/[connectionId]`

Create an alert.

```bash
curl -X POST http://localhost:3000/api/alerts/clx123... \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"High Row Count","tableName":"logs","condition":"row_count > 1000000","webhookUrl":"https://hooks.slack.com/..."}'
```

#### `PUT /api/alerts/[connectionId]`

Enable or disable an alert.

#### `DELETE /api/alerts/[connectionId]?alertId=xxx`

Delete an alert.

---

### Other Routes

#### `GET /api/plugins`

List all registered plugins (no auth required).

#### `GET /api/theme`

List available theme presets (no auth required).

#### `GET /api/csrf`

Generate a CSRF token (sets cookie).

#### `GET /api/export/[connectionId]/[table]?format=csv&limit=10000`

Export table data. Formats: `json`, `csv`, `jsonl`, `xlsx`, `pdf`.

```bash
curl -b cookies.txt "http://localhost:3000/api/export/clx123.../users?format=csv" --output users.csv
```

#### `POST /api/import/[connectionId]/[table]`

Import data from file (CSV, JSON, JSONL). Max 10MB, max 10,000 rows.

```bash
curl -X POST http://localhost:3000/api/import/clx123.../users \
  -b cookies.txt \
  -F "file=@users.csv" \
  -F "format=csv"
```

**Response (200):** `{ "imported": 500, "total": 500, "truncated": false }`

#### `GET /api/dashboard-templates`

List built-in dashboard templates (Database Overview, Table Health, Query Performance, Sales Dashboard, User Analytics).

---

## Deployment

### Docker

```bash
# Build the image
docker build -t dboard .

# Run with environment variables
docker run -p 3000:3000 \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e ENCRYPTION_KEY=$(openssl rand -base64 32) \
  -e DATABASE_URL=file:/data/dboard.db \
  -v dboard-data:/data \
  dboard
```

### Docker Compose

```bash
# Set secrets
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)

# Start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# NEXTAUTH_SECRET, ENCRYPTION_KEY, DATABASE_URL
```

> **Note:** For Vercel, use an external database (PostgreSQL) instead of SQLite for `DATABASE_URL`.

### Self-Hosted (PM2)

```bash
# Build for production
npm run build

# Start with PM2
pm2 start npm --name "dboard" -- start

# Save PM2 config
pm2 save
pm2 startup
```

### Environment Configuration

| Platform | DATABASE_URL | Notes |
|----------|-------------|-------|
| Local dev | `file:./dev.db` | SQLite, zero config |
| Docker | `file:/data/dboard.db` | Persistent via volume |
| Vercel | `postgresql://...` | External PostgreSQL required |
| Self-hosted | `file:./data/dboard.db` or `postgresql://...` | SQLite or external DB |

---

## Development

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start development server |
| `build` | `npm run build` | Production build |
| `start` | `npm run start` | Start production server |
| `lint` | `npm run lint` | Run ESLint |
| `test` | `npm run test` | Run unit tests (Vitest) |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `test:coverage` | `npm run test:coverage` | Generate coverage report |
| `test:e2e` | `npm run test:e2e` | Run E2E tests (Playwright) |
| `test:e2e:ui` | `npm run test:e2e:ui` | Playwright UI mode |
| `lint:security` | `npm run lint:security` | Security-focused linting |
| `lint:dead` | `npm run lint:dead` | Dead code detection (Knip) |
| `audit:deps` | `npm run audit:deps` | Dependency vulnerability audit |
| `format` | `npm run format` | Format code with Prettier |
| `format:check` | `npm run format:check` | Check formatting |
| `seed` | `npm run seed` | Seed the database |
| `prisma:generate` | `npx prisma generate` | Regenerate Prisma client |
| `prisma:push` | `npx prisma db push` | Push schema changes |

### Testing

**Unit tests (Vitest):**
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report (70% threshold)
```

**E2E tests (Playwright):**
```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive UI mode
```

**Coverage thresholds:** 70% lines, functions, branches, and statements.

### Linting

```bash
npm run lint              # ESLint (includes security rules)
npm run lint:dead         # Dead code detection
npm run lint:security     # Security-focused linting
npm run format:check      # Prettier formatting check
```

### CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs 7 jobs:

1. **Security Scan** — `npm audit` + `eslint-plugin-security`
2. **Lint** — `next lint` + `prettier --check`
3. **Type Check** — `tsc --noEmit`
4. **Dead Code Detection** — `knip`
5. **Unit Tests** — `vitest` with coverage
6. **E2E Tests** — Playwright (Chromium)
7. **Build** — `next build`

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Run linting: `npm run lint`
6. Commit your changes
7. Push to your fork and submit a Pull Request

### Good First Issues

Look for issues labeled `good first issue` in the GitHub issue tracker.

---

## Documentation

All project documentation is maintained in the repository root:

| Document | Description |
|----------|-------------|
| [README.md](README.md) | **This file** — full project documentation, API reference, and setup guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines, development workflow, and code standards |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards and behavior expectations (Contributor Covenant v2.1) |
| [SECURITY.md](SECURITY.md) | Security policy, vulnerability reporting process, and security measures |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [LICENSE](LICENSE) | MIT License |
| [AUDIT-REPORT.md](AUDIT-REPORT.md) | Pre-release code quality and security audit report |

### Quick Reference

- **New here?** Start with [Quick Start](#quick-start) above
- **API integration?** See [API Reference](#api-reference) with curl examples for all 80 endpoints
- **Contributing?** Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow
- **Found a bug?** [Open an issue](https://github.com/dboard/dboard/issues)
- **Security concern?** Follow the process in [SECURITY.md](SECURITY.md)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/dboard/dboard/issues)
- **Security:** See [SECURITY.md](SECURITY.md) for vulnerability reporting
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md)
