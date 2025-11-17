// src/app/api/google/reviews/route.ts
import { NextResponse } from 'next/server'
import { GoogleBusinessService } from '@/lib/google-business'
import { getTokenManager } from '@/lib/google-token-manager'

export async function GET() {
  try {
    console.log('🔍 Fetching reviews using server-side token...')

    // Get access token from token manager (no user session required)
    const tokenManager = getTokenManager()
    const accessToken = await tokenManager.getAccessToken()

    // Create service instance with access token
    const googleService = new GoogleBusinessService(accessToken)

    // Fetch all reviews
    const result = await googleService.getAllReviews()

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reviews: result.reviews,
      totalCount: result.totalCount,
      locationStats: result.locationStats
    })

  } catch (error) {
    console.error('💥 Fatal error fetching reviews:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
