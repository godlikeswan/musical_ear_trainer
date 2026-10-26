import { INSTRUMENTS } from '../audio/instruments.ts'
import {
  CHORD_SUFFIX,
  HIGH_MIDI,
  INVERSION_NAMES,
  LOW_MIDI,
  parseChordAnswer,
  voicingOffsets,
} from './chords.ts'
import type { ChordQuality, Inversion, Spacing } from './chords.ts'

/**
 * A chord addressed by scale degree rather than by pitch, so the same pattern
 * can be transposed and still spelled correctly.
 */
export type ProgressionStep = {
  /** Scale degree, 0 = tonic. */
  degree: number
  quality: ChordQuality
}

export type ProgressionPattern = {
  /** What the idiom is usually called, shown after answering. */
  name: string
  steps: readonly ProgressionStep[]
}

export type KeyType = 'major' | 'minor'

export type ProgressionPool = {
  id: string
  label: string
  keyType: KeyType
  patterns: readonly ProgressionPattern[]
}

export type ProgressionKey = {
  name: string
  tonicPitchClass: number
  minor: boolean
  /** Pitch class per scale degree, index 0 = tonic. */
  scale: readonly number[]
  /** Spelling per scale degree, e.g. `Eb`. */
  names: readonly string[]
}

export type ProgressionChord = {
  pitchClass: number
  quality: ChordQuality
  notes: readonly number[]
}

export type ProgressionShape = {
  spacing: Spacing
  inversion: Inversion
}

export type ProgressionQuestion = {
  pattern: ProgressionPattern
  pool: ProgressionPool
  key: ProgressionKey
  shape: ProgressionShape
  chords: readonly ProgressionChord[]
  /** Seconds between chord onsets. */
  stepSeconds: number
  instrumentId: string
}

export type AnswerFormat = 'chord' | 'roman'

const MAJ: ChordQuality = 'major'
const MIN: ChordQuality = 'minor'
const DIM: ChordQuality = 'diminished'

const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11]
/** Order accidentals enter a key signature: F C G D A E B. */
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]
/** And the reverse for flats: B E A D G C F. */
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]

type KeySpec = { name: string; tonicPitchClass: number; signature: number }

/**
 * The keys, spelled the way they are written. F# and Gb are both pitch class
 * 6 and are told apart by the signature, so the signature has to be stated
 * rather than looked up from the pitch class.
 */
const MAJOR_SPECS: readonly KeySpec[] = [
  { name: 'C major', tonicPitchClass: 0, signature: 0 },
  { name: 'G major', tonicPitchClass: 7, signature: 1 },
  { name: 'D major', tonicPitchClass: 2, signature: 2 },
  { name: 'A major', tonicPitchClass: 9, signature: 3 },
  { name: 'E major', tonicPitchClass: 4, signature: 4 },
  { name: 'B major', tonicPitchClass: 11, signature: 5 },
  { name: 'F# major', tonicPitchClass: 6, signature: 6 },
  { name: 'F major', tonicPitchClass: 5, signature: -1 },
  { name: 'Bb major', tonicPitchClass: 10, signature: -2 },
  { name: 'Eb major', tonicPitchClass: 3, signature: -3 },
  { name: 'Ab major', tonicPitchClass: 8, signature: -4 },
  { name: 'Db major', tonicPitchClass: 1, signature: -5 },
  { name: 'Gb major', tonicPitchClass: 6, signature: -6 },
]

const MINOR_SPECS: readonly KeySpec[] = [
  { name: 'A minor', tonicPitchClass: 9, signature: 0 },
  { name: 'E minor', tonicPitchClass: 4, signature: 1 },
  { name: 'B minor', tonicPitchClass: 11, signature: 2 },
  { name: 'F# minor', tonicPitchClass: 6, signature: 3 },
  { name: 'C# minor', tonicPitchClass: 1, signature: 4 },
  { name: 'G# minor', tonicPitchClass: 8, signature: 5 },
  { name: 'D minor', tonicPitchClass: 2, signature: -1 },
  { name: 'G minor', tonicPitchClass: 7, signature: -2 },
  { name: 'C minor', tonicPitchClass: 0, signature: -3 },
  { name: 'F minor', tonicPitchClass: 5, signature: -4 },
  { name: 'Bb minor', tonicPitchClass: 10, signature: -5 },
  { name: 'Eb minor', tonicPitchClass: 3, signature: -6 },
]

function buildKey(spec: KeySpec, minor: boolean): ProgressionKey {
  const sharps = spec.signature > 0
  const altered = new Set(
    sharps
      ? SHARP_ORDER.slice(0, spec.signature)
      : FLAT_ORDER.slice(0, -spec.signature),
  )
  const shiftFor = (letter: number): number => {
    if (!altered.has(letter)) return 0

    return sharps ? 1 : -1
  }

  // The tonic letter is whichever one lands on the tonic pitch class once the
  // signature is applied. Both F#/Gb resolve correctly this way.
  let tonicLetter = 0
  for (let letter = 0; letter < 7; letter += 1) {
    const pitchClass =
      ((LETTER_PITCH_CLASSES[letter] + shiftFor(letter)) % 12 + 12) % 12

    if (pitchClass === spec.tonicPitchClass) {
      tonicLetter = letter
      break
    }
  }

  const scale: number[] = []
  const names: string[] = []

  for (let degree = 0; degree < 7; degree += 1) {
    const letter = (tonicLetter + degree) % 7
    const shift = shiftFor(letter)

    names.push(
      LETTER_NAMES[letter] + (shift > 0 ? '#' : shift < 0 ? 'b' : ''),
    )
    scale.push(((LETTER_PITCH_CLASSES[letter] + shift) % 12 + 12) % 12)
  }

  return {
    name: spec.name,
    tonicPitchClass: spec.tonicPitchClass,
    minor,
    scale,
    names,
  }
}

const MAJOR_KEYS = MAJOR_SPECS.map((spec) => buildKey(spec, false))
const MINOR_KEYS = MINOR_SPECS.map((spec) => buildKey(spec, true))

/**
 * Curated rather than generated: random chord sequences are mostly incoherent,
 * which turns the drill into pattern-matching noise instead of music. Every
 * chord is diatonic to its key, which is also what keeps transposed spelling
 * unambiguous.
 */
export const PROGRESSION_POOLS: readonly ProgressionPool[] = [
  {
    id: 'pop',
    label: 'Rock and pop',
    keyType: 'major',
    patterns: [
      { name: 'Axis', steps: [step(0, MAJ), step(4, MAJ), step(5, MIN), step(3, MAJ)] },
      { name: 'Doo-wop', steps: [step(0, MAJ), step(5, MIN), step(3, MAJ), step(4, MAJ)] },
      { name: 'Two-chord vamp', steps: [step(0, MAJ), step(3, MAJ)] },
      { name: 'I–IV–V', steps: [step(0, MAJ), step(3, MAJ), step(4, MAJ)] },
      { name: 'vi–ii–V–I', steps: [step(5, MIN), step(1, MIN), step(4, MAJ), step(0, MAJ)] },
      { name: 'iii–vi–ii–V', steps: [step(2, MIN), step(5, MIN), step(1, MIN), step(4, MAJ)] },
      {
        name: 'Pachelbel',
        steps: [
          step(0, MAJ), step(4, MAJ), step(5, MIN), step(2, MIN),
          step(3, MAJ), step(0, MAJ), step(3, MAJ), step(4, MAJ),
        ],
      },
    ],
  },
  {
    id: 'minor',
    label: 'Minor key loops',
    keyType: 'minor',
    patterns: [
      { name: 'i–VI–III–VII', steps: [step(0, MIN), step(5, MAJ), step(2, MAJ), step(6, MAJ)] },
      { name: 'Andalusian', steps: [step(0, MIN), step(6, MAJ), step(5, MAJ), step(4, MAJ)] },
      { name: 'i–VII–VI', steps: [step(0, MIN), step(6, MAJ), step(5, MAJ)] },
      { name: 'i–VII–VI–VII', steps: [step(0, MIN), step(6, MAJ), step(5, MAJ), step(6, MAJ)] },
      { name: 'i–VI–VII', steps: [step(0, MIN), step(5, MAJ), step(6, MAJ)] },
      {
        name: 'Andalusian vamp',
        steps: [step(0, MIN), step(6, MAJ), step(5, MAJ), step(6, MAJ), step(0, MIN)],
      },
    ],
  },
  {
    id: 'cadence',
    label: 'Cadences',
    keyType: 'major',
    patterns: [
      { name: 'V–I', steps: [step(4, MAJ), step(0, MAJ)] },
      { name: 'IV–I', steps: [step(3, MAJ), step(0, MAJ)] },
      { name: 'V–vi', steps: [step(4, MAJ), step(5, MIN)] },
      { name: 'I–V', steps: [step(0, MAJ), step(4, MAJ)] },
      { name: 'ii–V–I', steps: [step(1, MIN), step(4, MAJ), step(0, MAJ)] },
      { name: 'IV–V–I', steps: [step(3, MAJ), step(4, MAJ), step(0, MAJ)] },
    ],
  },
  {
    id: 'blues',
    label: 'Blues',
    keyType: 'major',
    patterns: [
      { name: 'Four-bar', steps: blues([0, 3, 4, 0]) },
      { name: 'Six-bar', steps: blues([0, 3, 4, 0, 3, 4]) },
      { name: 'Eight-bar', steps: blues([0, 0, 3, 3, 4, 0, 3, 4]) },
    ],
  },
]

function step(degree: number, quality: ChordQuality): ProgressionStep {
  return { degree, quality }
}

function blues(degrees: readonly number[]): ProgressionStep[] {
  return degrees.map((degree) => step(degree, MAJ))
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/**
 * Case carries the quality, which is what makes the analysis idiomatic: I–V–vi–IV
 * in a major key and i–VII–VI–V in a minor one both fall out of the same rule.
 */
export function romanNumeral(degree: number, quality: ChordQuality): string {
  const upper = ROMAN_NUMERALS[degree]

  if (quality === 'diminished') return `${upper.toLowerCase()}°`

  return quality === 'major' ? upper : upper.toLowerCase()
}

export function patternRoman(pattern: ProgressionPattern): string {
  return pattern.steps
    .map((chord) => romanNumeral(chord.degree, chord.quality))
    .join('–')
}

/** Chord name spelled for the key, e.g. `Bbm` in Db major, never `A#m`. */
export function formatChordStep(
  key: ProgressionKey,
  chord: ProgressionStep,
): string {
  return `${key.names[chord.degree]}${CHORD_SUFFIX[chord.quality]}`
}

export function formatStep(
  key: ProgressionKey,
  chord: ProgressionStep,
  format: AnswerFormat,
): string {
  return format === 'roman'
    ? romanNumeral(chord.degree, chord.quality)
    : formatChordStep(key, chord)
}

export function formatProgression(
  question: ProgressionQuestion,
  format: AnswerFormat,
): string {
  return question.pattern.steps
    .map((chord) => formatStep(question.key, chord, format))
    .join(' ')
}

const ROMAN_DEGREES: Record<string, number> = {
  I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6,
}
const ROMAN_PATTERN = /^([ivIV]+)(°|ø|o|dim)?$/

/** Accepts `I`, `vi`, `vii°`, `ii dim`. Case alone does not decide the key. */
export function parseRomanAnswer(text: string): ProgressionStep | null {
  const match = ROMAN_PATTERN.exec(text.trim())

  if (match === null) return null

  const numeral = match[1]
  const degree = ROMAN_DEGREES[numeral.toUpperCase()]

  if (degree === undefined) return null
  if (match[2] !== undefined) return { degree, quality: DIM }

  const upper = numeral[0] === numeral[0].toUpperCase()

  return { degree, quality: upper ? MAJ : MIN }
}

/**
 * Both answer formats reduce to a scale degree, so grading compares one shape
 * regardless of how the learner wrote it.
 */
export function parseStepAnswer(
  text: string,
  format: AnswerFormat,
  key: ProgressionKey,
): ProgressionStep | null {
  if (format === 'roman') return parseRomanAnswer(text)

  const parsed = parseChordAnswer(text)

  if (parsed === null) return null

  // A pitch class outside the key signature is not a chord in this key, so it
  // cannot be graded as one.
  const degree = key.scale.indexOf(parsed.pitchClass)

  return degree < 0 ? null : { degree, quality: parsed.quality }
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function resolvePool(setting: string): ProgressionPool {
  return (
    PROGRESSION_POOLS.find((pool) => pool.label === setting) ?? PROGRESSION_POOLS[0]
  )
}

function resolveKey(setting: string, keyType: KeyType): ProgressionKey {
  const keys = keyType === 'minor' ? MINOR_KEYS : MAJOR_KEYS

  if (setting === 'Fixed key') {
    const tonic = keyType === 'minor' ? 9 : 0

    return keys.find((key) => key.tonicPitchClass === tonic) ?? keys[0]
  }

  return pick(keys)
}

function resolveSpacings(setting: string): readonly Spacing[] {
  if (setting === 'Narrow') return ['narrow']
  if (setting === 'Wide') return ['wide']

  return ['narrow', 'wide']
}

function resolveInversions(setting: string): readonly Inversion[] {
  return setting === 'Root position only' ? [0] : [0, 1, 2]
}

function resolveBpm(setting: string | number): number {
  const bpm = typeof setting === 'number' ? setting : Number(setting)

  if (!Number.isFinite(bpm)) return 80

  return Math.min(Math.max(bpm, 40), 120)
}

export function resolveAnswerFormat(setting: string): AnswerFormat {
  return setting === 'Roman numerals' ? 'roman' : 'chord'
}

export function createProgressionQuestion(settings: {
  progressionSet: string
  key: string
  spacing: string
  inversion: string
  tempo: string | number
}): ProgressionQuestion {
  const pool = resolvePool(settings.progressionSet)
  const pattern = pick(pool.patterns)
  const key = resolveKey(settings.key, pool.keyType)
  const stepSeconds = 60 / resolveBpm(settings.tempo)

  // One spacing and one inversion for the whole progression. A real progression
  // is played consistently, and re-rolling per chord would destroy the very
  // chord-to-chord motion the drill is about.
  const shape: ProgressionShape = {
    spacing: pick(resolveSpacings(settings.spacing)),
    inversion: pick(resolveInversions(settings.inversion)),
  }

  const shapes = pattern.steps.map((chord) => ({
    pitchClass: key.scale[chord.degree],
    quality: chord.quality,
    offsets: voicingOffsets(chord.quality, shape.inversion, shape.spacing, 'chord'),
  }))

  // The progression is slid as a unit into the playable range so every chord
  // shares one register: wide voicings reach 24 semitones above their root, and
  // random keys would otherwise push the top of the piano. The slide has to be a
  // whole number of octaves, or the audio would no longer be in the key the
  // question claims and the chord names would not match what sounds.
  const lowest = Math.min(
    ...shapes.map((item) => item.pitchClass + Math.min(...item.offsets)),
  )
  const highest = Math.max(
    ...shapes.map((item) => item.pitchClass + Math.max(...item.offsets)),
  )
  const octaveLow = Math.ceil((LOW_MIDI - lowest) / 12)
  const octaveHigh = Math.floor((HIGH_MIDI - highest) / 12)
  const shift =
    12 *
    (octaveLow + Math.floor(Math.random() * Math.max(octaveHigh - octaveLow + 1, 1)))

  return {
    pattern,
    pool,
    key,
    shape,
    chords: shapes.map((item) => ({
      pitchClass: item.pitchClass,
      quality: item.quality,
      notes: item.offsets.map((offset) => item.pitchClass + shift + offset),
    })),
    stepSeconds,
    instrumentId: pick(INSTRUMENTS).id,
  }
}

/** Duration for each chord, leaving a small gap before the next onset. */
export function chordDuration(stepSeconds: number): number {
  return stepSeconds * 0.92
}

export function describeShape(question: ProgressionQuestion): string {
  return `${question.shape.spacing} spacing, ${INVERSION_NAMES[question.shape.inversion]}`
}

export type ProgressionCheck = {
  correct: boolean
  correctCount: number
  /** Slots the learner got wrong, in order. */
  wrongIndices: readonly number[]
  /** Slots that could not be read as an answer at all. */
  unparsedIndices: readonly number[]
}

/**
 * Grades slot by slot rather than all or nothing. Knowing *which* position went
 * wrong is what tells the learner whether they misheard the change or just the
 * key, so a single boolean throws away the useful part.
 */
export function checkProgression(
  question: ProgressionQuestion,
  answers: readonly string[],
  format: AnswerFormat,
): ProgressionCheck {
  const wrongIndices: number[] = []
  const unparsedIndices: number[] = []
  let correctCount = 0

  question.pattern.steps.forEach((expected, index) => {
    const parsed = parseStepAnswer(answers[index] ?? '', format, question.key)

    if (parsed === null) {
      unparsedIndices.push(index)

      return
    }

    if (parsed.degree === expected.degree && parsed.quality === expected.quality) {
      correctCount += 1
    } else {
      wrongIndices.push(index)
    }
  })

  return {
    correct: correctCount === question.pattern.steps.length,
    correctCount,
    wrongIndices,
    unparsedIndices,
  }
}
