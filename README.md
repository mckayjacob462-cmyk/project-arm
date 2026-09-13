# Rapid Traverse

An interactive trainer for the G and M codes used on the **Hardinge VMC with
Fanuc 0i-18M control** — the code set on the two RIT shop sheets
(`RIT0292a-Schwenzer` and `RIT0293a-Schwenzer`).

Three modes, one page, no build step.

## Drill

Spaced-repetition flashcards over all 63 codes. Each card carries the
description verbatim from the sheet, a plain-English explanation, a sample
block, a shop-floor caution, and an animated demo of what the code actually
does to the machine.

- **Recall** — see the code, say the answer, grade yourself into one of five
  boxes. Low boxes come round sooner; box 5 leaves the session.
- **Multiple choice** — four distractors drawn from the same family and, where
  possible, the same functional group, so the wrong answers are plausible.
- Filter by G codes, M codes, or a functional group. Progress lives in
  `localStorage` on the viewer's own device.
- Keys: `Space` reveal · `1` `2` `3` grade · `A`–`D` pick · `R` replay the
  demo · `S` shuffle.

## Simulator

A working subset of the control. Type a program — or load one of seven
presets — and watch it run in a top (XY) and front (XZ) view together, with a
DRO, a block pointer, scrub and speed control.

Implemented: `G00`–`G04`, `G17`–`G21`, `G28`/`G30`, `G40`–`G43`, `G54`–`G59`,
the `G73`/`G74`/`G81`–`G86` canned cycles with `Q`, `R` and `P`, `G80`,
`G90`/`G91`, `G98`/`G99`, and the spindle, coolant, tool-change and
program-end M words. Arcs accept `I`/`J` or `R`. Canned cycles repeat on every
following block that carries an X or a Y, exactly as the control does — which
is what makes the `G80` demo worth watching.

The front view draws the R plane and the initial point as labelled dashed
lines, so `G98` against `G99` and `G83` against `G73` are visible rather than
memorised.

## Reference

Both sheets, searchable and grouped by function, with each row expanding to
the notes and the animation. The two footnotes from the original sheets are
reproduced where they belong.

## Running it

`index.html` is authored as an Artifact page body: it has no `<!doctype>`,
`<html>`, `<head>` or `<body>` wrapper, because the Artifact platform supplies
those at publish time. Browsers will still open the file directly — the fonts
come from Google Fonts and everything else is inline, with no dependencies and
no network calls of its own.

## A caution

The card text follows the two code sheets. The plain-English notes, the
cautions and the animations are study material written around them. Canned
cycle detail and the option codes vary between machines — the control at the
machine is the authority, not this page.
