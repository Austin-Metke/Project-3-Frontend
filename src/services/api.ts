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

  // User endpoints (UserController)
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await this.api.get<ApiResponse<User[]>>('/auth')
      return response.data.data
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

  // Activity Logs endpoints (TypeLogsController - /activity-logs)
  async getAllActivityLogs(): Promise<ActivityLog[]> {
    try {
      const response = await this.api.get<ApiResponse<ActivityLog[]>>('/activity-logs')
      return response.data.data
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
      const response = await this.api.post<ApiResponse<ActivityLog>>('/activity-logs', logData)
      return response.data.data
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
      return response.data.data
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
      const response = await this.api.post<ApiResponse<ActivityType>>('/activities', activityData)
      return response.data.data
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
      return response.data.data
    } catch (error) {
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
  async getActivityTypes() {
    return this.getAllActivityTypes()
  }

  /** @deprecated Use createActivityLog() instead */
  async logActivity(activityData: { activityTypeId: string; description?: string }) {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }
    return this.createActivityLog({
      userId,
      activityTypeId: activityData.activityTypeId,
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
