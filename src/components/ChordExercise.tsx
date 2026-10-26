import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  DEFAULT_NOTE_DURATION,
  DEFAULT_NOTE_VELOCITY,
  audioEngine,
} from '../audio/AudioEngine.ts'
import { getInstrument } from '../audio/instruments.ts'
import { midiToFrequency } from '../audio/midi.ts'
import {
  createChordQuestion,
  describeVoicing,
  formatChordName,
  isAnswerCorrect,
  parseChordAnswer,
} from '../exercises/chords.ts'
import type { ChordQuestion } from '../exercises/chords.ts'
import './ChordExercise.css'

type ChordExerciseProps = {
  qualities: string
  spacing: string
  inversion: string
  bass: string
}

type Result = {
  correct: boolean
  expected: string
  instrumentName: string
}

function soundChord(question: ChordQuestion) {
  audioEngine.playChord(getInstrument(question.instrumentId), {
    frequencies: question.notes.map(midiToFrequency),
    duration: DEFAULT_NOTE_DURATION,
    velocity: DEFAULT_NOTE_VELOCITY,
  })
}

function ChordExercise({
  qualities,
  spacing,
  inversion,
  bass,
}: ChordExerciseProps) {
  const [question, setQuestion] = useState(() =>
    createChordQuestion({ qualities, spacing, inversion, bass }),
  )
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const soundedRef = useRef<ChordQuestion | null>(null)

  function nextQuestion() {
    setQuestion(createChordQuestion({ qualities, spacing, inversion, bass }))
    setAnswer('')
    setResult(null)
  }

  useEffect(() => {
    if (soundedRef.current === question) return

    soundedRef.current = question
    soundChord(question)
  }, [question])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (result !== null) {
      nextQuestion()
      return
    }

    const parsed = parseChordAnswer(answer)
    if (parsed === null) return

    setResult({
      correct: isAnswerCorrect(parsed, question),
      expected: formatChordName(question.root, question.quality),
      instrumentName: getInstrument(question.instrumentId).name,
    })
  }

  return (
    <form className="chord-exercise" onSubmit={handleSubmit}>
      <button
        type="button"
        className="chord-exercise__play"
        onClick={() => soundChord(question)}
      >
        Replay chord
      </button>

      <label className="chord-exercise__field">
        <span className="chord-exercise__label">
          Which chord did you hear?
          <em>e.g. C, Am or F#dim</em>
        </span>
        <input
          className="chord-exercise__input"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Am"
          autoFocus
          onChange={(event) => setAnswer(event.target.value)}
          value={answer}
        />
      </label>

      {result === null ? (
        <button
          type="submit"
          className="chord-exercise__submit"
          disabled={answer.trim() === ''}
        >
          Check
        </button>
      ) : (
        <div className="chord-exercise__feedback" role="status">
          <p
            className={`chord-exercise__verdict ${
              result.correct
                ? 'chord-exercise__verdict--correct'
                : 'chord-exercise__verdict--wrong'
            }`}
          >
            {result.correct ? 'Correct.' : `That was ${result.expected}.`}
          </p>
          <p className="chord-exercise__detail">
            {describeVoicing(question)} &middot; played on the{' '}
            {result.instrumentName}
          </p>
          <button type="submit">Next chord</button>
          <p className="chord-exercise__hint">or press Enter</p>
        </div>
      )}
    </form>
  )
}

export default ChordExercise