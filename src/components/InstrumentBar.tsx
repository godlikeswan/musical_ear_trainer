import type { Instrument } from '../audio/types.ts'
import './InstrumentBar.css'

type InstrumentBarProps = {
  instruments: readonly Instrument[]
  instrumentId: string
  volume: number
  onInstrumentChange: (instrumentId: string) => void
  onVolumeChange: (volume: number) => void
}

function InstrumentBar({
  instruments,
  instrumentId,
  volume,
  onInstrumentChange,
  onVolumeChange,
}: InstrumentBarProps) {
  return (
    <div className="instrument-bar">
      <label className="instrument-bar__field" htmlFor="instrument-select">
        <span className="instrument-bar__label">Instrument</span>
        <select
          id="instrument-select"
          value={instrumentId}
          onChange={(event) => onInstrumentChange(event.target.value)}
        >
          {instruments.map((instrument) => (
            <option key={instrument.id} value={instrument.id}>
              {instrument.name}
            </option>
          ))}
        </select>
      </label>

      <label className="instrument-bar__field" htmlFor="volume-slider">
        <span className="instrument-bar__label">Volume</span>
        <input
          id="volume-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
        />
        <output className="instrument-bar__value" htmlFor="volume-slider">
          {Math.round(volume * 100)}%
        </output>
      </label>

      <span className="instrument-bar__spacer" />

      <span className="instrument-bar__slot" aria-disabled="true">
        Chord &amp; voicing options
        <em>coming next</em>
      </span>
    </div>
  )
}

export default InstrumentBar