import axios from 'axios'
import type { AxiosInstance, AxiosError } from 'axios'
import type { 
  ApiResponse, 
  ApiError, 
  AuthResponse, 
  LoginCredentials, 
  SignUpData,
  UpdateUserData,
  UserStats,
  User,
  ActivityLog,
  CreateActivityLogData,
  ActivityType,
  CreateActivityTypeData,
  UpdateActivityTypeData,
  LeaderboardEntry,
  Challenge
} from '../types'

// Base API configuration
const DEFAULT_API_URL = 'https://project3cst438-7cd2383ef437.herokuapp.com'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_URL

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      // Disable cookies to avoid CORS credential errors with Heroku
      withCredentials: false,
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

  /**
   * Exchange GitHub OAuth code for user info.
   * Prefers Netlify function when VITE_GITHUB_OAUTH_URL is set.
   */
  async exchangeGitHubCode(code: string): Promise<any> {
    const netlifyUrl = import.meta.env.VITE_GITHUB_OAUTH_URL
    if (netlifyUrl) {
      const resp = await fetch(netlifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
      if (!resp.ok) {
        const body = await resp.text()
        console.error('[api.exchangeGitHubCode] Failed:', resp.status, body)
        throw new Error(`GitHub OAuth function failed: ${resp.status}`)
      }
      const result = await resp.json()
      if (import.meta.env.DEV) {
        console.log('[api.exchangeGitHubCode] Success:', result)
      }
      return result
    }

    // Fallback to backend endpoint if provided by the API
    const response = await this.api.post('/auth/oauth/github', { code })
    return (response.data as any)?.data ?? response.data
  }

  /**
   * Upsert a user in the backend using GitHub profile data (idempotent-ish):
   * - Try /auth/register with a deterministic password
   * - On conflict, fetch all users and match by email or login to reuse backend user
   * - Always returns a backend user object when possible
   */
  async upsertUserFromGitHub(githubUser: any): Promise<AuthResponse> {
    const payload = {
      name: githubUser.login || githubUser.name || 'GitHub User',
      email: githubUser.email || `${githubUser.login}@users.noreply.github.com`,
      avatar: githubUser.avatar || githubUser.avatar_url,
      password: `github-oauth-${githubUser.id}`, // deterministic to allow repeat register
    }

    const toUser = (raw: any): User => ({
      id: raw?.id ?? githubUser.id,
      name: raw?.name ?? payload.name,
      email: raw?.email ?? payload.email,
      avatar: raw?.avatar ?? payload.avatar,
    })

    // 1) Try register
    try {
      const resp = await this.api.post('/auth/register', {
        name: payload.name,
        email: payload.email,
        password: payload.password,
      })
      const raw = (resp.data as any)?.data ?? resp.data
      const user = toUser(raw)
      localStorage.setItem('user', JSON.stringify(user))
      return { user, token: '' }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.debug('[api.upsertUserFromGitHub] register failed:', err?.response?.status, err?.response?.data)
      }
      // continue to lookup
    }

    // 2) On conflict/exists: list users and pick match
    try {
      const resp = await this.api.get('/auth')
      const list = ((resp.data as any)?._embedded?.userDtoList) || (resp.data as any)?.data || resp.data
      if (Array.isArray(list)) {
        const found = list.find((u: any) => {
          return (
            (u.email && u.email.toLowerCase() === payload.email.toLowerCase()) ||
            (u.name && u.name.toLowerCase() === payload.name.toLowerCase())
          )
        })
        if (found) {
          const user = toUser(found)
          localStorage.setItem('user', JSON.stringify(user))
          return { user, token: '' }
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug('[api.upsertUserFromGitHub] lookup failed', err)
      }
    }

    // 3) Fallback: GitHub data
    const localUser: User = {
      id: githubUser.id,
      name: payload.name,
      email: payload.email,
      avatar: payload.avatar,
    }
    localStorage.setItem('user', JSON.stringify(localUser))
    return { user: localUser, token: '' }
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
      // Adaptive payload to match backend: prefers { name, email, password }
      const identifier = (credentials as any).username ?? credentials.name ?? credentials.email
      const password = credentials.password ?? credentials.passwordHash
      const payload: any = {
        name: identifier,
        email: identifier,
        password,
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

    try {
      // Heroku backend expects: { name, email, password }
      const payload = {
        name: userData.name,
        email: userData.email,
        password: userData.password ?? userData.passwordHash,
      }
      
      const response = await this.api.post('/auth/register', payload)
      
      if (import.meta.env.DEV) {
        try {
          // eslint-disable-next-line no-console
          console.debug('[api.signUp] POST /auth/register status=', response.status, 'data=', response.data)
        } catch (e) {}
      }
      
      // Heroku backend returns user object directly: { id, name, email, googleID }
      const user = response.data
      if (user && user.id) {
        localStorage.setItem('user', JSON.stringify(user))
        return {
          user: user as User,
          token: '', // No token from Heroku backend - uses session-based auth
        }
      }
      
      return normalize(response.data)
    } catch (error) {
      if (import.meta.env.DEV) {
        try {
          // eslint-disable-next-line no-console
          console.debug('[api.signUp] error=', (error as any)?.response?.status, (error as any)?.response?.data)
        } catch (e) {}
      }
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

  // User endpoints (UserController)
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await this.api.get<ApiResponse<User[]>>('/auth')
      // Heroku backend uses HATEOAS format with _embedded.userDtoList
      const data = response.data as any
      if (data._embedded?.userDtoList) {
        return data._embedded.userDtoList
      }
      return response.data.data || response.data as any
    } catch (error) {
      this.handleError(error)
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const response = await this.api.get<ApiResponse<User>>(`/auth/${id}`)
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    try {
      const response = await this.api.put<ApiResponse<User>>(`/auth/update/${id}`, userData)
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.api.delete(`/auth/delete/${id}`)
    } catch (error) {
      this.handleError(error)
    }
  }

  // User/Stats endpoints
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await this.api.get<ApiResponse<UserStats>>('/user/stats')
      return response.data.data
    } catch (error) {
      // If backend doesn't implement /user/stats, fall back to synthesizing from activity-logs
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 500)) {
        try {
          // Get current user ID from localStorage
          const userStr = localStorage.getItem('user')
          const currentUserId = userStr ? JSON.parse(userStr).id : null
          
          // Get all activity logs (already normalized)
          const allLogs = await this.getAllActivityLogs()
          
          // Filter to current user's activities if we have a user ID
          const activities = currentUserId 
            ? allLogs.filter((a: any) => String(a.userId) === String(currentUserId) || String(a.user?.id) === String(currentUserId))
            : allLogs

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
            const pts = Number(a.points) || Number(a.activityType?.points) || 0
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
              if (t >= dayStartTs && t < dayEndTs) {
                return acc + (Number(a.points) || Number(a.activityType?.points) || 0)
              }
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

  // Activity Logs endpoints (TypeLogsController - /activity-logs)
  async getAllActivityLogs(): Promise<ActivityLog[]> {
    try {
      const response = await this.api.get<ApiResponse<ActivityLog[]>>('/activity-logs')
      // Heroku backend returns array directly with different field names
      const data = response.data as any
      if (Array.isArray(data)) {
        // Normalize Heroku format to expected format
        return data.map((log: any) => ({
          id: log.activityId || log.id,
          userId: log.user?.id || log.userId,
          activityTypeId: log.activityType?.id || log.activityTypeId,
          activityType: log.activityType,
          user: log.user,
          points: log.activityType?.points || log.points || 0,
          category: log.category || 'Other',
          createdAt: log.occurredAt || log.createdAt,
          description: log.description
        }))
      }
      return response.data.data || response.data as any
    } catch (error) {
      this.handleError(error)
    }
  }

  async getActivityLogById(id: string): Promise<ActivityLog> {
    try {
      const response = await this.api.get<ApiResponse<ActivityLog>>(`/activity-logs/${id}`)
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async getActivityLogsByUserId(userId: string): Promise<ActivityLog[]> {
    try {
      const response = await this.api.get<ApiResponse<ActivityLog[]>>(`/activity-logs/user/${userId}`)
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async getActivityLogsByActivityType(activityTypeId: string): Promise<ActivityLog[]> {
    try {
      const response = await this.api.get<ApiResponse<ActivityLog[]>>(`/activity-logs/activity/${activityTypeId}`)
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async createActivityLog(logData: CreateActivityLogData): Promise<ActivityLog> {
    try {
      // Heroku backend expects different field names
      const payload = {
        userId: logData.userId,
        activityTypeId: logData.activityTypeId,
        description: logData.description,
        occurredAt: new Date().toISOString()
      }
      const response = await this.api.post<ApiResponse<ActivityLog>>('/activity-logs', payload)
      // Backend may return object directly or wrapped in { data: {...} }
      const result = response.data.data || response.data as any
      // Normalize response when backend returns camel/snake mixed fields
      const raw = result as any
      if (raw.activityId) {
        const normalized = {
          id: raw.activityId,
          userId: raw.user?.id || raw.userId,
          activityTypeId: raw.activityType?.id || raw.activityTypeId,
          activityType: raw.activityType,
          user: raw.user,
          points: raw.activityType?.points || raw.points || 0,
          category: raw.category || 'Other',
          createdAt: raw.occurredAt || raw.createdAt,
          description: raw.description
        } as any
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('activity-logged', { detail: normalized }))
        }
        return normalized
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('activity-logged', { detail: result }))
      }
      return result
    } catch (error) {
      this.handleError(error)
    }
  }

  async deleteActivityLog(id: string): Promise<void> {
    try {
      await this.api.delete(`/activity-logs/${id}`)
    } catch (error) {
      this.handleError(error)
    }
  }

  // Activity Types endpoints (TypeActivityController - /activities)
  async getAllActivityTypes(): Promise<ActivityType[]> {
    try {
      const response = await this.api.get<ApiResponse<ActivityType[]>>('/activities')
      // Backend may return array directly or wrapped in { data: [...] }
      return response.data.data || response.data as any
    } catch (error) {
      this.handleError(error)
    }
  }

  async getActivityTypeById(id: string): Promise<ActivityType> {
    try {
      const response = await this.api.get<ApiResponse<ActivityType>>(`/activities/${id}`)
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async createActivityType(activityData: CreateActivityTypeData): Promise<ActivityType> {
    try {
      // Ensure co2gSaved is present; backend enforces NOT NULL on co2g_saved
      const payload: Record<string, unknown> = { ...activityData }
      const co2 = activityData.co2gSaved ?? 0
      payload.co2gSaved = co2
      // Send both camelCase and snake_case to maximize backend compatibility
      ;(payload as any).co2g_saved = co2
      const response = await this.api.post<ApiResponse<ActivityType>>('/activities', payload)
      // Backend may return object directly or wrapped in { data: {...} }
      const created = response.data.data || response.data as any
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('activity-type-created', { detail: created }))
          localStorage.setItem('custom_activity_created', 'true')
        }
      } catch {}
      return created
    } catch (error) {
      this.handleError(error)
    }
  }

  async updateActivityType(id: string, activityData: UpdateActivityTypeData): Promise<ActivityType> {
    try {
      const response = await this.api.put<ApiResponse<ActivityType>>(`/activities/${id}`, activityData)
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async deleteActivityType(id: string): Promise<void> {
    try {
      await this.api.delete(`/activities/${id}`)
    } catch (error) {
      this.handleError(error)
    }
  }

  // Leaderboard endpoints (LeaderboardController - /leaderboard)
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await this.api.get<ApiResponse<LeaderboardEntry[]>>('/leaderboard')
      // Backend may return array directly or wrapped in { data: [...] }
      return response.data.data || response.data as any
    } catch (error) {
      // If leaderboard endpoint fails, compute from activity logs
      if (axios.isAxiosError(error) && (error.response?.status === 500 || error.response?.status === 404)) {
        console.warn('Leaderboard endpoint unavailable, computing from activity logs')
        const logs = await this.getAllActivityLogs()
        const userMap = new Map<string | number, { name: string; totalPoints: number; totalCo2gSaved: number }>()
        
        logs.forEach((log: any) => {
          const userId = log.user?.id || log.userId
          const userName = log.user?.name || 'Unknown User'
          const points = log.activityType?.points || log.points || 0
          const co2 = log.activityType?.co2gSaved || log.co2gSaved || 0
          
          if (!userMap.has(userId)) {
            userMap.set(userId, { name: userName, totalPoints: 0, totalCo2gSaved: 0 })
          }
          const entry = userMap.get(userId)!
          entry.totalPoints += points
          entry.totalCo2gSaved += co2
        })
        
        return Array.from(userMap.entries())
          .map(([userId, data]) => ({
            userId: String(userId),
            name: data.name,
            totalPoints: data.totalPoints,
            totalCo2gSaved: data.totalCo2gSaved
          }))
          .sort((a, b) => b.totalPoints - a.totalPoints)
      }
      this.handleError(error)
    }
  }

  // Home endpoint (HomeController)
  async getHome(): Promise<{ message?: string; [key: string]: unknown }> {
    try {
      const response = await this.api.get('/')
      return response.data
    } catch (error) {
      this.handleError(error)
    }
  }

  // Legacy/deprecated methods - kept for backward compatibility
  /** @deprecated Use getAllActivityTypes() instead */
  async getActivityTypes(): Promise<ActivityType[]> {
    return this.getAllActivityTypes()
  }

  /** @deprecated Use createActivityLog() instead */
  async logActivity(activityData: { activityTypeId: string | number; description?: string }) {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }
    return this.createActivityLog({
      userId,
      activityTypeId: String(activityData.activityTypeId),
      description: activityData.description
    })
  }

  /** @deprecated Use getActivityLogsByUserId() instead */
  async getActivityHistory() {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }
    // This is a simplified version - you may want to add filtering on the backend
    return this.getActivityLogsByUserId(userId)
  }

  /** @deprecated Use getLeaderboard() instead */
  async getGlobalLeaderboard() {
    // Backend doesn't support period filtering yet, just return all
    return this.getLeaderboard()
  }

  /** @deprecated Challenges not yet implemented in backend */
  async getActiveChallenges(): Promise<Challenge[]> {
    // Placeholder - return empty array until challenges endpoint is implemented
    console.warn('Challenges endpoint not yet implemented')
    return []
  }

  /** @deprecated Badges not yet implemented in backend */
  async getUserBadges() {
    // Placeholder - return empty array until badges endpoint is implemented
    console.warn('Badges endpoint not yet implemented')
    return []
  }

  // Challenges endpoint (tries multiple patterns)
  async getChallenges(userId?: string | number): Promise<Challenge[]> {
    try {
      // Try user-specific challenges first if userId provided
      if (userId) {
        try {
          const response = await this.api.get<ApiResponse<Challenge[]>>(`/challenges/user/${userId}`)
          const data = response.data.data || response.data
          return Array.isArray(data) ? data : []
        } catch (err) {
          // Fall through to global endpoint
        }
      }

      // Try global challenges endpoint
      try {
        const response = await this.api.get<ApiResponse<Challenge[]>>('/challenges')
        const data = response.data.data || response.data
        return Array.isArray(data) ? data : []
      } catch (err) {
        // Backend may not have challenges endpoint yet
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          console.warn('Challenges endpoint not implemented in backend')
          return []
        }
        throw err
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  // Helper method to get current user ID
  private getCurrentUserId(): string | null {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    try {
      const user = JSON.parse(userStr)
      return user.id
    } catch {
      return null
    }
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService
