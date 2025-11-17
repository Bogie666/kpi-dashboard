// src/auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

// Enhanced scope for Google Business Profile access
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/business.manage', // Google Business Profile management
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ')

// Ensure required environment variables are present
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing GOOGLE_CLIENT_ID environment variable')
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_SECRET environment variable')
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing NEXTAUTH_SECRET environment variable')
}

// Extend the session type
declare module 'next-auth' {
  interface Session {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}

export const config = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code'
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session && token) {
        // Add token info from JWT callback
        if (token?.accessToken) {
          session.accessToken = token.accessToken as string
        }
        if (token?.refreshToken) {
          session.refreshToken = token.refreshToken as string
        }
        if (token?.expiresAt) {
          session.expiresAt = token.expiresAt as number
        }
      }

      return session
    },

    async jwt({ token, account, user }) {
      // Initial sign in - save tokens to JWT
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at

        console.log('🔐 Initial JWT setup - tokens saved')
        return token
      }

      // Token is still valid
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = token.expiresAt as number

      if (now < expiresAt - 300) { // 5 minutes buffer
        return token
      }

      // Token has expired or about to expire, refresh it
      console.log('🔄 Access token expired, refreshing...')
      try {
        const refreshToken = token.refreshToken as string

        if (!refreshToken) {
          console.error('❌ No refresh token available')
          return token
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        })

        const tokens = await response.json()

        if (!response.ok) {
          console.error('❌ Failed to refresh token:', tokens)
          return token
        }

        console.log('✅ Token refreshed successfully')

        return {
          ...token,
          accessToken: tokens.access_token,
          expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
          // Keep the same refresh token unless a new one is provided
          refreshToken: tokens.refresh_token ?? token.refreshToken,
        }
      } catch (error) {
        console.error('❌ Error refreshing access token:', error)
        return token
      }
    },

    async signIn({ user, account }) {
      console.log('🔐 Sign in attempt:', {
        provider: account?.provider,
        userEmail: user?.email,
        hasAccessToken: !!account?.access_token
      })

      // Allow sign in for Google provider
      if (account?.provider === 'google') {
        console.log('✅ Google sign in approved for:', user?.email)
        return true
      }

      console.log('❌ Sign in rejected - unsupported provider:', account?.provider)
      return false
    }
  },
  session: {
    strategy: 'jwt', // Use JWT sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60     // 24 hours
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)
