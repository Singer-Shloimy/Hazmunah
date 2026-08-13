import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  api,
  assetUrl,
  musicUrl,
  type ApiMusicTrack,
  type InviteForm,
} from '../lib/api'
import { CATEGORIES } from '../data/categories'
import { DesignEditor } from '../components/DesignEditor'
import { pdfFirstPageToPng } from '../lib/pdfToImage'
import {
  DEFAULT_WATERMARK,
  FIELD_OPTIONS,
  emptyCardFields,
  isUserEditableRegion,
  type FieldKey,
  type TemplateStyle,
  type TextRegion,
  type WatermarkConfig,
} from '../types'

const STYLES: TemplateStyle[] = [
  'garden',
  'midnight',
  'scroll',
  'bloom',
  'linen',
  'ember',
]

const ADMIN_CATEGORIES = CATEGORIES.filter((item) => item !== 'All')

const emptyDefaults = () => emptyCardFields()

const TOKEN_KEY = 'hazmunah-admin-token'

export function Admin() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [forms, setForms] = useState<InviteForm[]>([])
  const [tracks, setTracks] = useState<ApiMusicTrack[]>([])
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formDraft, setFormDraft] = useState({
    name: '',
    category: 'Wedding',
    style: 'garden' as TemplateStyle,
    description: '',
    defaults: emptyDefaults(),
    designImage: null as string | null,
    regions: [] as TextRegion[],
    watermark: { ...DEFAULT_WATERMARK } as WatermarkConfig,
  })

  const [musicDraft, setMusicDraft] = useState({
    name: '',
    mood: '',
    file: null as File | null,
  })

  async function refresh() {
    const [nextForms, nextMusic] = await Promise.all([
      api.getForms(),
      api.getMusic(),
    ])
    setForms(nextForms)
    setTracks(nextMusic)
  }

  useEffect(() => {
    refresh().catch(() => {
      setError('Could not reach the API. Start it with npm run dev.')
    })
  }, [])

  function resetDraft() {
    setEditingId(null)
    setFormDraft({
      name: '',
      category: 'Wedding',
      style: 'garden',
      description: '',
      defaults: emptyDefaults(),
      designImage: null,
      regions: [],
      watermark: { ...DEFAULT_WATERMARK },
    })
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { token: nextToken } = await api.login(password)
      localStorage.setItem(TOKEN_KEY, nextToken)
      setToken(nextToken)
      setPassword('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    if (!token) return
    try {
      await api.logout(token)
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }

  async function handleSaveForm(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    setBusy(true)
    setError('')
    try {
      if (editingId) {
        await api.updateForm(token, editingId, formDraft)
      } else {
        await api.createForm(token, formDraft)
      }
      resetDraft()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save form')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(form: InviteForm) {
    setEditingId(form.id)
    setFormDraft({
      name: form.name,
      category: form.category,
      style: form.style,
      description: form.description,
      defaults: { ...emptyCardFields(), ...form.defaults },
      designImage: form.designImage || null,
      regions: form.regions || [],
      watermark: form.watermark
        ? { ...form.watermark }
        : { ...DEFAULT_WATERMARK, enabled: false },
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDeleteForm(id: string) {
    if (!token || !confirm('Delete this invitation form?')) return
    setBusy(true)
    try {
      await api.deleteForm(token, id)
      if (editingId === id) resetDraft()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete form')
    } finally {
      setBusy(false)
    }
  }

  async function handleDesignFile(file: File | null) {
    if (!token || !file) return
    setBusy(true)
    setError('')
    try {
      let uploadFile = file
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        uploadFile = await pdfFirstPageToPng(file, 2.5)
      }
      const uploaded = await api.uploadDesign(token, uploadFile)
      setFormDraft((prev) => ({
        ...prev,
        designImage: uploaded.url,
        regions: prev.regions.length
          ? prev.regions
          : [
              {
                id: `region-honoree-${Date.now()}`,
                fieldKey: 'honoree',
                label: 'Name(s)',
                x: 12,
                y: 38,
                width: 76,
                height: 10,
                fontId: 'frank-ruhl',
                fontSize: 5.5,
                color: '#1a1a1a',
                align: 'center',
              },
            ],
      }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not upload design. Use PDF or PNG/JPG.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleUploadMusic(event: FormEvent) {
    event.preventDefault()
    if (!token || !musicDraft.file) return
    setBusy(true)
    setError('')
    try {
      await api.uploadMusic(token, musicDraft.file, {
        name: musicDraft.name || musicDraft.file.name,
        mood: musicDraft.mood || 'Uploaded track',
      })
      setMusicDraft({ name: '', mood: '', file: null })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload music')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteMusic(id: string) {
    if (!token || !confirm('Delete this music track?')) return
    setBusy(true)
    try {
      await api.deleteMusic(token, id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete music')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app admin-app">
      <div className="atmosphere" aria-hidden />
      <header className="site-header">
        <Link className="brand" to="/">
          Hazmunah
        </Link>
        <nav className="header-actions">
          <Link className="btn ghost" to="/">
            Studio
          </Link>
          {token ? (
            <button type="button" className="btn ghost" onClick={handleLogout}>
              Log out
            </button>
          ) : null}
        </nav>
      </header>

      <main className="admin-main">
        <section className="admin-hero">
          <h1>Admin</h1>
          <p>
            Upload your own PDF/image design, place text boxes, choose fonts,
            and upload music for users.
          </p>
        </section>

        {error ? <p className="admin-error">{error}</p> : null}

        {!token ? (
          <form className="admin-card" onSubmit={handleLogin}>
            <h2>Sign in</h2>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                required
              />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="download-note">
              Default password: <code>hazmunah-admin</code>
            </p>
          </form>
        ) : (
          <div className="admin-grid admin-grid-wide">
            <section className="admin-card admin-span-2">
              <h2>
                {editingId ? 'Edit invitation form' : 'New invitation form'}
              </h2>
              <form className="admin-form" onSubmit={handleSaveForm}>
                <div className="admin-form-columns">
                  <label className="field">
                    <span>Name</span>
                    <input
                      value={formDraft.name}
                      onChange={(e) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Category</span>
                    <select
                      value={formDraft.category}
                      onChange={(e) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      required
                    >
                      {ADMIN_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Fallback style (if no PDF)</span>
                    <select
                      value={formDraft.style}
                      onChange={(e) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          style: e.target.value as TemplateStyle,
                        }))
                      }
                    >
                      {STYLES.map((style) => (
                        <option key={style} value={style}>
                          {style}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Description</span>
                  <input
                    value={formDraft.description}
                    onChange={(e) =>
                      setFormDraft((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </label>
                <div className="design-upload-block">
                  <h3>PDF / image design</h3>
                  <p className="download-note">
                    Upload a PDF (first page) or PNG/JPG. Then place text boxes,
                    type the default Hebrew text for each one, and set the font.
                  </p>
                  <label className="field">
                    <span>Upload design</span>
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        handleDesignFile(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                </div>

                {formDraft.designImage ? (
                  <>
                    <div className="watermark-settings">
                      <h3>Watermark</h3>
                      <p className="download-note">
                        Shows on free previews. Removed automatically after the
                        user pays and downloads.
                      </p>
                      <label className="field checkbox-field">
                        <input
                          type="checkbox"
                          checked={formDraft.watermark.enabled}
                          onChange={(e) =>
                            setFormDraft((prev) => ({
                              ...prev,
                              watermark: {
                                ...prev.watermark,
                                enabled: e.target.checked,
                              },
                            }))
                          }
                        />
                        <span>Show watermark on this design</span>
                      </label>
                      <label className="field">
                        <span>Watermark text</span>
                        <input
                          value={formDraft.watermark.text}
                          onChange={(e) =>
                            setFormDraft((prev) => ({
                              ...prev,
                              watermark: {
                                ...prev.watermark,
                                text: e.target.value,
                              },
                            }))
                          }
                          placeholder="Hazmunah"
                        />
                      </label>
                      <label className="field">
                        <span>
                          Opacity ({Math.round(formDraft.watermark.opacity * 100)}
                          %)
                        </span>
                        <input
                          type="range"
                          min={0.05}
                          max={0.35}
                          step={0.01}
                          value={formDraft.watermark.opacity}
                          onChange={(e) =>
                            setFormDraft((prev) => ({
                              ...prev,
                              watermark: {
                                ...prev.watermark,
                                opacity: Number(e.target.value),
                              },
                            }))
                          }
                        />
                      </label>
                    </div>

                    <DesignEditor
                      designUrl={assetUrl(formDraft.designImage)}
                      regions={formDraft.regions}
                      sampleText={formDraft.defaults}
                      watermark={formDraft.watermark}
                      onChange={(regions) =>
                        setFormDraft((prev) => ({ ...prev, regions }))
                      }
                      onSampleTextChange={(key, value) =>
                        setFormDraft((prev) => ({
                          ...prev,
                          defaults: { ...prev.defaults, [key]: value },
                        }))
                      }
                    />
                    <div className="default-text-panel">
                      <h3>Admin wording (top / bottom — users can’t edit)</h3>
                      <p className="download-note">
                        Set all the small lines here. Locked boxes stay as you
                        wrote them on every download.
                      </p>
                      <div className="default-text-grid">
                        {FIELD_OPTIONS.filter((item) =>
                          formDraft.regions.some(
                            (region) =>
                              region.fieldKey === item.key &&
                              !isUserEditableRegion(region),
                          ),
                        ).map((item) => (
                          <label key={item.key} className="field">
                            <span>{item.label}</span>
                            <textarea
                              rows={2}
                              dir="auto"
                              value={formDraft.defaults[item.key as FieldKey]}
                              onChange={(e) =>
                                setFormDraft((prev) => ({
                                  ...prev,
                                  defaults: {
                                    ...prev.defaults,
                                    [item.key]: e.target.value,
                                  },
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="default-text-panel">
                      <h3>User-editable defaults (name / venues / times)</h3>
                      <p className="download-note">
                        Starting values users can change.
                      </p>
                      <div className="default-text-grid">
                        {FIELD_OPTIONS.filter((item) =>
                          formDraft.regions.some(
                            (region) =>
                              region.fieldKey === item.key &&
                              isUserEditableRegion(region),
                          ),
                        ).map((item) => (
                          <label key={item.key} className="field">
                            <span>{item.label}</span>
                            <input
                              type="text"
                              dir="auto"
                              value={formDraft.defaults[item.key as FieldKey]}
                              onChange={(e) =>
                                setFormDraft((prev) => ({
                                  ...prev,
                                  defaults: {
                                    ...prev.defaults,
                                    [item.key]: e.target.value,
                                  },
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="default-text-panel">
                    <h3>Default invitation text</h3>
                    <p className="download-note">
                      Without a custom PDF, these defaults fill the built-in
                      template style.
                    </p>
                    <div className="default-text-grid">
                      {FIELD_OPTIONS.map((item) => (
                        <label key={item.key} className="field">
                          <span>{item.label}</span>
                          {item.key === 'message' ? (
                            <textarea
                              rows={3}
                              dir="auto"
                              value={formDraft.defaults[item.key]}
                              onChange={(e) =>
                                setFormDraft((prev) => ({
                                  ...prev,
                                  defaults: {
                                    ...prev.defaults,
                                    [item.key]: e.target.value,
                                  },
                                }))
                              }
                            />
                          ) : (
                            <input
                              type="text"
                              dir="auto"
                              value={formDraft.defaults[item.key]}
                              onChange={(e) =>
                                setFormDraft((prev) => ({
                                  ...prev,
                                  defaults: {
                                    ...prev.defaults,
                                    [item.key]: e.target.value,
                                  },
                                }))
                              }
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="admin-save-row">
                  <button className="btn primary" type="submit" disabled={busy}>
                    {busy
                      ? 'Saving…'
                      : editingId
                        ? 'Save changes'
                        : 'Save form'}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={resetDraft}
                      disabled={busy}
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>

              <ul className="admin-list">
                {forms.map((form) => (
                  <li key={form.id}>
                    <div>
                      <strong>{form.name}</strong>
                      <span>
                        {form.category} · {form.style}
                        {form.designImage ? ' · custom PDF design' : ''}
                        {form.regions?.length
                          ? ` · ${form.regions.length} text boxes`
                          : ''}
                      </span>
                    </div>
                    <div className="admin-list-actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => startEdit(form)}
                        disabled={busy}
                      >
                        Edit design
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => handleDeleteForm(form.id)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="admin-card">
              <h2>Upload music</h2>
              <form className="admin-form" onSubmit={handleUploadMusic}>
                <label className="field">
                  <span>Track name</span>
                  <input
                    value={musicDraft.name}
                    onChange={(e) =>
                      setMusicDraft((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Wedding Prelude"
                  />
                </label>
                <label className="field">
                  <span>Mood / note</span>
                  <input
                    value={musicDraft.mood}
                    onChange={(e) =>
                      setMusicDraft((prev) => ({
                        ...prev,
                        mood: e.target.value,
                      }))
                    }
                    placeholder="Soft piano"
                  />
                </label>
                <label className="field">
                  <span>Audio file (mp3, wav, m4a)</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      setMusicDraft((prev) => ({
                        ...prev,
                        file: e.target.files?.[0] || null,
                      }))
                    }
                    required
                  />
                </label>
                <button
                  className="btn accent"
                  type="submit"
                  disabled={busy || !musicDraft.file}
                >
                  Upload music
                </button>
              </form>

              <ul className="admin-list">
                {tracks.length === 0 ? (
                  <li className="admin-empty">No music uploaded yet.</li>
                ) : (
                  tracks.map((track) => (
                    <li key={track.id}>
                      <div>
                        <strong>{track.name}</strong>
                        <span>{track.mood}</span>
                        <audio controls src={musicUrl(track)} preload="none" />
                      </div>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => handleDeleteMusic(track.id)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
