import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import './DaskboardTabsPages/Challenges.css'

interface ActivityType {
  id: number | string
  name: string
  points: number
  co2gSaved?: string | number
  description?: string
}

const FALLBACK_ACTIVITIES: ActivityType[] = [
  { id: 'bike-commute', name: 'Bike or Walk Instead of Driving', points: 50, co2gSaved: 1200, description: 'Replace a short car trip (5 mi) with biking or walking.' },
  { id: 'public-transit', name: 'Take Public Transit', points: 40, co2gSaved: 900, description: 'Use bus/train for a commute instead of driving solo.' },
  { id: 'meatless-day', name: 'Meatless Day', points: 35, co2gSaved: 800, description: 'Eat plant-based for a full day.' },
  { id: 'cold-wash', name: 'Wash Clothes on Cold', points: 15, co2gSaved: 200, description: 'Run a load on cold water instead of hot.' },
  { id: 'line-dry', name: 'Line Dry Laundry', points: 25, co2gSaved: 300, description: 'Air dry a load of laundry instead of using a dryer.' },
  { id: 'short-shower', name: 'Shorten Shower by 3 Minutes', points: 10, co2gSaved: 150, description: 'Cut shower time to save water and heating energy.' },
  { id: 'led-bulb', name: 'Install an LED Bulb', points: 20, co2gSaved: 250, description: 'Swap an incandescent for an LED bulb.' },
  { id: 'thermostat-2f', name: 'Adjust Thermostat by 2°F', points: 30, co2gSaved: 500, description: 'Adjust heating/cooling setpoint by 2°F for the day.' },
  { id: 'reuse-bag', name: 'Use Reusable Bag', points: 5, co2gSaved: 50, description: 'Skip a disposable bag at checkout.' },
  { id: 'refill-bottle', name: 'Refill Reusable Bottle', points: 5, co2gSaved: 30, description: 'Refill instead of buying a plastic bottle.' },
]

export default function LogActivity() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<Record<string | number, boolean>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [sampleMode, setSampleMode] = useState(false)
  const [seeding, setSeeding] = useState(false)
  // Dev-only form state for creating activities
  const [newName, setNewName] = useState('')
  const [newPoints, setNewPoints] = useState<number | ''>(10)
  const [newCo2, setNewCo2] = useState<string | number>(150)
  const [preset, setPreset] = useState<'low' | 'medium' | 'high'>('low')

  const applyPreset = (value: 'low' | 'medium' | 'high') => {
    setPreset(value)
    if (value === 'low') {
      setNewPoints(10)
      setNewCo2(150)
    } else if (value === 'medium') {
      setNewPoints(30)
      setNewCo2(500)
    } else {
      setNewPoints(50)
      setNewCo2(1200)
    }
  }
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
      if (arr.length === 0) {
        setSampleMode(true)
        setActivities(FALLBACK_ACTIVITIES as ActivityType[])
        setMessage('Showing sample activities. Claims will be sent to the backend when you log them.')
      } else {
        setSampleMode(false)
        setActivities(arr as ActivityType[])
        setMessage(null)
      }
      if (import.meta.env.DEV) {
        console.log('[LogActivity] Set activities state:', arr.length, 'items')
      }
    } catch (err) {
      console.error('Failed to load activities', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities')
      setSampleMode(true)
      setActivities(FALLBACK_ACTIVITIES as ActivityType[])
      setMessage('Showing sample activities. Claims will be sent to the backend when you log them.')
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
      let activityTypeId: string | number = act.id

      // In sample mode, first create the activity type on the backend so it can be logged
      if (sampleMode) {
        const co2 = act.co2gSaved === undefined ? 0 : Number(act.co2gSaved)
        const created = await apiService.createActivityType({
          name: act.name,
          points: act.points,
          description: act.description || '',
          category: 'Other',
          co2gSaved: Number.isNaN(co2) ? 0 : co2,
        } as any)
        activityTypeId = (created as any)?.id ?? (created as any)?.activityTypeId ?? activityTypeId
        // Refresh activities to include the newly created type
        await fetchActivities()
      }

      await apiService.logActivity({ activityTypeId, description: `Claimed via UI: ${act.name}` })
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

  async function seedFallbackActivitiesToBackend() {
    setSeeding(true)
    setMessage('Seeding sample activities to backend...')
    try {
      for (const act of FALLBACK_ACTIVITIES) {
        const co2 = act.co2gSaved === undefined ? 0 : Number(act.co2gSaved)
        await apiService.createActivityType({
          name: act.name,
          points: act.points,
          description: act.description || '',
          category: 'Other',
          co2gSaved: Number.isNaN(co2) ? 0 : co2,
        } as any)
      }
      setMessage('Sample activities seeded to backend. Reloading list...')
      await fetchActivities()
      setTimeout(() => setMessage(null), 2500)
    } catch (err) {
      console.error('Seeding activities failed', err)
      setMessage(err instanceof Error ? err.message : 'Failed to seed activities')
    } finally {
      setSeeding(false)
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
          {sampleMode && (
            <button className="btn-secondary" onClick={seedFallbackActivitiesToBackend} disabled={seeding}>
              {seeding ? 'Seeding...' : 'Seed activities to backend'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="info-banner">
          <p>{message}</p>
        </div>
      )}

      {/* Dev-only create form */}
      {import.meta.env.DEV && (
        <div className="dev-create-wrapper">
          <form className="dev-create-card" onSubmit={handleCreate}>
            <div className="dev-create-row">
              <label className="dev-label">
                Preset
                <select value={preset} onChange={e => applyPreset(e.target.value as any)}>
                  <option value="low">Low points / CO₂ (10 pts, 150g)</option>
                  <option value="medium">Medium points / CO₂ (30 pts, 500g)</option>
                  <option value="high">High points / CO₂ (50 pts, 1200g)</option>
                </select>
              </label>
            </div>
            <div className="dev-create-grid">
              <label className="dev-label">
                Activity name
                <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
              </label>
              <label className="dev-label">
                Points
                <input placeholder="Points" type="number" value={newPoints as any} readOnly />
              </label>
              <label className="dev-label">
                CO₂ saved (grams)
                <input placeholder="CO₂ saved" value={newCo2 as any} readOnly />
              </label>
            </div>
            <div className="dev-create-actions">
              <button className="btn-primary" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create activity'}</button>
            </div>
          </form>
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
                {act.description && <p className="challenge-description">{act.description}</p>}
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
