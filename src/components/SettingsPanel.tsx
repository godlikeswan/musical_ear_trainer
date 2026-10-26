import type { ModeField, ModeSettings } from '../modes.ts'
import './SettingsPanel.css'

type SettingsPanelProps = {
  idPrefix: string
  fields: readonly ModeField[]
  values: ModeSettings
  onChange: (fieldId: string, value: string | number | boolean) => void
}

function SettingsPanel({
  idPrefix,
  fields,
  values,
  onChange,
}: SettingsPanelProps) {
  if (fields.length === 0) {
    return <p className="settings__empty">This mode has no options.</p>
  }

  return (
    <div className="settings">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.id}`

        switch (field.kind) {
          case 'toggle':
            return (
              <div className="field field--toggle" key={id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(values[field.id])}
                  onChange={(event) => onChange(field.id, event.target.checked)}
                />
                <label htmlFor={id}>{field.label}</label>
              </div>
            )

          case 'choice':
            return (
              <div className="field" key={id}>
                <label className="field__label" htmlFor={id}>
                  {field.label}
                </label>
                <select
                  id={id}
                  value={String(values[field.id])}
                  onChange={(event) => onChange(field.id, event.target.value)}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )

          case 'range':
            return (
              <div className="field" key={id}>
                <label className="field__label" htmlFor={id}>
                  {field.label}
                  <output className="field__value" htmlFor={id}>
                    {String(values[field.id])}
                  </output>
                </label>
                <input
                  id={id}
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={Number(values[field.id])}
                  onChange={(event) => onChange(field.id, Number(event.target.value))}
                />
              </div>
            )
        }
      })}
    </div>
  )
}

export default SettingsPanel