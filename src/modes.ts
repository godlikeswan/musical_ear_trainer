export type ModeField =
  | {
      kind: 'toggle'
      id: string
      label: string
      defaultValue: boolean
    }
  | {
      kind: 'choice'
      id: string
      label: string
      options: readonly string[]
      defaultValue: string
    }
  | {
      kind: 'range'
      id: string
      label: string
      min: number
      max: number
      step: number
      defaultValue: number
    }

export type ModeSettings = Record<string, string | number | boolean>

export type Mode = {
  id: string
  label: string
  description: string
  fields: readonly ModeField[]
  /** Modes that are listed but not playable yet. */
  disabled?: boolean
}

export const MODES: readonly Mode[] = [
  {
    id: 'notes',
    label: 'Notes',
    description: 'Name the single note you hear.',
    fields: [
      {
        kind: 'choice',
        id: 'range',
        label: 'Range',
        defaultValue: 'Two octaves',
        options: ['One octave', 'Two octaves', 'Full keyboard'],
      },
      {
        kind: 'toggle',
        id: 'includeAccidentals',
        label: 'Include accidentals',
        defaultValue: true,
      },
      {
        kind: 'toggle',
        id: 'revealOctave',
        label: 'Require octave numbers',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'intervals',
    label: 'Intervals',
    description: 'Name the interval played between two notes.',
    disabled: true,
    fields: [
      {
        kind: 'choice',
        id: 'intervalSet',
        label: 'Interval set',
        defaultValue: 'Within an octave',
        options: [
          'Within an octave',
          'Perfect consonances',
          'Thirds and sixths',
          'Tritone and sevenths',
        ],
      },
      {
        kind: 'choice',
        id: 'direction',
        label: 'Playback',
        defaultValue: 'Ascending',
        options: ['Ascending', 'Descending', 'Harmonic', 'Random'],
      },
      {
        kind: 'range',
        id: 'tempo',
        label: 'Tempo (BPM)',
        min: 40,
        max: 120,
        step: 5,
        defaultValue: 70,
      },
      {
        kind: 'toggle',
        id: 'playRootFirst',
        label: 'Play the root note first',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'chords',
    label: 'Chords',
    description: 'Name the root and quality of the chord you hear.',
    fields: [
      {
        kind: 'choice',
        id: 'qualities',
        label: 'Qualities',
        defaultValue: 'Major and minor',
        options: ['Major and minor', 'All three'],
      },
      {
        kind: 'choice',
        id: 'spacing',
        label: 'Spacing',
        defaultValue: 'Narrow',
        options: ['Narrow', 'Wide', 'Both'],
      },
      {
        kind: 'choice',
        id: 'inversion',
        label: 'Inversion',
        defaultValue: 'Root position only',
        options: ['Root position only', 'Any inversion'],
      },
      {
        kind: 'choice',
        id: 'bass',
        label: 'Bass note',
        defaultValue: 'Chord bass',
        options: ['Chord bass', 'No bass', 'Trap bass', 'Any'],
      },
    ],
  },
  {
    id: 'progressions',
    label: 'Progressions',
    description: 'Name the chord progression played in sequence.',
    fields: [
      {
        kind: 'choice',
        id: 'progressionSet',
        label: 'Progression set',
        defaultValue: 'Rock and pop',
        options: ['Rock and pop', 'Minor key loops', 'Cadences', 'Blues'],
      },
      {
        kind: 'choice',
        id: 'key',
        label: 'Key',
        defaultValue: 'Random key',
        options: ['Random key', 'Fixed key'],
      },
      {
        kind: 'choice',
        id: 'answerFormat',
        label: 'Answer format',
        defaultValue: 'Chord names',
        options: ['Chord names', 'Roman numerals'],
      },
      {
        kind: 'choice',
        id: 'spacing',
        label: 'Spacing',
        defaultValue: 'Random',
        options: ['Random', 'Narrow', 'Wide'],
      },
      {
        kind: 'choice',
        id: 'inversion',
        label: 'Inversion',
        defaultValue: 'Any inversion',
        options: ['Any inversion', 'Root position only'],
      },
      {
        kind: 'range',
        id: 'tempo',
        label: 'Tempo (BPM)',
        min: 40,
        max: 120,
        step: 5,
        defaultValue: 80,
      },
      {
        kind: 'choice',
        id: 'replay',
        label: 'Replays',
        defaultValue: 'Play once',
        options: ['Play once', 'Unlimited replay'],
      },
    ],
  },
  {
    id: 'scales',
    label: 'Scales',
    description: 'Name the scale or mode played as a run of notes.',
    disabled: true,
    fields: [
      {
        kind: 'choice',
        id: 'scale',
        label: 'Scale',
        defaultValue: 'Major and minor',
        options: ['Major and minor', 'Modes', 'Blues', 'Pentatonic'],
      },
      {
        kind: 'choice',
        id: 'direction',
        label: 'Playback',
        defaultValue: 'Ascending',
        options: ['Ascending', 'Descending', 'Ascending and descending'],
      },
      {
        kind: 'range',
        id: 'octaves',
        label: 'Octaves',
        min: 1,
        max: 3,
        step: 1,
        defaultValue: 1,
      },
      {
        kind: 'toggle',
        id: 'resolveTonic',
        label: 'Finish on the tonic',
        defaultValue: true,
      },
    ],
  },
]

export const DEFAULT_MODE_ID = 'chords'

export function getDefaultSettings(fields: readonly ModeField[]): ModeSettings {
  const settings: ModeSettings = {}

  for (const field of fields) {
    settings[field.id] = field.defaultValue
  }

  return settings
}