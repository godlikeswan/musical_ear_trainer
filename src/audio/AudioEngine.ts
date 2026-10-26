import type { Instrument, Voice } from './types'

const MAX_VOICES = 16
const MIN_NOTE_DURATION = 0.12

/** Held keys are not modelled yet, so every note is cut at a fixed length. */
export const DEFAULT_NOTE_DURATION = 1.4
export const DEFAULT_NOTE_VELOCITY = 0.8
export const DEFAULT_VOLUME = 0.5

/**
 * Owns the AudioContext, master gain and polyphony budget. Instruments only
 * ever see a destination node, so they stay free of shared state.
 */
class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private volume = DEFAULT_VOLUME
  private readonly voices = new Set<Voice>()

  /**
   * The context is created on first use rather than at import time: browsers
   * refuse to start audio outside a user gesture, and this also keeps the
   * module safe to load in a non-browser environment.
   */
  private ensureContext(): { context: AudioContext; master: GainNode } {
    if (this.context === null || this.master === null) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = this.volume

      // Sixteen simultaneous voices can sum well past full scale, which clips
      // into audible crackle. The limiter only engages on those peaks.
      const limiter = this.context.createDynamicsCompressor()
      limiter.threshold.value = -3
      limiter.knee.value = 0
      limiter.ratio.value = 20
      limiter.attack.value = 0.003
      limiter.release.value = 0.1

      this.master.connect(limiter)
      limiter.connect(this.context.destination)
    }

    return { context: this.context, master: this.master }
  }

  private get output(): { context: AudioContext; master: GainNode } {
    const output = this.ensureContext()

    if (output.context.state === 'suspended') {
      void output.context.resume()
    }

    return output
  }

  /** Must be called from a user gesture before any unattended playback. */
  async unlock(): Promise<void> {
    const { context } = this.output
    if (context.state === 'suspended') await context.resume()
  }

  play(instrument: Instrument, options: NoteRequest): Voice {
    const { context } = this.output

    return this.startVoice(instrument, options, options.when ?? context.currentTime)
  }

  /**
   * Sounds every frequency at the same instant so a chord is heard as one
   * event rather than a fast arpeggio.
   */
  playChord(instrument: Instrument, options: ChordRequest): Voice[] {
    const { context } = this.output

    return this.playChordAt(instrument, options, options.when ?? context.currentTime)
  }

  /**
   * Schedules chords one after another on the audio clock. Everything is placed
   * in a single pass so the timing cannot drift: driving this from timers
   * instead would jitter and stall whenever a background tab throttles them.
   */
  playSequence(
    instrument: Instrument,
    chords: readonly ChordRequest[],
    stepSeconds: number,
  ): Voice[] {
    const { context } = this.output
    const startTime = context.currentTime

    return chords.flatMap((chord, index) =>
      this.playChordAt(instrument, chord, startTime + index * stepSeconds),
    )
  }

  private playChordAt(
    instrument: Instrument,
    options: ChordRequest,
    startTime: number,
  ): Voice[] {
    return options.frequencies.map((frequency) =>
      this.startVoice(instrument, { ...options, frequency }, startTime),
    )
  }

  private startVoice(
    instrument: Instrument,
    options: NoteRequest,
    startTime: number,
  ): Voice {
    const { context, master } = this.output

    // Pruning uses the real clock, not the scheduled start. A note booked in
    // for next bar has not finished anything yet, and judging it against its
    // own start time would retire voices that are still sounding.
    this.pruneFinishedVoices(context.currentTime)

    const voice = instrument.createVoice(context, master, {
      frequency: options.frequency,
      startTime,
      duration:
        options.duration === undefined
          ? undefined
          : Math.max(options.duration, MIN_NOTE_DURATION),
      velocity: options.velocity,
    })

    this.voices.add(voice)

    // The budget counts voices that are actually sounding. A note booked in for
    // a later bar is not using polyphony yet, and counting it would let a long
    // sequence steal its own earlier chords.
    if (this.soundingVoices(context.currentTime).length + 1 > MAX_VOICES) {
      this.stealOldestVoice(context.currentTime)
    }

    return voice
  }

  private soundingVoices(now: number): Voice[] {
    return [...this.voices].filter(
      (voice) => voice.startTime <= now && voice.endTime > now,
    )
  }

  setVolume(value: number): void {
    this.volume = Math.min(Math.max(value, 0), 1)

    // Deliberately does not create a context: changing the slider should not
    // instantiate audio before the user has interacted with the page.
    if (this.context !== null && this.master !== null) {
      // Ramp rather than jump, so slider drags do not click.
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.01)
    }
  }

  private pruneFinishedVoices(now: number): void {
    for (const voice of this.voices) {
      if (voice.endTime <= now) this.voices.delete(voice)
    }
  }

  /** Set iteration order is insertion order, so the first entry is the oldest. */
  private stealOldestVoice(now: number): void {
    const oldest = this.voices.values().next().value

    if (oldest !== undefined) {
      // A release scheduled before a voice's start time would cancel its own
      // attack, so a booked-in note is faded from the moment it begins.
      oldest.release(Math.max(now, oldest.startTime))
      this.voices.delete(oldest)
    }
  }
}

export type NoteRequest = {
  frequency: number
  duration?: number
  velocity?: number
  /** AudioContext time to start at. Defaults to now. */
  when?: number
}

export type ChordRequest = {
  frequencies: readonly number[]
  duration?: number
  velocity?: number
  /** AudioContext time to start at. Defaults to now. */
  when?: number
}

export const audioEngine = new AudioEngine()