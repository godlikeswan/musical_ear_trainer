/** Exponential ramps cannot reach zero, so decay targets this instead. */
export const SILENCE = 0.0001

/** Short linear ramp from SILENCE to true zero, so nothing steps on stop. */
const TAIL = 0.012

/** Percussive shape: near-instant attack, exponential decay to silence. */
export function applyDecayEnvelope(
  param: AudioParam,
  startTime: number,
  peak: number,
  attack: number,
  endTime: number,
): void {
  const peakTime = startTime + attack

  param.setValueAtTime(SILENCE, startTime)
  param.linearRampToValueAtTime(peak, peakTime)
  param.exponentialRampToValueAtTime(SILENCE, endTime)
  param.linearRampToValueAtTime(0, endTime + TAIL)
}

/** Sustained shape: rise to `peak`, then hold until a release is scheduled. */
export function applyHoldEnvelope(
  param: AudioParam,
  startTime: number,
  peak: number,
  attack: number,
): number {
  param.setValueAtTime(SILENCE, startTime)
  param.linearRampToValueAtTime(peak, startTime + attack)

  return startTime + attack
}

/**
 * Cut the scheduled envelope and fade down from a level the caller already
 * knows. Reading `param.value` here would be wrong: it reports the level at
 * `currentTime`, not at the future `when` this release is scheduled for.
 */
export function applyReleaseEnvelope(
  param: AudioParam,
  when: number,
  releaseTime: number,
  level: number,
): number {
  param.cancelScheduledValues(when)
  param.setValueAtTime(Math.max(level, SILENCE), when)
  param.exponentialRampToValueAtTime(SILENCE, when + releaseTime)
  param.linearRampToValueAtTime(0, when + releaseTime + TAIL)

  return when + releaseTime + TAIL
}

/**
 * Release at an arbitrary time whose level we cannot predict, e.g. stealing a
 * voice partway through its decay. `cancelAndHoldAtTime` keeps the ramp
 * continuous where it is supported.
 */
export function releaseAtCurrentLevel(
  param: AudioParam,
  when: number,
  releaseTime: number,
): number {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(when)
  } else {
    param.cancelScheduledValues(when)
    param.setValueAtTime(Math.max(param.value, SILENCE), when)
  }

  param.exponentialRampToValueAtTime(SILENCE, when + releaseTime)
  param.linearRampToValueAtTime(0, when + releaseTime + TAIL)

  return when + releaseTime + TAIL
}