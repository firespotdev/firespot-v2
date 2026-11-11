import { isAxiosError } from 'axios'

/** Gateway errors mean the API is restarting or down, not that it refused. */
const UNAVAILABLE_STATUSES = new Set([502, 503, 504])
const DEFAULT_RETRIES = 3
const MAX_RETRY_DELAY_MS = 10_000

/** True when the API couldn't be reached at all, as opposed to answering with an error. */
export function isApiUnreachable(error: unknown): boolean {
  if (!isAxiosError(error)) return false
  if (error.code === 'ERR_CANCELED') return false
  if (!error.response) return true
  return UNAVAILABLE_STATUSES.has(error.response.status)
}

/**
 * Keep retrying a query while the API is unreachable, so a screen fills in
 * by itself once the server is back. Real error responses keep the usual
 * three retries.
 */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  return isApiUnreachable(error) || failureCount < DEFAULT_RETRIES
}

/** Back off 1s, 2s, 4s… up to 10s between attempts. */
export function queryRetryDelay(attempt: number) {
  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}
