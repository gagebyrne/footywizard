# FootyWizard — Requirements Document

## 1. Product Overview

FootyWizard is a web application for Fantasy Premier League (FPL) managers who want data-driven help picking their weekly lineup. After a user registers and selects a 15-player squad, the application runs an integer linear programming (ILP) optimizer against the squad and the current gameweek's fixtures to surface the best possible starting eleven, identify transfer targets, and track how accurate its own predictions have been over the season.

The intended audience is any FPL participant who wants to replace manual lineup intuition with algorithmic optimization while retaining full control over squad composition.

---

## 2. User Roles

There is a single authenticated user role: **FPL Manager**.

An FPL Manager can:

- Create an account and sign in using email and password.
- Build and save a 15-player squad subject to FPL composition rules.
- View an optimized starting eleven and bench on the dashboard.
- Browse transfer targets ranked by expected points.
- Review next-three-gameweek fixture difficulty for every squad player.
- Inspect the algorithm's historical accuracy metrics.

There are no admin, guest, or read-only roles.

---

## 3. Functional Requirements

### 3.1 Authentication

**FR-01** — The application must allow a visitor to create an account with email and password. Passwords must be at least 8 characters. The sign-up form must include a confirm-password field and validate that both fields match before submitting.

**FR-02** — After sign-up, Supabase sends a confirmation email. The user is shown a success message instructing them to check their email before signing in.

**FR-03** — An existing user must be able to sign in with email and password. Failed authentication returns an error message beneath the form.

**FR-04** — All routes under `/dashboard`, `/team`, and `/history` must redirect unauthenticated visitors to `/login`.

**FR-05** — An authenticated user must be able to sign out from the application navigation bar. Sign-out is implemented as a server action that ends the Supabase session and redirects to `/login`.

**FR-06** — An OAuth callback route (`/auth/callback`) must exchange an authorization code for a Supabase session and redirect the user to `/dashboard` on success, or to `/login?error=confirmation_failed` on failure.

---

### 3.2 Squad Management

**FR-07** — A logged-in user without a saved squad must be redirected from `/dashboard` to `/team` to build their squad before they can see lineup recommendations.

**FR-08** — The squad builder must allow selection of exactly 15 players: 2 GK, 5 DEF, 5 MID, 3 FWD.

**FR-09** — The squad builder must enforce a maximum of 3 players from any single Premier League club.

**FR-10** — The squad builder must prevent adding a player who would exceed the per-position or per-team limits; the add button for ineligible players must be disabled with a descriptive reason.

**FR-11** — The player selection list must display a real-time xP score (60% form + 40% points-per-game), price in £m, and position badge for each player.

**FR-12** — The player list must support filtering by position (GK / DEF / MID / FWD), club, maximum price, and an "available only" toggle that hides injured, doubtful, and unavailable players.

**FR-13** — The player search must be accent-insensitive (NFD normalization), matching against `web_name`, `first_name`, and `second_name`.

**FR-14** — The filtered player list must be capped at 60 results, sorted by xP descending.

**FR-15** — The squad panel must show current position slot counts (e.g., "DEF 3/5") and the total squad cost in £m.

**FR-16** — The Save Squad button must be disabled until exactly 15 players are selected. On save, the squad's player IDs are upserted to the `user_squads` table (keyed on `user_id`) and the user is redirected to `/dashboard`.

**FR-17** — When a user returns to `/team` with an existing squad, the builder must pre-populate the squad panel with their previously saved players.

---

### 3.3 Lineup Optimization

**FR-18** — On every dashboard load, the application must run the ILP optimizer against the user's saved 15-player squad IDs and the current gameweek's fixtures from the FPL API.

**FR-19** — The optimizer must try all 7 valid FPL formations: 3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-3-2, 5-4-1. The formation producing the highest total expected points is selected.

**FR-20** — Expected points for each player must be calculated as: `0.7 × (5 − fixture_difficulty) + 0.3 × form_score`. Players whose status is not `'a'` (available) must receive 0 expected points and cannot appear in the starting eleven.

**FR-21** — The ILP model must enforce: exactly 11 players selected, position counts matching the chosen formation, and a maximum of 3 players from any single club. Budget is not a binding constraint when optimizing a saved squad.

**FR-22** — The player with the highest expected points in the optimal lineup must be designated captain.

**FR-23** — The 4 squad players not included in the starting eleven must be displayed as the bench.

**FR-24** — Each time the optimizer runs successfully, it must persist the prediction (gameweek, formation, lineup expected points, per-player expected points, captain) to `data/historical-predictions.json`. If a record for the same gameweek already exists, it must be overwritten.

**FR-25** — If the optimizer finds no feasible lineup (e.g., too few available players), the dashboard must show an error state with a descriptive message.

---

### 3.4 Dashboard

**FR-26** — The dashboard header must display total expected points, the chosen formation string (e.g., "4-3-3"), and squad value in £m.

**FR-27** — The formation pitch must render the goalkeeper, defensive line, midfield line, and forward line as rows on a stylized pitch graphic, with each player shown as a card.

**FR-28** — The captain's card must display a gold captain badge (C).

**FR-29** — Each player card must display: the player's portrait image fetched from `resources.premierleague.com`; a silhouette SVG fallback if the image fails to load; the player's web name; their club abbreviation; and a numeric metric value.

**FR-30** — The formation pitch must provide a toggle between "Expected Pts" (xP) and "Form Score" display modes. In xP mode the card shows the optimizer's expected points value; in form mode it shows the FPL `form` field.

**FR-31** — Players with a non-available status (`d` = Doubtful, `i` = Injured, `u` = Unavailable) must display a color-coded badge on their card and in all player lists.

**FR-32** — Clicking or tapping a player card must open a popover showing: fixture score, form score, next 3 fixtures with difficulty ratings and home/away indicator, availability status (if not available), and stats for PPG, total points, and ownership percentage.

**FR-33** — The bench must be displayed below the pitch in a distinct section.

**FR-34** — Transfer targets and the fixture outlook must load concurrently in a Suspense boundary with skeleton fallbacks, so the pitch renders without waiting for secondary data.

---

### 3.5 Transfer Targets

**FR-35** — The Transfer Targets panel must display the top 15 players by expected points who are not in the user's 15-player squad (irrespective of whether they are in the starting eleven).

**FR-36** — Each row must show: rank, player name with status badge, club abbreviation, position, xP, price in £m, form score, and next fixture with a green/yellow/red difficulty indicator.

**FR-37** — Transfer targets must be calculated using the same xP formula as the squad builder: 60% form + 40% PPG.

---

### 3.6 Fixture Outlook

**FR-38** — The Fixture Outlook panel must display all 15 squad players with their next 3 upcoming fixtures, sorted so players with favorable runs appear first.

**FR-39** — Each fixture cell must show the opponent abbreviation, home (`v`) or away (`@`) indicator, and a color-coded difficulty badge (green ≤ 2, yellow = 3, red ≥ 4).

**FR-40** — A player whose next 3 fixtures all have difficulty ≤ 2 must be flagged "Favorable". A player whose next 3 fixtures all have difficulty ≥ 4 must be flagged "Unfavorable".

**FR-41** — The fixture difficulty values displayed must use the position-based difficulty override computed by the `/api/fpl/fixtures` route (see FR-43), not the raw FPL difficulty values.

---

### 3.7 Prediction History

**FR-42** — The History page must display aggregate accuracy metrics across all recorded gameweeks: Mean Absolute Error (MAE), captain hit rate (percentage of gameweeks where the captain was the highest-scoring player), and Pearson correlation between predicted and actual points.

**FR-43** — The per-gameweek table must show, for each recorded gameweek: gameweek number, formation, predicted total expected points, actual total points (or "N/A" if not yet backfilled), and the absolute error.

**FR-44** — Gameweeks must be sorted most-recent first.

**FR-45** — Actual points are backfilled automatically into `historical-predictions.json` after each gameweek finishes. Captain points are counted double in the actual total, consistent with FPL rules.

---

## 4. Non-Functional Requirements

**NFR-01 — Data freshness.** FPL bootstrap data (players, teams, events) and fixtures are fetched fresh on each dashboard load (`export const dynamic = 'force-dynamic'`). There is no application-level caching layer between the FPL API and the browser.

**NFR-02 — Optimization latency.** The ILP solver runs with a 10-second timeout per formation. With 7 formations and a squad of 15 players the total solve time is typically well under 1 second.

**NFR-03 — Security.** All protected routes check for a valid Supabase session server-side and redirect to `/login` if absent. Server actions re-validate the session before reading or writing user data. Supabase Row-Level Security (RLS) is expected to be configured on the `user_squads` table in the database.

**NFR-04 — Responsive layout.** The team builder uses a two-column desktop layout and a mobile tab switcher (Pick Players / My Squad). All tables support horizontal scrolling on small viewports.

**NFR-05 — Browser support.** The application targets modern evergreen browsers. No polyfills for legacy browsers are included.

**NFR-06 — Player images.** Player portraits are loaded from `https://resources.premierleague.com/premierleague/photos/players/110x140/p{code}.png`. This hostname is allowlisted in `next.config.ts`. Portrait load failures fall back to an SVG silhouette without user-visible errors.

---

## 5. Out of Scope

The following are explicitly not implemented in the current version:

- Live gameweek tracking (points updating in real time during matches).
- Transfer budget enforcement — the optimizer does not restrict transfers by the user's available budget.
- Transfer suggestions that account for selling prices, free transfers, or hit costs.
- Multi-user comparison or league table views.
- Price change predictions.
- Automatic squad import from a user's official FPL team ID.
- Push notifications or email alerts for deadline reminders.
- Mobile native applications (iOS / Android).
