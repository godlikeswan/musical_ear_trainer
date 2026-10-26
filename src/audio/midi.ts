/** Equal temperament with A4 = 440Hz, i.e. MIDI note 69. */
export const A4_MIDI = 69
export const A4_FREQUENCY = 440

/** Pitch classes that map to a white key on a piano. */
export const WHITE_PITCH_CLASSES: ReadonlySet<number> = new Set([
  0, 2, 4, 5, 7, 9, 11,
])

const PITCH_CLASS_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

/** Pitch class name with ASCII sharps, e.g. `F#`. No octave. */
export function pitchClassName(pitchClass: number): string {
  return PITCH_CLASS_NAMES[((pitchClass % 12) + 12) % 12]
}

export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12)
}

export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1
}

export function midiToPitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/** Scientific pitch notation with ASCII sharps, e.g. `F#5`. */
export function midiToSpelling(midi: number): string {
  return `${pitchClassName(midiToPitchClass(midi))}${midiToOctave(midi)}`
}

/** Same note with typographic accidentals, for on-screen labels. */
export function midiToName(midi: number): string {
  return midiToSpelling(midi).replace('#', '\u266f')
}