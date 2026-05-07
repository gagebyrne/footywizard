# Graph Report - .  (2026-05-07)

## Corpus Check
- 93 files · ~91,358 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 245 nodes · 325 edges · 30 communities
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.87)
- Token cost: 4,200 input · 1,850 output

## Community Hubs (Navigation)
- [[_COMMUNITY_History Analytics & Metrics|History Analytics & Metrics]]
- [[_COMMUNITY_App Routing & Pages|App Routing & Pages]]
- [[_COMMUNITY_xP Calculation & Chalk UI|xP Calculation & Chalk UI]]
- [[_COMMUNITY_Domain Model & Agent Governance|Domain Model & Agent Governance]]
- [[_COMMUNITY_Team Actions & UI Controls|Team Actions & UI Controls]]
- [[_COMMUNITY_Formation Validation & ILP Solver|Formation Validation & ILP Solver]]
- [[_COMMUNITY_Expected Points Engine|Expected Points Engine]]
- [[_COMMUNITY_Live Stats & Broadsheet|Live Stats & Broadsheet]]
- [[_COMMUNITY_Brand & Visual Identity|Brand & Visual Identity]]
- [[_COMMUNITY_Core Domain Concepts|Core Domain Concepts]]
- [[_COMMUNITY_Cache & Error Handling|Cache & Error Handling]]
- [[_COMMUNITY_App Icons & Static Assets|App Icons & Static Assets]]
- [[_COMMUNITY_Platform & Deployment Config|Platform & Deployment Config]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 11 edges
2. `optimizeAllFormations()` - 10 edges
3. `FootyWizard` - 10 edges
4. `Wizard Icon SVG` - 10 edges
5. `calculateAggregateMetrics()` - 9 edges
6. `WizardBall()` - 8 edges
7. `cn()` - 8 edges
8. `calculateExpectedPoints()` - 8 edges
9. `getPredictions()` - 7 edges
10. `runOptimization()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Wizard Icon SVG` --rationale_for--> `FootyWizard`  [INFERRED]
  public/wizard-icon.svg → README.md
- `FootyWizard` --conceptually_related_to--> `Wizard/Magic Theme`  [INFERRED]
  README.md → public/wizard-icon.svg
- `FootyWizard` --conceptually_related_to--> `Football/Soccer Theme`  [INFERRED]
  README.md → public/wizard-icon.svg
- `Next.js Logo SVG` --references--> `Next.js 16 App Router`  [INFERRED]
  public/next.svg → docs/technical.md
- `Footywizard Public Assets` --references--> `Next.js 16 App Router`  [INFERRED]
  public/next.svg → docs/technical.md

## Hyperedges (group relationships)
- **Dashboard secondary panels: transfer targets and fixture outlook both load concurrently via Suspense** — transfer_targets, fixture_outlook, fixture_difficulty_override [EXTRACTED 0.85]
- **Optimization pipeline: FPL API data feeds expected points formula feeds ILP solver to produce lineup** — fpl_api, expected_points_formula, ilp_optimizer, prediction_history_json [EXTRACTED 0.95]
- **Auth and squad persistence: Supabase Auth gates access to user_squads table protected by RLS** — supabase_auth, user_squads_table, row_level_security [EXTRACTED 0.95]
- **xP Prediction Pipeline Core Concepts** — context_xp, context_position_specific_xp, context_fixture_difficulty_attack, context_fixture_difficulty_defense, context_minutes_floor, context_participation_threshold [INFERRED 0.85]
- **History Page Display and Benchmarking** — context_history_page, context_fpl_benchmark, context_point_prediction_accuracy, adr_0002 [INFERRED 0.85]
- **Agent Governance Document Set** — agents_md, claude_md, issue_tracker_md, triage_labels_md, domain_md [EXTRACTED 1.00]

## Communities (30 total, 0 thin omitted)

### Community 0 - "History Analytics & Metrics"
Cohesion: 0.15
Nodes (10): calculateAggregateMetrics(), calculateCaptainHitRate(), calculateCorrelation(), calculateMAE(), fetchHistory(), backfillActuals(), getFpl(), getPredictions() (+2 more)

### Community 1 - "App Routing & Pages"
Cohesion: 0.12
Nodes (8): ThemeProvider(), ThemeToggle(), useTheme(), WizardBall(), signOut(), signIn(), signUp(), createClient()

### Community 2 - "xP Calculation & Chalk UI"
Cohesion: 0.11
Nodes (7): ChalkPlayer(), diffStyle(), nextThreeFixtures(), statusIndicator(), isLight(), PlayerPortrait(), teamColor()

### Community 3 - "Domain Model & Agent Governance"
Cohesion: 0.13
Nodes (22): ADR 0001: Convert xP Signals to FPL Point Units, xP Signal Point Conversion Rationale, ADR 0002: Treat FPL ep_this as Benchmark, ep_this as Benchmark Rationale, AGENTS.md — Claude Operating Rules, CLAUDE.md — Agent Instructions, Captain Selection Score, Fixture Difficulty — Attack Dimension (+14 more)

### Community 4 - "Team Actions & UI Controls"
Cohesion: 0.1
Nodes (5): addPlayer(), blockReason(), cn(), normalizeStr(), saveSquad()

### Community 5 - "Formation Validation & ILP Solver"
Cohesion: 0.17
Nodes (9): buildBasePool(), p(), validateLineup(), buildCandidate(), captainMultiplier(), designateCaptain(), optimizeAllFormations(), solveLineup() (+1 more)

### Community 6 - "Expected Points Engine"
Cohesion: 0.14
Nodes (5): availabilityMultiplier(), baseScore(), calculateExpectedPoints(), parseFloat0(), getFixtureMultiplier()

### Community 7 - "Live Stats & Broadsheet"
Cohesion: 0.14
Nodes (6): BroadsheetMasthead(), CountUp(), fetchOptimization(), savePrediction(), POST(), runOptimization()

### Community 8 - "Brand & Visual Identity"
Cohesion: 0.26
Nodes (15): App Branding and Visual Identity, Football/Soccer Theme, FootyWizard, FootyWizard Brand Identity, Hat Buckle Element, Stars on Hat Element, Magic Wand with Star (Visual Element), FootyWizard Requirements Document (+7 more)

### Community 9 - "Core Domain Concepts"
Cohesion: 0.18
Nodes (14): Expected Points Formula, Position-Based Fixture Difficulty Override, Fixture Outlook Panel, FPL Public API (fpl-fetch), ILP Lineup Optimizer, Multi-Formation Optimizer (7 valid FPL formations), Historical Predictions JSON (filesystem), Prediction History Page (MAE, captain hit rate, Pearson) (+6 more)

### Community 10 - "Cache & Error Handling"
Cohesion: 0.24
Nodes (5): CacheHandler(), formatCacheAge(), getCachedLineup(), isCacheStale(), saveCachedLineup()

### Community 11 - "App Icons & Static Assets"
Cohesion: 0.31
Nodes (9): Browser Window UI Icon (16x16), file.svg - Generic File Icon SVG, Globe / International / Web Symbol, Globe SVG Icon, Next.js Application (footywizard), FootyWizard Next.js Application, Public Static Assets Directory, File/Document Icon (generic document with folded corner) (+1 more)

### Community 12 - "Platform & Deployment Config"
Cohesion: 0.6
Nodes (5): Footywizard Public Assets, Next.js 16 App Router, Next.js Logo SVG, Vercel (Brand/Platform), Vercel Logo SVG

## Knowledge Gaps
- **11 isolated node(s):** `Fixture Outlook Panel`, `Prediction History Page (MAE, captain hit rate, Pearson)`, `Supabase Row-Level Security on user_squads`, `Globe / International / Web Symbol`, `Next.js Application (footywizard)` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `App Routing & Pages` to `History Analytics & Metrics`, `Team Actions & UI Controls`, `Live Stats & Broadsheet`?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._
- **Why does `runOptimization()` connect `Live Stats & Broadsheet` to `Formation Validation & ILP Solver`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `optimizeAllFormations()` (e.g. with `runOptimization()` and `validateLineup()`) actually correct?**
  _`optimizeAllFormations()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `FootyWizard` (e.g. with `Wizard Icon SVG` and `Wizard/Magic Theme`) actually correct?**
  _`FootyWizard` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Wizard Icon SVG` (e.g. with `FootyWizard` and `Wizard/Magic Theme`) actually correct?**
  _`Wizard Icon SVG` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `calculateAggregateMetrics()` (e.g. with `GET()` and `fetchHistory()`) actually correct?**
  _`calculateAggregateMetrics()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Fixture Outlook Panel`, `Prediction History Page (MAE, captain hit rate, Pearson)`, `Supabase Row-Level Security on user_squads` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._