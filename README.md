# Musical Ear Trainer

A client-only ear training app for identifying notes, chords, and chord progressions by ear. Everything is synthesized live in the browser with the Web Audio API — no audio files, no backend, no account.

## Modes

| Mode | Status | What you do |
| --- | --- | --- |
| **Notes** | Ready | Name a single pitch, with optional accidentals and octave numbers. |
| **Chords** | Ready | Name the root and quality of a played chord. |
| **Progressions** | Ready | Name each chord of a progression in order, as chord names or Roman numerals. |
| **Intervals** | Planned | Identify the interval between two notes. |
| **Scales** | Planned | Identify a scale or mode played as a run. |

## What makes it different

Most trainers play the same handful of MIDI files. This one generates every question on the fly and takes the theory seriously:

- **Correct spelling in all 25 keys.** Key signatures are declared explicitly rather than derived from pitch class, so F♯ major and G♭ major stay distinct, and a chord in D♭ major is named B♭m — never A♯m.
- **Voicings that respect register.** Chords are built from voicing ladders and fitted to a fixed MIDI window (C3–C6), so nothing turns into mud or a dog whistle.
- **Curated progressions, not random chords.** 22 patterns across rock/pop, minor-key loops, cadences, and blues, including the Axis, doo-wop, Pachelbel, Andalusian, and 12-bar forms. Random chord sequences mostly sound like nonsense; these sound like music.
- **Progression answers are position-aware.** Each slot is graded separately, so you can see exactly which chord you missed.
- **No voice stealing.** Playback is scheduled against the AudioContext clock, and the voice budget counts only notes that are actually sounding — an eight-chord progression never cuts off its own ending.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. Audio starts on your first click or keypress, as browsers require.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR. |
| `npm run build` | Type-check and build for production into `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Lint with [oxlint](https://oxc.rs). |
| `npm run typecheck` | Type-check without emitting. |

## Using it

Pick a mode in the left panel and configure it on the right. Then press **Play** and answer.

In **Progressions**, the answer format decides what you type:

- **Chord names** — `C F G Am`, spelled for the key (so D♭ major uses B♭m, not A♯m).
- **Roman numerals** — `I V vi IV`, with case encoding quality. `°`, `ø`, `o`, and `dim` are all accepted for diminished.

The resolved key is shown while you answer, since Roman numerals only mean something relative to a key. One spacing and one inversion are chosen per progression and then shifted as a unit, so the whole phrase sits in a comfortable register.

## Project structure

```
src/
  audio/        Web Audio engine, voices, envelopes, instruments, MIDI helpers
  components/   Mode list, settings, piano, and one component per exercise
  exercises/    Question generation, answer parsing, and grading
  modes.ts      Mode definitions and their configurable settings
  storage.ts    Guarded localStorage helpers
```

The exercise modules are pure TypeScript with no React or DOM dependencies, which keeps the music theory testable in isolation.

## Tech

React 19, TypeScript, Vite, oxlint. The audio layer is hand-rolled: oscillator-based instruments, per-voice envelopes, and a polyphony budget, all scheduled on the AudioContext clock.

## Browser support

Any current browser with Web Audio (Chrome, Edge, Firefox, Safari). The UI has not been tuned for very small screens.
