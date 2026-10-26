/** Options passed to an instrument to start a single note. */
export type VoiceOptions = {
  /** Pitch in hertz. */
  frequency: number
  /** AudioContext time at which the note begins. */
  startTime: number
  /** Note length in seconds. Sustained instruments stay open while omitted. */
  duration?: number
  /** 0..1 loudness scaling. */
  velocity?: number
}

/** A single sounding note, owned by the engine until it ends or is released. */
export type Voice = {
  /** AudioContext time the note begins. May be scheduled in the future. */
  readonly startTime: number
  /** AudioContext time after which this voice is guaranteed to be silent. */
  readonly endTime: number
  /** Fade the voice out starting at `when`. */
  release: (when: number) => void
}

export type Instrument = {
  id: string
  name: string
  createVoice: (
    context: AudioContext,
    destination: AudioNode,
    options: VoiceOptions,
  ) => Voice
}