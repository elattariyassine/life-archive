interface ApiErrorShape {
  statusCode?: number
  statusMessage?: string
  data?: {
    statusMessage?: string
    data?: {
      code?: string
      field?: string
    }
  }
}

const asApiError = (value: unknown): ApiErrorShape | null => {
  if (!value || typeof value !== 'object') return null
  return value as ApiErrorShape
}

export const getApiErrorStatus = (value: unknown) => asApiError(value)?.statusCode

export const getApiErrorCode = (value: unknown) => asApiError(value)?.data?.data?.code

export const getApiErrorMessage = (value: unknown, fallback: string) => {
  const error = asApiError(value)
  if (import.meta.dev && value) console.error('[life-archive] API request failed', value)
  return error?.data?.statusMessage || error?.statusMessage || fallback
}
