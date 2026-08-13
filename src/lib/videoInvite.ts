import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { saveAs } from 'file-saver'
import { captureCardPng } from './download'

const WIDTH = 1080
const HEIGHT = 1512
const FPS = 30
const DURATION_SEC = 28

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoading: Promise<FFmpeg> | null = null

async function getFfmpeg() {
  if (ffmpegInstance) return ffmpegInstance
  if (!ffmpegLoading) {
    ffmpegLoading = (async () => {
      const ffmpeg = new FFmpeg()
      const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegInstance = ffmpeg
      return ffmpeg
    })()
  }
  return ffmpegLoading
}

function pickRecorderMime() {
  const candidates = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function convertWebmToMp4(webm: Blob) {
  const ffmpeg = await getFfmpeg()
  const inputName = 'invite.webm'
  const outputName = 'invite.mp4'
  await ffmpeg.writeFile(inputName, await fetchFile(webm))
  await ffmpeg.exec([
    '-i',
    inputName,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    outputName,
  ])
  const data = await ffmpeg.readFile(outputName)
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(outputName)
  const bytes =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : new Uint8Array(data)
  return new Blob([bytes.buffer], { type: 'video/mp4' })
}

export async function downloadInviteVideo(options: {
  element: HTMLElement
  musicUrl?: string
  filename: string
  onProgress?: (message: string) => void
}) {
  const { element, musicUrl, filename, onProgress } = options
  onProgress?.('Capturing invitation…')

  const png = await captureCardPng(element)
  const image = await loadImage(png)

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available')

  const audioContext = new AudioContext()
  const destination = audioContext.createMediaStreamDestination()
  let audioElement: HTMLAudioElement | null = null
  let audioSource: MediaElementAudioSourceNode | null = null

  if (musicUrl) {
    onProgress?.('Loading music…')
    audioElement = new Audio(musicUrl)
    audioElement.crossOrigin = 'anonymous'
    audioElement.loop = true
    await new Promise<void>((resolve, reject) => {
      if (!audioElement) return reject(new Error('Missing audio'))
      audioElement.oncanplaythrough = () => resolve()
      audioElement.onerror = () => reject(new Error('Could not load music'))
      audioElement.load()
    })
    audioSource = audioContext.createMediaElementSource(audioElement)
    audioSource.connect(destination)
    // Keep graph alive without playing through speakers during export
    const silent = audioContext.createGain()
    silent.gain.value = 0
    audioSource.connect(silent)
    silent.connect(audioContext.destination)
  } else {
    // Add a silent track so containers stay consistent
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    gain.gain.value = 0
    oscillator.connect(gain)
    gain.connect(destination)
    oscillator.start()
    setTimeout(() => oscillator.stop(), DURATION_SEC * 1000 + 500)
  }

  const videoStream = canvas.captureStream(FPS)
  const combined = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ])

  const mimeType = pickRecorderMime()
  if (!mimeType) throw new Error('Video recording is not supported in this browser')

  const chunks: Blob[] = []
  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  })

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onerror = () => reject(new Error('Recording failed'))
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType.includes('mp4') ? 'video/mp4' : 'video/webm' }))
    }
  })

  onProgress?.('Recording invitation video…')
  if (audioContext.state === 'suspended') await audioContext.resume()
  if (audioElement) await audioElement.play()

  recorder.start(200)

  const started = performance.now()
  await new Promise<void>((resolve) => {
    const draw = (now: number) => {
      const elapsed = (now - started) / 1000
      const t = Math.min(elapsed / DURATION_SEC, 1)
      const zoom = 1 + t * 0.06

      ctx.fillStyle = '#141c28'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      const drawW = WIDTH * zoom
      const drawH = HEIGHT * zoom
      const x = (WIDTH - drawW) / 2
      const y = (HEIGHT - drawH) / 2
      ctx.drawImage(image, x, y, drawW, drawH)

      // Soft vignette
      const gradient = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        HEIGHT * 0.2,
        WIDTH / 2,
        HEIGHT / 2,
        HEIGHT * 0.75,
      )
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, 'rgba(0,0,0,0.28)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      if (elapsed < DURATION_SEC) {
        requestAnimationFrame(draw)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(draw)
  })

  recorder.stop()
  if (audioElement) {
    audioElement.pause()
    audioElement.src = ''
  }
  await audioContext.close()

  let blob = await recorded
  const wantsMp4 = filename.toLowerCase().endsWith('.mp4')

  if (wantsMp4 && blob.type !== 'video/mp4') {
    onProgress?.('Converting to MP4…')
    try {
      blob = await convertWebmToMp4(blob)
    } catch (error) {
      console.warn('MP4 conversion failed, saving WebM instead', error)
      saveAs(blob, filename.replace(/\.mp4$/i, '.webm'))
      onProgress?.('')
      return
    }
  }

  saveAs(blob, filename)
  onProgress?.('')
}
