// Rate limiting simple en memoria (para empezar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(userId: string, limit = 10, windowMs = 60000) {
  const now = Date.now()
  const record = rateLimitMap.get(userId)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}