import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../../services/api'
import './Challenges.css'

// Challenges now load from backend; mock data removed.

interface Challenge {
  id: string
  title: string
  description: string
  points: number
  progress: number
  target: number
  status: 'active' | 'completed' | 'expired'
}

export default function Challenges() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    fetchChallenges()
  }, [])

  async function fetchChallenges() {
    setLoading(true)
    try {
      // Prefer backend challenges if available
      const userStr = localStorage.getItem('user')
      const userId = userStr ? JSON.parse(userStr).id : undefined
      const backendChallenges = await apiService.getChallenges(userId)
      // Normalize backend shape -> our Challenge interface if needed
      const mapped = (Array.isArray(backendChallenges) ? backendChallenges : []).map((ch) => {
        const record = (ch && typeof ch === 'object') ? (ch as Record<string, unknown>) : {}
        const id = String(record.challengeID ?? record.id ?? record.ChallengeID ?? Math.random())
        const title = String(record.name ?? record.title ?? 'Untitled Challenge')
        const description = String(record.description ?? '')
        const points = Number(record.points ?? 0)
        const target = Number(record.target ?? 1)
        const isCompleted = Boolean(record.isCompleted)
        const progress = Number(record.progress ?? (isCompleted ? target : 0))
        const status: Challenge['status'] = isCompleted ? 'completed' : 'active'
        return { id, title, description, points, progress, target, status }
      }) as Challenge[]
      setChallenges(mapped)
    } catch (err) {
      // Do not fall back to mock — surface error so developer knows backend is missing
      console.error('Backend challenges unavailable:', err)
      setChallenges([])
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/')
  }

  const filteredChallenges = challenges.filter(challenge => {
    if (filter === 'all') return true
    return challenge.status === filter
  })

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min((progress / target) * 100, 100)
  }

  return (
    <div className="challenges-container">
      <div className="challenges-header">
        <div>
          <h1>Challenges</h1>
          <p className="subtitle">Complete challenges to earn bonus points</p>
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

      {/* Info: challenges are loaded from backend when available */}

      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Challenges
        </button>
        <button 
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active ({challenges.filter(c => c.status === 'active').length})
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed ({challenges.filter(c => c.status === 'completed').length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading challenges...</p>
        </div>
      ) : (
        <div className="challenges-list">
          {filteredChallenges.length === 0 ? (
            <div className="empty-state">
              <p>No {filter !== 'all' ? filter : ''} challenges found</p>
            </div>
          ) : (
            filteredChallenges.map(challenge => (
              <div 
                key={challenge.id} 
                className={`challenge-card ${challenge.status}`}
              >
                <div className="challenge-header">
                  <div className="challenge-title-section">
                    <h3>{challenge.title}</h3>
                  </div>
                  <div className="challenge-points">
                    <span className="points-value">+{challenge.points}</span>
                    <span className="points-label">points</span>
                  </div>
                </div>

                <p className="challenge-description">{challenge.description}</p>

                <div className="progress-section">
                  <div className="progress-info">
                    <span className="progress-text">
                      {challenge.progress} / {challenge.target}
                    </span>
                    {challenge.status === 'completed' && (
                      <span className="status-badge completed">Completed</span>
                    )}
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${getProgressPercentage(challenge.progress, challenge.target)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
