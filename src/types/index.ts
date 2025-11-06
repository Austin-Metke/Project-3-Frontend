// User and Authentication Types
export interface User {
  id: string
  name: string
  email: string
  totalPoints: number
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  name: string
  email: string
  password: string
}

// Dashboard Stats Types
export interface UserStats {
  totalPoints: number
  currentStreak: number
  weeklyPoints: number
  monthlyPoints: number
  rank: number
  recentActivities: Activity[]
  weeklyProgress: WeeklyProgress[]
}

export interface WeeklyProgress {
  day: string
  points: number
}

// Activity Types
export interface Activity {
  id: string
  userId: string
  activityType: ActivityType
  points: number
  category: ActivityCategory
  createdAt: string
  description?: string
}

export interface ActivityType {
  id: string
  name: string
  description: string
  points: number
  category: ActivityCategory
  icon?: string
}

export type ActivityCategory = 
  | 'Transportation'
  | 'Recycling'
  | 'Energy'
  | 'Water'
  | 'Food'
  | 'Other'

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  message: string
  errors?: Record<string, string[]>
}
