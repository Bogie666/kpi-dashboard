// src/app/api/google/reviews/route.ts
import { NextResponse } from 'next/server'
import { GoogleReviewsCacheService } from '@/lib/google-reviews-cache'

export async function GET() {
  try {
    console.log('📖 Fetching reviews from cache...')

    const cacheService = new GoogleReviewsCacheService()

    // Get cached reviews (fast!)
    const { reviews, locationStats } = await cacheService.getCachedReviews()

    // Get sync status
    const syncStatus = await cacheService.getSyncStatus()

    console.log(`✅ Returned ${reviews.length} cached reviews`)

    return NextResponse.json({
      success: true,
      reviews,
      totalCount: reviews.length,
      locationStats,
      syncStatus: syncStatus ? {
        lastSync: syncStatus.last_sync_at,
        status: syncStatus.sync_status
      } : null
    })

  } catch (error) {
    console.error('💥 Error fetching cached reviews:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
