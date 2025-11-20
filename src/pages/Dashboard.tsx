import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import type { UserStats } from '../types'
import './Dashboard.css'

import type { User } from '../types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
    loadUser()
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

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>🌱 EcoPoints Dashboard</h1>
          <p className="subtitle">Keep making a difference, one action at a time!</p>
          {user && <p className="welcome">Signed in as <strong>{user.name}</strong></p>}
        </div>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </header>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>Total Points</h3>
            <p className="stat-value">{stats.totalPoints.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <h3>Current Streak</h3>
            <p className="stat-value">{stats.currentStreak} days</p>
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>This Week</h3>
            <p className="stat-value">{stats.weeklyPoints}</p>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Global Rank</h3>
            <p className="stat-value">#{stats.rank}</p>
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="card">
        <h2>📈 Weekly Progress</h2>
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
        <h2>🌿 Recent Activities</h2>
        {stats.recentActivities.length > 0 ? (
          <div className="activities-list">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{getCategoryIcon(String(activity.category ?? 'Other'))}</div>
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

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => navigate('/log-activity')}>
            <span className="action-icon">➕</span>
            <span>Log Activity</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/leaderboard')}>
            <span className="action-icon">🏅</span>
            <span>Leaderboard</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/challenges')}>
            <span className="action-icon">🎯</span>
            <span>Challenges</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/badges')}>
            <span className="action-icon">⭐</span>
            <span>Badges</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper function to get category icons
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    Transportation: '🚴',
    Recycling: '♻️',
    Energy: '⚡',
    Water: '💧',
    Food: '🥗',
    Other: '🌍'
  }
  return icons[category] || '🌍'
}
