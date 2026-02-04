// src/app/api/google/reviews/sync/route.ts
import { NextResponse } from 'next/server'
import { GoogleBusinessService } from '@/lib/google-business'
import { GoogleReviewsCacheService } from '@/lib/google-reviews-cache'
import { getTokenManager } from '@/lib/google-token-manager'

async function syncReviews(force: boolean = false) {
  try {
    console.log(`🔄 Starting Google reviews sync...${force ? ' (FORCE MODE)' : ''}`)

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

    // Store in cache (with validation to prevent data loss)
    // Also pass reportedTotals so we can display Google's actual counts
    const cacheService = new GoogleReviewsCacheService()
    const syncResult = await cacheService.syncReviews(result.reviews, result.locationStats, force, result.reportedTotals)

    if (syncResult.skipped) {
      console.warn('⚠️ Reviews sync was skipped:', syncResult.reason)
      return NextResponse.json({
        success: false,
        message: 'Sync skipped to prevent data loss',
        reason: syncResult.reason,
        apiReturnedCount: result.totalCount,
        locationStats: result.locationStats,
        paginationErrors: result.paginationErrors
      }, { status: 200 }) // 200 because it's not an error, just a safety skip
    }

    console.log('✅ Reviews sync completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Reviews synced successfully',
      totalReviews: result.totalCount,
      locationStats: result.locationStats,
      paginationErrors: result.paginationErrors
    })

  } catch (error) {
    console.error('💥 Error syncing reviews:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET handler for Vercel cron jobs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'
  return syncReviews(force)
}

// POST handler for manual triggers
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const force = body.force === true
    return syncReviews(force)
  } catch {
    return syncReviews(false)
  }
}
