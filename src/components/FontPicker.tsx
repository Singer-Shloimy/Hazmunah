import { INVITE_FONTS } from '../data/fonts'

interface FontPickerProps {
  headingFont: string
  bodyFont: string
  onHeadingChange: (id: string) => void
  onBodyChange: (id: string) => void
}

export function FontPicker({
  headingFont,
  bodyFont,
  onHeadingChange,
  onBodyChange,
}: FontPickerProps) {
  return (
    <section className="font-picker" aria-label="Invitation fonts">
      <div className="download-heading">
        <h2>Fonts</h2>
        <p>Choose fonts for the Hebrew invitation text on your card.</p>
      </div>
      <div className="font-picker-grid">
        <label className="field">
          <span>Name / title font</span>
          <select
            value={headingFont}
            onChange={(e) => onHeadingChange(e.target.value)}
          >
            {INVITE_FONTS.map((font) => (
              <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Body font</span>
          <select
            value={bodyFont}
            onChange={(e) => onBodyChange(e.target.value)}
          >
            {INVITE_FONTS.map((font) => (
              <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="font-preview-samples" dir="rtl">
        <p
          className="font-sample-title"
          style={{ fontFamily: INVITE_FONTS.find((f) => f.id === headingFont)?.stack }}
        >
          דוגמה לשם
        </p>
        <p
          className="font-sample-body"
          style={{ fontFamily: INVITE_FONTS.find((f) => f.id === bodyFont)?.stack }}
        >
          טקסט גוף לדוגמה בהזמנה
        </p>
      </div>
    </section>
  )
}
