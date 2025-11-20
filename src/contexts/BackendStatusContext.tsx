import React, { createContext, useContext, useEffect, useState } from 'react'

type Status = 'unknown' | 'online' | 'offline'

const BackendStatusContext = createContext<{ status: Status }>({ status: 'unknown' })

export function BackendStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('unknown')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Try a lightweight unauthenticated endpoint to detect backend availability.
        // Prefer GET /auth (user list) which most backends expose for discovery.
        const base = (import.meta.env.VITE_API_BASE_URL as string) || '/api'
        const url = `${base.replace(/\/$/, '')}/auth`
        const resp = await fetch(url, { method: 'GET' })
        if (!mounted) return
        if (resp.ok) setStatus('online')
        else setStatus('offline')
      } catch {
        if (!mounted) return
        setStatus('offline')
      }
    })()

    return () => { mounted = false }
  }, [])

  return (
    <BackendStatusContext.Provider value={{ status }}>
      {children}
    </BackendStatusContext.Provider>
  )
}

export function useBackendStatus() {
  return useContext(BackendStatusContext)
}

export default BackendStatusContext
