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

// User and Authentication Types
export interface User {
  id: number | string
  name?: string
  email?: string
  username?: string
  googleID?: string | null
  createdAt?: string
  updatedAt?: string
  totalPoints?: number
}

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

export interface UpdateUserData {
  name?: string
  email?: string
  password?: string
}

export interface AuthResponse {
  user?: User
  token?: string
}

// Dashboard Stats Types
export interface UserStats {
  totalPoints: number
  currentStreak: number
  weeklyPoints: number
  monthlyPoints: number
  rank: number
  recentActivities: Activity[]
  weeklyProgress: WeeklyProgressPoint[]
}

export interface WeeklyProgressPoint {
  day: string
  points: number
}

export interface WeeklyProgress {
  day: string
  points: number
}

// Activity Types
export interface Activity {
  id?: number | string
  userId?: number | string
  activityType?: ActivityType
  activityTypeId?: number | string
  points?: number
  category?: ActivityCategory | string
  createdAt?: string
  description?: string
}

export interface ActivityType {
  id: string | number
  name: string
  description: string
  points: number
  category: ActivityCategory
  icon?: string
}

export interface ActivityLog {
  id: string | number
  userId: string | number
  activityTypeId: string | number
  activityType?: ActivityType
  points?: number
  createdAt: string
  description?: string
}

export interface CreateActivityLogData {
  userId: string | number
  activityTypeId: string | number
  description?: string
}

export interface CreateActivityTypeData {
  name: string
  description: string
  points: number
  category: ActivityCategory
  icon?: string
}

export interface UpdateActivityTypeData {
  name?: string
  description?: string
  points?: number
  category?: ActivityCategory
  icon?: string
}

// Leaderboard Types
export interface LeaderboardEntry {
  userId: number | string
  userName?: string
  name?: string
  totalPoints: number
  totalCo2gSaved?: number | string
  rank?: number
  avatar?: string
}

// Challenge Types
export interface Challenge {
  id?: number | string
  challengeId?: number | string
  name?: string
  title?: string
  description?: string
  points?: number
  isCompleted?: boolean
  completed?: boolean
  userId?: number | string
}

