import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { DEFAULT_NOTE_VELOCITY, audioEngine } from '../audio/AudioEngine.ts'
import { getInstrument } from '../audio/instruments.ts'
import { midiToFrequency } from '../audio/midi.ts'
import {
  checkProgression,
  chordDuration,
  createProgressionQuestion,
  describeShape,
  formatStep,
  patternRoman,
  resolveAnswerFormat,
} from '../exercises/progressions.ts'
import type {
  ProgressionCheck,
  ProgressionQuestion,
} from '../exercises/progressions.ts'
import './ProgressionExercise.css'

type ProgressionExerciseProps = {
  progressionSet: string
  /** Named keySetting rather than key, which React reserves for itself. */
  keySetting: string
  answerFormat: string
  spacing: string
  inversion: string
  tempo: string | number
  replay: string
}

function playProgression(question: ProgressionQuestion) {
  audioEngine.playSequence(
    getInstrument(question.instrumentId),
    question.chords.map((chord) => ({
      frequencies: chord.notes.map(midiToFrequency),
      duration: chordDuration(question.stepSeconds),
      velocity: DEFAULT_NOTE_VELOCITY,
    })),
    question.stepSeconds,
  )
}

function emptyAnswers(count: number): string[] {
  return Array.from({ length: count }, () => '')
}

function ProgressionExercise({
  progressionSet,
  keySetting,
  answerFormat,
  spacing,
  inversion,
  tempo,
  replay,
}: ProgressionExerciseProps) {
  const build = () =>
    createProgressionQuestion({
      progressionSet,
      key: keySetting,
      spacing,
      inversion,
      tempo,
    })

  const [question, setQuestion] = useState(build)
  const [answers, setAnswers] = useState<string[]>(() =>
    emptyAnswers(question.chords.length),
  )
  const [result, setResult] = useState<ProgressionCheck | null>(null)
  const [playsLeft, setPlaysLeft] = useState(() =>
    replay === 'Play once' ? 1 : Infinity,
  )
  const soundedRef = useRef<ProgressionQuestion | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const nextButtonRef = useRef<HTMLButtonElement | null>(null)

  const singlePlay = replay === 'Play once'
  const format = resolveAnswerFormat(answerFormat)
  const roman = format === 'roman'
  const slots = question.pattern.steps.length

  useEffect(() => {
    if (soundedRef.current === question) return

    soundedRef.current = question
    playProgression(question)
  }, [question])

  // The inputs are replaced by the feedback panel once answered, so focus has to
  // be handed to the button that continues the drill or Enter goes nowhere.
  useEffect(() => {
    if (result === null) inputRefs.current[0]?.focus()
    else nextButtonRef.current?.focus()
  }, [result, question])

  function nextQuestion() {
    const created = build()

    setQuestion(created)
    setAnswers(emptyAnswers(created.chords.length))
    setResult(null)
    setPlaysLeft(singlePlay ? 1 : Infinity)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (result !== null) nextQuestion()
    else setResult(checkProgression(question, answers, format))
  }

  function replayProgression() {
    if (playsLeft <= 0) return

    setPlaysLeft((left) => left - 1)
    playProgression(question)
  }

  function handleInput(index: number, value: string) {
    setAnswers((current) => {
      const next = [...current]
      next[index] = value

      return next
    })
  }

  /** Enter hops to the next empty box; once they are all full it submits. */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== 'Enter') return

    for (let slot = index + 1; slot < slots; slot += 1) {
      if (answers[slot].trim() === '') {
        event.preventDefault()
        inputRefs.current[slot]?.focus()

        return
      }
    }
  }

  const canSubmit = answers.every((answer) => answer.trim() !== '')

  return (
    <form className="progression-exercise" onSubmit={handleSubmit}>
      {singlePlay && playsLeft <= 0 ? null : (
        <button
          type="button"
          className="progression-exercise__play"
          onClick={replayProgression}
        >
          {singlePlay ? 'Play again' : 'Replay progression'}
        </button>
      )}

      {/* Roman numerals are only meaningful against a key, so this has to stay
          visible while answering. */}
      <p className="progression-exercise__key">{question.key.name}</p>

      {singlePlay && playsLeft === 1 ? (
        <p className="progression-exercise__notice">One listen only.</p>
      ) : null}

      {result === null ? (
        <>
          <div className="progression-exercise__slots">
            {Array.from({ length: slots }, (_, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element
                }}
                className="progression-exercise__input"
                type="text"
                maxLength={6}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={`Chord ${index + 1} of ${slots}`}
                value={answers[index]}
                onChange={(event) => handleInput(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              />
            ))}
          </div>

          <p className="progression-exercise__label">
            {roman
              ? `Name the ${slots} chords as Roman numerals.`
              : `Name the ${slots} chords, in order.`}
            <em>
              {roman
                ? `e.g. ${question.key.minor ? 'i VII VI' : 'I V vi IV'} — Enter moves to the next box`
                : 'e.g. C F G Am — Enter moves to the next box'}
            </em>
          </p>

          <button
            type="submit"
            className="progression-exercise__submit"
            disabled={!canSubmit}
          >
            Check
          </button>
        </>
      ) : (
        <div className="progression-exercise__feedback" role="status">
          <p
            className={`progression-exercise__verdict ${
              result.correct
                ? 'progression-exercise__verdict--correct'
                : 'progression-exercise__verdict--wrong'
            }`}
          >
            {result.correct
              ? 'Correct.'
              : `${result.correctCount} of ${slots} correct.`}
          </p>

          <ol className="progression-exercise__answer">
            {question.pattern.steps.map((chord, index) => {
              const wrong =
                result.wrongIndices.includes(index) ||
                result.unparsedIndices.includes(index)

              return (
                <li
                  key={index}
                  className={
                    wrong
                      ? 'progression-exercise__answer--wrong'
                      : 'progression-exercise__answer--right'
                  }
                >
                  {formatStep(question.key, chord, format)}
                </li>
              )
            })}
          </ol>

          <p className="progression-exercise__detail">
            {question.pattern.name} &middot; {patternRoman(question.pattern)}{' '}
            &middot; {question.key.name} &middot; {describeShape(question)} &middot;
            played on the {getInstrument(question.instrumentId).name}
          </p>

          <button ref={nextButtonRef} type="submit">
            Next progression
          </button>
          <p className="progression-exercise__hint">or press Enter</p>
        </div>
      )}
    </form>
  )
}

export default ProgressionExercise
