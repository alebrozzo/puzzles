# KDP puzzle book — next-chat handoff

## Project

Plan a connected murder-mystery puzzle book. The intended audience includes pre-teens, teens, and adults, so puzzle difficulty should vary. The creator is building a TypeScript app that generates logic-grid puzzles. When discussing book scope, account for creator time and likely return; adding pages or puzzles is not automatically worthwhile.

## Planning preferences and decisions

- Plan the investigation and what readers discover before choosing puzzle mechanics, except when a discovery clearly calls for a particular format.
- Aim for four information sets when a puzzle is a grid, since the user finds one-to-one or 1x1 grids too slight.
- A sequence of puzzles may build linearly on previous answers. An answer key will appear at the end, so readers can look up an answer and continue; no fallback clues or repeated recap are needed.
- Keep a possible **case file** in mind: readers may record discoveries and use selected facts in the final puzzle. Do not force every puzzle to contribute to it.
- Do not make early puzzles point fingers through lies or contradictions. Let the opening establish the cast and situation first.
- Keep examples concise and focused on what the puzzle reveals; solving clues are noise while planning.
- Names and story details are placeholders. The user has edited the solution file directly; treat that file as the current source of truth.

## Current opening setup

A dinner is held at a house or mansion. The guests do not know one another. The host is already dead when Puzzle 1 begins. Why the host invited this group together is undecided and needs to make sense as one shared event.

## Current puzzle plan and values

See `puzzle-solutions.md` for the latest tables. Its values are still proposals, not locked canon.

1. **Puzzle 1 — The body is discovered.** Grid sets: guest, relationship to host, location when the body was discovered, and what the guest said they were doing. Current guests: Alice (business partner), Bob (neighbor), Carl (nephew), and Dave (restorer or doctor, undecided). The current location/activity assignments are in the file.
2. **Puzzle 2 — Match the place settings.** A visual matching puzzle, not necessarily a grid. The answer table has guest, seat, other place-setting detail, glass, and napkin. Some attributes overlap (for example, Alice and Bob both have lemon-slice glasses); the completed puzzle should need combined deductions rather than a single giveaway clue. Use the user’s latest table, not earlier examples.
3. **Puzzle 3 — Motives and the detective’s findings.** Grid sets: guest, possible motive, evidence found by the detective, and where the evidence was found. The current draft uses a decades-old accident, a private debt, a false alibi, and a concealed identity. The user specifically wants motives that are not obvious stereotypes of each guest’s job or relationship. These are leads, not conclusions about guilt.

The initial book length target was about 12 puzzles, but the total number and the purpose of later puzzles remain undecided.
