import type { Product } from '../lib/api'
import type { DownloadKind } from './DownloadPanel'

interface CheckoutPanelProps {
  products: Product[]
  mode: 'stripe' | 'demo' | 'unconfigured'
  unlocked: Array<'pdf' | 'video' | 'png'>
  selectedProductId: string
  onSelectProduct: (id: string) => void
  onCheckout: () => void
  checkingOut: boolean
  tracksCount: number
  selectedMusicId: string
  onMusicChange: (id: string) => void
  musicOptions: { id: string; name: string; mood: string }[]
  downloading: DownloadKind | null
  progressMessage?: string
  onDownload: (kind: DownloadKind) => void
  onClearPurchase?: () => void
}

export function CheckoutPanel({
  products,
  mode,
  unlocked,
  selectedProductId,
  onSelectProduct,
  onCheckout,
  checkingOut,
  tracksCount,
  selectedMusicId,
  onMusicChange,
  musicOptions,
  downloading,
  progressMessage,
  onDownload,
  onClearPurchase,
}: CheckoutPanelProps) {
  const paid = unlocked.length > 0
  const busy = downloading !== null || checkingOut

  return (
    <section className="download-panel checkout-panel" aria-label="Checkout">
      <div className="download-heading">
        <h2>Pay & download</h2>
        <p>
          Choose a package and pay by credit card. Then download your Hebrew
          invitation as PDF or an MP4 (~28 seconds) with music.
        </p>
      </div>

      {!paid ? (
        <>
          <div className="product-grid">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                className={`product-card${selectedProductId === product.id ? ' selected' : ''}`}
                onClick={() => onSelectProduct(product.id)}
                disabled={busy}
              >
                <strong>{product.name}</strong>
                <span className="product-price">${product.price}</span>
                <span className="product-desc">{product.description}</span>
              </button>
            ))}
          </div>

          {mode === 'unconfigured' ? (
            <p className="admin-error">
              Card payments need Stripe keys in <code>.env</code> (
              STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY). See{' '}
              <code>.env.example</code>.
            </p>
          ) : (
            <button
              type="button"
              className="btn primary"
              disabled={busy || !selectedProductId}
              onClick={onCheckout}
            >
              {checkingOut
                ? 'Opening checkout…'
                : mode === 'stripe'
                  ? 'Pay with credit card'
                  : 'Continue to checkout'}
            </button>
          )}

          <p className="download-note">
            {mode === 'stripe'
              ? 'Secure card checkout powered by Stripe.'
              : mode === 'demo'
                ? 'Demo mode (no Stripe keys yet): checkout is simulated for testing.'
                : 'Configure Stripe to accept real cards.'}{' '}
            Free PNG preview before purchase.
          </p>

          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => onDownload('png')}
          >
            {downloading === 'png' ? 'Preparing PNG…' : 'Free PNG preview'}
          </button>
        </>
      ) : (
        <>
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

          <label className="field music-field">
            <span>Background music (for video)</span>
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

          {tracksCount === 0 ? (
            <p className="download-note">
              No music uploaded yet. An admin can add tracks on the Admin page.
            </p>
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
        </>
      )}
    </section>
  )
}
