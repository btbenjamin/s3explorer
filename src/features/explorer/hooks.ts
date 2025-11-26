import { useEffect, useState } from 'react'
import { getObjectAccess } from './s3.server'
import type { ObjectAccess } from './types'

type AccessState =
  | { status: 'idle' }
  | { status: 'loading'; key: string }
  | { status: 'error'; key: string; message: string }
  | { status: 'success'; key: string; data: ObjectAccess }

export const useObjectAccess = (
  key: string | null,
  disposition: 'inline' | 'attachment' = 'inline',
) => {
  const [state, setState] = useState<AccessState>({ status: 'idle' })

  useEffect(() => {
    if (!key) {
      setState({ status: 'idle' })
      return
    }

    let aborted = false
    setState({ status: 'loading', key })

    getObjectAccess({ data: { key, disposition } })
      .then((data) => {
        if (aborted) return
        setState({ status: 'success', key, data })
      })
      .catch((error: unknown) => {
        if (aborted) return
        const message =
          error instanceof Error
            ? error.message
            : 'Une erreur est survenue lors de la récupération du document.'
        setState({ status: 'error', key, message })
      })

    return () => {
      aborted = true
    }
  }, [key, disposition])

  return state
}
