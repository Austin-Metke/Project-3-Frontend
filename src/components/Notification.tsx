import { useEffect } from 'react'
import './Notification.css'

type NotificationProps = {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
}

export default function Notification({ message, type = 'info', onClose }: NotificationProps) {
  useEffect(() => {
    const t = setTimeout(() => onClose && onClose(), 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`notification ${type}`} role="status" aria-live="polite">
      <div className="notification-message">{message}</div>
      <button className="notification-close" onClick={() => onClose && onClose()} aria-label="Close">×</button>
    </div>
  )
}
