import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../../services/api'
import './Challenges.css'

interface Challenge {
  id: string
  title: string
  description: string
  points: number
  progress: number
  target: number
  status: 'active' | 'completed' | 'expired'
  assignedUser?: number | string
}

export default function Challenges() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    fetchChallenges()
  }, [])

  useEffect(() => {
    const handler = () => fetchChallenges()
    window.addEventListener('activity-logged', handler)
    return () => window.removeEventListener('activity-logged', handler)
  }, [])

  useEffect(() => {
    const handler = () => fetchChallenges()
    window.addEventListener('activity-type-created', handler)
    return () => window.removeEventListener('activity-type-created', handler)
  }, [])

  const getUserActivityCount = async () => {
    try {
      const userStr = localStorage.getItem('user')
      const userId = userStr ? JSON.parse(userStr).id : undefined
      if (!userId) return 0
      const logs = await apiService.getAllActivityLogs()
      if (!Array.isArray(logs)) return 0
      const userIdStr = String(userId)
      return logs.filter((log: any) => {
        const lid = log?.userId ?? log?.user?.id
        return lid != null && String(lid) === userIdStr
      }).length
    } catch (err) {
      console.error('Failed to compute activity count for challenges', err)
      return 0
    }
  }

  const buildFallbackChallenges = async (): Promise<Challenge[]> => {
    const activityCount = await getUserActivityCount()
    const customCreated = localStorage.getItem('custom_activity_created') === 'true'
    const milestones = [
      { id: 'milestone-1', title: 'Log 1 Activity', description: 'Start your journey with your first logged activity.', points: 25, target: 1 },
      { id: 'milestone-3', title: 'Log 3 Activities', description: 'Build a habit with three logged activities.', points: 75, target: 3 },
      { id: 'milestone-5', title: 'Log 5 Activities', description: 'Stay consistent and reach five total logs.', points: 150, target: 5 },
      { id: 'milestone-10', title: 'Log 10 Activities', description: 'Hit double-digits to become an eco pro.', points: 350, target: 10 },
      { id: 'milestone-20', title: 'Log 20 Activities', description: 'Serious streak — twenty total activities!', points: 750, target: 20 },
      { id: 'create-custom-activity', title: 'Create a Custom Activity', description: 'Add your own activity type on the Log Activity page.', points: 200, target: 1 },
    ]

    return milestones.map(m => {
      const progressSource = m.id === 'create-custom-activity' ? (customCreated ? 1 : 0) : activityCount
      const progress = Math.min(progressSource, m.target)
      const status: Challenge['status'] = progress >= m.target ? 'completed' : 'active'
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        points: m.points,
        progress,
        target: m.target,
        status,
      }
    })
  }

  async function fetchChallenges() {
    setLoading(true)
    let mapped: Challenge[] = []
    try {
      const userStr = localStorage.getItem('user')
      const userId = userStr ? JSON.parse(userStr).id : undefined
      if (import.meta.env.DEV) {
        console.log('[Challenges] Fetching challenges for userId:', userId)
      }
      let backendChallenges = await apiService.getChallenges(userId)

      if (import.meta.env.DEV) {
        console.log('[Challenges] User-specific challenges result:', backendChallenges)
      }

      if ((!backendChallenges || (Array.isArray(backendChallenges) && backendChallenges.length === 0)) && userId) {
        backendChallenges = await apiService.getChallenges()
        if (import.meta.env.DEV) {
          console.log('[Challenges] Global challenges result:', backendChallenges)
        }
      }
  // Normalize backend shape -> our Challenge interface if needed
  mapped = (Array.isArray(backendChallenges) ? backendChallenges : []).map((ch) => {
        const record = (ch && typeof ch === 'object') ? (ch as Record<string, unknown>) : {}
        const id = String(record.challengeID ?? record.id ?? record.ChallengeID ?? Math.random())
        const title = String(record.name ?? record.title ?? 'Untitled Challenge')
        const description = String(record.description ?? '')
        const points = Number(record.points ?? 0)
        const target = Number(record.target ?? 1)
        const isCompleted = Boolean(record.isCompleted ?? record.completed ?? false)
        const progress = Number(record.progress ?? (isCompleted ? target : 0))
  const assignedUser = record.userId ?? ((record.user as any)?.id) ?? undefined
        const status: Challenge['status'] = isCompleted ? 'completed' : 'active'
        return { id, title, description, points, progress, target, status, assignedUser }
      }) as Challenge[]
    } catch (err) {
      console.error('Backend challenges unavailable:', err)
      mapped = []
    } finally {
      const fallback = await buildFallbackChallenges()
      // Merge fallback milestones with any backend-provided challenges, avoiding duplicate IDs
      const mergedIds = new Set<string>(mapped.map(m => String(m.id)))
      const merged = [...mapped]
      fallback.forEach(f => {
        if (!mergedIds.has(String(f.id))) {
          merged.push(f)
        }
      })
      setChallenges(merged)
      setLoading(false)
    }
  }

  // Logout removed per request (retain function if needed later)

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
                    {challenge.assignedUser && (
                      <small className="assigned-badge">Assigned to {String(challenge.assignedUser)}</small>
                    )}
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
