// src/lib/google-token-manager.ts
/**
 * Server-side token manager for Google Business Profile API
 * Uses a stored refresh token to automatically get fresh access tokens
 */

export class GoogleTokenManager {
  private refreshToken: string
  private clientId: string
  private clientSecret: string
  private accessToken: string | null = null
  private expiresAt: number = 0

  constructor() {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!refreshToken) {
      throw new Error('GOOGLE_REFRESH_TOKEN environment variable is required')
    }
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID environment variable is required')
    }
    if (!clientSecret) {
      throw new Error('GOOGLE_CLIENT_SECRET environment variable is required')
    }

    this.refreshToken = refreshToken
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && now < this.expiresAt - 300) {
      console.log('✅ Using cached access token')
      return this.accessToken
    }

    // Refresh the access token
    console.log('🔄 Refreshing access token...')
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to refresh token: ${error}`)
      }

      const tokens: { access_token: string; expires_in: number } = await response.json()

      if (!tokens.access_token) {
        throw new Error('No access token in response')
      }

      this.accessToken = tokens.access_token
      this.expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in

      console.log('✅ Access token refreshed successfully')
      return tokens.access_token
    } catch (error) {
      console.error('❌ Error refreshing access token:', error)
      throw error
    }
  }
}

// Singleton instance
let tokenManager: GoogleTokenManager | null = null

export function getTokenManager(): GoogleTokenManager {
  if (!tokenManager) {
    tokenManager = new GoogleTokenManager()
  }
  return tokenManager
}
