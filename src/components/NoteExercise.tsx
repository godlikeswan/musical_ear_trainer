import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  DEFAULT_NOTE_DURATION,
  DEFAULT_NOTE_VELOCITY,
  audioEngine,
} from '../audio/AudioEngine.ts'
import { getInstrument } from '../audio/instruments.ts'
import { midiToFrequency, midiToSpelling } from '../audio/midi.ts'
import {
  createNoteQuestion,
  isAnswerCorrect,
  parseNoteAnswer,
} from '../exercises/notes.ts'
import type { NoteQuestion } from '../exercises/notes.ts'
import './NoteExercise.css'

type NoteExerciseProps = {
  range: string
  includeAccidentals: boolean
  requireOctave: boolean
}

type Result = {
  correct: boolean
  noteName: string
  instrumentName: string
}

type QuestionOptions = Pick<NoteExerciseProps, 'range' | 'includeAccidentals'>

function soundNote(question: NoteQuestion) {
  audioEngine.play(getInstrument(question.instrumentId), {
    frequency: midiToFrequency(question.midi),
    duration: DEFAULT_NOTE_DURATION,
    velocity: DEFAULT_NOTE_VELOCITY,
  })
}

function NoteExercise({
  range,
  includeAccidentals,
  requireOctave,
}: NoteExerciseProps) {
  const options: QuestionOptions = { range, includeAccidentals }

  const [question, setQuestion] = useState(() => createNoteQuestion(options))
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const soundedRef = useRef<NoteQuestion | null>(null)

  // The parent remounts this component when the range settings change, so a new
  // question only ever arrives from an event handler here.
  function nextQuestion() {
    setQuestion(createNoteQuestion(options))
    setAnswer('')
    setResult(null)
  }

  // Autoplay each new note. The ref guard stops StrictMode's double-invoked
  // effect from sounding the same note twice.
  useEffect(() => {
    if (soundedRef.current === question) return

    soundedRef.current = question
    soundNote(question)
  }, [question])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    // Enter is the same key throughout: check, then advance.
    if (result !== null) {
      nextQuestion()
      return
    }

    const parsed = parseNoteAnswer(answer)
    if (parsed === null) return

    setResult({
      correct: isAnswerCorrect(parsed, question.midi, requireOctave),
      noteName: midiToSpelling(question.midi),
      instrumentName: getInstrument(question.instrumentId).name,
    })
  }

  return (
    <form className="note-exercise" onSubmit={handleSubmit}>
      <button
        type="button"
        className="note-exercise__play"
        onClick={() => soundNote(question)}
      >
        Replay note
      </button>

      <label className="note-exercise__field">
        <span className="note-exercise__label">
          Which note did you hear?
          <em>
            {requireOctave ? 'include the octave, e.g. C4' : 'the octave is optional'}
          </em>
        </span>
        <input
          className="note-exercise__input"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={requireOctave ? 'F#5' : 'F#'}
          autoFocus
          onChange={(event) => setAnswer(event.target.value)}
          value={answer}
        />
      </label>

      {result === null ? (
        <button
          type="submit"
          className="note-exercise__submit"
          disabled={answer.trim() === ''}
        >
          Check
        </button>
      ) : (
        <div className="note-exercise__feedback" role="status">
          <p
            className={`note-exercise__verdict ${
              result.correct
                ? 'note-exercise__verdict--correct'
                : 'note-exercise__verdict--wrong'
            }`}
          >
            {result.correct ? 'Correct.' : `That was ${result.noteName}.`}
          </p>
          <p className="note-exercise__detail">
            Played on the {result.instrumentName}.
          </p>
          <button type="submit">Next note</button>
          <p className="note-exercise__hint">or press Enter</p>
        </div>
      )}
    </form>
  )
}

export default NoteExercise