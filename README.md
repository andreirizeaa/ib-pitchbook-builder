# AI Pitch Deck Builder

An AI-powered pitch book generation system for investment banking. Built as a monorepo with Turborepo.

The system generates professional PowerPoint pitch decks by fetching real financial data (Yahoo Finance, SEC EDGAR), planning slide content with GPT-4o, and rendering slides with PptxGenJS. Users can upload their own PPTX templates or use built-in themes. A PowerPoint Add-in allows generating decks directly inside PowerPoint.

## Architecture

```
ai-pitchdeck-builder/
├── apps/
│   ├── web/                  Next.js 15 frontend (dashboard + viewer)
│   ├── service/              Express.js backend (API + generation pipeline)
│   └── powerpoint-addin/     Vite + React Office Add-in (runs inside PowerPoint)
├── packages/
│   └── shared-types/         Shared TypeScript type definitions
├── supabase/
│   └── migrations/           PostgreSQL schema migrations (001–004)
├── cypress/                  E2E tests
├── turbo.json                Turborepo config
└── vitest.workspace.ts       Unit test workspace
```

**Backend pipeline:** Orchestration → Template Analysis → Data Retrieval → Content Planning (GPT-4o) → Slide Building (PptxGenJS) → Preview Generation (LibreOffice → PNG)

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 22.x |
| Package Manager | npm | 10.5.0 |
| Monorepo | Turborepo | latest |
| Language | TypeScript | 5.7 |
| Frontend | Next.js, React, Tailwind CSS v4, shadcn/ui | 15.5, 19.0, 4.0 |
| Backend | Express.js | 4.21 |
| Database + Auth + Storage | Supabase (PostgreSQL) | JS SDK 2.86 |
| AI | OpenAI GPT-4o (content planning), GPT-4o-mini (chat) | SDK 6.27 |
| PowerPoint Generation | PptxGenJS | 3.12 |
| Template Parsing | JSZip + xml2js | 3.10 / 0.6 |
| Financial Data | yahoo-finance2 | 2.13 |
| Slide Previews | LibreOffice (headless) + pdftoppm (Poppler) | — |
| Office Add-in | Office.js, Vite, React | 1.1 / 6.0 / 19.0 |
| Testing | Vitest, Cypress | 4.1 / 15.12 |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) | 6.2 / 5.0 |

---

## Prerequisites

Install these **before** anything else:

### 1. Node.js 22

```bash
# macOS (using nvm)
nvm install 22
nvm use 22

# Verify
node -v   # Should print v22.x.x
npm -v    # Should print 10.x.x
```

### 2. LibreOffice (for slide preview generation)

The backend converts PPTX files to PNG preview images using LibreOffice headless mode.

```bash
# macOS
brew install --cask libreoffice

# Verify it installed to the expected path
/opt/homebrew/bin/soffice --version
```

If your LibreOffice is installed elsewhere, the backend expects it at `/opt/homebrew/bin/soffice`.

### 3. Poppler (for PDF-to-PNG conversion)

```bash
# macOS
brew install poppler

# Verify
/opt/homebrew/bin/pdftoppm -v
```

### 4. Supabase Project

You need a [Supabase](https://supabase.com) project. Once created:

1. Go to **Project Settings > API** and note your:
   - Project URL
   - `anon` public key
   - `service_role` secret key
2. Run the SQL migrations in order against your database (via the Supabase SQL Editor or CLI):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_slide_previews.sql`
   - `supabase/migrations/003_add_pb_types.sql`
   - `supabase/migrations/004_custom_deck_types.sql`
3. Create a **Storage bucket** called `pitchdeck-files` (Settings > Storage > New bucket). Make it **public** so preview images are accessible.

### 5. OpenAI API Key

Get one from [platform.openai.com](https://platform.openai.com). The system uses GPT-4o for content planning and GPT-4o-mini for the AI chat feature.

### 6. Office Add-in Dev Certificates (only needed for the PowerPoint Add-in)

The PowerPoint Add-in must be served over HTTPS. Generate self-signed dev certs:

```bash
# Install the Office Add-in dev certs tool
npx office-addin-dev-certs install

# This creates certs in ~/.office-addin-dev-certs/
# Verify they exist:
ls ~/.office-addin-dev-certs/
# Should show: localhost.key  localhost.crt  ca.crt
```

If you do **not** need the PowerPoint Add-in and only want to run the web app + backend, you can skip this step.

---

## Setup

All commands are run from the **monorepo root** (`ai-pitchdeck-builder/`).

### 1. Install dependencies

```bash
npm install
```

This installs dependencies for all workspaces (web, service, powerpoint-addin, shared-types).

### 2. Configure environment variables

You need `.env.local` files in two (or three) apps.

> **Note:** If you are a marker or supervisor reviewing this project, please contact the repository owner to receive pre-configured `.env.local` files with working API keys. This will save you from having to set up Supabase, OpenAI, and other third-party accounts yourself.

#### `apps/service/.env.local`

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-your-key

# Server
PORT=8002
NODE_ENV=development
CORS_ORIGIN=http://localhost:8000

# SEC EDGAR (use your real email — required by SEC fair access policy)
SEC_EDGAR_USER_AGENT=your-email@example.com

# Storage
STORAGE_BUCKET=pitchdeck-files

# Unsplash (optional — image sourcing works without it)
UNSPLASH_ACCESS_KEY=
```

#### `apps/web/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8002
```

#### `apps/powerpoint-addin/.env.local` (only if using the Add-in)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8002
```

### 3. Run the database migrations

Go to your Supabase project dashboard > **SQL Editor** and run each migration file in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_slide_previews.sql`
3. `supabase/migrations/003_add_pb_types.sql`
4. `supabase/migrations/004_custom_deck_types.sql`

---

## Running Locally

From the **monorepo root**:

```bash
npm run dev
```

This starts all apps in parallel via Turborepo:

| App | URL | Description |
|-----|-----|-------------|
| Web | http://localhost:8000 | Next.js dashboard and pitch book viewer |
| Service | http://localhost:8002 | Express API server |
| Service (HTTPS) | https://localhost:8012 | HTTPS version (only if dev certs exist) |
| PowerPoint Add-in | https://localhost:8003 | Office Add-in dev server (HTTPS) |
| Swagger Docs | http://localhost:8002/api-docs | Interactive API documentation |

The `predev` script automatically kills any processes on ports 8000–8003 before starting.

---

## PowerPoint Add-in Setup

The Add-in runs as a task pane inside Microsoft PowerPoint. It requires a few extra steps beyond the standard setup above.

### Requirements

- Microsoft PowerPoint (desktop app, not web)
- macOS or Windows
- Dev certs installed (see Prerequisites step 6)

### Sideloading the Add-in

1. Make sure `npm run dev` is running (all three apps need to be up).
2. Open PowerPoint.
3. Sideload the manifest:

**macOS:**
```bash
# From the monorepo root
cd apps/powerpoint-addin
npm run sideload
```

Or manually: copy `apps/powerpoint-addin/manifest.xml` to:
```
~/Library/Containers/com.microsoft.PowerPoint/Data/Documents/wef/
```
Then restart PowerPoint.

**Windows:**
Share the folder containing `manifest.xml` via a network share, then add it in PowerPoint > File > Options > Trust Center > Trusted Add-in Catalogs.

4. In PowerPoint, go to the **Home** tab. You should see a **"Pitch Deck Builder"** button in the ribbon. Click it to open the task pane.

5. Log in with your Supabase account credentials in the task pane.

### How It Works

- The Add-in communicates with the backend at `https://localhost:8012` (HTTPS required by Office.js).
- When a pitch deck is generated, it uses `Office.js insertSlidesFromBase64()` to inject the slides directly into the active PowerPoint presentation.
- You can use the AI chat feature to refine individual slides after generation.

---

## Running Tests

From the **monorepo root**:

```bash
# Unit and integration tests (all apps)
npm test

# E2E tests (requires the web app to be running)
npm run cy:open    # Interactive Cypress runner
npm run cy:run     # Headless Cypress run
```

Test reports are generated in `apps/*/test-report/index.html`.

---

## API Documentation

With the service running, visit:

- **Swagger UI:** http://localhost:8002/api-docs
- **OpenAPI JSON:** http://localhost:8002/api-docs.json

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/pitchbooks | Create a new pitch book (starts generation) |
| GET | /api/pitchbooks | List user's pitch books |
| GET | /api/pitchbooks/:id | Get a specific pitch book |
| PUT | /api/pitchbooks/:id | Update a pitch book |
| DELETE | /api/pitchbooks/:id | Delete a pitch book |
| POST | /api/templates | Upload a PPTX template |
| GET | /api/templates | List user's templates |
| GET | /api/companies/:ticker | Fetch company financials |
| GET | /api/deck-types | List available deck types |
| POST | /api/deck-types | Create a custom deck type |

---

## Production Deployment

### Backend (Render)

- **Root Directory:** `apps/service`
- **Build Command:** `npm install; npm run build`
- **Start Command:** `npm run start`
- **Environment variable:** `NPM_CONFIG_PRODUCTION=false` (so TypeScript and type definitions are installed for the build step)
- Set all env vars from `apps/service/.env.local` but with production values (e.g., `NODE_ENV=production`, `CORS_ORIGIN=https://your-frontend.vercel.app`)

### Frontend (Vercel)

- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js
- **Environment variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL` (your Render backend URL)

---

## Troubleshooting

**"LibreOffice not found" or preview generation fails:**
Slide previews require LibreOffice and Poppler. Verify both are installed:
```bash
/opt/homebrew/bin/soffice --version
/opt/homebrew/bin/pdftoppm -v
```

**"Cannot find module '@pitchdeck/shared-types'":**
Run `npm install` from the monorepo root. The shared-types package is linked via npm workspaces.

**PowerPoint Add-in not showing up:**
Make sure dev certs exist in `~/.office-addin-dev-certs/` and the dev server is running on https://localhost:8003. Restart PowerPoint after sideloading.

**CORS errors in the browser:**
Check that `CORS_ORIGIN` in the service `.env.local` matches the frontend URL exactly (including protocol and port).

**Port already in use:**
Run `npm run predev` to kill processes on ports 8000–8003, then `npm run dev`.
