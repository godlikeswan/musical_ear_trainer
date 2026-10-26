import { INSTRUMENTS } from '../audio/instruments.ts'
import { midiToPitchClass, midiToSpelling, pitchClassName } from '../audio/midi.ts'

export type ChordQuality = 'major' | 'minor' | 'diminished'

/** 0 = root in the bass, 1 = third, 2 = fifth. */
export type Inversion = 0 | 1 | 2

export type Spacing = 'narrow' | 'wide'

/**
 * - `chord`: the chord's own bass note sounds.
 * - `none`:  the bass note is left out, the triad is voiced above it.
 * - `trap`:  a bass note that is *not* a chord tone sounds instead.
 */
export type BassMode = 'chord' | 'none' | 'trap'

export type ChordQuestion = {
  /** MIDI note of the root, regardless of inversion. */
  root: number
  quality: ChordQuality
  inversion: Inversion
  spacing: Spacing
  bass: BassMode
  /** MIDI notes to sound, lowest first. */
  notes: readonly number[]
  instrumentId: string
}

const TRIADS: Record<ChordQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
}

/** How the answer is written back to the user. */
export const CHORD_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
}

export const QUALITIES: readonly ChordQuality[] = ['major', 'minor', 'diminished']

/**
 * Inclusive MIDI bounds a voicing has to fit inside. The floor is C3 rather
 * than the piano's C2: a bass note below C3 is hard to pitch-identify by ear,
 * which makes the question unguessable rather than just hard.
 */
export const LOW_MIDI = 48
export const HIGH_MIDI = 84

/** Which ladder positions sound. */
const VOICING_POSITIONS: Record<Spacing, readonly number[]> = {
  narrow: [0, 1, 2],
  wide: [0, 2, 4],
}

/**
 * Consecutive chord tones climbing from the bass: for a C major triad this is
 * C E G C E G ... so index 0 is the bass and each step is the next chord tone.
 */
export function buildLadder(
  root: number,
  quality: ChordQuality,
  inversion: Inversion,
  count: number,
): number[] {
  const intervals = TRIADS[quality]
  const ladder: number[] = []
  let tone = inversion
  let current = root + intervals[tone]

  ladder.push(current)

  for (let step = 1; step < count; step += 1) {
    tone = (tone + 1) % intervals.length
    // The chord tone has to land above the previous note, so keep adding
    // octaves until it does. A single +12 is not enough once the ladder is
    // already more than an octave up.
    let candidate = root + intervals[tone]
    while (candidate <= current) candidate += 12
    current = candidate
    ladder.push(current)
  }

  return ladder
}

/**
 * Which ladder positions sound, as semitone offsets from the chord's ROOT.
 * Narrow walks consecutive chord tones; wide skips every other one, spreading
 * the triad over more than an octave.
 */
export function voicingOffsets(
  quality: ChordQuality,
  inversion: Inversion,
  spacing: Spacing,
  bass: BassMode,
): number[] {
  const start = bass === 'none' ? 1 : 0
  const ladder = buildLadder(0, quality, inversion, 6)
  const voicing = VOICING_POSITIONS[spacing].map((position) => ladder[position + start])

  if (bass === 'trap') {
    // A semitone below the chord bass: unambiguously not a chord tone, which
    // is what makes it worth guessing against.
    return [ladder[0] - 1, ...voicing]
  }

  return voicing
}

export function buildVoicing(
  root: number,
  quality: ChordQuality,
  inversion: Inversion,
  spacing: Spacing,
  bass: BassMode,
): number[] {
  return voicingOffsets(quality, inversion, spacing, bass).map(
    (offset) => root + offset,
  )
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function resolveQualities(setting: string): readonly ChordQuality[] {
  if (setting === 'All three') return QUALITIES

  return setting === 'Major and minor'
    ? ['major', 'minor']
    : QUALITIES
}

function resolveSpacings(setting: string): Spacing[] {
  if (setting === 'Both') return ['narrow', 'wide']
  if (setting === 'Wide') return ['wide']

  return ['narrow']
}

function resolveInversions(setting: string): Inversion[] {
  return setting === 'Any inversion' ? [0, 1, 2] : [0]
}

function resolveBasses(setting: string): BassMode[] {
  if (setting === 'Any') return ['chord', 'none', 'trap']
  if (setting === 'No bass') return ['none']
  if (setting === 'Trap bass') return ['trap']

  return ['chord']
}

export function createChordQuestion(settings: {
  qualities: string
  spacing: string
  inversion: string
  bass: string
}): ChordQuestion {
  const quality = pick(resolveQualities(settings.qualities))
  const spacing = pick(resolveSpacings(settings.spacing))
  const inversion = pick(resolveInversions(settings.inversion))
  const bass = pick(resolveBasses(settings.bass))

  const offsets = voicingOffsets(quality, inversion, spacing, bass)

  // The voicing is a fixed shape in semitones from the root, so the root can be
  // chosen to make the whole thing land inside the keyboard.
  const lowest = Math.min(...offsets)
  const highest = Math.max(...offsets)
  const rootMin = LOW_MIDI - lowest
  const rootMax = HIGH_MIDI - highest
  const root = rootMin + Math.floor(Math.random() * (rootMax - rootMin + 1))

  return {
    root,
    quality,
    inversion,
    spacing,
    bass,
    notes: offsets.map((offset) => root + offset),
    instrumentId: pick(INSTRUMENTS).id,
  }
}

export const INVERSION_NAMES = ['root position', '1st inversion', '2nd inversion']
const BASS_NAMES: Record<BassMode, string> = {
  chord: 'chord bass',
  none: 'no bass',
  trap: 'trap bass',
}

/** Human readable summary of how the chord was voiced, shown after answering. */
export function describeVoicing(question: ChordQuestion): string {
  return `${question.spacing} spacing, ${INVERSION_NAMES[question.inversion]}, ${BASS_NAMES[question.bass]}`
}

export function formatChordName(root: number, quality: ChordQuality): string {
  return `${midiToSpelling(root)}${CHORD_SUFFIX[quality]}`
}

/** Chord name without an octave, e.g. `F#dim`. Used where no root is sounding. */
export function formatChordLabel(
  pitchClass: number,
  quality: ChordQuality,
): string {
  return `${pitchClassName(pitchClass)}${CHORD_SUFFIX[quality]}`
}

export type ParsedChord = {
  pitchClass: number
  quality: ChordQuality
}

const LETTER_PITCH_CLASSES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const CHORD_PATTERN = /^([A-Ga-g])([#b♯♭]?)([A-Za-z°]*)$/

function qualityFromSuffix(suffix: string): ChordQuality | null {
  if (suffix === '') return 'major'

  const lower = suffix.toLowerCase()

  if (lower === 'dim' || suffix === 'o' || suffix === '°') return 'diminished'
  // `m` is minor but `M` is major, so this check has to stay case sensitive.
  if (suffix === 'm' || lower === 'min') return 'minor'
  if (suffix === 'M' || lower === 'maj') return 'major'

  return null
}

/**
 * Accepts `C`, `Am`, `F#dim`, `Bb`, `C°`. Flats count as enharmonic
 * equivalents, so `Db` and `C#` both mean C#.
 */
export function parseChordAnswer(text: string): ParsedChord | null {
  const match = CHORD_PATTERN.exec(text.replace(/\s+/g, ''))

  if (match === null) return null

  const base = LETTER_PITCH_CLASSES[match[1].toUpperCase()]
  const accidental = match[2]
  const shift =
    accidental === '#' || accidental === '♯'
      ? 1
      : accidental === 'b' || accidental === '♭'
        ? -1
        : 0
  const quality = qualityFromSuffix(match[3])

  if (quality === null) return null

  return {
    pitchClass: (((base + shift) % 12) + 12) % 12,
    quality,
  }
}

export function isAnswerCorrect(
  answer: ParsedChord,
  question: ChordQuestion,
): boolean {
  return (
    answer.pitchClass === midiToPitchClass(question.root) &&
    answer.quality === question.quality
  )
}