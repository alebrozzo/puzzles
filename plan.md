# Logic Grid Puzzle Clue Generator — Plan

## Overview

A headless, test-driven TypeScript app that takes a **solved** logic-grid puzzle and
generates a clue set proven to yield a **unique** solution, with a static description
per clue. A campaign layer ties multiple independent puzzles together with shared
categories and user-authored narration. File in, files out. UI and positional puzzles
come later.

The product is a **scrambler** (answer → clues), but a uniqueness-guaranteeing scrambler
necessarily contains a **solver** inside it: it works by generate-and-test — pick clues,
solve to count solutions, iterate until exactly one remains.

## Confirmed decisions

- **Scale**: max 6 items per category → small search space, hand-written solver (no SAT).
- **Solver**: constraint-propagation + backtracking; counts solutions (stop at 2) to prove
  uniqueness; records a deduction trace.
- **Puzzle types**: Phase 1 = FLAT only. Positional (ordered category, "directly left of")
  = later phase, designed as a pluggable clue module from day one.
- **Build order**: headless `core/` + CLI first, test-driven. UI later.
- **Clue explanations**: Phase 1 = STATIC descriptions. Deduction-trace = later enhancement.
- **Input/output**: JSON input (hand-edited); output written to `.md` + `.json`.
- **Generation control**: global knobs only — `difficulty`, `maxClues`, `allowedClueTypes`
  (no per-clue pin/forbid).
- **Difficulty**: controls clue-type mix (easy → direct positives; hard → indirect/negative).
- **Non-unique input**: fail with a clear explanation.
- **Generation**: deterministic (same input → same output).
- **Campaign**: shared category POOL (any category can recur, not just characters) +
  fully-independent puzzles + user-authored narration.

## Data model

- **Category**: name + items (≤6).
- **Puzzle**: references shared categories + own local categories, a `solution`
  (bijections across categories), and `options` (`difficulty`, `maxClues`, `allowedClueTypes`).
- **Campaign**: `title`, `backstory`, pool of shared categories defined once, and an ordered
  `puzzles` list where each entry has authored `narration` + the puzzle definition.
- **Clue**: structured form (type + operands) → static natural-language description.

## Steps

1. **[DONE] Project scaffold** — TS + Vitest + CLI entry; set up `core/` (engine) and `cli/`. (foundation)
2. **[DONE] Puzzle & campaign types + JSON loader** — define model; parse/validate campaign JSON
   (item counts ≤6, solution completeness, shared-category references resolve). (depends on 1)
3. **[DONE] Solver** — constraint-propagation + backtracking over the pairwise assignment matrix;
   counts solutions (stop at 2); records deduction trace. **Highest risk — build/test first.**
   (depends on 2)
4. **[DONE] Flat clue catalog** — templates: positive, negative, disjunction, cross-category links.
   Each = structured form + static description renderer. (parallel with 3)
5. **[DONE] Clue generator (scrambler)** — enumerate candidate clues from the solution; greedily
   select a minimal set (add the clue that most reduces remaining possibilities, respecting
   `options`), re-run solver, stop when solution is forced and proven unique. (depends on 3, 4)
6. **[DONE] Output assembler** — run generator per puzzle; emit `<name>.result.md` (backstory → per
   puzzle: narration, numbered clues, descriptions, uniqueness confirmation) and `<name>.result.json`. (depends on 5)
7. **[DONE] CLI command** — `puzzle generate main.ts puzzle.ts [--out dir]`; wire loading → generation →
   output; friendly errors for invalid input or unsatisfiable options. (depends on 6)
8. **[NOT DONE] Example campaign + tests** — family-vacation example (activities puzzle, dinner puzzle)
   as fixture + end-to-end test asserting unique solutions. (depends on 7)

## Later phases (out of Phase 1 scope)

- Positional clue module (ordered categories; adjacency/ordering/distance clues).
- Deduction-trace explanations (surface the trace the solver already computes).
- Web UI (Vite + React) consuming the same `core/`.

## Relevant files (to be created)

- `core/model.ts` — Category/Puzzle/Campaign/Clue types
- `core/loader.ts` — JSON parsing + validation
- `core/solver.ts` — propagation + backtracking + solution counting + trace
- `core/clues/` — clue templates + description renderers
- `core/generator.ts` — greedy minimal-clue selection + uniqueness proof
- `core/output.ts` — markdown/JSON assembler
- `cli/index.ts` — CLI entry
- `examples/family-vacation.json` — example campaign
- `*.test.ts` — Vitest suites (solver, generator, e2e)

## Verification

Tests are the product's core value: correctness (uniqueness) is invisible in the output and
cannot be eyeballed. Testing approach avoids circularity (do NOT grade the solver with itself):

1. **Ground-truth fixtures (primary)** — small puzzles with hand-known answers; assert the app
   reproduces the exact solution. No solver in the test.
2. **Brute-force reference oracle** — a trivially-correct ~20-line checker that enumerates all
   assignments and counts those satisfying the clues (fast since ≤6 items). Differential test:
   the optimized solver must agree with it across many random puzzles. Independent of the production
   solver by design.
3. **Uniqueness** — each generated clue set yields exactly one solution.
4. **Minimality** — removing any single generated clue makes the solution non-unique.
5. **End-to-end** — `puzzle generate examples/family-vacation.json` produces a `.md` with all
   puzzles, clues, descriptions, and uniqueness confirmations.

## Suggested first checkpoint

After Steps 1–3 (scaffold + model + solver with the brute-force oracle test passing), stop and
confirm the foundation before building the generator. Highest-risk piece first.
