# Rapid Traverse

An interactive trainer for the G and M codes used on the **Hardinge VMC with
Fanuc 0i-18M control** — the code set on the two RIT shop sheets
(`RIT0292a-Schwenzer` and `RIT0293a-Schwenzer`).

Two pages, no build step: a workbench (`index.html`) and a pocket app
(`study.html`). Both read the same deck and the same progress, so a code you
master on the phone is mastered on the laptop.

# The workbench — `index.html`

Three modes, one page.

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

# The pocket app — `study.html`

The same 63 codes as a phone-shaped study app: a sticky header, five tabs
along the bottom, and a column that tops out at 520px so it reads the same on
a laptop.

## Study

One card at a time. Tap it to reveal, then swipe — right for *Know It*, left
for *Need Practice* — or press the two buttons under the card. The card
tracks the drag, tilts, and shows its verdict stamp before it goes.

Under a revealed card, **Code Details** gives the description, the sample
block, the animated visual of what the code does to the machine, and the
shop-floor caution. The strip at the top counts mastered, learning and new
across whichever deck is filtered — all, G codes or M codes.

`Space` reveals, `←` and `→` grade, `S` shuffles.

## Browse

All 63 codes grouped by function, searchable across the code, the
description, the notes and the sample block. A row expands in place to the
full detail with its animation, and can be sent straight to the study queue
or marked known without drilling it.

## Game

**Code Rush** — sixty seconds, three lives, four choices. Questions run both
ways: name what a code does, or name the code that does a thing. Distractors
come from the same family and, where possible, the same functional group. A
streak multiplies each answer up to 5×; the high score, best streak and round
count are kept. Anything missed can be handed to the Study tab as a queue of
exactly those codes. A round pauses if you leave the tab.

## Progress

A mastery ring over the whole sheet, the answered and best-streak counts, a
bar per functional group, the codes that need work, and a tile per code
shaded by its Leitner box — tap any tile to open that code in Browse.

## Settings

Theme (system, light, dark), the deck the app opens on, whether the animated
visuals draw at all, whether the shop-floor note shows with the answer, and
an auto-reveal option that shows the answer on the first swipe instead of
grading blind. Progress can be reset from here.

# The deck — `engine.js`

The 63 cards, the G-code interpreter, the canvas renderers, the schematics
and the demo player live in `engine.js`, which both pages load. One source
for the card text and one source for every animation.

# Running it

Both pages are authored as Artifact page bodies: no `<!doctype>`, `<html>`,
`<head>` or `<body>` wrapper, because the Artifact platform supplies those at
publish time. `engine.js` sits next to them as a supporting file. Browsers
open either file directly — the fonts come from Google Fonts and everything
else is inline, with no dependencies and no network calls of its own.

Progress lives in `localStorage` under `rapid-traverse-v1`, shared by both
pages; the pocket app keeps its own settings and game scores under
`cnc-study-v1`. Nothing leaves the device.

# A caution

The card text follows the two code sheets. The plain-English notes, the
cautions and the animations are study material written around them. Canned
cycle detail and the option codes vary between machines — the control at the
machine is the authority, not this page.
