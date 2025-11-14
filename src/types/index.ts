// Shared application types used across the frontend

// Generic API wrapper used by some backend responses
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success?: boolean
}

export interface ApiError {
  message: string
  statusCode?: number
  errors?: Record<string, string[]>
}

// Activity category union
export type ActivityCategory =
  | 'Transportation'
  | 'Recycling'
  | 'Energy'
  | 'Water'
  | 'Food'
  | 'Other'

// Activity and related shapes (kept permissive to match different backend shapes)
export interface ActivityType {
  id?: number | string
  name?: string
  description?: string
  points?: number
  category?: ActivityCategory
  icon?: string
}

export interface Activity {
  id?: number | string
  userId?: number | string
  activityType?: ActivityType
  activityTypeId?: number
  points?: number
  category?: ActivityCategory | string
  createdAt?: string
  description?: string
}

export interface WeeklyProgressPoint {
  day: string
  points: number
}

// Basic user shape
export interface User {
  id: number
  name?: string
  email?: string
  username?: string
  googleID?: string | null
  createdAt?: string
  updatedAt?: string
  totalPoints?: number
}

// Authentication response normalized for the frontend
export interface AuthResponse {
  user?: User
  token?: string
}

// Credentials / signup shapes (loose to tolerate backend differences)
export interface LoginCredentials {
  // backend in this project expects { name, passwordHash }
  name?: string
  email?: string
  password?: string
  passwordHash?: string
}

export interface SignUpData {
  name?: string
  email?: string
  password?: string
  passwordHash?: string
}

// Dashboard / stats
export interface UserStats {
  totalPoints: number
  currentStreak: number
  weeklyPoints: number
  monthlyPoints: number
  rank: number
  recentActivities: Activity[]
  weeklyProgress: WeeklyProgressPoint[]
}

