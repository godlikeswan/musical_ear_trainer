import { createAdditiveVoice, createFmVoice } from './voices'
import type { Instrument } from './types'

/** Struck string: 1:1 FM gives the hollow body, the fast index decay the knock. */
const piano: Instrument = {
  id: 'piano',
  name: 'Piano',
  createVoice: (context, destination, options) =>
    createFmVoice(context, destination, options, {
      ratio: 1,
      index: 1.6,
      indexDecay: 0.25,
      decay: 2.2,
      gain: 0.9,
      filter: { start: 6000, end: 800, decay: 0.6 },
    }),
}

/** Same FM pair, tamed, plus the inharmonic 14:1 partial that rings like a tine. */
const electricPiano: Instrument = {
  id: 'electric-piano',
  name: 'Electric piano',
  createVoice: (context, destination, options) =>
    createFmVoice(context, destination, options, {
      ratio: 1,
      index: 1.1,
      indexDecay: 0.12,
      decay: 2.8,
      gain: 0.8,
      filter: { start: 4200, end: 700, decay: 0.5 },
      partial: { ratio: 14, gain: 0.12, decay: 0.9 },
    }),
}

/** Wooden bar: the 4th partial dominates and everything dies quickly. */
const marimba: Instrument = {
  id: 'marimba',
  name: 'Marimba',
  createVoice: (context, destination, options) =>
    createFmVoice(context, destination, options, {
      ratio: 4,
      index: 1.2,
      indexDecay: 0.06,
      decay: 0.5,
      attack: 0.002,
      gain: 0.85,
      filter: { start: 3000, end: 900, decay: 0.2 },
    }),
}

/** Additive drawbars: no decay at all, the note sounds until it is released. */
const organ: Instrument = {
  id: 'organ',
  name: 'Organ',
  createVoice: (context, destination, options) =>
    createAdditiveVoice(context, destination, options, {
      gain: 0.5,
      attack: 0.03,
      release: 0.14,
      partials: [
        { ratio: 1, gain: 1 },
        { ratio: 2, gain: 0.6 },
        { ratio: 3, gain: 0.4 },
        { ratio: 4, gain: 0.25 },
        { ratio: 6, gain: 0.15 },
        { ratio: 8, gain: 0.12 },
      ],
    }),
}

export const INSTRUMENTS: readonly Instrument[] = [
  piano,
  electricPiano,
  marimba,
  organ,
]

export const DEFAULT_INSTRUMENT_ID = piano.id

export function getInstrument(id: string): Instrument {
  return INSTRUMENTS.find((instrument) => instrument.id === id) ?? piano
}