<div align="center">
  <img src="public/wizard-icon.png" alt="FootyWizard" width="120"/>
  <h1>FootyWizard</h1>
  <p>A data-driven Fantasy Premier League lineup optimizer.</p>
</div>

---

## Overview

FootyWizard helps FPL managers replace lineup intuition with algorithmic optimization. After building a 15-player squad, the app runs an Integer Linear Programming (ILP) solver across all 7 valid FPL formations to recommend the best possible starting eleven, surface transfer targets ranked by expected points, and track the accuracy of its own predictions over the season.

## Features

- **Lineup optimizer** — ILP solver picks the highest-value XI from your squad, selects formation automatically, and designates a captain
- **Squad builder** — enforces FPL composition rules (2 GK / 5 DEF / 5 MID / 3 FWD, 3-player club cap) with real-time filtering and search
- **Transfer targets** — top-15 non-squad players ranked by expected points with fixture difficulty indicators
- **Fixture outlook** — next-3-gameweek difficulty for all 15 squad players using position-based difficulty overrides
- **Prediction history** — season-long accuracy metrics: MAE, captain hit rate, and Pearson correlation

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| Next.js | 16 (App Router) | Framework, server actions, route handlers |
| React | 19 | UI rendering |
| TypeScript | ^5 | Static typing |
| Tailwind CSS | ^4 | Styling |
| shadcn/ui (Radix UI) | — | Headless UI primitives |
| Supabase | — | Email/password auth and squad persistence |
| fpl-fetch | ^2.9.0 | FPL public API wrapper |
| javascript-lp-solver | ^1.0.3 | ILP optimization engine |
| Vitest | ^4 | Unit testing |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone <repo-url>
cd footywizard
npm install
```

### 2. Configure environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create the database table

Run this in your Supabase project's SQL editor:

```sql
create table user_squads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_ids integer[] not null,
  updated_at timestamptz not null default now()
);

alter table user_squads enable row level security;

create policy "Users can manage their own squad"
  on user_squads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Also add `{your-site-url}/auth/callback` to the allowed redirect URLs in your Supabase project's Authentication settings.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run tests

```bash
npm test
```

## Project Structure

```
footywizard/
├── app/                        # Next.js App Router pages and API routes
│   ├── page.tsx                # Public landing page
│   ├── login/                  # Sign-in / sign-up + server actions
│   ├── dashboard/              # Optimized lineup dashboard
│   ├── team/                   # Squad builder
│   ├── history/                # Prediction history page
│   ├── auth/callback/          # Supabase OAuth code exchange
│   └── api/fpl/fixtures/       # Fixture route with difficulty overrides
├── components/                 # Shared React components
├── lib/
│   ├── optimizer/              # ILP solver, expected-points formula, validation
│   ├── history/                # JSON persistence and accuracy metrics
│   └── supabase/               # Server and browser Supabase clients
├── data/
│   └── historical-predictions.json  # Persisted gameweek predictions
├── tests/                      # Vitest unit tests
└── docs/                       # Requirements and technical documentation
```

## Deployment

FootyWizard targets [Vercel](https://vercel.com). Push the repo, import it in the Vercel dashboard, add the two `NEXT_PUBLIC_SUPABASE_*` environment variables, and deploy — no custom build command needed.

> **Production note:** `data/historical-predictions.json` is written to the local filesystem. On Vercel's serverless infrastructure, writes outside `/tmp` are not durable across function invocations. For persistent prediction history in production, replace the file-based store in `lib/history/predictions.ts` with a Supabase table.

## Documentation

- [`docs/requirements.md`](docs/requirements.md) — full functional and non-functional requirements
- [`docs/technical.md`](docs/technical.md) — architecture, data sources, optimization engine, API routes, auth flow, and deployment details
