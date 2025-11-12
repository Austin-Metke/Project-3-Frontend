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
      const response = await this.api.post('/auth/login', credentials)
      const raw: unknown = response.data
      function hasData(obj: unknown): obj is { data: unknown } {
        return typeof obj === 'object' && obj !== null && 'data' in obj
      }
      const dataUnknown: unknown = hasData(raw) ? (raw as { data: unknown }).data : raw
      const dataRecord = (dataUnknown && typeof dataUnknown === 'object') ? (dataUnknown as Record<string, unknown>) : {}
      const token = (dataRecord.token as string) || (dataRecord.accessToken as string) || (dataRecord.jwt as string) || (dataRecord.authToken as string)
      const user = (dataRecord.user as unknown) || (dataRecord.profile as unknown) || (dataRecord.account as unknown)
      
      // Store token and user info
      if (token) localStorage.setItem('authToken', token)
      if (user) localStorage.setItem('user', JSON.stringify(user))

      // Construct a typed response for the caller
      const result: AuthResponse = {
        user: (user as unknown) as User,
        token: (token as unknown) as string,
      }

      return result
    } catch (error) {
      this.handleError(error)
    }
  }

  async signUp(userData: SignUpData): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/auth/register', userData)
      const raw: unknown = response.data
      function hasData(obj: unknown): obj is { data: unknown } {
        return typeof obj === 'object' && obj !== null && 'data' in obj
      }
      const dataUnknown: unknown = hasData(raw) ? (raw as { data: unknown }).data : raw
      const dataRecord = (dataUnknown && typeof dataUnknown === 'object') ? (dataUnknown as Record<string, unknown>) : {}
      const token = (dataRecord.token as string) || (dataRecord.accessToken as string) || (dataRecord.jwt as string) || (dataRecord.authToken as string)
      const user = (dataRecord.user as unknown) || (dataRecord.profile as unknown) || (dataRecord.account as unknown)
      
      // Store token and user info
      if (token) localStorage.setItem('authToken', token)
      if (user) localStorage.setItem('user', JSON.stringify(user))

      // Construct a typed response for the caller
      const result: AuthResponse = {
        user: (user as unknown) as User,
        token: (token as unknown) as string,
      }

      return result
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
      { path: `/auth/${userId}/challenges`, params: undefined },
      { path: `/users/${userId}/challenges`, params: undefined },
    ]

    for (const c of candidates) {
      try {
        const resp = await this.api.get(c.path, { params: c.params })
        if (resp && resp.data) return resp.data.data ?? resp.data
      } catch {
        // try next
      }
    }

    // Final attempt: generic /challenges without params
    const response = await this.api.get('/challenges')
    return response.data.data ?? response.data
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
