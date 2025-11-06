import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Badges.css'

// Mock data for testing UI without backend
const MOCK_BADGES = [
  {
    id: '1',
    title: 'Green Commuter',
    description: 'Completed the Green Commuter challenge',
    earnedDate: new Date(Date.now() - 2 * 24 * 3600000).toISOString()
  },
  {
    id: '2',
    title: 'Early Adopter',
    description: 'One of the first users to join EcoPoints',
    earnedDate: new Date(Date.now() - 10 * 24 * 3600000).toISOString()
  }
]

interface Badge {
  id: string
  title: string
  description: string
  earnedDate: string
}

export default function Badges() {
  const navigate = useNavigate()
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ⚠️ BACKEND INTEGRATION POINT
    // Replace this mock data fetch with actual API call
    fetchBadges()
  }, [])

  async function fetchBadges() {
    try {
      setLoading(true)
      
      // ⚠️ TODO: Replace with actual API call when backend is ready
      // Example:
      // const response = await apiService.getBadges()
      // setBadges(response.data)
      
      // Simulating API delay for now
      await new Promise(resolve => setTimeout(resolve, 500))
      setBadges(MOCK_BADGES)
      
    } catch (error) {
      console.error('Failed to fetch badges:', error)
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
          <button className="btn-back" onClick={() => navigate('/dashboard-preview')}>
            Back to Dashboard
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="demo-banner">
        Demo Mode - Using mock data. Backend integration ready at line 40.
      </div>

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
