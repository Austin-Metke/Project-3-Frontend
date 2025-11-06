import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserStats } from '../types'
import './Dashboard.css'

// MOCK DATA for testing UI without backend
const mockStats: UserStats = {
  totalPoints: 847,
  currentStreak: 3,
  weeklyPoints: 127,
  monthlyPoints: 563,
  rank: 1247,
  recentActivities: [
    {
      id: '1',
      userId: 'user1',
      activityType: {
        id: 'type1',
        name: 'Brought reusable bag to store',
        description: 'Used reusable bag instead of plastic',
        points: 10,
        category: 'Recycling'
      },
      points: 10,
      category: 'Recycling',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: '2',
      userId: 'user1',
      activityType: {
        id: 'type2',
        name: 'Walked instead of driving',
        description: 'Short trip on foot',
        points: 25,
        category: 'Transportation'
      },
      points: 25,
      category: 'Transportation',
      createdAt: new Date(Date.now() - 6 * 3600000).toISOString()
    },
    {
      id: '3',
      userId: 'user1',
      activityType: {
        id: 'type3',
        name: 'Unplugged unused devices',
        description: 'Reduced phantom power usage',
        points: 15,
        category: 'Energy'
      },
      points: 15,
      category: 'Energy',
      createdAt: new Date(Date.now() - 22 * 3600000).toISOString()
    },
    {
      id: '4',
      userId: 'user1',
      activityType: {
        id: 'type4',
        name: 'Composted food scraps',
        description: 'Kitchen composting',
        points: 20,
        category: 'Food'
      },
      points: 20,
      category: 'Food',
      createdAt: new Date(Date.now() - 28 * 3600000).toISOString()
    }
  ],
  weeklyProgress: [
    { day: 'Mon', points: 0 },
    { day: 'Tue', points: 35 },
    { day: 'Wed', points: 15 },
    { day: 'Thu', points: 42 },
    { day: 'Fri', points: 0 },
    { day: 'Sat', points: 25 },
    { day: 'Sun', points: 10 }
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
          <h1>EcoPoints Dashboard</h1>
          <p className="subtitle">Welcome back!</p>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </header>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-content">
            <h3>Total Points</h3>
            <p className="stat-value">{stats.totalPoints.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-content">
            <h3>Current Streak</h3>
            <p className="stat-value">{stats.currentStreak} days</p>
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-content">
            <h3>This Week</h3>
            <p className="stat-value">{stats.weeklyPoints}</p>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-content">
            <h3>Global Rank</h3>
            <p className="stat-value">#{stats.rank}</p>
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
        <div className="activities-list">
          {stats.recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item">
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
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => alert('This feature is coming in the next PR!')}>
            <span>Log Activity</span>
          </button>
          <button className="action-btn" onClick={() => alert('Leaderboard page coming soon!')}>
            <span>Leaderboard</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/challenges')}>
            <span>Challenges</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/badges')}>
            <span>Badges</span>
          </button>
        </div>
      </div>
    </div>
  )
}
