// src/lib/google-business.ts
import { OAuth2Client } from 'google-auth-library'

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export class GoogleBusinessService {
  private oauth2Client: OAuth2Client

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken
    })
  }

  // Fetch a single page of reviews with retry logic
  private async fetchReviewsPage(
    url: string,
    retries: number = 3
  ): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string; status?: number }> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.oauth2Client.credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          return { ok: true, data }
        }

        // If rate limited (429) or server error (5xx), retry with backoff
        if (response.status === 429 || response.status >= 500) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // 1s, 2s, 4s... max 10s
          console.warn(`⚠️ Attempt ${attempt}/${retries}: HTTP ${response.status}, retrying in ${backoffMs}ms...`)
          await delay(backoffMs)
          continue
        }

        // For other errors, don't retry
        const errorText = await response.text()
        return { ok: false, error: errorText, status: response.status }
      } catch (err) {
        // Network error - retry with backoff
        if (attempt < retries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          console.warn(`⚠️ Attempt ${attempt}/${retries}: Network error, retrying in ${backoffMs}ms...`, err)
          await delay(backoffMs)
          continue
        }
        return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
      }
    }
    return { ok: false, error: 'Max retries exceeded' }
  }

  async getAllReviews() {
    try {
      console.log('🔍 Fetching reviews from Google Business Profile...')

      // Three specific locations for the KPI dashboard
      const locations = [
        // Lex (Dallas/Plano) - 901 Jupiter Rd, Plano, TX
        { accountId: '102262219515631457064', locationId: '2211062401809147654', title: 'Lex Air Conditioning', identifier: 'lex' },

        // Lex ETX (East Texas) - Tyler, TX
        { accountId: '102262219515631457064', locationId: '7913826327010230630', title: 'LEX ETX', identifier: 'lex-etx' },

        // Lyons - Rockwall
        { accountId: '104110704176658195109', locationId: '379116535546276113', title: 'Lyons Air Conditioning and Heating', identifier: 'lyons' },
      ]

      const allReviews: Array<{
        id: string;
        name: string;
        rating: number;
        text: string;
        reply: string | null;
        locationName: string;
        locationId: string;
        accountId: string;
        date: string;
      }> = []
      const locationStats: Record<string, number> = {}
      const paginationErrors: string[] = []
      const reportedTotals: Record<string, number> = {} // What Google says the total is

      for (const location of locations) {
        try {
          console.log(`📍 Fetching reviews for ${location.title}`)

          // Fetch all reviews by paginating through all pages
          let pageToken: string | undefined = undefined
          let locationReviewCount = 0
          let pageNumber = 0

          do {
            pageNumber++
            const reviewsUrl: string = pageToken
              ? `https://mybusiness.googleapis.com/v4/accounts/${location.accountId}/locations/${location.locationId}/reviews?pageSize=50&pageToken=${pageToken}`
              : `https://mybusiness.googleapis.com/v4/accounts/${location.accountId}/locations/${location.locationId}/reviews?pageSize=50`

            // Add delay between page fetches to avoid rate limiting (skip first page)
            if (pageNumber > 1) {
              await delay(200) // 200ms between pages
            }

            const result = await this.fetchReviewsPage(reviewsUrl)

            if (result.ok && result.data) {
              const reviewsData = result.data

              // Capture the reported total from the first page
              if (reviewsData.totalReviewCount && !reportedTotals[location.identifier]) {
                reportedTotals[location.identifier] = reviewsData.totalReviewCount as number
                console.log(`📊 Google reports ${reviewsData.totalReviewCount} total reviews for ${location.title}`)
              }

              const reviews = reviewsData.reviews as Array<{
                reviewId?: string;
                name?: string;
                reviewer?: { displayName?: string };
                starRating: string;
                comment?: string;
                reviewReply?: { comment?: string };
                createTime?: string;
              }> | undefined

              if (reviews && reviews.length > 0) {
                const reviewsWithLocation = reviews.map((review) => ({
                  id: review.reviewId || review.name || '',
                  name: review.reviewer?.displayName || 'Anonymous',
                  rating: this.convertStarRatingToNumber(review.starRating),
                  text: review.comment || '',
                  reply: review.reviewReply?.comment || null,
                  locationName: location.title,
                  locationId: location.identifier,
                  accountId: location.accountId,
                  date: review.createTime || new Date().toISOString(),
                }))

                allReviews.push(...reviewsWithLocation)
                locationReviewCount += reviewsWithLocation.length
                console.log(`✅ Page ${pageNumber}: Found ${reviewsWithLocation.length} reviews for ${location.title} (total: ${locationReviewCount})`)
              } else {
                console.log(`📄 Page ${pageNumber}: No reviews in response for ${location.title}`)
              }

              // Check if there are more pages
              pageToken = reviewsData.nextPageToken as string | undefined
            } else {
              console.error(`❌ Error fetching reviews for ${location.title}: ${result.status || 'unknown'}`, result.error)
              paginationErrors.push(`${location.title}: HTTP ${result.status || 'error'} on page ${pageNumber} after ${locationReviewCount} reviews - ${(result.error || '').substring(0, 200)}`)
              break
            }
          } while (pageToken)

          // Store the total count for this location
          locationStats[location.identifier] = locationReviewCount
          console.log(`📊 Total reviews for ${location.title}: ${locationReviewCount}`)

        } catch (error) {
          console.error(`💥 Error processing ${location.title}:`, error)
          locationStats[location.identifier] = 0
        }
      }

      console.log(`📊 Grand total reviews fetched: ${allReviews.length}`)
      console.log(`📊 Location breakdown:`, locationStats)
      console.log(`📊 Google reported totals:`, reportedTotals)

      // Check for discrepancies between reported and actual
      for (const [loc, reported] of Object.entries(reportedTotals)) {
        const actual = locationStats[loc] || 0
        if (reported !== actual) {
          console.warn(`⚠️ DISCREPANCY for ${loc}: Google reports ${reported} but we fetched ${actual} (missing ${reported - actual})`)
        }
      }

      if (paginationErrors.length > 0) {
        console.warn(`⚠️ Pagination errors encountered:`, paginationErrors)
      }

      return {
        success: true,
        reviews: allReviews,
        totalCount: allReviews.length,
        locationStats,
        reportedTotals,
        paginationErrors: paginationErrors.length > 0 ? paginationErrors : undefined
      }
    } catch (error) {
      console.error('❌ Error fetching reviews:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
        reviews: [],
        locationStats: {}
      }
    }
  }

  private convertStarRatingToNumber(starRating: string): number {
    const ratingMap: Record<string, number> = {
      'ONE': 1,
      'TWO': 2,
      'THREE': 3,
      'FOUR': 4,
      'FIVE': 5
    }

    return ratingMap[starRating] || 0
  }
}
