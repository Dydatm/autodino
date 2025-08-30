type Key = string

interface Bucket { count: number; resetAt: number }

const store = new Map<Key, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  const bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (bucket.count < limit) {
    bucket.count += 1
    return { ok: true }
  }
  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
  return { ok: false, retryAfter }
}
