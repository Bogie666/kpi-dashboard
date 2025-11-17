// src/app/api/google/reviews/sync/route.ts
import { NextResponse } from 'next/server'
import { GoogleBusinessService } from '@/lib/google-business'
import { GoogleReviewsCacheService } from '@/lib/google-reviews-cache'
import { getTokenManager } from '@/lib/google-token-manager'

export async function POST() {
  try {
    console.log('🔄 Starting Google reviews sync...')

    // Get access token
    const tokenManager = getTokenManager()
    const accessToken = await tokenManager.getAccessToken()

    // Fetch all reviews from Google API
    const googleService = new GoogleBusinessService(accessToken)
    const result = await googleService.getAllReviews()

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    // Store in cache
    const cacheService = new GoogleReviewsCacheService()
    await cacheService.syncReviews(result.reviews, result.locationStats)

    console.log('✅ Reviews sync completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Reviews synced successfully',
      totalReviews: result.totalCount,
      locationStats: result.locationStats
    })

  } catch (error) {
    console.error('💥 Error syncing reviews:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
