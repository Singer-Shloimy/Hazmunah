export interface InviteFont {
  id: string
  label: string
  stack: string
}

/** Hebrew-capable fonts for invitation text */
export const INVITE_FONTS: InviteFont[] = [
  {
    id: 'assistant',
    label: 'Assistant',
    stack: '"Assistant", "Segoe UI", sans-serif',
  },
  {
    id: 'frank-ruhl',
    label: 'Frank Ruhl Libre',
    stack: '"Frank Ruhl Libre", Georgia, serif',
  },
  {
    id: 'heebo',
    label: 'Heebo',
    stack: '"Heebo", "Segoe UI", sans-serif',
  },
  {
    id: 'rubik',
    label: 'Rubik',
    stack: '"Rubik", "Segoe UI", sans-serif',
  },
  {
    id: 'david-libre',
    label: 'David Libre',
    stack: '"David Libre", "Times New Roman", serif',
  },
  {
    id: 'miriam',
    label: 'Miriam Libre',
    stack: '"Miriam Libre", "Segoe UI", sans-serif',
  },
  {
    id: 'secular',
    label: 'Secular One',
    stack: '"Secular One", "Arial Black", sans-serif',
  },
  {
    id: 'instrument',
    label: 'Instrument Serif',
    stack: '"Instrument Serif", Georgia, serif',
  },
]

export const DEFAULT_HEADING_FONT = 'frank-ruhl'
export const DEFAULT_BODY_FONT = 'assistant'

export function fontStack(id: string) {
  return (
    INVITE_FONTS.find((font) => font.id === id)?.stack ||
    INVITE_FONTS[0].stack
  )
}
