const PREFIX = 'met:'

/**
 * localStorage throws rather than returning null when storage is unavailable
 * (Safari private browsing, sandboxed frames), so every access is guarded.
 */
export function readStoredNumber(key: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)

    if (raw === null) return fallback

    const value = Number(raw)

    return Number.isFinite(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function writeStoredNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(PREFIX + key, String(value))
  } catch {
    return
  }
}