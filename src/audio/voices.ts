import {
  SILENCE,
  applyDecayEnvelope,
  applyHoldEnvelope,
  applyReleaseEnvelope,
  releaseAtCurrentLevel,
} from './envelope'
import type { Voice, VoiceOptions } from './types'

const RELEASE_TIME = 0.06

/** Guarantees a decay ramp exists even for a pathologically short note. */
const MIN_DECAY = 0.02

/** Extra sine partial layered on top of the FM pair, e.g. a Rhodes tine. */
export type FmPartial = {
  ratio: number
  gain: number
  decay: number
}

export type FmParams = {
  /** Modulator frequency as a multiple of the carrier. */
  ratio: number
  /** Modulation depth, in multiples of the carrier frequency. */
  index: number
  /** How fast the modulation depth collapses; this is the "strike". */
  indexDecay: number
  /** Overall decay of the note, in seconds. */
  decay: number
  attack?: number
  gain?: number
  filter?: {
    start: number
    end: number
    decay: number
  }
  partial?: FmPartial
}

/** Two-operator FM voice: a sine carrier bent by a fast-decaying modulator. */
export function createFmVoice(
  context: AudioContext,
  destination: AudioNode,
  options: VoiceOptions,
  params: FmParams,
): Voice {
  const { frequency, startTime, duration, velocity = 1 } = options
  const attack = params.attack ?? 0.005
  const peak = velocity * (params.gain ?? 1)
  const naturalEnd = startTime + attack + params.decay
  const decayEnd = Math.max(
    duration === undefined ? naturalEnd : Math.min(naturalEnd, startTime + duration),
    startTime + attack + MIN_DECAY,
  )

  const carrier = context.createOscillator()
  const modulator = context.createOscillator()
  const modulation = context.createGain()
  const amplifier = context.createGain()

  carrier.type = 'sine'
  carrier.frequency.value = frequency
  modulator.type = 'sine'
  modulator.frequency.value = frequency * params.ratio

  modulation.gain.setValueAtTime(frequency * params.index, startTime)
  modulation.gain.exponentialRampToValueAtTime(
    SILENCE,
    startTime + params.indexDecay,
  )

  modulator.connect(modulation)
  modulation.connect(carrier.frequency)

  const sources: AudioScheduledSourceNode[] = [carrier, modulator]
  const nodes: AudioNode[] = [modulation, amplifier]
  let tail: AudioNode = carrier

  if (params.filter !== undefined) {
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.7
    filter.frequency.setValueAtTime(params.filter.start, startTime)
    filter.frequency.exponentialRampToValueAtTime(
      params.filter.end,
      startTime + params.filter.decay,
    )
    tail.connect(filter)
    nodes.push(filter)
    tail = filter
  }

  if (params.partial !== undefined) {
    const overtone = context.createOscillator()
    const overtoneGain = context.createGain()
    overtone.type = 'sine'
    overtone.frequency.value = frequency * params.partial.ratio
    applyDecayEnvelope(
      overtoneGain.gain,
      startTime,
      peak * params.partial.gain,
      attack,
      startTime + params.partial.decay,
    )
    overtone.connect(overtoneGain)
    nodes.push(overtoneGain)
    sources.push(overtone)
    overtoneGain.connect(tail)
  }

  applyDecayEnvelope(amplifier.gain, startTime, peak, attack, decayEnd)

  tail.connect(amplifier)
  amplifier.connect(destination)

  const stopAt = decayEnd + 0.02
  for (const source of sources) {
    source.start(startTime)
    source.stop(stopAt)
  }

  sources[0].onended = () => {
    for (const node of nodes) node.disconnect()
    for (const source of sources) source.disconnect()
  }

  return {
    startTime,
    endTime: stopAt,
    release(when: number) {
      if (when >= decayEnd) return

      const end = releaseAtCurrentLevel(amplifier.gain, when, RELEASE_TIME)
      for (const source of sources) source.stop(end)
    },
  }
}

export type AdditiveParams = {
  partials: readonly { ratio: number; gain: number }[]
  attack?: number
  release?: number
  gain?: number
}

/** Additive voice: one oscillator per harmonic, held until released. */
export function createAdditiveVoice(
  context: AudioContext,
  destination: AudioNode,
  options: VoiceOptions,
  params: AdditiveParams,
): Voice {
  const { frequency, startTime, duration, velocity = 1 } = options
  const attack = params.attack ?? 0.02
  const releaseTime = params.release ?? 0.12
  const peak = velocity * (params.gain ?? 1)

  const amplifier = context.createGain()
  const holdTime = applyHoldEnvelope(amplifier.gain, startTime, peak, attack)

  const sources: AudioScheduledSourceNode[] = []
  const nodes: AudioNode[] = []

  for (const partial of params.partials) {
    const oscillator = context.createOscillator()
    const partialGain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency * partial.ratio
    partialGain.gain.value = partial.gain

    oscillator.connect(partialGain)
    partialGain.connect(amplifier)
    nodes.push(partialGain)
    sources.push(oscillator)
  }

  amplifier.connect(destination)

  for (const source of sources) source.start(startTime)

  function stopAt(when: number) {
    for (const source of sources) source.stop(when)
  }

  let endTime = Number.POSITIVE_INFINITY

  if (duration !== undefined) {
    // A short note can be shorter than the release ramp, which would otherwise
    // schedule the release before the attack has finished. The held level is
    // exactly `peak`, so it is passed explicitly.
    const releaseStart = Math.max(
      startTime + Math.max(duration, attack) - releaseTime,
      holdTime,
    )
    endTime = applyReleaseEnvelope(
      amplifier.gain,
      releaseStart,
      releaseTime,
      peak,
    )
    stopAt(endTime)
  }

  sources[0].onended = () => {
    for (const node of nodes) node.disconnect()
    for (const source of sources) source.disconnect()
    amplifier.disconnect()
  }

  return {
    startTime,
    endTime,
    release(when: number) {
      if (when >= endTime) return

      stopAt(releaseAtCurrentLevel(amplifier.gain, when, releaseTime))
    },
  }
}