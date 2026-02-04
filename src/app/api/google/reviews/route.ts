// src/app/api/google/reviews/route.ts
import { NextResponse } from 'next/server'
import { GoogleReviewsCacheService } from '@/lib/google-reviews-cache'
import { GoogleBusinessService } from '@/lib/google-business'
import { getTokenManager } from '@/lib/google-token-manager'

export async function GET() {
  try {
    console.log('📖 Fetching reviews from cache...')

    const cacheService = new GoogleReviewsCacheService()

    // Get cached reviews (fast!)
    const { reviews, locationStats } = await cacheService.getCachedReviews()

    // Get sync status
    const syncStatus = await cacheService.getSyncStatus()

    // If no cached reviews and DATABASE_URL is not configured, fall back to direct Google API call
    if (reviews.length === 0 && !process.env.DATABASE_URL) {
      console.log('⚠️ No cache available, fetching directly from Google API...')

      const tokenManager = getTokenManager()
      const accessToken = await tokenManager.getAccessToken()
      const googleService = new GoogleBusinessService(accessToken)
      const result = await googleService.getAllReviews()

      if (result.success) {
        return NextResponse.json({
          success: true,
          reviews: result.reviews,
          totalCount: result.totalCount,
          locationStats: result.locationStats,
          syncStatus: null,
          cached: false
        })
      }
    }

    console.log(`✅ Returned ${reviews.length} cached reviews`)

    // Use Google's reported totals if available (these are the accurate counts shown on Google Maps)
    // Fall back to actual fetched counts if not available
    const reportedTotals = syncStatus?.reported_totals || locationStats;

    return NextResponse.json({
      success: true,
      reviews,
      totalCount: reviews.length,
      locationStats,  // Actual fetched counts
      reportedTotals, // What Google reports (use this for display)
      syncStatus: syncStatus ? {
        lastSync: syncStatus.last_sync_at,
        status: syncStatus.sync_status
      } : null,
      cached: true
    })

  } catch (error) {
    console.error('💥 Error fetching reviews:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
