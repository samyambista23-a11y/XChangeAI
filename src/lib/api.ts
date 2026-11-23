import { getAuthToken } from 'deepspace'

/**
 * Call a server action (POST /api/actions/:name) as the signed-in user and
 * return its `data`. Throws an Error carrying the server's own message when
 * the action refuses, so callers can show it directly.
 */
export async function callAction<T = unknown>(name: string, params: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Please sign in again.')
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  })
  let body: { success?: boolean; error?: string; data?: T } = {}
  try {
    body = (await res.json()) as typeof body
  } catch {
    /* non-JSON error page; fall through to the status message */
  }
  if (!res.ok || body.success === false) {
    throw new Error(body.error ?? `Something went wrong (${res.status}).`)
  }
  return body.data as T
}

/** Run an async UI action, turning any thrown error into a message for a toast. */
export async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
