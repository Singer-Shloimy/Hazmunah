import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/** Render the first page of a PDF to a PNG File for upload. */
export async function pdfFirstPageToPng(file: File, scale = 2): Promise<File> {
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const page = await doc.getPage(1)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas for PDF')

  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('PNG failed'))),
      'image/png',
    )
  })

  const base = file.name.replace(/\.pdf$/i, '') || 'design'
  return new File([blob], `${base}.png`, { type: 'image/png' })
}
