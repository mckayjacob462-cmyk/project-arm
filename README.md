# Rapid Traverse

An interactive trainer for the G and M codes used on the **Hardinge VMC with
Fanuc 0i-18M control** — the code set on the two RIT shop sheets
(`RIT0292a-Schwenzer` and `RIT0293a-Schwenzer`).

Two pages, no build step: a pocket app (`index.html`) and a workbench
(`trainer.html`). Both read the same deck and the same progress, so a code
you master on the phone is mastered on the laptop.

## Put it on a phone

Open the app in Safari or Chrome, then **Share → Add to Home Screen**. It
gets its own icon, opens full screen with no browser bars, and works with no
signal at all — which is most of a machine shop. No app store, no account,
nothing to install from anywhere: it is a link, so anybody you send it to has
it.

# Installing it

`manifest.webmanifest` and `sw.js` are what make the pocket app installable:
a home-screen icon, `display: standalone` so it opens without browser
furniture, and a service worker that precaches the shell — both pages,
`engine.js`, every icon — then serves cache-first. Open it once with signal
and it works offline forever after. The Google Fonts are cached on that first
visit too, so even the typography survives a dead zone. Three home-screen
shortcuts jump straight to Study, Browse or Games.

Every path in the manifest and in the worker is relative, so the app works at
a subpath like `/project-arm/` as happily as at a domain root. `VERSION` in
`sw.js` is what evicts the old cache — bump it on any deploy.

Installing needs HTTPS. Netlify builds this repo already, and gives every
pull request its own preview URL you can open on a phone before merging.
`netlify.toml` only sets cache headers: the service worker, the manifest and
the two pages must revalidate, because a CDN holding a stale worker pins
every installed phone to an old version of the app.

`.github/workflows/pages.yml` can publish to GitHub Pages instead, but it
runs only from Actions → Run workflow, never on a push — a spare tyre, so it
cannot redden the repo for a service nobody asked it to use.

# The pocket app — `index.html`

The same 63 codes as a phone-shaped study app. Five tabs along the bottom —
Home, Study, Browse, Games, Progress — and a column that tops out at 600px so
it reads the same on an iPad or a laptop. Settings live behind the gear in
the header rather than taking a tab of their own.

Everything sizes off the viewport: the card takes whatever height the screen
can spare, between a floor and a ceiling, so it suits a small iPhone, a large
iPhone and an iPad without a fixed size. The rating buttons sit at the bottom
of the screen, within one-handed reach, and every control is at least 44px.

## Home

The first thing on the screen is the one thing you probably came to do:
**Continue studying**, which reads what is actually due — overdue cards if
there are any, otherwise codes you have never seen, otherwise the ones you
starred. Under it, the decks (all, needs practice, G, M), the two games, and
a summary of progress. One tap to carry on, and nothing else competing for
the eye.

## Study

One card, one thing on it. The front is the code and nothing else — a
prompt says *tap card to reveal answer* for the first few flips and then
retires. Tap anywhere on the card and it turns over to what the code means,
the plain-English reading of it, and one worked block; the code itself is not
repeated, because you are looking at the answer to it. **Show the diagram**
draws the animation of what that code does to the machine, in place, when you
want it.

Then four buttons — **Again · Hard · Good · Easy** — each captioned with when
that choice brings the card back. Rating advances automatically, so a session
is: read, tap, read, rate.

**Gestures.** The card does not move at all until a finger has clearly
committed to a horizontal drag, so a press or a slow read never nudges it.
Past that threshold it tracks the finger from where the threshold was
crossed rather than jumping. Swipe left for the next card, right for the
previous — navigation, not grading; only the rating buttons schedule
anything. A vertical drag scrolls, and a long answer scrolls *inside* the
card rather than stretching it off the screen.

**The schedule.** Six levels, spaced 0, 1, 2, 4, 9 and 21 days apart. *Good*
moves a card up one, *Easy* two, *Hard* holds it where it is but brings it
back a little sooner, and *Again* drops it to the bottom, marks a lapse and
puts it back a few cards later in the same session. A new session deals what
is overdue first, then what is new, weakest first. Missing a code in a game
counts against it; a lucky tap in a game never promotes one.

The strip above the card shows *12 of 40* with a bar, and a star that files
the code under **Needs practice** — a deck you can study on its own.

Finish a deck and you get a session summary: cards studied, how many came
back right, what needs another pass, and the day streak. Under it: review the
ones you missed, review the difficult ones, study codes you have not seen
yet, restart the deck, or go home.

Keys: `Space` reveals · `1`–`4` rate · `←` `→` move · `S` stars.

## Browse

All 63 codes grouped by function, searchable across the code, the
description, the notes and the sample block, and filterable to G, M, starred
or not-yet-learned. A row expands in place to the full detail with its
animation, and can be sent straight to the study queue as a deck of one, or
starred for later.

## Games

**Match Up** — six codes and six definitions, shuffled. Pair them; a correct
pair settles out of the way, a wrong one marks both tiles briefly without
telling you which was right. It is timed, and the best time is kept.

**Code Rush** — sixty seconds, three lives, four choices. Questions run both
ways: name what a code does, or name the code that does a thing. Distractors
come from the same family and, where possible, the same functional group. A
streak multiplies each answer up to 5×; the high score, best streak and round
count are kept. `A`–`D` pick without reaching for the screen. Anything missed
can be handed to the Study tab as a deck of exactly those codes. The clock
stops with the screen — lock the phone and the round waits where you left it.

Both games feed the same schedule the Study tab uses, so time spent here is
not time spent away from studying.

## Progress

A learned ring over the whole sheet, the day streak, the answered count, the
starred count and the Code Rush high score, a bar per functional group, the
codes that need work — studiable as their own deck — and a tile per code
shaded by its level. Tap any tile to open that code in Browse.

## Settings

Behind the gear: theme (system, light, dark), the deck the app opens on,
whether the animated visuals draw at all, and whether the shop-floor note
shows with the answer. Game scores and study progress can each be reset from
here.

# The workbench — `trainer.html`

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

# The deck — `engine.js`

The 63 cards, the G-code interpreter, the canvas renderers, the schematics,
the block reader and the demo player live in `engine.js`, which both pages
load. One source for the card text and one source for every animation.

## Drawing the schematics

The 51 schematics share a small kit rather than each placing type by eye: one
type scale, a `chip()` that sets a label on its own plate so it can sit over a
grid or a part without fighting it, a `key()` for the diagrams carrying more
than one colour, a `caption()` that measures and wraps to a second line
instead of condensing one line edge to edge, and a heading band with a rule
under it. Each schematic is a 100×75 unit box: heading to y 10, art to y 64,
caption below that.

The toolpath views follow the same rule. Plane lines label themselves at the
right, the stock names its top face at whichever end the tool is not standing
on, and the running note sits on a plate at the bottom — so the R plane and
the top of the part can land at the same height without turning into soup.

# Running it

Both pages are complete HTML documents — no build step, no dependencies, the
fonts from Google Fonts and everything else inline. Opening `index.html` from
the filesystem works for a quick look, but a service worker needs a real
origin, so to exercise the installable app serve the folder over HTTP:

    python3 -m http.server 8000

and open `http://localhost:8000/`. Deployed, it wants HTTPS.

Each page links to the other: the trainer's footer opens the pocket app, and
the pocket app's About section opens the trainer.

Progress lives in `localStorage` under `rapid-traverse-v1`, shared by both
pages; the pocket app keeps its own settings and game scores under
`cnc-study-v1`. Nothing leaves the device, and either page still starts
cleanly if that storage is missing or corrupt.

# A caution

The card text follows the two code sheets. The plain-English notes, the
cautions and the animations are study material written around them. Canned
cycle detail and the option codes vary between machines — the control at the
machine is the authority, not this page.
