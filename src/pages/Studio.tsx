import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TemplateGallery } from '../components/TemplateGallery'
import { CardPreview } from '../components/CardPreview'
import { EditorForm } from '../components/EditorForm'
import { FontPicker } from '../components/FontPicker'
import { EditorContinue } from '../components/EditorContinue'
import { DownloadActions } from '../components/DownloadActions'
import { StepBar } from '../components/StepBar'
import type { DownloadKind } from '../components/DownloadPanel'
import {
  api,
  assetUrl,
  musicUrl,
  type ApiMusicTrack,
} from '../lib/api'
import { downloadPdf, downloadPng, inviteSlug } from '../lib/download'
import { downloadInviteVideo } from '../lib/videoInvite'
import {
  DEFAULT_BODY_FONT,
  DEFAULT_HEADING_FONT,
} from '../data/fonts'
import { templates as fallbackTemplates } from '../data/templates'
import {
  emptyCardFields,
  isUserEditableRegion,
  type CardFields,
  type FieldKey,
  type Template,
} from '../types'

type View = 'home' | 'editor'
const ORDER_KEY = 'hazmunah-order-token'

export function Studio() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<View>('home')
  const [forms, setForms] = useState<Template[]>(fallbackTemplates)
  const [tracks, setTracks] = useState<ApiMusicTrack[]>([])
  const [template, setTemplate] = useState<Template | null>(null)
  const [fields, setFields] = useState<CardFields | null>(null)
  const [headingFont, setHeadingFont] = useState(DEFAULT_HEADING_FONT)
  const [bodyFont, setBodyFont] = useState(DEFAULT_BODY_FONT)
  const [musicId, setMusicId] = useState('')
  const [unlocked, setUnlocked] = useState<Array<'pdf' | 'video' | 'png'>>([])
  const [continuing, setContinuing] = useState(false)
  const [downloading, setDownloading] = useState<DownloadKind | null>(null)
  const [progressMessage, setProgressMessage] = useState('')
  const [, startTransition] = useTransition()
  const cardRef = useRef<HTMLDivElement>(null)

  const step =
    view === 'home' ? 1 : unlocked.length ? 3 : 2

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [nextForms, nextMusic] = await Promise.all([
          api.getForms(),
          api.getMusic(),
        ])
        if (cancelled) return
        if (nextForms.length) setForms(nextForms)
        setTracks(nextMusic)
        if (nextMusic[0]) setMusicId(nextMusic[0].id)
      } catch {
        // Offline / API down — keep seed templates
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const fromCheckout = searchParams.get('paid')
    const paidToken = fromCheckout || localStorage.getItem(ORDER_KEY)
    if (!paidToken) return

    let cancelled = false
    ;(async () => {
      try {
        const order = await api.getOrder(paidToken)
        if (cancelled) return
        if (order.status === 'paid') {
          setUnlocked(order.entitlements)
          localStorage.setItem(ORDER_KEY, paidToken)
          if (view === 'home') {
            // Keep user on home unless they were editing; still unlock downloads
          }
        } else {
          localStorage.removeItem(ORDER_KEY)
          setUnlocked([])
        }
        if (fromCheckout) {
          searchParams.delete('paid')
          setSearchParams(searchParams, { replace: true })
        }
      } catch {
        localStorage.removeItem(ORDER_KEY)
        setUnlocked([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, setSearchParams, view])

  function clearPurchase() {
    localStorage.removeItem(ORDER_KEY)
    setUnlocked([])
  }

  function openTemplate(next: Template) {
    startTransition(() => {
      setTemplate(next)
      setFields({ ...emptyCardFields(), ...next.defaults })
      setHeadingFont(DEFAULT_HEADING_FONT)
      setBodyFont(DEFAULT_BODY_FONT)
      setView('editor')
    })
  }

  function updateField(key: FieldKey, value: string) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function goHome() {
    startTransition(() => {
      setView('home')
      setTemplate(null)
      setFields(null)
      setDownloading(null)
      setProgressMessage('')
    })
  }

  function handleContinueToCheckout() {
    setContinuing(true)
    navigate('/checkout')
  }

  async function handleDownload(kind: DownloadKind) {
    if (!cardRef.current || !template || !fields) return

    if (kind !== 'png' && !unlocked.includes(kind)) {
      alert('Please complete checkout before downloading this file.')
      return
    }

    setDownloading(kind)
    setProgressMessage('')
    const slug = inviteSlug(fields, template.name) || template.id
    const track = tracks.find((item) => item.id === musicId)

    try {
      if (kind === 'pdf') {
        await downloadPdf(cardRef.current, `hazmunah-invite-${slug}.pdf`)
      } else if (kind === 'png') {
        await downloadPng(cardRef.current, `hazmunah-invite-${slug}.png`)
      } else {
        setProgressMessage('Recording video (~28s)…')
        await downloadInviteVideo({
          element: cardRef.current,
          musicUrl: track ? musicUrl(track) : undefined,
          filename: `hazmunah-invite-${slug}.mp4`,
          onProgress: setProgressMessage,
        })
      }
    } catch (error) {
      console.error(error)
      alert(
        error instanceof Error
          ? error.message
          : 'Could not download the invitation. Please try again.',
      )
    } finally {
      setDownloading(null)
      setProgressMessage('')
    }
  }

  const musicOptions = useMemo(
    () =>
      tracks.map((track) => ({
        id: track.id,
        name: track.name,
        mood: track.mood,
      })),
    [tracks],
  )

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden />
      <header className="site-header">
        <button type="button" className="brand" onClick={goHome}>
          Hazmunah
        </button>
        <nav className="header-actions">
          <Link className="btn ghost header-admin" to="/admin">
            Admin
          </Link>
          {view === 'editor' ? (
            <button type="button" className="btn ghost" onClick={goHome}>
              Templates
            </button>
          ) : null}
        </nav>
      </header>

      <div className="studio-shell">
        <StepBar step={step as 1 | 2 | 3} />

        {view === 'home' ? (
          <main className="home">
            <section className="hero">
              <p className="hero-brand">Hazmunah</p>
              <h1>Beautiful invites, ready to send</h1>
              <p className="hero-sub">
                Choose a design, personalize the details, then checkout —
                $25 base, or $30 with a music video.
              </p>
              <div className="hero-actions">
                <a className="btn primary hero-cta" href="#templates">
                  Browse templates
                </a>
                <p className="hero-mini">Choose → Edit → Pay</p>
              </div>
            </section>
            <div id="templates">
              <TemplateGallery templates={forms} onSelect={openTemplate} />
            </div>
          </main>
        ) : (
          template &&
          fields && (
            <main className="editor">
              <section className="preview-panel" aria-label="Live preview">
                <p className="preview-label">Live preview</p>
                <CardPreview
                  style={template.style}
                  fields={fields}
                  headingFont={headingFont}
                  bodyFont={bodyFont}
                  designImage={assetUrl(template.designImage)}
                  regions={template.regions}
                  watermark={template.watermark}
                  showWatermark={unlocked.length === 0}
                  cardRef={cardRef}
                />
              </section>

              <aside className="editor-panel">
                <div className="editor-heading">
                  <span className="gallery-category">{template.category}</span>
                  <h1>{template.name}</h1>
                  <p>
                    Update your details below. When it looks right, continue to
                    checkout.
                  </p>
                </div>
                <EditorForm
                  fields={fields}
                  onChange={updateField}
                  visibleKeys={
                    template.regions?.length
                      ? template.regions
                          .filter((region) => isUserEditableRegion(region))
                          .map((region) => region.fieldKey)
                      : undefined
                  }
                />
                {!template.designImage ? (
                  <FontPicker
                    headingFont={headingFont}
                    bodyFont={bodyFont}
                    onHeadingChange={setHeadingFont}
                    onBodyChange={setBodyFont}
                  />
                ) : (
                  <p className="download-note font-locked-note">
                    Top/bottom wording is set by admin. You edit name, venues,
                    and times.
                  </p>
                )}

                {unlocked.length > 0 ? (
                  <DownloadActions
                    unlocked={unlocked}
                    downloading={downloading}
                    progressMessage={progressMessage}
                    onDownload={handleDownload}
                    onClearPurchase={clearPurchase}
                    selectedMusicId={musicId}
                    onMusicChange={setMusicId}
                    musicOptions={musicOptions}
                    tracksCount={tracks.length}
                  />
                ) : (
                  <EditorContinue
                    tracksCount={tracks.length}
                    selectedMusicId={musicId}
                    onMusicChange={setMusicId}
                    musicOptions={musicOptions}
                    downloading={downloading}
                    onPreviewPng={() => handleDownload('png')}
                    onContinue={handleContinueToCheckout}
                    continuing={continuing}
                  />
                )}
              </aside>
            </main>
          )
        )}
      </div>

      {view === 'editor' && !unlocked.length ? (
        <div className="mobile-checkout-bar">
          <div className="mobile-checkout-prices">
            <span>From $25</span>
            <span className="mobile-checkout-sub">Music package $30</span>
          </div>
          <button
            type="button"
            className="btn primary"
            disabled={continuing}
            onClick={handleContinueToCheckout}
          >
            Checkout
          </button>
        </div>
      ) : null}

      <footer className="site-footer">
        <span>Hazmunah</span>
        <span>$25 invite · $30 with music video</span>
      </footer>
    </div>
  )
}
