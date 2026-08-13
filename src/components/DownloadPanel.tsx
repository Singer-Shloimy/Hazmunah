import type { ApiMusicTrack } from '../lib/api'

export type DownloadKind = 'pdf' | 'video' | 'png'

interface DownloadPanelProps {
  tracks: ApiMusicTrack[]
  selectedMusicId: string
  onMusicChange: (id: string) => void
  downloading: DownloadKind | null
  progressMessage?: string
  onDownload: (kind: DownloadKind) => void
}

export function DownloadPanel({
  tracks,
  selectedMusicId,
  onMusicChange,
  downloading,
  progressMessage,
  onDownload,
}: DownloadPanelProps) {
  const busy = downloading !== null
  const hasMusic = tracks.length > 0

  return (
    <section className="download-panel" aria-label="Download invitation">
      <div className="download-heading">
        <h2>Download your invitation</h2>
        <p>
          PDF for printing. Video (MP4) for sharing — invitation style with
          background music from the library.
        </p>
      </div>

      <label className="field music-field">
        <span>Background music</span>
        <select
          value={selectedMusicId}
          onChange={(e) => onMusicChange(e.target.value)}
          disabled={busy || !hasMusic}
        >
          <option value="">No music</option>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
              {track.mood ? ` — ${track.mood}` : ''}
            </option>
          ))}
        </select>
      </label>

      {!hasMusic ? (
        <p className="download-note">
          No music uploaded yet. An admin can add tracks on the Admin page.
        </p>
      ) : null}

      <div className="download-actions">
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => onDownload('pdf')}
        >
          {downloading === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}
        </button>
        <button
          type="button"
          className="btn accent"
          disabled={busy}
          onClick={() => onDownload('video')}
        >
          {downloading === 'video'
            ? progressMessage || 'Rendering MP4…'
            : selectedMusicId
              ? 'Download MP4 + music'
              : 'Download MP4 video'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() => onDownload('png')}
        >
          {downloading === 'png' ? 'Preparing PNG…' : 'Download PNG'}
        </button>
      </div>

      <p className="download-note">
        Video invites play like a short invitation reel — perfect for WhatsApp
        and social sharing.
      </p>
    </section>
  )
}
