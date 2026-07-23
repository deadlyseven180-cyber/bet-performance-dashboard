# 🎯 Bet Performance Dashboard

A production-ready SaaS dashboard that reads your betting records **directly from Google Sheets** and turns them into performance analytics, interactive charts, leaderboards and exportable reports.

Google Sheets stays the **single source of truth** — this application is strictly **read-only** and never modifies your spreadsheet.

---

## ✨ Features

- **Google Sheets integration** — connect via Service Account, API key or OAuth 2.0; pick a spreadsheet + worksheet; manual refresh and optional **60-second auto-sync** with live sync status, record count and last-sync time.
- **Win/Loss detection** — settlement status is read from your `Status` column *and intelligently inferred from Profit / Return / Stake* when the status is missing or ambiguous.
- **12 KPI cards** — Total / Pending / Won / Lost / Void, Win Rate, Total Stake, Total Returns, Net Profit, ROI, Average Odds, Average Stake — plus largest win/loss and win/loss streaks.
- **Interactive charts** (Recharts) — profit over time (daily / weekly / monthly), profit by service / account / platform / sport, win rate by bet type, stake & odds distributions.
- **Rankings** — best/worst services, best accounts, platforms, sports and bet types by profit, ROI or win rate.
- **Bet history** — searchable, sortable, filterable, paginated read-only table.
- **Global filters** — date range, service, account, platform, sport, league, bet type, status, and free-text search. All filters combine.
- **Reports** — export the **currently-filtered** data to **Excel**, **CSV** or **PDF**.
- **Premium UI** — light/dark mode, responsive layout, rounded cards, skeleton loaders, toast notifications, smooth animations.

## 🧱 Tech Stack

| Layer | Tech |
|------|------|
| Frontend | React + TypeScript + Vite + Tailwind CSS + Recharts |
| Backend | Node.js + Express + TypeScript |
| Google | Google Sheets API + OAuth 2.0 (`googleapis`) |
| Exports | `xlsx`, `papaparse`, `jspdf` |

---

## 🚀 Quick Start

Requires **Node 18+**.

```bash
# from the project root
npm install          # installs both workspaces (server + client)
npm run dev          # starts API (http://localhost:4000) + UI (http://localhost:5173)
```

Open **http://localhost:5173**. It runs immediately on a built-in **sample dataset** — no credentials required.

> The dev server proxies `/api/*` to the Express backend automatically.

---

## 🔌 Connecting your own Google Sheet

Copy `.env.example` to `.env` (in the project root) and choose a `DATA_SOURCE`:

### Option A — Service Account (recommended, read-only, no browser login)

1. In [Google Cloud Console](https://console.cloud.google.com/): create a project → enable the **Google Sheets API** → create a **Service Account** → add a **JSON key**.
2. Save the JSON to `credentials/service-account.json` (or paste it into `GOOGLE_SERVICE_ACCOUNT_JSON`).
3. **Share your spreadsheet** with the service account's email (`…@…iam.gserviceaccount.com`) as a Viewer.
4. Set in `.env`:
   ```env
   DATA_SOURCE=service
   SPREADSHEET_ID=your_spreadsheet_id
   WORKSHEET_NAME=Sheet1
   ```

### Option B — API key (public "anyone with the link" sheets only)

```env
DATA_SOURCE=apikey
GOOGLE_API_KEY=your_api_key
SPREADSHEET_ID=your_spreadsheet_id
```

### Option C — OAuth 2.0 (per-user login)

```env
DATA_SOURCE=oauth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```
Then click **Connect Google Account** on the *Data Source* page.

The **Spreadsheet ID** is the long id in the sheet URL:
`https://docs.google.com/spreadsheets/d/`**`SPREADSHEET_ID`**`/edit`

---

## 📋 Expected columns

The importer matches your headers flexibly (case/spacing/alias-insensitive), so you can keep your own titles. Supported fields:

`Date, Service, Account, Bet Platform, Sport, League, Event, Bet Type, Selection, Stake, Odds, Status, Return Amount, Profit, Notes`

- **Extra columns** are ignored safely and preserved on each record.
- **Missing optional columns** are handled gracefully (a warning is shown, processing continues).
- **Status** accepts many spellings (`won/win/w`, `lost/lose/l`, `void/push/cancelled`, `pending/open`…). If absent, win/loss is derived from Profit/Return.

---

## 🧮 Calculations

```
Net Profit  = Σ Return − Σ Stake        (settled bets)
Win Rate    = Won / (Won + Lost)         (excludes void & pending)
ROI         = Net Profit / Settled Stake
```
Also computed: Average Odds, Average Stake, Largest Win/Loss, Longest Winning/Losing Streak, Total Pending Stake, Total Settled Stake.

---

## 🗂 Architecture

```
├── server/                      # Express API (read-only)
│   └── src/
│       ├── services/            # googleSheets.service, auth.service  ← Sheets I/O
│       ├── utils/normalize.ts   # column mapping + win/loss inference
│       ├── routes/              # /api/sheets, /api/auth
│       └── data/mockData.ts     # built-in demo dataset
└── client/                      # React + Vite app
    └── src/
        ├── services/analytics.ts   # ← analytics engine (pure, decoupled from Sheets)
        ├── services/{filters,export}.ts
        ├── charts/                 # Recharts components
        ├── components/             # UI, layout, dashboard, filters, history, rankings
        ├── pages/                  # Dashboard, Charts, Rankings, History, Reports, Settings
        ├── context/DataContext.tsx # sync + filters + auto-refresh state
        ├── hooks/                  # useAnalytics, useTheme
        └── api/                    # typed API client
```

**Key design principle:** the **Google Sheets service** (data I/O) is fully separated from the **analytics engine** (`client/src/services/analytics.ts`, pure functions). Spreadsheet structure is never hardcoded — headers are mapped by alias.

### Built for future expansion
The architecture leaves room for (not yet implemented): AI screenshot importer, automatic settlement updates, bankroll tracking, multi-user auth, subscriptions, notifications, mobile app, goal tracking and multi-bookmaker support. The token store, data source layer and analytics engine are already isolated to make these additive.

---

## 📦 Production build

```bash
npm run build        # builds server (dist/) and client (client/dist/)
npm start            # runs everything from one process on $PORT
```

In production the Express server **also serves the built React app**, so the
whole thing runs as a single service on one URL (API under `/api`, UI everywhere
else) — no separate frontend host or CORS setup needed.

---

## 🌐 Deploy & share (Render)

The app deploys as **one web service** on Render's free tier. A [`render.yaml`](render.yaml)
blueprint is included.

**1. Protect it.** Because the dashboard shows private data, set a shared
password — anyone opening the URL must enter it:
- `APP_PASSWORD` = a password you choose (share it only with your people)

**2. Keep the Google connection durable.** Instead of an interactive login on
the server, provide a refresh token so it reads the sheet unattended:
- Grab it from your local grant:
  ```bash
  node -e "console.log(require('./server/data/tokens.json').refresh_token)"
  ```
- Set it as `GOOGLE_REFRESH_TOKEN` on Render (plus `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).

**3. Deploy:**
1. Push this project to a GitHub repo.
2. On **render.com → New + → Blueprint**, connect the repo (it reads `render.yaml`).
3. Fill the secret env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REFRESH_TOKEN`, `APP_PASSWORD`. `SESSION_SECRET` is auto-generated.
4. Deploy → you get `https://<your-app>.onrender.com`. Share that link + the password.

> ⚠️ **Important — publish your Google app.** While the OAuth consent screen is
> in **"Testing"**, Google expires refresh tokens after **7 days**, so the
> deployed app would stop reading your sheet weekly. To make it permanent, in
> Google Cloud → **OAuth consent screen → Publishing status → Publish app**
> (moving to "In production"). No verification is required for personal use with
> a single read-only scope — you'll just see the same "unverified app" notice
> once. After publishing, generate a fresh refresh token and update the env var.

> **Netlify?** Netlify hosts static sites/functions only, so it can't run this
> Node + Sheets backend as-is. Render (or Railway/Fly/any Node host) is the right
> fit. Netlify could host *only* the `client/dist` frontend if you deploy the API
> elsewhere and set the API base URL — more moving parts, not recommended.

### Environment variables (production)

| Var | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATA_SOURCE` | `oauth` |
| `SPREADSHEET_ID` | your sheet id |
| `WORKSHEET_NAME` | the tab, e.g. `Non Promo Tracker` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud |
| `GOOGLE_REFRESH_TOKEN` | durable read grant (see above) |
| `APP_PASSWORD` | shared viewer password |
| `SESSION_SECRET` | long random string (Render auto-generates) |

---

## 🔒 Data safety

- Uses **read-only** Google scopes (`spreadsheets.readonly`).
- No write endpoints exist. The spreadsheet is never modified.
