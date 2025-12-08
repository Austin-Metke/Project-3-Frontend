import { useEffect, useState } from 'react'
import apiService from '../services/api'
import type { LeaderboardEntry } from '../types'
import './Leaderboard.css'
import './DaskboardTabsPages/Challenges.css'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<'WEEK' | 'MONTH' | 'ALL'>('WEEK')

  useEffect(() => {
    loadLeaderboard()
  }, [range])

  async function loadLeaderboard() {
    setLoading(true)
    setError(null)
    try {
      // Try backend leaderboard first
      const data = await apiService.getLeaderboard()
      const arr = Array.isArray(data) ? data : []
      // Normalize to LeaderboardEntry
      const normalized: LeaderboardEntry[] = (arr as any[]).map((r, idx) => {
        const rec = r && typeof r === 'object' ? (r as Record<string, any>) : {}
        return {
          userId: rec.userId ?? rec.id ?? rec.user?.id ?? idx,
          name: rec.name ?? rec.user?.name ?? String(rec.email ?? 'Unknown'),
          totalPoints: Number(rec.totalPoints ?? rec.points ?? 0),
          totalCo2gSaved: Number(rec.totalCo2gSaved ?? rec.co2gSaved ?? 0),
        }
      })
      if (normalized.length) {
        setEntries(normalized.slice(0, 50))
        setLoading(false)
        return
      }

      // If backend returned empty, fall through to fallback
      throw new Error('Empty leaderboard from server')
    } catch (err) {
      // Backend failed — fallback to client-side aggregation of activity-logs
      try {
        const logs = await apiService.getAllActivityLogs()
        const arr = Array.isArray(logs) ? logs : []
        const map = new Map<string | number, { name?: string; totalPoints: number; totalCo2gSaved: number }>()

        for (const l of arr as any[]) {
          const user = l.user ?? l.userDto ?? l.userId
          const userId = user?.id ?? l.userId ?? (user ?? 'unknown')
          const name = user?.name ?? user?.fullName ?? user?.username ?? l.name ?? 'Unknown'
          const points = Number(l.activityType?.points ?? l.points ?? 0)
          const co2 = Number(l.activityType?.co2gSaved ?? l.co2gSaved ?? 0)

          const prev = map.get(userId) ?? { name, totalPoints: 0, totalCo2gSaved: 0 }
          prev.totalPoints += points
          prev.totalCo2gSaved += co2
          prev.name = prev.name ?? name
          map.set(userId, prev)
        }

        const computed: LeaderboardEntry[] = Array.from(map.entries())
          .map(([userId, v]) => ({ userId, name: v.name, totalPoints: v.totalPoints, totalCo2gSaved: v.totalCo2gSaved }))
          .sort((a, b) => b.totalPoints - a.totalPoints)

        setEntries(computed.slice(0, 50))
      } catch (err2) {
        setError(err2 instanceof Error ? err2.message : 'Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="challenges-container">
      <div className="challenges-header">
        <div>
          <h1>Leaderboard</h1>
          <p className="subtitle">Top contributors making an impact</p>
        </div>
        <div className="header-actions" style={{gap:'0.5rem'}}>
          <button className="btn-back" onClick={() => window.history.length > 1 ? window.history.back() : (location.href = '/dashboard')}>
            Back
          </button>
          <select value={range} onChange={(e) => setRange(e.target.value as any)} className="btn-small">
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
            <option value="ALL">All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      ) : error ? (
        <div className="error-card">
          <p>{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><p>No leaderboard entries found</p></div>
      ) : (
        <div className="challenges-list">
          {entries.map((e, i) => (
            <div key={String(e.userId)} className="challenge-card active">
              <div className="challenge-header">
                <div className="challenge-title-section">
                  <h3>#{i + 1} {e.name ?? `User ${e.userId}`}</h3>
                </div>
                <div className="challenge-points">
                  <span className="points-value">{e.totalPoints}</span>
                  <span className="points-label">pts</span>
                </div>
              </div>
              <p className="challenge-description">CO₂ Saved: {Number(e.totalCo2gSaved ?? 0).toLocaleString()} g</p>
              <div className="progress-section">
                <div className="progress-info">
                  <span className="progress-text">Rank {i + 1}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
