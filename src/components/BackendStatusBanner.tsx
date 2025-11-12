import { useBackendStatus } from '../contexts/BackendStatusContext'
import './BackendStatusBanner.css'

export default function BackendStatusBanner() {
  const { status } = useBackendStatus()

  if (status === 'unknown') return null

  return (
    <div className={`backend-banner ${status}`}> 
      {status === 'online' ? 'Using live backend data' : 'Offline — using mock data'}
    </div>
  )
}
