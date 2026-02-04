// src/app/api/google/reviews/debug/route.ts
// Debug endpoint to test Google API response without syncing

import { NextResponse } from 'next/server'
import { GoogleBusinessService } from '@/lib/google-business'
import { GoogleReviewsCacheService } from '@/lib/google-reviews-cache'
import { getTokenManager } from '@/lib/google-token-manager'

export async function GET() {
  try {
    console.log('🔍 Debug: Testing Google reviews API...')

    // Get current cache count
    const cacheService = new GoogleReviewsCacheService()
    const cachedData = await cacheService.getCachedReviews()
    const syncStatus = await cacheService.getSyncStatus()

    // Get access token
    const tokenManager = getTokenManager()
    const accessToken = await tokenManager.getAccessToken()

    // Fetch all reviews from Google API
    const googleService = new GoogleBusinessService(accessToken)
    const result = await googleService.getAllReviews()

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        cached: {
          totalReviews: cachedData.reviews.length,
          locationStats: cachedData.locationStats
        }
      }, { status: 500 })
    }

    // Compare API vs Cache
    const comparison = {
      api: {
        totalReviews: result.totalCount,
        locationStats: result.locationStats,
        reportedTotals: result.reportedTotals || {},
        paginationErrors: result.paginationErrors || []
      },
      cache: {
        totalReviews: cachedData.reviews.length,
        locationStats: cachedData.locationStats
      },
      difference: (result.totalCount ?? 0) - cachedData.reviews.length,
      lastSync: syncStatus?.last_sync_at || null,
      lastSyncStatus: syncStatus?.sync_status || null
    }

    // Check for discrepancies between what Google reports vs what we fetched
    const reportedTotals: Record<string, number> = result.reportedTotals || {}
    const locationStats: Record<string, number> = result.locationStats || {}
    const discrepancies: Record<string, { reported: number; fetched: number; missing: number; percentFetched: string }> = {}
    for (const [loc, reported] of Object.entries(reportedTotals)) {
      const fetched = locationStats[loc] || 0
      if (reported !== fetched) {
        discrepancies[loc] = {
          reported,
          fetched,
          missing: reported - fetched,
          percentFetched: `${((fetched / reported) * 100).toFixed(1)}%`
        }
      }
    }

    // Calculate totals
    const totalReported = Object.values(reportedTotals).reduce((sum, n) => sum + n, 0)
    const totalFetched = result.totalCount || 0
    const totalCached = cachedData.reviews.length

    return NextResponse.json({
      success: true,
      message: 'Debug info - no changes made',
      summary: {
        googleReportsTotal: totalReported,
        apiFetchedTotal: totalFetched,
        currentCacheTotal: totalCached,
        apiVsGoogleDiff: totalFetched - totalReported,
        cacheVsApiFetchDiff: totalCached - totalFetched
      },
      comparison,
      discrepancies: Object.keys(discrepancies).length > 0 ? discrepancies : null,
      paginationErrors: result.paginationErrors || [],
      diagnosis: discrepancies && Object.keys(discrepancies).length > 0
        ? `⚠️ ISSUE FOUND: Google API is not returning all reviews. The API reports ${totalReported} reviews but we could only fetch ${totalFetched}. This appears to be a Google API limitation, not a code bug.`
        : totalFetched === totalReported && totalFetched > 0
          ? `✅ API is returning all reviews correctly (${totalFetched} fetched = ${totalReported} reported)`
          : 'Unable to determine - check the numbers above',
      recommendation: comparison.difference < 0
        ? `⚠️ API returned ${Math.abs(comparison.difference)} FEWER reviews than cache. Do NOT force sync unless you verified reviews were legitimately removed.`
        : comparison.difference > 0
          ? `✅ API returned ${comparison.difference} MORE reviews. Safe to sync.`
          : '✅ API and cache match.'
    })

  } catch (error) {
    console.error('💥 Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
