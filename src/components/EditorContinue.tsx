import type { DownloadKind } from './DownloadPanel'

interface EditorContinueProps {
  tracksCount: number
  selectedMusicId: string
  onMusicChange: (id: string) => void
  musicOptions: { id: string; name: string; mood: string }[]
  downloading: DownloadKind | null
  onPreviewPng: () => void
  onContinue: () => void
  continuing?: boolean
}

export function EditorContinue({
  tracksCount,
  selectedMusicId,
  onMusicChange,
  musicOptions,
  downloading,
  onPreviewPng,
  onContinue,
  continuing,
}: EditorContinueProps) {
  const busy = downloading !== null || Boolean(continuing)

  return (
    <section className="editor-continue" aria-label="Continue to checkout">
      <div className="download-heading">
        <h2>Almost ready</h2>
        <p>
          Review your invite, optionally pick music for the video package, then
          continue to payment.
        </p>
      </div>

      <label className="field music-field">
        <span>Preferred music track (used if you choose the $30 package)</span>
        <select
          value={selectedMusicId}
          onChange={(e) => onMusicChange(e.target.value)}
          disabled={busy || tracksCount === 0}
        >
          <option value="">No track selected</option>
          {musicOptions.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
              {track.mood ? ` — ${track.mood}` : ''}
            </option>
          ))}
        </select>
      </label>

      {tracksCount === 0 ? (
        <p className="download-note">
          No music uploaded yet. You can still buy the $25 base invite.
        </p>
      ) : null}

      <div className="editor-continue-actions">
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={onPreviewPng}
        >
          {downloading === 'png' ? 'Preparing…' : 'Free preview PNG'}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={onContinue}
        >
          {continuing ? 'Opening…' : 'Continue to checkout'}
        </button>
      </div>
    </section>
  )
}
