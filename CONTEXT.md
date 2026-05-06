# FootyWizard Domain Context

## Glossary

### xP (Expected Points)
The model's estimate of how many FPL points a player will score in a given gameweek. Calculated per-player, then summed across the 11-player lineup. xP drives both lineup selection and transfer target ranking.

Not the same as FPL's own `ep_this`/`ep_next` fields — those are FPL's proprietary estimate. Our xP is independently computed and can incorporate signals FPL's model may not surface.

### Lineup Selection
The primary optimization goal: choosing the best possible 11 starters (and captain) from a saved 15-player squad. Correctness of lineup selection matters more than numerical accuracy of the xP estimates — a model that picks the right players but overestimates their points beats one that predicts totals accurately but picks wrong players.

### Point Prediction Accuracy
Secondary goal: minimizing error between predicted xP and actual points scored. Measured via MAE, Pearson correlation, and captain hit rate on the History page. Improvements here should not come at the expense of Lineup Selection quality.

### Fixture Difficulty — Attack Dimension
How hard it is for a MID or FWD to score/assist against a given opponent. Derived from the opponent's defensive strength (`strength_defence_home` or `strength_defence_away` from the FPL Team object). A team with a strong defense raises attacking difficulty.

### Fixture Difficulty — Defense Dimension
How hard it is for a GK or DEF to keep a clean sheet against a given opponent. Derived from the opponent's attacking strength (`strength_attack_home` or `strength_attack_away` from the FPL Team object). A team with a strong attack raises defensive difficulty.

Previously, a single difficulty number was derived from league position and applied uniformly to all positions — this conflated two independent dimensions.

The fixture multiplier is computed per-position using the opponent's raw FPL team strength values, normalised across all 20 teams to a 0.5–1.5 multiplier range:
- **MID/FWD (attack):** opponent's `strength_defence_home` or `strength_defence_away` → higher opponent defence = lower multiplier
- **GK/DEF (defense):** opponent's `strength_attack_home` or `strength_attack_away` → higher opponent attack = lower multiplier
- Home/away venue is handled automatically because FPL provides separate home and away strength ratings

The `positionToDifficulty` function and league-position lookup in `fixture-difficulty.ts` are replaced by this approach.

### Captain Selection Score
A separate score used only for captain designation, not lineup selection. Computed as `xP × captainMultiplier` where the multiplier biases toward attacking positions that have high scoring ceilings:
- FWD: ×1.20
- MID: ×1.10
- DEF: ×0.75
- GK: ×0.50

The highest captain score in the lineup is designated captain. Rationale: clean sheet points are binary and capped; a striker in form can haul 15-20 points when captained, making ceiling more important than expected value for this specific decision.

### Minutes Floor
Players with fewer than 450 minutes played have unreliable per-90 stats (xGI_per_90, clean_sheets_per_90, saves_per_90). Below this threshold, the position-specific formula falls back to `0.60×PPG + 0.40×form` as the base score, with the same fixture multiplier applied. 450 minutes ≈ 5 full games — enough to be representative without excluding recently returned players for too long. Revisable once history data accumulates.

### Participation Threshold
The minimum `chance_of_playing_this_round` a player must have to be included in lineup optimization. Players below this threshold are hard-excluded (xP = 0, invisible to the ILP solver). Currently targeting ~25%.

Above the threshold, a gentle probability discount is applied so the solver naturally prefers high-certainty starters without heavily penalizing valuable doubts:

```
adjusted_xP = xP × (0.85 + 0.15 × chance_of_playing / 100)
```

| Chance | Multiplier | Discount |
|--------|------------|---------|
| 25%    | ×0.8875    | ~11%    |
| 50%    | ×0.925     | ~7.5%   |
| 75%    | ×0.9625    | ~3.75%  |
| 100% / null | ×1.0  | none    |

The discount is intentionally shallow — purpose is to break ties in favour of certainty, not to price doubts out of contention. A high-value 60% doubt still beats a mediocre certain starter.

**UX requirement:** Any doubtful player selected into the lineup must be visibly flagged in the UI (status badge, tooltip, or similar) so the user is aware of the risk. The model may include them — the user must always know when it has.

### FPL Benchmark (ep_this)
FPL's proprietary expected points estimate for the current gameweek (`ep_this` field on the Player object). Not used as a formula input — used as a benchmark stored alongside our prediction when saving, and displayed on the History page for comparison (Our xP | FPL xP | Actual). This comparison reveals where our model diverges from FPL's and informs future signal tuning.

### Position-Specific xP
The principle that GKs, DEFs, MIDs, and FWDs should have xP calculated using different signals, because FPL scoring mechanisms differ by position:
- **GK**: points from clean sheets, saves, and penalty saves — defensive dimension dominates
- **DEF**: points from clean sheets, goals, assists — mix of defensive and attacking signals
- **MID**: points from goals, assists, and clean sheet bonuses — attacking dimension dominates
- **FWD**: points from goals and assists — purely attacking signals

Previously, all positions shared the same formula: `(0.5 × PPG + 0.5 × form) × fixtureMultiplier`.

Signals are converted to FPL point-equivalent units before weighting, so xP lands in interpretable point units (not a dimensionless 0–1 score). This supports goal B (History page comparison) and is legible to users.

Point conversion factors per signal:
- `xGI_per_90 × 4.5` — MID (goal=5pts, assist=3pts, blended ~4.5)
- `xGI_per_90 × 5.0` — FWD (goals worth more relatively)
- `clean_sheets_per_90 × 6` — GK and DEF (6pts per clean sheet)
- `goals_scored_per_90 × 6 + assists_per_90 × 3` — DEF attacking contribution
- `saves_per_90 × 0.33` — GK (1pt per 3 saves)

Proposed base score formulas (weights are starting points, to be tuned against history data):
- **MID:** `0.45×(xGI_per_90×4.5) + 0.30×form + 0.25×PPG`
- **FWD:** `0.45×(xGI_per_90×5.0) + 0.30×form + 0.25×PPG`
- **GK:** `0.50×(clean_sheets_per_90×6) + 0.25×(saves_per_90×0.33) + 0.25×PPG`
- **DEF:** `0.40×(clean_sheets_per_90×6) + 0.35×form + 0.25×PPG`

Form is kept as a recency/momentum signal — it captures hot streaks, bonus points, and things that xGI/clean_sheets_per_90 miss. Reduced weight vs the original 50% because xGI and clean_sheets_per_90 are more mechanistically correct per position.
