import { INSTRUMENTS } from '../audio/instruments.ts'
import {
  WHITE_PITCH_CLASSES,
  midiToOctave,
  midiToPitchClass,
} from '../audio/midi.ts'

type NoteRange = {
  start: number
  end: number
}

/** Inclusive MIDI bounds for each `Notes` range option. */
const NOTE_RANGES: Record<string, NoteRange> = {
  'One octave': { start: 60, end: 71 },
  'Two octaves': { start: 60, end: 83 },
  'Full keyboard': { start: 36, end: 84 },
}

const DEFAULT_RANGE = 'Two octaves'

export type NoteQuestion = {
  midi: number
  instrumentId: string
}

export type ParsedAnswer = {
  pitchClass: number
  octave: number | null
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

const ANSWER_PATTERN = /^([a-g])\s*([#b♯♭]?)\s*(-?\d{1,2})?$/i

export function createNoteQuestion(options: {
  range: string
  includeAccidentals: boolean
}): NoteQuestion {
  const range = NOTE_RANGES[options.range] ?? NOTE_RANGES[DEFAULT_RANGE]
  const candidates: number[] = []

  for (let midi = range.start; midi <= range.end; midi += 1) {
    if (options.includeAccidentals || WHITE_PITCH_CLASSES.has(midi % 12)) {
      candidates.push(midi)
    }
  }

  return {
    midi: candidates[Math.floor(Math.random() * candidates.length)],
    instrumentId: INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)].id,
  }
}

/**
 * Accepts `C4`, `F#5`, `G♭3`, `Bb` and friends. Flats are treated as
 * enharmonic equivalents of sharps, so `Gb4` and `F#4` both match F#4.
 */
export function parseNoteAnswer(text: string): ParsedAnswer | null {
  const match = ANSWER_PATTERN.exec(text.trim())

  if (match === null) return null

  const base = LETTER_PITCH_CLASSES[match[1].toUpperCase()]
  const accidental = match[2]
  const shift =
    accidental === '#' || accidental === '\u266f'
      ? 1
      : accidental === 'b' || accidental === '\u266d'
        ? -1
        : 0

  return {
    pitchClass: (((base + shift) % 12) + 12) % 12,
    octave: match[3] === undefined ? null : Number(match[3]),
  }
}

export function isAnswerCorrect(
  answer: ParsedAnswer,
  midi: number,
  requireOctave: boolean,
): boolean {
  if (requireOctave && answer.octave === null) return false
  if (answer.pitchClass !== midiToPitchClass(midi)) return false

  return answer.octave === null || answer.octave === midiToOctave(midi)
}