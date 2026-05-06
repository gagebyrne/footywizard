# ADR 0002: Treat FPL's ep_this as a Benchmark, Not a Formula Input

**Status:** Accepted

## Context

The FPL API exposes `ep_this` — FPL's proprietary expected points estimate for the current gameweek per player. It is already position-aware and fixture-adjusted. Three options were considered:

1. **Ignore it** — build entirely from first-principles signals (xGI, clean_sheets_per_90, etc.)
2. **Use it as a primary formula input** — blend it into xP alongside our own signals
3. **Use it as a benchmark** — store it at prediction time, display it on the History page for comparison, never incorporate it into the formula

Options 1 and 2 represent genuine trade-offs. Option 2 risks double-counting: if we apply our own fixture multiplier on top of an `ep_this` value that already bakes in fixture difficulty, we corrupt the signal. Option 1 means ignoring a well-tuned expert signal entirely.

## Decision

Use `ep_this` as a benchmark only (Option 3). At the point of saving a prediction, store the sum of `ep_this` across the 11 selected players as `fpl_expected_points`. Display it on the History page as a third column alongside our xP and actual points:

| GW | Our xP | FPL xP | Actual |
|----|--------|--------|--------|
| 32 | 54.2   | 51.8   | 49.0   |

`ep_this` is never read inside `calculateExpectedPoints` or the ILP solver.

## Consequences

- Our model is fully explainable — every number traces back to a signal we own and understand.
- The History page comparison reveals where our model diverges from FPL's. Persistent divergence in one direction is a signal to investigate formula weights or conversion factors.
- We forgo the benefit of FPL's tuning during the early season when our history data is thin. This is acceptable — the benchmark column compensates by making the gap visible rather than hiding it inside a blend.
- Requires a new nullable `fpl_expected_points` column on the `predictions` table (database migration needed).
- If over time our model consistently underperforms FPL's estimate, we can revisit this decision and consider blending — but that requires enough history data to measure it meaningfully.
