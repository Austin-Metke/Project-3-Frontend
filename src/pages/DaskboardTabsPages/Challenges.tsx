import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Challenges.css'

// Mock data for testing UI without backend
const MOCK_CHALLENGES = [
  {
    id: '1',
    title: '7-Day Streak',
    description: 'Log eco-friendly activities for 7 consecutive days',
    points: 100,
    progress: 3,
    target: 7,
    status: 'active' as const
  },
  {
    id: '2',
    title: 'Recycling Champion',
    description: 'Complete 10 recycling activities this month',
    points: 150,
    progress: 6,
    target: 10,
    status: 'active' as const
  },
  {
    id: '3',
    title: 'Green Commuter',
    description: 'Use eco-friendly transportation 15 times',
    points: 200,
    progress: 15,
    target: 15,
    status: 'completed' as const
  },
  {
    id: '4',
    title: 'Energy Saver',
    description: 'Complete 5 energy-saving activities',
    points: 75,
    progress: 2,
    target: 5,
    status: 'active' as const
  },
  {
    id: '5',
    title: 'Weekend Warrior',
    description: 'Complete any 3 activities this weekend',
    points: 50,
    progress: 0,
    target: 3,
    status: 'active' as const
  }
]

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
    // ⚠️ BACKEND INTEGRATION POINT
    // Replace this mock data fetch with actual API call
    fetchChallenges()
  }, [])

  async function fetchChallenges() {
    try {
      setLoading(true)
      
      // ⚠️ TODO: Replace with actual API call when backend is ready
      // Example:
      // const response = await apiService.getChallenges()
      // setChallenges(response.data)
      
      // Simulating API delay for now
      await new Promise(resolve => setTimeout(resolve, 500))
      setChallenges(MOCK_CHALLENGES)
      
    } catch (error) {
      console.error('Failed to fetch challenges:', error)
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
          <button className="btn-back" onClick={() => navigate('/dashboard-preview')}>
            Back to Dashboard
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="demo-banner">
        Demo Mode - Using mock data. Backend integration ready at line 85.
      </div>

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
