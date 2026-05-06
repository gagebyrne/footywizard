# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — canonical domain glossary and formula sketches for the prediction model.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If either doesn't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## Supplementary: graphify-out/

`graphify-out/` at the repo root contains a machine-generated knowledge graph of the codebase (nodes, edges, community clusters). Use it for structural exploration — understanding what connects to what, which files are most central, which communities of code are coupled.

**Important caveats:**
- It is generated, not authoritative. It can go stale if the codebase changes significantly since the last `/graphify` run.
- It describes code relationships, not domain meaning. `CONTEXT.md` is the authority on what things *mean*; `graphify-out/` tells you what things *connect to*.
- When in doubt about domain language, trust `CONTEXT.md`. When in doubt about code structure, `graphify-out/` is a useful starting point.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── graphify-out/          ← generated code graph (supplementary)
├── docs/
│   ├── adr/
│   │   ├── 0001-xp-signal-point-conversion.md
│   │   └── 0002-ep-this-as-benchmark.md
│   └── agents/            ← this directory
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

Key terms defined in `CONTEXT.md`: xP, Lineup Selection, Point Prediction Accuracy, Fixture Difficulty (Attack/Defense dimensions), Participation Threshold, Minutes Floor, Captain Selection Score, FPL Benchmark, Position-Specific xP.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (xP signal point conversion) — but worth reopening because…_
