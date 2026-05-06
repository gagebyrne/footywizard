# ADR 0001: Convert xP Signals to FPL Point Units Before Weighting

**Status:** Accepted

## Context

The redesigned position-specific xP formula blends heterogeneous signals:
- `xGI_per_90` — typically 0.0–0.8
- `form` — FPL rolling average, typically 0–12
- `PPG` — season average, typically 0–10
- `clean_sheets_per_90` — 0.0–1.0
- `saves_per_90` — 0–5

Two approaches were considered for making these signals comparable before weighting:

**Normalisation to 0–1:** divide each signal by a hardcoded maximum (e.g. `xGI ÷ 1.0`, `form ÷ 12`). This produces a dimensionless blended score. Simple, but the output is a unitless rank — not a point estimate. A player's xP of `0.60` can't be compared against a 6-point actual, breaking the History page.

**Point conversion:** multiply each signal by its FPL scoring equivalent before weighting, so the output lands in point units. `xGI_per_90 × 4.5` for MIDs (goal ≈ 5pts, assist ≈ 3pts, blended), `clean_sheets_per_90 × 6` for GKs/DEFs, etc.

## Decision

Use point conversion. All signals are expressed in FPL point-equivalent units before weighting. The resulting xP is interpretable as a point estimate, not a rank.

Conversion factors:
- `xGI_per_90 × 4.5` — MID
- `xGI_per_90 × 5.0` — FWD (goals weighted higher)
- `clean_sheets_per_90 × 6` — GK and DEF
- `goals_scored_per_90 × 6 + assists_per_90 × 3` — DEF attacking contribution
- `saves_per_90 × 0.33` — GK

## Consequences

- xP values are directly comparable to actual FPL points — the History page MAE, Pearson correlation, and the FPL benchmark column all operate on the same scale.
- Users see xP numbers they recognise (e.g. Bruno at ~5.5) rather than opaque 0–1 scores.
- The conversion factors are assumptions based on FPL scoring rules, not fitted to data. They will need tuning as history data accumulates. If a factor is wrong, it skews that signal's effective weight — this should be monitored via the History page FPL benchmark comparison.
- Normalisation to 0–1 is not used anywhere in the xP pipeline.
