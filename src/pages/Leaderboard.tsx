import { useEffect, useState } from 'react'
import apiService from '../services/api'
import type { LeaderboardEntry } from '../types'
import './Leaderboard.css'

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
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1>🏅 Leaderboard</h1>
        <div className="controls">
          <label>
            Range:
            <select value={range} onChange={(e) => setRange(e.target.value as any)}>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
              <option value="ALL">All Time</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      ) : error ? (
        <div className="error-card">
          <h3>Unable to load leaderboard</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {entries.length === 0 ? (
            <div className="empty-state">No leaderboard entries found</div>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Points</th>
                  <th>CO2 saved (g)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={String(e.userId)}>
                    <td>{i + 1}</td>
                    <td>{e.name ?? `User ${e.userId}`}</td>
                    <td>{e.totalPoints}</td>
                    <td>{Number(e.totalCo2gSaved ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
