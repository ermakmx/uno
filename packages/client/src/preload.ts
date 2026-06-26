// Preload + rasterize SVG card assets to cached PNG data URLs so that
// <img> tags paint instantly (no per-mount SVG re-rasterization).
// The back is already a PNG; we still cache it under the same map.

const ASSETS = [
  '/cards/back.png',
  '/cards/wild.svg',
  '/cards/wild4.svg',
  ...['red', 'yellow', 'green', 'blue'].flatMap(c => [
    ...Array.from({ length: 10 }, (_, v) => `/cards/${c}-${v}.svg`),
    `/cards/${c}-skip.svg`,
    `/cards/${c}-reverse.svg`,
    `/cards/${c}-draw2.svg`,
  ]),
]

export type LoadState = {
  loaded: number
  total: number
  error?: string
}

// Render at a fixed resolution; the browser downscales for display.
// 240x360 viewBox × 2 for crispness on hi-DPI but small file size.
const RENDER_W = 240
const RENDER_H = 360
const SCALE = 2

const cache = new Map<string, string>()

const inflight = new Map<string, Promise<void>>()

function loadAndRasterize(src: string): Promise<void> {
  if (cache.has(src)) return Promise.resolve()
  const existing = inflight.get(src)
  if (existing) return existing

  const p = new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      try {
        await img.decode().catch(() => {})
        const canvas = document.createElement('canvas')
        canvas.width = RENDER_W * SCALE
        canvas.height = RENDER_H * SCALE
        const ctx = canvas.getContext('2d')
        if (!ctx) { cache.set(src, src); resolve(); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        try {
          const url = canvas.toDataURL('image/png')
          cache.set(src, url)
        } catch {
          // tainted canvas or unavailable: fall back to original source
          cache.set(src, src)
        }
        resolve()
      } catch {
        cache.set(src, src)
        resolve()
      }
    }
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    img.src = src
  })
  inflight.set(src, p)
  return p
}

export function getAsset(src: string): string {
  return cache.get(src) ?? src
}

export function preloadAssets(
  onProgress: (s: LoadState) => void
): Promise<void> {
  const total = ASSETS.length
  let loaded = 0
  let settled = false
  return new Promise((resolve, reject) => {
    for (const src of ASSETS) {
      loadAndRasterize(src)
        .then(() => {
          if (settled) return
          loaded++
          onProgress({ loaded, total })
          if (loaded === total) { settled = true; resolve() }
        })
        .catch((err) => {
          if (settled) return
          settled = true
          onProgress({ loaded, total, error: String(err.message ?? err) })
          reject(err)
        })
    }
  })
}