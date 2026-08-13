import { useMemo, useState } from 'react'
import type { Template } from '../types'
import { CATEGORIES } from '../data/categories'
import { CardPreview } from './CardPreview'
import { assetUrl } from '../lib/api'

interface TemplateGalleryProps {
  templates: Template[]
  onSelect: (template: Template) => void
}

export function TemplateGallery({ templates, onSelect }: TemplateGalleryProps) {
  const [category, setCategory] = useState<string>('All')

  const categories = useMemo(() => {
    const fromData = Array.from(
      new Set(templates.map((item) => item.category).filter(Boolean)),
    )
    const ordered = CATEGORIES.filter(
      (item) => item === 'All' || fromData.includes(item),
    )
    const extras = fromData.filter(
      (item) => !CATEGORIES.includes(item as (typeof CATEGORIES)[number]),
    )
    return [...ordered, ...extras]
  }, [templates])

  const filtered =
    category === 'All'
      ? templates
      : templates.filter((item) => item.category === category)

  return (
    <div className="gallery-wrap">
      <div className="category-bar" role="tablist" aria-label="Categories">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={category === item}
            className={`category-chip${category === item ? ' active' : ''}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="gallery" aria-label="Invitation templates">
        {filtered.map((template, index) => (
          <button
            key={template.id}
            type="button"
            className="gallery-item"
            style={{ animationDelay: `${index * 70}ms` }}
            onClick={() => onSelect(template)}
          >
            <div className="gallery-preview">
              <CardPreview
                style={template.style}
                fields={template.defaults}
                designImage={assetUrl(template.designImage)}
                regions={template.regions}
                watermark={template.watermark}
              />
            </div>
            <div className="gallery-meta">
              <span className="gallery-category">{template.category}</span>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <span className="gallery-cta">
                {template.designImage ? 'Custom design · ' : ''}Customize →
              </span>
            </div>
          </button>
        ))}
      </section>
    </div>
  )
}
