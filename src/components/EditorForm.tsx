import { FIELD_OPTIONS, type CardFields, type FieldKey } from '../types'

interface EditorFormProps {
  fields: CardFields
  onChange: (key: FieldKey, value: string) => void
  /** When set, only show these fields (custom PDF designs). */
  visibleKeys?: FieldKey[]
}

export function EditorForm({ fields, onChange, visibleKeys }: EditorFormProps) {
  const labels = (visibleKeys?.length
    ? FIELD_OPTIONS.filter((item) => visibleKeys.includes(item.key))
    : FIELD_OPTIONS
  ).map((item) => ({
    ...item,
    multiline: item.key === 'message',
  }))

  return (
    <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
      {labels.map(({ key, label, multiline }) => (
        <label key={key} className="field">
          <span>{label}</span>
          {multiline ? (
            <textarea
              rows={3}
              dir="auto"
              value={fields[key]}
              onChange={(e) => onChange(key, e.target.value)}
            />
          ) : (
            <input
              type="text"
              dir="auto"
              value={fields[key]}
              onChange={(e) => onChange(key, e.target.value)}
            />
          )}
        </label>
      ))}
    </form>
  )
}
