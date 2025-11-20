import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserStats } from '../types'
import './Dashboard.css'

const mockStats: UserStats = {
  totalPoints: 500,
  currentStreak: 5,
  weeklyPoints: 80,
  monthlyPoints: 320,
  rank: 850,
  recentActivities: [
    {
      id: 'a1',
      userId: 'me',
      activityType: { id: 't1', name: 'Recycled plastic', description: '', points: 10, category: 'Recycling' },
      points: 10,
      category: 'Recycling',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a2',
      userId: 'me',
      activityType: { id: 't2', name: 'Biked to work', description: '', points: 20, category: 'Transportation' },
      points: 20,
      category: 'Transportation',
      createdAt: new Date().toISOString(),
    },
  ],
  weeklyProgress: [
    { day: 'Mon', points: 0 },
    { day: 'Tue', points: 20 },
    { day: 'Wed', points: 10 },
    { day: 'Thu', points: 30 },
    { day: 'Fri', points: 0 },
    { day: 'Sat', points: 20 },
    { day: 'Sun', points: 0 },
  ],
}

export default function DashboardMockDev() {
  const navigate = useNavigate()
  const [stats] = useState<UserStats>(mockStats)

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>EcoPoints (Mock)</h1>
          <p className="subtitle">Dev mock view</p>
        </div>
        <button onClick={() => navigate('/login')} className="btn-logout">Logout</button>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Points</h3>
          <p className="stat-value">{stats.totalPoints}</p>
        </div>
        <div className="stat-card">
          <h3>Current Streak</h3>
          <p className="stat-value">{stats.currentStreak} days</p>
        </div>
      </div>

      <div className="card">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {stats.recentActivities.map(a => (
            <div key={String(a.id)} className="activity-item">
              <div className="activity-content">
                <h4>{a.activityType?.name ?? 'Activity'}</h4>
                <p className="activity-category">{a.category ?? 'Other'}</p>
              </div>
              <div className="activity-points">+{Number(a.points ?? 0)} pts</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
