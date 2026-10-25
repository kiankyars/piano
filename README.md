# Piano, one day at a time

**[Open the practice page →](https://kiankyars.github.io/piano/)**

A simple daily practice for a returning pianist whose playing is ahead of their sight-reading. The page opens directly to a four-bar exercise in standard piano notation. Use an acoustic or digital piano; no MIDI, account or subscription is required.

## The daily hour

| Time | What to do |
| --- | --- |
| 30 minutes | Read the exercise on the page. Preview, play once, check, then choose **Next exercise**. |
| 30 minutes | Work on your pieces: improve a useful passage or learn part of an easy new piece, then enjoy playing. |

Start at level 1. Read the notes before using **Hear it** to check the result. Keep a slow pulse; let a small mistake go and check it afterward. Move up only when fresh exercises are comfortable. The [start-here guide](curriculum/first-week.md) explains the first attempt.

## What the exercises cover

| Level | Main demand |
| --- | --- |
| 1 | C major, five-note positions, hands alternating |
| 2 | C major melody over held bass notes |
| 3 | C, G and F major, mostly stepwise motion and some eighth notes |
| 4 | Simple left-hand two-note chords and broken patterns |
| 5 | Phrases in 3/4, using familiar keys |
| 6 | Gentle 6/8, using familiar keys |

Every exercise has a five-line treble staff and a five-line bass staff, with no printed finger numbers or note names. These are short, original, constrained exercises, not a complete repertoire curriculum or an exam-grade assessment. Repeated musical patterns are expected. Keep the pieces you love in the other half of the hour; broader composed music remains useful as your reading develops.

- [Practice method, placement and progression](curriculum/plan.md)
- [Start here](curriculum/first-week.md)
- [Optional further study and evidence](curriculum/resources.md)

## How the page works

The browser generates a four-bar exercise from its level and seed, then renders it with a bundled copy of abcjs. The URL identifies the level and seed, so the same URL reproduces the same exercise. **Next exercise** changes the seed. The page remembers your selected level in this browser. Playback is an optional reference after your first attempt; the page does not listen to or grade your playing.

The generator and notation renderer run locally in the browser. They do not need a remote rendering service or an external score library. A complete local copy of `docs/`, including its bundled assets, can be opened through `docs/index.html`. You can also run `python3 -m http.server 8765 --directory docs` and visit `http://localhost:8765`. Loading the hosted page initially requires internet access; downloading the whole local copy avoids that dependency.

GitHub Pages serves `docs/` on `main`. Level descriptions live in `docs/curriculum.js`; the explanatory documents live in `curriculum/`. There are no analytics or paid integrations.

Run `node --test tests/exercises.test.cjs` to check notation against playback, bar lengths, note ranges, staff structure and exercise variety. No package installation is needed. See [third-party notices](THIRD_PARTY_NOTICES.md) for the bundled renderer's license and provenance.
