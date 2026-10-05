export class ApiError extends Error {}

async function mensajeError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const error = body.error
      if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        if ('details' in error && Array.isArray(error.details)) {
          const detalles = error.details
            .map((item) => typeof item === 'object' && item !== null && 'message' in item ? item.message : null)
            .filter((item): item is string => typeof item === 'string')
          return detalles.length ? detalles.join(' ') : error.message
        }
        return error.message
      }
    }
  } catch {
    // La respuesta puede no incluir JSON.
  }
  return 'No se pudo completar la operación.'
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    signal: init?.signal ?? AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new ApiError(await mensajeError(response))
  const body = await response.json() as { data: T }
  return body.data
}
