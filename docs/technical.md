# FootyWizard — IT / Technical Document

## 1. Architecture Overview

FootyWizard is a Next.js 16 application using the App Router. The rendering model mixes server and client components:

- **Server components** fetch data from the FPL public API and Supabase on every request. Pages are marked `export const dynamic = 'force-dynamic'` to prevent static caching.
- **Client components** handle interactive UI — the formation pitch display-mode toggle, the team builder, and all popover/tooltip interactions.
- **Server actions** handle form submissions (sign-in, sign-up, sign-out, save squad) with full server-side session validation.
- **Supabase** provides authentication (email/password, session cookies) and the single persistence table (`user_squads`).
- **FPL public API** (via the `fpl-fetch` npm package) provides player data, team data, events (gameweeks), and fixture lists. No API key is required.
- **javascript-lp-solver** runs the ILP optimization entirely within the Node.js server process — no external solver service is needed.
- **Prediction history** is stored as a JSON file on the local filesystem (`data/historical-predictions.json`), written by server-side code after each optimization run.

```
Browser
  │
  ├─ GET /  ─────────────────────> app/page.tsx (Server component, landing)
  ├─ GET /login ─────────────────> app/login/page.tsx (Client component)
  ├─ POST /login/actions ────────> Server action → Supabase auth
  ├─ GET /dashboard ─────────────> app/dashboard/page.tsx (Server component)
  │    ├─ runOptimization()  ────> FPL API + javascript-lp-solver
  │    ├─ FormationPitch  ───────> Client component
  │    ├─ TransferTargets ───────> Client component (Suspense)
  │    └─ FixtureOutlook ────────> Client component (Suspense)
  ├─ GET /team ──────────────────> app/team/page.tsx (Server component)
  │    └─ TeamBuilder ───────────> Client component
  ├─ GET /history ───────────────> app/history/page.tsx (Server component)
  └─ GET /api/fpl/fixtures ──────> Next.js Route Handler
```

---

## 2. Technology Stack

| Technology | Version | Role |
|---|---|---|
| Next.js | 16.2.4 | Framework (App Router, server actions, route handlers) |
| React | 19.2.4 | UI rendering |
| TypeScript | ^5 | Static typing across the entire codebase |
| Tailwind CSS | ^4 | Utility-first styling |
| @tailwindcss/postcss | ^4 | PostCSS integration for Tailwind v4 |
| shadcn/ui (Radix UI) | — | Headless UI primitives (Table, Popover) |
| @radix-ui/react-popover | ^1.1.15 | Player tooltip popover |
| @radix-ui/react-slot | ^1.2.4 | Composable slot primitive |
| class-variance-authority | ^0.7.1 | Variant-based class generation |
| clsx | ^2.1.1 | Conditional class name utility |
| tailwind-merge | ^3.5.0 | Tailwind class conflict resolution |
| lucide-react | ^1.11.0 | Icon library |
| @supabase/supabase-js | ^2.104.1 | Supabase JavaScript client |
| @supabase/ssr | ^0.10.2 | Server-side Supabase client with cookie handling |
| fpl-fetch | ^2.9.0 | FPL public API wrapper |
| javascript-lp-solver | ^1.0.3 | Integer linear programming solver |
| vitest | ^4.1.5 | Unit test runner |
| @vitejs/plugin-react | ^6.0.1 | Vitest React plugin |
| eslint | ^9 | Linting |
| eslint-config-next | 16.2.4 | Next.js ESLint rules |

---

## 3. Project Structure

```
footywizard/
├── app/                        # Next.js App Router pages and route handlers
│   ├── page.tsx                # Public landing page
│   ├── layout.tsx              # Root layout (global styles, metadata)
│   ├── globals.css             # Global CSS
│   ├── login/
│   │   ├── page.tsx            # Sign-in / sign-up form (client component)
│   │   └── actions.ts          # signIn, signUp server actions
│   ├── dashboard/
│   │   ├── page.tsx            # Optimized lineup dashboard (server component)
│   │   └── actions.ts          # signOut server action
│   ├── team/
│   │   ├── page.tsx            # Squad builder page (server component)
│   │   └── actions.ts          # saveSquad server action
│   ├── history/
│   │   └── page.tsx            # Prediction history page (server component)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts        # Supabase OAuth code exchange
│   └── api/
│       └── fpl/
│           └── fixtures/
│               └── route.ts    # Fixtures endpoint with difficulty override
│
├── components/                 # Shared React components
│   ├── app-nav.tsx             # Authenticated navigation bar (server component)
│   ├── formation-pitch.tsx     # Pitch graphic with player cards (client)
│   ├── player-card.tsx         # Individual player card with portrait (client)
│   ├── player-tooltip.tsx      # Player detail popover (client)
│   ├── team-builder.tsx        # Squad selection interface (client)
│   ├── transfer-targets.tsx    # Transfer target table (client)
│   ├── fixture-outlook.tsx     # Fixture difficulty table (client)
│   ├── captain-badge.tsx       # Captain (C) badge overlay
│   ├── status-badge.tsx        # D/I/U availability badge
│   ├── cache-handler.tsx       # Client-side optimization cache
│   ├── error-boundary.tsx      # Error boundary wrapper
│   ├── lineup-skeleton.tsx     # Loading skeleton for the pitch
│   └── ui/                     # shadcn/ui primitives (table, popover, …)
│
├── lib/                        # Shared server-side logic
│   ├── optimizer/
│   │   ├── run-optimization.ts     # Orchestrates FPL fetch + ILP solve + persistence
│   │   ├── expected-points.ts      # Expected points formula
│   │   ├── ilp-solver.ts           # ILP model builder and multi-formation runner
│   │   └── formation-validator.ts  # Post-solve constraint validation
│   ├── history/
│   │   ├── predictions.ts          # JSON persistence for prediction records
│   │   └── metrics.ts              # MAE, captain hit rate, correlation calculations
│   ├── supabase/
│   │   ├── server.ts               # Server-side Supabase client (cookie-based)
│   │   └── client.ts               # Browser-side Supabase client
│   ├── types/
│   │   ├── fpl.ts                  # Re-exports from fpl-fetch (Player, Team, Fixture, Event)
│   │   └── optimizer.ts            # OptimizeResponse, ConstraintStatus types
│   ├── cache.ts                    # (Cache utilities)
│   └── utils.ts                    # cn() class merger, normalizeStr() accent helper
│
├── data/
│   └── historical-predictions.json # Persisted prediction records (filesystem)
│
├── tests/
│   ├── optimizer/
│   │   ├── expected-points.test.ts
│   │   ├── ilp-solver.test.ts
│   │   └── multi-formation.test.ts
│   └── history/
│       ├── metrics.test.ts
│       └── predictions.test.ts
│
├── public/
│   └── wizard-icon.svg             # Application logo
│
├── docs/                           # Project documentation
│   ├── requirements.md
│   └── technical.md
│
├── next.config.ts                  # Next.js configuration (image remote patterns)
├── tsconfig.json                   # TypeScript configuration
├── vitest.config.ts                # Vitest test configuration
├── package.json
└── CLAUDE.md / AGENTS.md           # AI assistant project instructions
```

---

## 4. Data Sources

### 4.1 FPL Bootstrap Static

Fetched via `fpl.getBootstrapData()` from the `fpl-fetch` package. Returns:

- `elements` — All current FPL players with stats (`form`, `points_per_game`, `now_cost`, `status`, `element_type`, `team`, `photo`, `selected_by_percent`, `total_points`).
- `teams` — All Premier League clubs with `id`, `name`, `short_name`, and league `position`.
- `events` — All 38 gameweeks; the current gameweek is identified by `is_current: true`.

### 4.2 FPL Fixtures

Fetched via `fpl.getFixtures()`. Returns all fixtures for the season. The internal `/api/fpl/fixtures` route overrides the raw FPL difficulty values using a position-based algorithm (see Section 6). The optimizer consumes fixtures filtered to `event === currentEvent.id`.

### 4.3 Supabase — user_squads Table

The application reads and writes one table: `user_squads`.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid | Supabase Auth user ID (primary key / unique constraint for upsert) |
| `player_ids` | integer[] | Array of 15 FPL player element IDs |
| `updated_at` | timestamptz | ISO timestamp of last save |

The table is queried with `.maybeSingle()`, returning `null` when no row exists for the current user. The upsert uses `onConflict: 'user_id'` so each user has at most one squad row.

### 4.4 Prediction History — Filesystem JSON

Historical predictions are stored in `data/historical-predictions.json` as an array of `PredictionRecord` objects:

```typescript
{
  gameweek: number;           // FPL event ID
  timestamp: string;          // ISO datetime of when the prediction was made
  formation: string;          // e.g. "4-3-3"
  totalExpectedPoints: number;
  totalActualPoints?: number; // backfilled after gameweek finishes
  captain: {
    playerId: number;
    playerName: string;
  };
  predictions: Array<{
    playerId: number;
    playerName: string;
    expectedPoints: number;
    actualPoints?: number;    // backfilled
  }>;
}
```

---

## 5. Optimization Engine

### 5.1 Expected Points Formula

File: `lib/optimizer/expected-points.ts`

```
xP = 0.7 × fixtureScore + 0.3 × formScore
```

- `fixtureScore = 5 − difficulty` (where `difficulty` is 1–5; lower difficulty → higher score).
- `formScore = parseFloat(player.form)` — the FPL rolling form metric.
- Players with `status !== 'a'` return `xP = 0`.
- Players with no fixture in the current gameweek return `xP = 0`.

The formation pitch's display-mode toggle uses a slightly different client-side formula for display purposes: `0.6 × form + 0.4 × PPG`. The optimizer always uses the `0.7/0.3` fixture-weighted formula.

### 5.2 Multi-Formation ILP Solver

File: `lib/optimizer/ilp-solver.ts`

The solver is powered by `javascript-lp-solver` (pure JavaScript ILP). For each of the 7 valid FPL formations, `solveLineup()` builds a binary ILP model:

- **Objective:** maximize `Σ xP_i × selected_i`
- **Decision variables:** one binary variable per player (`player_{id} ∈ {0, 1}`)
- **Constraints:**
  - `totalSelected = 11`
  - `gkCount = formation.gk` (always 1)
  - `defCount = formation.def`
  - `midCount = formation.mid`
  - `fwdCount = formation.fwd`
  - `budget ≤ budgetLimit` (99,999 × £0.1m = effectively unlimited for saved squads; £100m for hypothetical full-pool optimization)
  - `team_{id} ≤ 3` for each club represented in the player pool

`optimizeAllFormations()` calls `solveLineup()` for all 7 formations and selects the result with the highest `totalExpectedPoints`. After selection, `validateLineup()` checks the solution against all constraints and throws if any violation is found (indicating a solver bug).

### 5.3 Captain Selection

The captain is the player in the optimal lineup with the highest expected points. No manual override is provided.

### 5.4 Bench

The 4 squad players not selected by the optimizer are the bench. They are determined by `Set` difference between all 15 squad IDs and the 11 lineup IDs.

---

## 6. API Routes

### GET /api/fpl/fixtures

File: `app/api/fpl/fixtures/route.ts`

Returns fixture data with difficulty values overridden by the opponent's current league position rather than FPL's own difficulty ratings.

**Position-to-difficulty mapping:**

| League position | Difficulty |
|---|---|
| 1–4 | 5 (hardest) |
| 5–8 | 4 |
| 9–12 | 3 |
| 13–16 | 2 |
| 17–20 | 1 (easiest) |

The override is applied to both `team_h_difficulty` and `team_a_difficulty` based on the **opponent's** position. For a home team, `team_h_difficulty` is set to the away team's position-derived difficulty (and vice versa).

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `event` | integer (optional) | Filter to a specific gameweek number |

**Response:** `Fixture[]` or `{ error: string }` with HTTP 500.

---

## 7. Authentication and Authorization

### 7.1 Supabase Auth

Authentication uses Supabase's built-in email/password system via `@supabase/ssr`. Sessions are stored in HTTP-only cookies managed by the Supabase SSR client.

**Sign-up flow:**
1. User submits email + password via the `signUp` server action.
2. `supabase.auth.signUp()` is called; Supabase sends a confirmation email.
3. The user must click the confirmation link, which hits `/auth/callback?code=...`.
4. The callback route calls `supabase.auth.exchangeCodeForSession(code)` and redirects to `/dashboard`.

**Sign-in flow:**
1. User submits email + password via the `signIn` server action.
2. `supabase.auth.signInWithPassword()` is called.
3. On success, `redirect('/dashboard')` is called; Next.js sets session cookies.

**Sign-out:**
Implemented as a server action (`signOut`) that calls `supabase.auth.signOut()` and redirects to `/login`.

### 7.2 Route Protection

Each protected page (dashboard, team, history) calls `supabase.auth.getUser()` at the top of the server component and issues `redirect('/login')` if `user` is null. The `saveSquad` server action performs the same check before any database operation.

There is no Next.js middleware file; protection is done per-page.

### 7.3 User Identity and Squad Linkage

The `user.id` from Supabase Auth (a UUID) is used as the `user_id` column in `user_squads`. All squad reads and writes are scoped to `user.id`.

---

## 8. Environment Variables

The following environment variables must be set before running the application:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | The Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | The Supabase anonymous/public API key |

Both variables are prefixed `NEXT_PUBLIC_` so they are available in the browser client (`lib/supabase/client.ts`) as well as on the server.

No `.env.example` file is committed to the repository. Create a `.env.local` file at the project root with the values above.

---

## 9. Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd footywizard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp /dev/null .env.local
   ```
   Then add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Create the Supabase table**
   In your Supabase project's SQL editor, run:
   ```sql
   create table user_squads (
     user_id uuid primary key references auth.users(id) on delete cascade,
     player_ids integer[] not null,
     updated_at timestamptz not null default now()
   );

   -- Enable Row Level Security
   alter table user_squads enable row level security;

   create policy "Users can manage their own squad"
     on user_squads
     for all
     using (auth.uid() = user_id)
     with check (auth.uid() = user_id);
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   The application is available at `http://localhost:3000`.

6. **Run tests**
   ```bash
   npm test
   ```

---

## 10. Deployment

FootyWizard is designed for deployment on **Vercel**.

1. Push the repository to GitHub / GitLab / Bitbucket.
2. Import the project in the Vercel dashboard.
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings under Environment Variables.
4. Deploy. No custom build command is required; Vercel detects Next.js automatically and runs `next build`.

**Important notes for production:**

- The `data/historical-predictions.json` file is written to the local filesystem by the server. On Vercel's serverless/edge infrastructure, filesystem writes to paths outside `/tmp` are not persistent across function invocations. For durable prediction history in production, replace the file-based persistence in `lib/history/predictions.ts` with a Supabase table or another persistent store.
- The FPL public API has no authentication requirement and no published rate limits, but it should not be called more frequently than necessary. The `force-dynamic` setting means every page load triggers at least one FPL API call.
- The Supabase auth callback URL (`{origin}/auth/callback`) must be added to the list of allowed redirect URLs in the Supabase project's Authentication settings.
