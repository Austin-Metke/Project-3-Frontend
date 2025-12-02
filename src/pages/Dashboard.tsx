import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import type { UserStats, LeaderboardEntry } from '../types'
import './Dashboard.css'

import type { User } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
    loadUser()
    loadLeaderboard()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getUserStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUser = async () => {
    try {
      const u = await apiService.getUserProfile()
      setUser(u)
    } catch (err) {
      // ignore; user may be in localStorage
      const userStr = localStorage.getItem('user')
      if (userStr) setUser(JSON.parse(userStr))
    }
  }

  const loadLeaderboard = async () => {
    try {
      const data = await apiService.getLeaderboard()
      const arr = Array.isArray(data) ? data : []
      // Normalize entries similar to Leaderboard page for consistent matching
      const normalized: LeaderboardEntry[] = (arr as any[]).map((r, idx) => {
        const rec = r && typeof r === 'object' ? (r as Record<string, any>) : {}
        return {
          userId: rec.userId ?? rec.id ?? rec.user?.id ?? idx,
          name: rec.name ?? rec.user?.name ?? String(rec.email ?? rec.username ?? 'Unknown'),
          totalPoints: Number(rec.totalPoints ?? rec.points ?? rec.total_points ?? 0),
          totalCo2gSaved: Number(rec.totalCo2gSaved ?? rec.co2gSaved ?? rec.co2_saved ?? 0),
          rank: Number(rec.rank ?? rec.position ?? idx + 1),
        }
      }).sort((a, b) => b.totalPoints - a.totalPoints)
      // Reassign rank after sorting
      normalized.forEach((e, i) => { e.rank = i + 1 })
      setLeaderboard(normalized)
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    }
  }

  const handleLogout = async () => {
    await apiService.logout()
    navigate('/login')
  }

  const useDemoMode = () => {
    // Navigate to the mock dashboard instead
    navigate('/dashboard-preview')
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your EcoPoints...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-card">
          <h2>Unable to Load Dashboard</h2>
          <p>{error}</p>
          <div className="info-banner" style={{ marginTop: '1rem' }}>
            The backend API is not connected. Try the Demo Dashboard to see how it will look.
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={loadDashboardData} className="btn-primary">
              Try Again
            </button>
            <button onClick={useDemoMode} className="btn-demo">
              View Demo Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const maxWeeklyPoints = Math.max(...stats.weeklyProgress.map(d => d.points), 100)
  
  // Find user's actual rank and points from leaderboard
  const matchesUser = (entry: LeaderboardEntry) => {
    const userIdStr = user?.id != null ? String(user.id) : undefined
    const entryIds = [entry.userId, (entry as any).id, (entry as any).user_id]
    if (userIdStr && entryIds.some(v => v != null && String(v) === userIdStr)) return true
    const userNames = [user?.name, (user as any)?.username, (user as any)?.email].filter(Boolean)
    const entryNames = [entry.name, (entry as any).userName, (entry as any).username, (entry as any).email].filter(Boolean)
    return userNames.some(n => entryNames.includes(n as string))
  }
  const sortedLeaderboard = leaderboard.slice().sort((a, b) => b.totalPoints - a.totalPoints)
  const userLeaderboardEntry = sortedLeaderboard.find(matchesUser)
  const userIndex = sortedLeaderboard.findIndex(matchesUser)
  const actualRank = userIndex >= 0 ? userIndex + 1 : (userLeaderboardEntry?.rank || stats.rank)
  const actualTotalPoints = userLeaderboardEntry?.totalPoints ?? stats.totalPoints

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>EcoPoints Dashboard</h1>
          <p className="subtitle">Keep making a difference, one action at a time!</p>
          {user && <p className="welcome">Signed in as <strong>{user.name}</strong></p>}
        </div>
        <div style={{display:'flex', gap:'0.75rem'}}>
          <button onClick={() => navigate(-1)} className="btn-back">Back</button>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">Total</div>
          <div className="stat-content">
            <h3>Total Points</h3>
            <p className="stat-value">{actualTotalPoints.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon">Rank</div>
          <div className="stat-content">
            <h3>Global Rank</h3>
            <p className="stat-value">#{actualRank}</p>
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="card">
        <h2>Weekly Progress</h2>
        <div className="chart-container">
          {stats.weeklyProgress.map((day) => (
            <div key={day.day} className="chart-bar-wrapper">
              <div className="chart-bar-container">
                <div 
                  className="chart-bar"
                  style={{ 
                    height: `${(day.points / maxWeeklyPoints) * 100}%`,
                    minHeight: day.points > 0 ? '4px' : '0'
                  }}
                >
                  <span className="bar-value">{day.points}</span>
                </div>
              </div>
              <span className="chart-label">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="card">
        <h2>Recent Activities</h2>
        {stats.recentActivities.length > 0 ? (
          <div className="activities-list">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-content">
                  <h4>{activity.activityType?.name ?? 'Activity'}</h4>
                  <p className="activity-category">{activity.category ?? 'Other'}</p>
                </div>
                <div className="activity-points">+{Number(activity.points ?? 0)} pts</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No activities logged yet. Start making an impact!</p>
          </div>
        )}
      </div>

      {/* Global Leaderboard Preview */}
      {leaderboard.length > 0 && (
        <div className="card">
          <h2>Global Leaderboard - Top 5</h2>
          <div className="activities-list">
            {leaderboard.slice(0, 5).map((entry, index) => {
              const isCurrentUser = entry.userId === user?.id || entry.name === user?.name
              return (
                <div 
                  key={entry.userId} 
                  className={`activity-item ${isCurrentUser ? 'highlight' : ''}`}
                  style={isCurrentUser ? { backgroundColor: '#e8f5e9', borderLeft: '4px solid #4caf50' } : {}}
                >
                  <div className="activity-content">
                    <h4>
                      #{entry.rank || index + 1} {entry.name || entry.userName || 'User'}
                      {isCurrentUser && ' (You)'}
                    </h4>
                    {entry.totalCo2gSaved && (
                      <p className="activity-category">
                        CO₂ Saved: {Number(entry.totalCo2gSaved).toLocaleString()}g
                      </p>
                    )}
                  </div>
                  <div className="activity-points">{entry.totalPoints.toLocaleString()} pts</div>
                </div>
              )
            })}
          </div>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/leaderboard')}
            style={{ marginTop: '1rem', width: '100%' }}
          >
            View Full Leaderboard
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => navigate('/log-activity')}>
            <span className="action-icon">+</span>
            <span>Log Activity</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/leaderboard')}>
            <span className="action-icon"></span>
            <span>Leaderboard</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/challenges')}>
            <span className="action-icon"></span>
            <span>Challenges</span>
          </button>

        </div>
      </div>
    </div>
  )
}
