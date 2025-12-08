import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import './DaskboardTabsPages/Challenges.css'

interface ActivityType {
  id: number
  name: string
  points: number
  co2gSaved?: string | number
}

export default function LogActivity() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<Record<number, boolean>>({})
  const [message, setMessage] = useState<string | null>(null)
  // Dev-only form state for creating activities
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPoints, setNewPoints] = useState<number | ''>('')
  const [newCo2, setNewCo2] = useState<string | number>('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchActivities()
  }, [])

  async function fetchActivities() {
    setLoading(true)
    setError(null)
    try {
      const resp = await apiService.getActivityTypes()
      if (import.meta.env.DEV) {
        console.log('[LogActivity] Fetched activities:', resp)
      }
      // tolerate wrappers - ensure array
      const arr = Array.isArray(resp) ? resp : []
      setActivities(arr as ActivityType[])
      if (import.meta.env.DEV) {
        console.log('[LogActivity] Set activities state:', arr.length, 'items')
      }
    } catch (err) {
      console.error('Failed to load activities', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!newName || !newPoints) return setMessage('Name and points are required')
    const co2Num = newCo2 === '' ? 0 : Number(newCo2)
    if (Number.isNaN(co2Num)) return setMessage('CO2 saved must be a number')
    setCreating(true)
    setMessage(null)
    try {
      const co2Num = newCo2 === '' ? 0 : Number(newCo2)
      await apiService.createActivityType({ name: newName, points: Number(newPoints), description: '', category: 'Other', co2gSaved: co2Num })
      setMessage(`Created activity "${newName}"`)
      // reset
      setNewName('')
      setNewPoints('')
      setNewCo2('')
      // refresh list
      await fetchActivities()
      setTimeout(() => setMessage(null), 2500)
    } catch (err) {
      console.error('Create activity error', err)
      setMessage(err instanceof Error ? err.message : 'Failed to create activity')
    } finally {
      setCreating(false)
    }
  }

  async function handleClaim(act: ActivityType) {
    setClaiming((s) => ({ ...s, [act.id]: true }))
    setMessage(null)
    try {
      await apiService.logActivity({ activityTypeId: act.id, description: `Claimed via UI: ${act.name}` })
      setMessage(`Claimed "${act.name}" for +${act.points} pts`)
      // Optionally refresh activities or user's dashboard
      // trigger a small refresh to show recent activity
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error('Claim error', err)
      setMessage(err instanceof Error ? err.message : 'Failed to claim activity')
    } finally {
      setClaiming((s) => ({ ...s, [act.id]: false }))
    }
  }

  return (
    <div className="challenges-container">
      <div className="challenges-header">
        <div>
          <h1>Log Activity</h1>
          <p className="subtitle">Select an activity type to claim its points</p>
        </div>
        <div className="header-actions">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>Back</button>
        </div>
      </div>

      {message && (
        <div className="info-banner">
          <p>{message}</p>
        </div>
      )}

      {/* Dev-only create form */}
      {import.meta.env.DEV && (
        <div style={{ margin: '12px 0' }}>
          <button className="btn-secondary" onClick={() => setShowCreate(s => !s)}>
            {showCreate ? 'Hide' : 'Add Activity'}
          </button>
          {showCreate && (
            <form onSubmit={handleCreate} style={{ marginTop: 8 }}>
              <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
              <input placeholder="Points" type="number" value={newPoints as any} onChange={e => setNewPoints(e.target.value === '' ? '' : Number(e.target.value))} />
              <input placeholder="CO2 g saved (grams)" value={newCo2 as any} onChange={e => setNewCo2(e.target.value)} />
              <button className="btn-primary" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading activities...</p>
        </div>
      ) : error ? (
        <div className="error-card">
          <p>{error}</p>
          <button onClick={fetchActivities} className="btn-primary">Try again</button>
        </div>
      ) : (
        <div className="challenges-list">
          {activities.length === 0 ? (
            <div className="empty-state"><p>No activities available</p></div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="challenge-card active">
                <div className="challenge-header">
                  <div className="challenge-title-section">
                    <h3>{act.name}</h3>
                  </div>
                  <div className="challenge-points">
                    <span className="points-value">+{act.points}</span>
                    <span className="points-label">points</span>
                  </div>
                </div>
                <p className="challenge-description">CO₂ saved: {act.co2gSaved ?? '—'}</p>
                <div className="progress-section">
                  <div className="progress-info">
                    <button
                      className="btn-primary"
                      onClick={() => handleClaim(act)}
                      disabled={Boolean(claiming[act.id])}
                    >
                      {claiming[act.id] ? 'Claiming...' : 'Claim'}
                    </button>
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
