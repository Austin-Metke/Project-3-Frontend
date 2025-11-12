import React, { createContext, useContext, useEffect, useState } from 'react'
import apiService from '../services/api'

type Status = 'unknown' | 'online' | 'offline'

const BackendStatusContext = createContext<{ status: Status }>({ status: 'unknown' })

export function BackendStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('unknown')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Try a lightweight call that most backends provide
        await apiService.getUserProfile()
        if (!mounted) return
        setStatus('online')
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
