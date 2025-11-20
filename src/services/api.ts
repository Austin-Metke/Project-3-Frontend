import axios from 'axios'
import type { AxiosInstance, AxiosError } from 'axios'
import type { 
  ApiResponse, 
  ApiError, 
  AuthResponse, 
  LoginCredentials, 
  SignUpData,
  UserStats,
  User
} from '../types'

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      // Allow sending/receiving cookies for session-based auth
      withCredentials: true,
    })

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Helper method to handle errors
  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as ApiError | undefined
      throw new Error(apiError?.message || 'An unexpected error occurred')
    }
    throw error
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Some backends expect `password` while others expect `passwordHash`.
      // Send both when available to maximize compatibility.
      const payload = {
        ...credentials,
        password: credentials.password ?? credentials.passwordHash,
        passwordHash: credentials.passwordHash ?? credentials.password,
      }
      const response = await this.api.post('/auth/login', payload)
      if (import.meta.env.DEV) {
        try {
          // eslint-disable-next-line no-console
          console.debug('[api.login] POST /auth/login status=', response.status, 'data=', response.data)
        } catch (e) {}
      }
      const raw: unknown = response.data
      function hasData(obj: unknown): obj is { data: unknown } {
        return typeof obj === 'object' && obj !== null && 'data' in obj
      }
      const dataUnknown: unknown = hasData(raw) ? (raw as { data: unknown }).data : raw
      const dataRecord = (dataUnknown && typeof dataUnknown === 'object') ? (dataUnknown as Record<string, unknown>) : {}
      const token = (dataRecord.token as string) || (dataRecord.accessToken as string) || (dataRecord.jwt as string) || (dataRecord.authToken as string)
      // Accept either a wrapped { user: ... } or a top-level user object returned directly by some backends
      const user = (dataRecord.user as unknown) || (dataRecord.profile as unknown) || (dataRecord.account as unknown) || dataUnknown
      
      // Store token and user info
      if (token) localStorage.setItem('authToken', token)
      if (user) localStorage.setItem('user', JSON.stringify(user))

      // Some backends use cookie-based sessions and return no token/user in the login response.
      // In that case, attempt to fetch the user profile (requires withCredentials) and persist it.
      if (!token && !user) {
        try {
          const profile = await this.getUserProfile()
          if (profile) {
            localStorage.setItem('user', JSON.stringify(profile))
            return { user: profile, token: '' }
          }
        } catch (e) {
          // ignore — we'll return whatever we have
        }
      }

      // Construct a typed response for the caller
      const result: AuthResponse = {
        user: (user as unknown) as User,
        token: (token as unknown) as string,
      }

      return result
    } catch (error) {
      if (import.meta.env.DEV) {
        try {
          // eslint-disable-next-line no-console
          console.debug('[api.login] error=', (error as any)?.response?.status, (error as any)?.response?.data)
        } catch (e) {}
      }
      this.handleError(error)
    }
  }

  async signUp(userData: SignUpData): Promise<AuthResponse> {
    // Try multiple candidate registration endpoints so frontend is tolerant
    const candidates = [
      { path: '/auth/register', params: undefined },
      { path: '/auth', params: undefined },
      { path: '/users', params: undefined },
      { path: '/register', params: undefined },
    ]

    // Helper to normalize response -> AuthResponse
    const normalize = (raw: unknown): AuthResponse => {
      function hasData(obj: unknown): obj is { data: unknown } {
        return typeof obj === 'object' && obj !== null && 'data' in obj
      }
      const dataUnknown: unknown = hasData(raw) ? (raw as { data: unknown }).data : raw
      const dataRecord = (dataUnknown && typeof dataUnknown === 'object') ? (dataUnknown as Record<string, unknown>) : {}
      const token = (dataRecord.token as string) || (dataRecord.accessToken as string) || (dataRecord.jwt as string) || (dataRecord.authToken as string)
      const user = (dataRecord.user as unknown) || (dataRecord.profile as unknown) || (dataRecord.account as unknown) || dataUnknown

      if (token) localStorage.setItem('authToken', token)
      if (user) localStorage.setItem('user', JSON.stringify(user))

      return {
        user: (user as unknown) as User,
        token: (token as unknown) as string,
      }
    }

    // Try each candidate until one succeeds
    for (const c of candidates) {
      try {
        // normalize password field names for compatibility
        const payload = {
          ...userData,
          password: userData.password ?? userData.passwordHash,
          passwordHash: userData.passwordHash ?? userData.password,
        }
        const resp = await this.api.post(c.path, payload, { params: c.params })
        if (import.meta.env.DEV) {
          try {
            // Log raw response for easier debugging in development
            // eslint-disable-next-line no-console
            console.debug('[api.signUp] POST', c.path, 'status=', resp.status, 'data=', resp.data)
          } catch (e) {
            /* ignore logging errors in rare environments */
          }
        }
        if (resp && resp.data !== undefined) return normalize(resp.data)
      } catch (err) {
        // continue to next candidate
      }
    }

    // Final attempt: post to /auth/register (keeps previous behavior)
    try {
      const response = await this.api.post('/auth/register', userData)
      if (import.meta.env.DEV) {
        try {
          // eslint-disable-next-line no-console
          console.debug('[api.signUp] POST /auth/register status=', response.status, 'data=', response.data)
        } catch (e) {}
      }
      return normalize(response.data)
    } catch (error) {
      this.handleError(error)
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
    }
  }

  // User/Stats endpoints
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await this.api.get<ApiResponse<UserStats>>('/user/stats')
      return response.data.data
    } catch (error) {
      // If backend doesn't implement /user/stats, fall back to synthesizing from activity-logs
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        try {
          const resp = await this.api.get('/activity-logs')
          const logs: unknown = resp.data?.data ?? resp.data ?? []
          const activities = Array.isArray(logs) ? (logs as any[]) : []

          // Simple synthesis: totalPoints as sum of points, weekly/monthly based on createdAt date
          const now = Date.now()
          const oneDay = 24 * 60 * 60 * 1000
          const last7 = now - 7 * oneDay
          const last30 = now - 30 * oneDay

          let totalPoints = 0
          let weeklyPoints = 0
          let monthlyPoints = 0
          const recentActivities = [] as any[]

          for (const a of activities) {
            const pts = Number(a.points) || 0
            totalPoints += pts
            const t = a.createdAt ? new Date(a.createdAt).getTime() : now
            if (t >= last7) weeklyPoints += pts
            if (t >= last30) monthlyPoints += pts
            if (recentActivities.length < 10) recentActivities.push(a)
          }

          // Weekly progress: aggregate by day for last 7 days
          const weeklyProgress: { day: string; points: number }[] = []
          for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now - i * oneDay)
            const dayLabel = dayStart.toLocaleDateString(undefined, { weekday: 'short' })
            const dayStartTs = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate()).getTime()
            const dayEndTs = dayStartTs + oneDay
            const dayPoints = activities.reduce((acc, a) => {
              const t = a.createdAt ? new Date(a.createdAt).getTime() : now
              if (t >= dayStartTs && t < dayEndTs) return acc + (Number(a.points) || 0)
              return acc
            }, 0)
            weeklyProgress.push({ day: dayLabel, points: dayPoints })
          }

          const stats: UserStats = {
            totalPoints,
            currentStreak: 0,
            weeklyPoints,
            monthlyPoints,
            rank: 0,
            recentActivities,
            weeklyProgress,
          }

          return stats
        } catch (e) {
          // If fallback fails, propagate original 404 handling
          this.handleError(error)
        }
      }

      this.handleError(error)
    }
  }

  async getUserProfile(): Promise<User> {
    try {
      // Try common profile endpoints used by different backends
      const userStr = localStorage.getItem('user')
      const id = userStr ? JSON.parse(userStr).id : undefined

      // Try /user/profile first (existing frontend expectation)
      try {
        const resp = await this.api.get<ApiResponse<User>>('/user/profile')
        return resp.data.data
      } catch {
        // ignore and try fallbacks
      }

      // Try /auth/me (common) then /auth/{id}
      try {
        const resp = await this.api.get<ApiResponse<User>>('/auth/me')
        return resp.data.data
      } catch {
        // ignore
      }

      if (id) {
        try {
          const resp = await this.api.get<ApiResponse<User>>(`/auth/${id}`)
          // backend may return user directly or wrapped
          return (resp.data && (resp.data.data ?? resp.data)) as User
        } catch {
          // ignore
        }
      }

      // As a last resort, use stored user from localStorage
      if (userStr) return JSON.parse(userStr)

      throw new Error('Unable to fetch user profile')
    } catch (error) {
      this.handleError(error)
    }
  }

  // Activity types
  async getActivityTypes() {
    const response = await this.api.get('/activities')
    return response.data.data ?? response.data
  }

  // Create a new activity type (dev/admin)
  async createActivity(activityData: { name: string; points: number; co2gSaved?: string | number }) {
    try {
      const response = await this.api.post('/activities', activityData)
      return response.data.data ?? response.data
    } catch (error) {
      this.handleError(error)
    }
  }

  // Activity logs
  async logActivity(activityData: { activityTypeId: number; description?: string }) {
    const response = await this.api.post('/activity-logs', activityData)
    return response.data.data ?? response.data
  }

  async getActivityHistory(userId?: number) {
    const userStr = localStorage.getItem('user')
    const id = userId ?? (userStr ? JSON.parse(userStr).id : undefined)
    if (!id) throw new Error('Missing user id for activity history')
    const response = await this.api.get(`/activity-logs/user/${id}`)
    return response.data.data ?? response.data
  }

  // Get all activity logs (used for client-side leaderboard fallback)
  async getAllActivityLogs() {
    try {
      const response = await this.api.get('/activity-logs')
      return response.data.data ?? response.data
    } catch (error) {
      this.handleError(error)
    }
  }

  // Leaderboard
  async getLeaderboard(range: 'WEEK' | 'MONTH' | 'SIX_MONTHS' | 'YEAR' | 'ALL_TIME' = 'WEEK', limit = 10) {
    const response = await this.api.get('/leaderboard', { params: { range, limit } })
    return response.data.data ?? response.data
  }

  // Challenges (graceful fallback if backend not ready)
  async getChallenges(userId?: number) {
    // Try a number of common challenge endpoints (don't change backend)
    const candidates = [
      { path: '/challenges', params: userId ? { userId } : undefined },
      { path: '/challenge', params: userId ? { userId } : undefined },
      { path: `/challenges/user/${userId}`, params: undefined },
      { path: `/challenges/user`, params: userId ? { userId } : undefined },
      { path: `/auth/${userId}/challenges`, params: undefined },
      { path: `/users/${userId}/challenges`, params: undefined },
    ]

    const extractArray = (raw: unknown): unknown[] => {
      // raw might be: array, { data: [...] }, { data: { items: [...] } }, { _embedded: { challenges: [...] } }, or { challenges: [...] }
      if (!raw) return []
      // If already an array
      if (Array.isArray(raw)) return raw

      if (typeof raw === 'object' && raw !== null) {
        const rec = raw as Record<string, unknown>

        // Common API wrappers
        const candidatesKeys = [
          'data',
          'items',
          'results',
          'challenges',
          'challengeList',
          'rows',
        ]

        for (const k of candidatesKeys) {
          const val = rec[k]
          if (Array.isArray(val)) return val
          if (val && typeof val === 'object') {
            // nested wrapper like { data: { items: [...] } }
            const nested = (val as Record<string, unknown>)
            for (const kk of candidatesKeys) {
              if (Array.isArray(nested[kk])) return nested[kk] as unknown[]
            }
          }
        }

        // HAL style: { _embedded: { challenges: [...] } }
        if ('_embedded' in rec && rec._embedded && typeof rec._embedded === 'object') {
          const emb = rec._embedded as Record<string, unknown>
          for (const v of Object.values(emb)) {
            if (Array.isArray(v)) return v
          }
        }

        // If any property is an array, prefer it
        for (const v of Object.values(rec)) {
          if (Array.isArray(v)) return v
        }
      }

      // Give up — return empty array
      return []
    }

    for (const c of candidates) {
      try {
        const resp = await this.api.get(c.path, { params: c.params })
        const payload = resp?.data ?? resp
        const arr = extractArray(payload)
        if (import.meta.env.DEV) {
          try {
            // eslint-disable-next-line no-console
            console.debug('[api.getChallenges] tried', c.path, 'status=', resp.status, 'found=', arr.length)
          } catch (e) {}
        }
        if (arr.length) return arr
      } catch (e) {
        // try next
      }
    }

    // Final attempt: generic /challenges without params and be tolerant about response shapes
    try {
      const response = await this.api.get('/challenges')
      const payload = response?.data ?? response
      const arr = extractArray(payload)
      if (arr.length) return arr
      // If nothing matched, but payload itself is an object/array, attempt to return meaningful parts
      if (Array.isArray(payload)) return payload
      if (payload && typeof payload === 'object') {
        // return any nested array or the object itself wrapped
        const nested = extractArray(payload)
        if (nested.length) return nested
        return [payload]
      }
      return []
    } catch (error) {
      this.handleError(error)
    }
  }

  // Badges (placeholder; often derived from completed challenges)
  async getUserBadges() {
    const userStr = localStorage.getItem('user')
    const id = userStr ? JSON.parse(userStr).id : undefined
    const candidates = [
      '/user/badges',
      '/badges',
      id ? `/auth/${id}/badges` : undefined,
      id ? `/users/${id}/badges` : undefined,
    ].filter(Boolean) as string[]

    for (const path of candidates) {
      try {
        const resp = await this.api.get(path)
        if (resp && resp.data) return resp.data.data ?? resp.data
      } catch {
        // try next
      }
    }

    // fallback
    const response = await this.api.get('/user/badges')
    return response.data.data ?? response.data
  }

  /**
   * Exchange OAuth code with backend to obtain auth token and user profile
   * Expected backend endpoint: POST /auth/oauth/:provider
   */
  async exchangeOAuthCode(provider: string, code: string, state?: string): Promise<AuthResponse> {
    try {
      const payload: Record<string, unknown> = { code }
      if (state) payload.state = state

      const response = await this.api.post(`/auth/oauth/${provider}`, payload)
      const raw: unknown = response.data
      function hasData(obj: unknown): obj is { data: unknown } {
        return typeof obj === 'object' && obj !== null && 'data' in obj
      }
      const dataUnknown: unknown = hasData(raw) ? (raw as { data: unknown }).data : raw
      const dataRecord = (dataUnknown && typeof dataUnknown === 'object') ? (dataUnknown as Record<string, unknown>) : {}
      const token = (dataRecord.token as string) || (dataRecord.accessToken as string) || (dataRecord.jwt as string) || (dataRecord.authToken as string)
      const user = (dataRecord.user as unknown) || (dataRecord.profile as unknown) || (dataRecord.account as unknown)

      if (token) localStorage.setItem('authToken', token)
      if (user) localStorage.setItem('user', JSON.stringify(user))

      const result: AuthResponse = {
        user: (user as unknown) as User,
        token: (token as unknown) as string,
      }

      return result
    } catch (error) {
      this.handleError(error)
    }
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService
