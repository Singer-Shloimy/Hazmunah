import type { WatermarkConfig } from '../types'

interface WatermarkOverlayProps {
  watermark?: WatermarkConfig | null
}

export function WatermarkOverlay({ watermark }: WatermarkOverlayProps) {
  if (!watermark?.enabled || !watermark.text.trim()) return null

  const tiles = Array.from({ length: 18 }, (_, index) => index)

  return (
    <div
      className="watermark-overlay"
      aria-hidden
      style={{ opacity: Math.min(0.45, Math.max(0.05, watermark.opacity)) }}
    >
      <div className="watermark-grid">
        {tiles.map((index) => (
          <span key={index}>{watermark.text}</span>
        ))}
      </div>
    </div>
  )
}
