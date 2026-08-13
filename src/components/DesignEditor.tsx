import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { INVITE_FONTS, fontStack } from '../data/fonts'
import {
  ADMIN_WORDING_FIELDS,
  CORE_EDIT_FIELDS,
  FIELD_OPTIONS,
  isUserEditableRegion,
  type CardFields,
  type FieldKey,
  type TextAlign,
  type TextRegion,
  type WatermarkConfig,
} from '../types'
import { WatermarkOverlay } from './WatermarkOverlay'

interface DesignEditorProps {
  designUrl: string
  regions: TextRegion[]
  sampleText: CardFields
  watermark?: WatermarkConfig | null
  onChange: (regions: TextRegion[]) => void
  onSampleTextChange: (key: FieldKey, value: string) => void
}

function newRegion(fieldKey: FieldKey, index: number): TextRegion {
  const label =
    FIELD_OPTIONS.find((item) => item.key === fieldKey)?.label || fieldKey
  const userEditable = CORE_EDIT_FIELDS.some((item) => item.key === fieldKey)
  return {
    id: `region-${fieldKey}-${Date.now()}-${index}`,
    fieldKey,
    label,
    x: 10,
    y: 8 + (index % 8) * 10,
    width: 80,
    height: userEditable ? 8 : 6,
    fontId: fieldKey === 'honoree' ? 'frank-ruhl' : 'assistant',
    fontSize: fieldKey === 'honoree' ? 5.5 : 2.8,
    color: '#1a1a1a',
    align: 'center',
    userEditable,
  }
}

export function DesignEditor({
  designUrl,
  regions,
  sampleText,
  watermark,
  onChange,
  onSampleTextChange,
}: DesignEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    regions[0]?.id ?? null,
  )
  const dragRef = useRef<{
    id: string
    mode: 'move' | 'resize'
    startX: number
    startY: number
    orig: TextRegion
  } | null>(null)

  const selected = useMemo(
    () => regions.find((region) => region.id === selectedId) || null,
    [regions, selectedId],
  )

  function updateRegion(id: string, patch: Partial<TextRegion>) {
    onChange(
      regions.map((region) =>
        region.id === id ? { ...region, ...patch } : region,
      ),
    )
  }

  function addField(fieldKey: FieldKey) {
    if (regions.some((region) => region.fieldKey === fieldKey)) return
    const region = newRegion(fieldKey, regions.length)
    onChange([...regions, region])
    setSelectedId(region.id)
  }

  function addFieldGroup(
    group: { key: FieldKey; label: string }[],
  ) {
    const next = [...regions]
    group.forEach((item, index) => {
      if (!next.some((region) => region.fieldKey === item.key)) {
        next.push(newRegion(item.key, next.length + index))
      }
    })
    onChange(next)
    setSelectedId(next.find((r) => r.fieldKey === group[0]?.key)?.id ?? next[0]?.id ?? null)
  }

  function removeSelected() {
    if (!selectedId) return
    const next = regions.filter((region) => region.id !== selectedId)
    onChange(next)
    setSelectedId(next[0]?.id ?? null)
  }

  function onPointerDown(
    event: PointerEvent<HTMLElement>,
    id: string,
    mode: 'move' | 'resize',
  ) {
    event.preventDefault()
    event.stopPropagation()
    const region = regions.find((item) => item.id === id)
    if (!region) return
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    dragRef.current = {
      id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      orig: { ...region },
    }
    setSelectedId(id)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>, board: HTMLElement) {
    const drag = dragRef.current
    if (!drag) return
    const rect = board.getBoundingClientRect()
    const dx = ((event.clientX - drag.startX) / rect.width) * 100
    const dy = ((event.clientY - drag.startY) / rect.height) * 100

    if (drag.mode === 'move') {
      updateRegion(drag.id, {
        x: Math.min(95, Math.max(0, drag.orig.x + dx)),
        y: Math.min(95, Math.max(0, drag.orig.y + dy)),
      })
    } else {
      updateRegion(drag.id, {
        width: Math.min(100 - drag.orig.x, Math.max(8, drag.orig.width + dx)),
        height: Math.min(100 - drag.orig.y, Math.max(4, drag.orig.height + dy)),
      })
    }
  }

  function onPointerUp() {
    dragRef.current = null
  }

  const unusedFields = FIELD_OPTIONS.filter(
    (item) => !regions.some((region) => region.fieldKey === item.key),
  )

  return (
    <div className="design-editor">
      <div className="design-toolbar">
        <p className="download-note">
          Place <strong>top/bottom wording</strong> as admin text (users cannot
          change it). Place <strong>name / venues / times</strong> as user-editable.
        </p>
        <div className="design-add-row">
          <button
            type="button"
            className="btn accent"
            onClick={() => addFieldGroup(ADMIN_WORDING_FIELDS.slice(0, 5))}
          >
            Add top + bottom wording
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => addFieldGroup(CORE_EDIT_FIELDS)}
          >
            Add name + venues + times
          </button>
          {unusedFields.map((item) => (
            <button
              key={item.key}
              type="button"
              className="btn ghost"
              onClick={() => addField(item.key)}
            >
              + {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="design-workspace">
        <div
          className="design-board"
          onPointerMove={(event) =>
            onPointerMove(event, event.currentTarget)
          }
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <img src={designUrl} alt="Invitation design" draggable={false} />
          {regions.map((region) => {
            const text = sampleText[region.fieldKey] || region.label
            const editable = isUserEditableRegion(region)
            return (
              <div
                key={region.id}
                className={`design-region${selectedId === region.id ? ' selected' : ''}${editable ? '' : ' locked'}`}
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
                onPointerDown={(event) => onPointerDown(event, region.id, 'move')}
              >
                <span className="design-region-badge">
                  {editable ? 'User' : 'Admin'}
                </span>
                <span dir="auto">{text}</span>
                <button
                  type="button"
                  className="design-resize"
                  aria-label="Resize"
                  onPointerDown={(event) =>
                    onPointerDown(event, region.id, 'resize')
                  }
                />
              </div>
            )
          })}
          <WatermarkOverlay watermark={watermark} />
        </div>

        <aside className="design-inspector">
          <h3>Text box settings</h3>
          {!selected ? (
            <p className="download-note">Select a text box on the design.</p>
          ) : (
            <div className="admin-form">
              <label className="field">
                <span>Field</span>
                <select
                  value={selected.fieldKey}
                  onChange={(e) => {
                    const fieldKey = e.target.value as FieldKey
                    const label =
                      FIELD_OPTIONS.find((item) => item.key === fieldKey)
                        ?.label || fieldKey
                    const userEditable = CORE_EDIT_FIELDS.some(
                      (item) => item.key === fieldKey,
                    )
                    updateRegion(selected.id, {
                      fieldKey,
                      label,
                      userEditable:
                        typeof selected.userEditable === 'boolean'
                          ? selected.userEditable
                          : userEditable,
                    })
                  }}
                >
                  {FIELD_OPTIONS.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field checkbox-field">
                <input
                  type="checkbox"
                  checked={isUserEditableRegion(selected)}
                  onChange={(e) =>
                    updateRegion(selected.id, {
                      userEditable: e.target.checked,
                    })
                  }
                />
                <span>Users can edit this text</span>
              </label>
              <p className="download-note">
                Off = admin wording only (top/bottom lines). On = name / venue /
                time style fields.
              </p>

              <label className="field">
                <span>Default text (Hebrew)</span>
                {selected.fieldKey === 'message' ||
                selected.fieldKey.startsWith('top') ||
                selected.fieldKey.startsWith('bottom') ? (
                  <textarea
                    rows={3}
                    dir="auto"
                    value={sampleText[selected.fieldKey]}
                    onChange={(e) =>
                      onSampleTextChange(selected.fieldKey, e.target.value)
                    }
                    placeholder="Type the wording for this box"
                  />
                ) : (
                  <input
                    type="text"
                    dir="auto"
                    value={sampleText[selected.fieldKey]}
                    onChange={(e) =>
                      onSampleTextChange(selected.fieldKey, e.target.value)
                    }
                    placeholder="Type the wording for this box"
                  />
                )}
              </label>
              <label className="field">
                <span>Font</span>
                <select
                  value={selected.fontId}
                  onChange={(e) =>
                    updateRegion(selected.id, { fontId: e.target.value })
                  }
                >
                  {INVITE_FONTS.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Size (% of card width)</span>
                <input
                  type="number"
                  min={1.5}
                  max={12}
                  step={0.1}
                  value={selected.fontSize}
                  onChange={(e) =>
                    updateRegion(selected.id, {
                      fontSize: Number(e.target.value) || 3,
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Color</span>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) =>
                    updateRegion(selected.id, { color: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Align</span>
                <select
                  value={selected.align}
                  onChange={(e) =>
                    updateRegion(selected.id, {
                      align: e.target.value as TextAlign,
                    })
                  }
                >
                  <option value="right">Right (Hebrew)</option>
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                </select>
              </label>
              <button
                type="button"
                className="btn ghost"
                onClick={removeSelected}
              >
                Remove text box
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
