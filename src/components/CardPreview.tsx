import type { RefObject } from 'react'
import type {
  CardFields,
  TemplateStyle,
  TextRegion,
  WatermarkConfig,
} from '../types'
import { fontStack } from '../data/fonts'
import { WatermarkOverlay } from './WatermarkOverlay'

interface CardPreviewProps {
  style: TemplateStyle
  fields: CardFields
  headingFont?: string
  bodyFont?: string
  designImage?: string | null
  regions?: TextRegion[]
  watermark?: WatermarkConfig | null
  /** When false, watermark is hidden (e.g. after paid download). Default true. */
  showWatermark?: boolean
  cardRef?: RefObject<HTMLDivElement | null>
}

export function CardPreview({
  style,
  fields,
  headingFont = 'frank-ruhl',
  bodyFont = 'assistant',
  designImage,
  regions,
  watermark,
  showWatermark = true,
  cardRef,
}: CardPreviewProps) {
  const heading = fontStack(headingFont)
  const body = fontStack(bodyFont)
  const custom = Boolean(designImage && regions && regions.length > 0)

  if (custom && designImage && regions) {
    return (
      <div className="card-stage style-custom" ref={cardRef}>
        <img className="card-design-bg" src={designImage} alt="" />
        <div className="card-design-layers">
          {regions.map((region) => {
            const text = fields[region.fieldKey]
            if (!text) return null
            return (
              <div
                key={region.id}
                className="card-design-text"
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  color: region.color,
                  fontFamily: fontStack(region.fontId),
                  fontSize: `${region.fontSize}cqi`,
                  textAlign: region.align,
                }}
              >
                <span dir="auto">{text}</span>
              </div>
            )
          })}
        </div>
        {showWatermark ? <WatermarkOverlay watermark={watermark} /> : null}
      </div>
    )
  }

  return (
    <div
      className={`card-stage style-${style}`}
      ref={cardRef}
      style={{ fontFamily: body }}
    >
      <div className="card-ornament card-ornament-tl" aria-hidden />
      <div className="card-ornament card-ornament-br" aria-hidden />
      <div className="card-inner" dir="rtl">
        {fields.hostLine ? (
          <p className="card-host" style={{ fontFamily: body }}>
            {fields.hostLine}
          </p>
        ) : null}
        {fields.honoree ? (
          <h2 className="card-honoree" style={{ fontFamily: heading }}>
            {fields.honoree}
          </h2>
        ) : null}
        {fields.eventTitle ? (
          <p className="card-event" style={{ fontFamily: body }}>
            {fields.eventTitle}
          </p>
        ) : null}
        {(fields.date || fields.time) && (
          <div className="card-when">
            {fields.date ? (
              <p className="card-date" style={{ fontFamily: heading }}>
                {fields.date}
              </p>
            ) : null}
            {fields.time ? (
              <p className="card-time" style={{ fontFamily: body }}>
                {fields.time}
              </p>
            ) : null}
          </div>
        )}
        {(fields.venue || fields.address) && (
          <div className="card-where">
            {fields.venue ? (
              <p className="card-venue" style={{ fontFamily: heading }}>
                {fields.venue}
              </p>
            ) : null}
            {fields.address ? (
              <p className="card-address" style={{ fontFamily: body }}>
                {fields.address}
              </p>
            ) : null}
          </div>
        )}
        {fields.message ? (
          <p className="card-message" style={{ fontFamily: body }}>
            {fields.message}
          </p>
        ) : null}
        {fields.rsvp ? (
          <p className="card-rsvp" style={{ fontFamily: body }}>
            {fields.rsvp}
          </p>
        ) : null}
      </div>
      {showWatermark ? <WatermarkOverlay watermark={watermark} /> : null}
    </div>
  )
}
