import { useEffect, useState } from 'react'
import {
  DEFAULT_NOTE_DURATION,
  DEFAULT_NOTE_VELOCITY,
  DEFAULT_VOLUME,
  audioEngine,
} from './audio/AudioEngine.ts'
import {
  DEFAULT_INSTRUMENT_ID,
  INSTRUMENTS,
  getInstrument,
} from './audio/instruments.ts'
import { midiToFrequency, midiToName } from './audio/midi.ts'
import InstrumentBar from './components/InstrumentBar.tsx'
import ChordExercise from './components/ChordExercise.tsx'
import ModeList from './components/ModeList.tsx'
import NoteExercise from './components/NoteExercise.tsx'
import Piano from './components/Piano.tsx'
import ProgressionExercise from './components/ProgressionExercise.tsx'
import SettingsPanel from './components/SettingsPanel.tsx'
import { DEFAULT_MODE_ID, MODES, getDefaultSettings } from './modes.ts'
import type { ModeSettings } from './modes.ts'
import { readStoredNumber, writeStoredNumber } from './storage.ts'

const INITIAL_SETTINGS: Record<string, ModeSettings> = Object.fromEntries(
  MODES.map((mode) => [mode.id, getDefaultSettings(mode.fields)]),
)

function App() {
  const [modeId, setModeId] = useState(DEFAULT_MODE_ID)
  const [settingsByMode, setSettingsByMode] =
    useState<Record<string, ModeSettings>>(INITIAL_SETTINGS)
  const [instrumentId, setInstrumentId] = useState(DEFAULT_INSTRUMENT_ID)
  const [volume, setVolume] = useState(() =>
    readStoredNumber('volume', DEFAULT_VOLUME),
  )
  const [selected, setSelected] = useState<number | null>(null)

  const mode = MODES.find((candidate) => candidate.id === modeId) ?? MODES[0]
  const settings = settingsByMode[mode.id] ?? getDefaultSettings(mode.fields)

  // Browsers only allow audio to start from a user gesture.
  useEffect(() => {
    void audioEngine.unlock()
  }, [])

  // Single writer for the engine's volume: runs on mount to restore a saved
  // level, and again on every change.
  useEffect(() => {
    audioEngine.setVolume(volume)
  }, [volume])

  function updateSetting(fieldId: string, value: string | number | boolean) {
    setSettingsByMode((current) => ({
      ...current,
      [mode.id]: { ...current[mode.id], [fieldId]: value },
    }))
  }

  function handleVolumeChange(nextVolume: number) {
    setVolume(nextVolume)
    writeStoredNumber('volume', nextVolume)
  }

  function handleKeySelect(midi: number) {
    setSelected(midi)
    audioEngine.play(getInstrument(instrumentId), {
      frequency: midiToFrequency(midi),
      duration: DEFAULT_NOTE_DURATION,
      velocity: DEFAULT_NOTE_VELOCITY,
    })
  }

  return (
    <div className="app">
      <nav className="panel app__modes" aria-label="Training mode">
        <h2 className="panel__title">Mode</h2>
        <ModeList modes={MODES} selectedId={mode.id} onSelect={setModeId} />
      </nav>

      <main className="app__main">
        <h1 className="app__title">Musical Ear Trainer</h1>
        <span className="app__mode">{mode.label}</span>
        <p className="app__description">{mode.description}</p>

        {mode.id === 'notes' ? (
          <NoteExercise
            key={`${String(settings.range)}-${String(settings.includeAccidentals)}`}
            range={String(settings.range)}
            includeAccidentals={Boolean(settings.includeAccidentals)}
            requireOctave={!settings.revealOctave}
          />
        ) : null}

        {mode.id === 'chords' ? (
          <ChordExercise
            key={[
              String(settings.qualities),
              String(settings.spacing),
              String(settings.inversion),
              String(settings.bass),
            ].join('|')}
            qualities={String(settings.qualities)}
            spacing={String(settings.spacing)}
            inversion={String(settings.inversion)}
            bass={String(settings.bass)}
          />
        ) : null}

        {mode.id === 'progressions' ? (
          <ProgressionExercise
            key={[
              String(settings.progressionSet),
              String(settings.key),
              String(settings.answerFormat),
              String(settings.spacing),
              String(settings.inversion),
              String(settings.tempo),
              String(settings.replay),
            ].join('|')}
            progressionSet={String(settings.progressionSet)}
            keySetting={String(settings.key)}
            answerFormat={String(settings.answerFormat)}
            spacing={String(settings.spacing)}
            inversion={String(settings.inversion)}
            tempo={Number(settings.tempo)}
            replay={String(settings.replay)}
          />
        ) : null}

        <p className="app__status">
          {selected === null
            ? 'Click a key on the piano below to hear it.'
            : `Piano: ${midiToName(selected)}`}
        </p>
      </main>

      <section className="panel app__settings" aria-label="Mode options">
        <h2 className="panel__title">Options</h2>
        <SettingsPanel
          idPrefix={mode.id}
          fields={mode.fields}
          values={settings}
          onChange={updateSetting}
        />
      </section>

      <footer className="app__piano">
        <InstrumentBar
          instruments={INSTRUMENTS}
          instrumentId={instrumentId}
          volume={volume}
          onInstrumentChange={setInstrumentId}
          onVolumeChange={handleVolumeChange}
        />
        <Piano
          showLabels
          highlighted={selected === null ? [] : [selected]}
          onSelect={handleKeySelect}
        />
      </footer>
    </div>
  )
}

export default App