import type { DownloadKind } from './DownloadPanel'

interface DownloadActionsProps {
  unlocked: Array<'pdf' | 'video' | 'png'>
  downloading: DownloadKind | null
  progressMessage?: string
  onDownload: (kind: DownloadKind) => void
  onClearPurchase?: () => void
  selectedMusicId: string
  onMusicChange: (id: string) => void
  musicOptions: { id: string; name: string; mood: string }[]
  tracksCount: number
}

export function DownloadActions({
  unlocked,
  downloading,
  progressMessage,
  onDownload,
  onClearPurchase,
  selectedMusicId,
  onMusicChange,
  musicOptions,
  tracksCount,
}: DownloadActionsProps) {
  const busy = downloading !== null

  return (
    <section className="download-panel" aria-label="Downloads">
      <div className="unlocked-banner">
        Payment received ✓ Your downloads are unlocked.
        {onClearPurchase ? (
          <button
            type="button"
            className="btn ghost unlock-reset"
            onClick={onClearPurchase}
          >
            Start new payment
          </button>
        ) : null}
      </div>

      {unlocked.includes('video') ? (
        <label className="field music-field">
          <span>Background music for MP4</span>
          <select
            value={selectedMusicId}
            onChange={(e) => onMusicChange(e.target.value)}
            disabled={busy || tracksCount === 0}
          >
            <option value="">No music</option>
            {musicOptions.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
                {track.mood ? ` — ${track.mood}` : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="download-actions">
        {unlocked.includes('pdf') ? (
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => onDownload('pdf')}
          >
            {downloading === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        ) : null}
        {unlocked.includes('video') ? (
          <button
            type="button"
            className="btn accent"
            disabled={busy}
            onClick={() => onDownload('video')}
          >
            {downloading === 'video'
              ? progressMessage || 'Rendering MP4…'
              : 'Download MP4 (~28s)'}
          </button>
        ) : null}
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() => onDownload('png')}
        >
          {downloading === 'png' ? 'Preparing PNG…' : 'Download PNG'}
        </button>
      </div>
    </section>
  )
}
