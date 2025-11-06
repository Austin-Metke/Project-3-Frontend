import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserStats } from '../types'
import './Dashboard.css'

// MOCK DATA for testing UI without backend
const mockStats: UserStats = {
  totalPoints: 1250,
  currentStreak: 7,
  weeklyPoints: 350,
  monthlyPoints: 980,
  rank: 42,
  recentActivities: [
    {
      id: '1',
      userId: 'user1',
      activityType: {
        id: 'type1',
        name: 'Biked to School',
        description: 'Used bicycle instead of car',
        points: 50,
        category: 'Transportation'
      },
      points: 50,
      category: 'Transportation',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      userId: 'user1',
      activityType: {
        id: 'type2',
        name: 'Recycled Bottles',
        description: 'Recycled plastic bottles',
        points: 25,
        category: 'Recycling'
      },
      points: 25,
      category: 'Recycling',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      userId: 'user1',
      activityType: {
        id: 'type3',
        name: 'Used Reusable Water Bottle',
        description: 'Avoided single-use plastic',
        points: 15,
        category: 'Water'
      },
      points: 15,
      category: 'Water',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ],
  weeklyProgress: [
    { day: 'Mon', points: 50 },
    { day: 'Tue', points: 75 },
    { day: 'Wed', points: 60 },
    { day: 'Thu', points: 85 },
    { day: 'Fri', points: 40 },
    { day: 'Sat', points: 20 },
    { day: 'Sun', points: 20 }
  ]
}

export default function DashboardMock() {
  const navigate = useNavigate()
  const [stats] = useState<UserStats>(mockStats)

  const handleLogout = () => {
    navigate('/login')
  }

  const maxWeeklyPoints = Math.max(...stats.weeklyProgress.map(d => d.points), 100)

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>🌱 EcoPoints Dashboard</h1>
          <p className="subtitle">Keep making a difference, one action at a time!</p>
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
        <div className="activities-list">
          {stats.recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{getCategoryIcon(activity.category)}</div>
              <div className="activity-content">
                <h4>{activity.activityType.name}</h4>
                <p className="activity-category">{activity.category}</p>
              </div>
              <div className="activity-points">+{activity.points} pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => alert('Activity Logging coming in next PR!')}>
            <span className="action-icon">➕</span>
            <span>Log Activity</span>
          </button>
          <button className="action-btn" onClick={() => alert('Leaderboard coming soon!')}>
            <span className="action-icon">🏅</span>
            <span>Leaderboard</span>
          </button>
          <button className="action-btn" onClick={() => alert('Challenges coming soon!')}>
            <span className="action-icon">🎯</span>
            <span>Challenges</span>
          </button>
          <button className="action-btn" onClick={() => alert('Badges coming soon!')}>
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
