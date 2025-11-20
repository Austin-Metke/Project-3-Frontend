import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../../services/api'
import './Badges.css'

interface Badge {
  id: string
  title: string
  description: string
  earnedDate?: string
}

export default function Badges() {
  const navigate = useNavigate()
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBadges()
  }, [])

  async function fetchBadges() {
    try {
      setLoading(true)
      setError(null)
      const resp = await apiService.getUserBadges()
      // Normalize response shape
      const list = Array.isArray(resp) ? resp : []
      setBadges(list.map((b: any) => ({ id: String(b.id ?? b.badgeId ?? Math.random()), title: b.title ?? b.name ?? 'Badge', description: b.description ?? '', earnedDate: b.earnedDate ?? b.createdAt })))
    } catch (err) {
      console.error('Failed to fetch badges:', err)
      setError(err instanceof Error ? err.message : 'Failed to load badges')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <div className="badges-container">
      <div className="badges-header">
        <div>
          <h1>Badges</h1>
          <p className="subtitle">Your earned achievements</p>
        </div>
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">⚠️ {error}</div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading badges...</p>
        </div>
      ) : (
        <div className="badges-list">
          {badges.length === 0 ? (
            <div className="empty-state">
              <p>No badges earned yet. Complete challenges to earn badges!</p>
            </div>
          ) : (
            badges.map(badge => (
              <div key={badge.id} className="badge-card">
                <div className="badge-icon">
                  <div className="badge-circle"></div>
                </div>
                <div className="badge-content">
                  <h3>{badge.title}</h3>
                  <p className="badge-description">{badge.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
