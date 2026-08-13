import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { saveAs } from 'file-saver'
import type { CardFields } from '../types'

export function inviteSlug(fields: CardFields | null, fallback: string) {
  const raw = (fields?.honoree || fallback).trim()
  const slug = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  return slug || 'invite'
}

export async function captureCardPng(element: HTMLElement) {
  if (document.fonts?.ready) {
    await document.fonts.ready
  }
  return toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
  })
}

export async function downloadPng(element: HTMLElement, filename: string) {
  const dataUrl = await captureCardPng(element)
  saveAs(dataUrl, filename)
}

export async function downloadPdf(element: HTMLElement, filename: string) {
  const dataUrl = await captureCardPng(element)
  const img = await loadImage(dataUrl)

  const pageWidth = 127
  const pageHeight = 178
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
  })

  pdf.addImage(img, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
  pdf.save(filename)
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
