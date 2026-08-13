export type FieldKey =
  | 'hostLine'
  | 'honoree'
  | 'eventTitle'
  | 'date'
  | 'time'
  | 'venue'
  | 'address'
  | 'message'
  | 'rsvp'
  | 'topLine1'
  | 'topLine2'
  | 'topLine3'
  | 'bottomLine1'
  | 'bottomLine2'

export interface CardFields {
  hostLine: string
  honoree: string
  eventTitle: string
  date: string
  time: string
  venue: string
  address: string
  message: string
  rsvp: string
  topLine1: string
  topLine2: string
  topLine3: string
  bottomLine1: string
  bottomLine2: string
}

export type TemplateStyle =
  | 'garden'
  | 'midnight'
  | 'scroll'
  | 'bloom'
  | 'linen'
  | 'ember'

export type TextAlign = 'right' | 'center' | 'left'

/** Text box placed on an uploaded PDF/image design (percents of the card). */
export interface TextRegion {
  id: string
  fieldKey: FieldKey
  label: string
  x: number
  y: number
  width: number
  height: number
  fontId: string
  /** Font size as % of card width */
  fontSize: number
  color: string
  align: TextAlign
  /**
   * When false, only admin sets this text (top/bottom wording).
   * Users cannot edit it in the studio.
   */
  userEditable?: boolean
}

export interface WatermarkConfig {
  enabled: boolean
  text: string
  opacity: number
}

export interface Template {
  id: string
  name: string
  category: string
  style: TemplateStyle
  description: string
  defaults: CardFields
  /** Uploaded design image (from PDF page or PNG/JPG) */
  designImage?: string | null
  /** Where each text field sits on the design */
  regions?: TextRegion[]
  watermark?: WatermarkConfig | null
}

/** Fields users typically edit (name / venues / times). */
export const CORE_EDIT_FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'honoree', label: 'Name(s)' },
  { key: 'venue', label: 'Venue 1' },
  { key: 'time', label: 'Time 1' },
  { key: 'address', label: 'Venue 2' },
  { key: 'date', label: 'Time 2 / Date' },
]

/** Small wording admin places at top/bottom — locked for users by default. */
export const ADMIN_WORDING_FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'topLine1', label: 'Top wording 1' },
  { key: 'topLine2', label: 'Top wording 2' },
  { key: 'topLine3', label: 'Top wording 3' },
  { key: 'bottomLine1', label: 'Bottom wording 1' },
  { key: 'bottomLine2', label: 'Bottom wording 2' },
  { key: 'hostLine', label: 'Host line' },
  { key: 'eventTitle', label: 'Event line' },
  { key: 'message', label: 'Message' },
  { key: 'rsvp', label: 'RSVP / footer' },
]

export const FIELD_OPTIONS: { key: FieldKey; label: string }[] = [
  ...CORE_EDIT_FIELDS,
  ...ADMIN_WORDING_FIELDS,
]

export const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: true,
  text: 'Hazmunah',
  opacity: 0.14,
}

export function emptyCardFields(): CardFields {
  return {
    hostLine: '',
    honoree: '',
    eventTitle: '',
    date: '',
    time: '',
    venue: '',
    address: '',
    message: '',
    rsvp: '',
    topLine1: '',
    topLine2: '',
    topLine3: '',
    bottomLine1: '',
    bottomLine2: '',
  }
}

export function isUserEditableRegion(region: TextRegion) {
  if (typeof region.userEditable === 'boolean') return region.userEditable
  return CORE_EDIT_FIELDS.some((item) => item.key === region.fieldKey)
}
