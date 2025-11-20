import { CredentialResponse } from '@react-oauth/google'
import apiService from './api'

export interface GoogleUser {
  id: string
  name: string
  email: string
  picture?: string
}

class GoogleAuthService {
  async handleGoogleLogin(credentialResponse: CredentialResponse): Promise<void> {
    if (!credentialResponse.credential) {
      throw new Error('No credential received from Google')
    }

    try {
      const response = await apiService.loginWithGoogle(credentialResponse.credential)
      
      localStorage.setItem('authToken', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  }

  decodeJWT(token: string): GoogleUser | null {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Error decoding JWT:', error)
      return null
    }
  }
}

export const googleAuthService = new GoogleAuthService()
export default googleAuthService
