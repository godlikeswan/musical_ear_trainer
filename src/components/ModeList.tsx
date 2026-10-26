import type { Mode } from '../modes.ts'
import './ModeList.css'

type ModeListProps = {
  modes: readonly Mode[]
  selectedId: string
  onSelect: (modeId: string) => void
}

function ModeList({ modes, selectedId, onSelect }: ModeListProps) {
  return (
    <ul className="mode-list">
      {modes.map((mode) => {
        const isSelected = mode.id === selectedId

        return (
          <li key={mode.id}>
            <button
              type="button"
              className="mode-list__item"
              aria-current={isSelected ? 'true' : undefined}
              disabled={mode.disabled}
              title={mode.disabled ? 'Not implemented yet' : undefined}
              onClick={() => onSelect(mode.id)}
            >
              {mode.label}
              {mode.disabled ? (
                <span className="mode-list__badge">soon</span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default ModeList