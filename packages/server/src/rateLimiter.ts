const WINDOW_MS = 1000
const MAX_EVENTS = 10

const counters = new Map<string, { count: number; resetAt: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of counters) {
    if (entry.resetAt < now) counters.delete(key)
  }
}, 30_000)

export function checkRateLimit(socketId: string): boolean {
  const now = Date.now()
  const entry = counters.get(socketId)
  if (!entry || entry.resetAt < now) {
    counters.set(socketId, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= MAX_EVENTS
}
