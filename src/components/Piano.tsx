import { WHITE_PITCH_CLASSES, midiToOctave } from '../audio/midi.ts'
import './Piano.css'

const DISPLAY_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const

const SPOKEN_NAMES = [
  'C',
  'C sharp',
  'D',
  'D sharp',
  'E',
  'F',
  'F sharp',
  'G',
  'G sharp',
  'A',
  'A sharp',
  'B',
] as const

const BLACK_KEY_WIDTH_RATIO = 0.62
const START_MIDI = 36
const OCTAVE_COUNT = 4

type PianoKey = {
  midi: number
  label: string
  spokenLabel: string
  isWhite: boolean
  leftWhiteIndex: number
}

function buildKeys(): { keys: PianoKey[]; whiteCount: number } {
  const endMidi = START_MIDI + OCTAVE_COUNT * 12
  const keys: PianoKey[] = []
  let whiteCount = 0

  for (let midi = START_MIDI; midi <= endMidi; midi += 1) {
    const pitchClass = midi % 12
    const isWhite = WHITE_PITCH_CLASSES.has(pitchClass)

    keys.push({
      midi,
      label: `${DISPLAY_NAMES[pitchClass]}${midiToOctave(midi)}`,
      spokenLabel: `${SPOKEN_NAMES[pitchClass]} ${midiToOctave(midi)}`,
      isWhite,
      leftWhiteIndex: whiteCount - 1,
    })

    if (isWhite) whiteCount += 1
  }

  return { keys, whiteCount }
}

const { keys: KEYS, whiteCount: WHITE_KEY_COUNT } = buildKeys()
const WHITE_KEY_WIDTH = 100 / WHITE_KEY_COUNT

type PianoProps = {
  showLabels?: boolean
  highlighted?: readonly number[]
  disabled?: boolean
  onSelect?: (midi: number) => void
}

function Piano({
  showLabels = false,
  highlighted = [],
  disabled = false,
  onSelect,
}: PianoProps) {
  const highlightedMidi = new Set(highlighted)

  return (
    <div className="piano">
      {KEYS.map((key) => {
        const style = key.isWhite
          ? undefined
          : {
              left: `${(key.leftWhiteIndex + 1) * WHITE_KEY_WIDTH}%`,
              width: `${WHITE_KEY_WIDTH * BLACK_KEY_WIDTH_RATIO}%`,
            }

        return (
          <button
            key={key.midi}
            type="button"
            className={`piano__key ${
              key.isWhite ? 'piano__key--white' : 'piano__key--black'
            }`}
            style={style}
            aria-label={key.spokenLabel}
            data-active={highlightedMidi.has(key.midi) || undefined}
            disabled={disabled}
            onClick={() => onSelect?.(key.midi)}
          >
            {showLabels ? (
              <span className="piano__label">{key.label}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export default Piano