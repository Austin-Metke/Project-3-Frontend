export interface GoogleUser {
  sub: string
  name: string
  email: string
  picture?: string
  email_verified?: boolean
  iat?: number
  exp?: number
}

class GoogleAuthService {
  async handleGoogleLogin(credentialResponse: any): Promise<void> {
    if (!credentialResponse.credential) {
      throw new Error('No credential received from Google')
    }

    try {
      // Decode the Google JWT to get user info
      const googleUser = this.decodeJWT(credentialResponse.credential)
      
      if (!googleUser) {
        throw new Error('Failed to decode Google credential')
      }

      localStorage.setItem('authToken', credentialResponse.credential)
      
      const user = {
        id: googleUser.sub,
        name: googleUser.name,
        email: googleUser.email,
        picture: googleUser.picture
      }
      localStorage.setItem('user', JSON.stringify(user))
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
