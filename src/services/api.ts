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
      const apiError = error.response?.data as ApiError
      throw new Error(apiError?.message || 'An unexpected error occurred')
    }
    throw error
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.api.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
      const { data } = response.data
      
      // Store token and user info
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      return data
    } catch (error) {
      this.handleError(error)
    }
  }

  async signUp(userData: SignUpData): Promise<AuthResponse> {
    try {
      const response = await this.api.post<ApiResponse<AuthResponse>>('/auth/register', userData)
      const { data } = response.data
      
      // Store token and user info
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      return data
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
      const response = await this.api.get<ApiResponse<User>>('/user/profile')
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  // Activity endpoints (placeholders for future PRs)
  async getActivityTypes() {
    try {
      const response = await this.api.get('/activity-types')
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async logActivity(activityData: { activityTypeId: string; description?: string }) {
    try {
      const response = await this.api.post('/activities', activityData)
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  async getActivityHistory(params?: { startDate?: string; endDate?: string; category?: string }) {
    try {
      const response = await this.api.get('/activities/history', { params })
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  // Leaderboard endpoints (placeholders for future PRs)
  async getGlobalLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly') {
    try {
      const response = await this.api.get('/leaderboard/global', { params: { period } })
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  // Challenges endpoints (placeholders for future PRs)
  async getActiveChallenges() {
    try {
      const response = await this.api.get('/challenges/active')
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }

  // Badges endpoints (placeholders for future PRs)
  async getUserBadges() {
    try {
      const response = await this.api.get('/user/badges')
      return response.data.data
    } catch (error) {
      this.handleError(error)
    }
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService
