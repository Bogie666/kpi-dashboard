// src/lib/google-business.ts
import { OAuth2Client } from 'google-auth-library'

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

      for (const location of locations) {
        try {
          console.log(`📍 Fetching reviews for ${location.title}`)

          // Fetch all reviews by paginating through all pages
          let pageToken: string | undefined = undefined
          let locationReviewCount = 0

          do {
            const reviewsUrl: string = pageToken
              ? `https://mybusiness.googleapis.com/v4/accounts/${location.accountId}/locations/${location.locationId}/reviews?pageSize=50&pageToken=${pageToken}`
              : `https://mybusiness.googleapis.com/v4/accounts/${location.accountId}/locations/${location.locationId}/reviews?pageSize=50`

            const reviewsResponse = await fetch(reviewsUrl, {
              headers: {
                'Authorization': `Bearer ${this.oauth2Client.credentials.access_token}`,
                'Content-Type': 'application/json'
              }
            })

            if (reviewsResponse.ok) {
              const reviewsData = await reviewsResponse.json()

              if (reviewsData.reviews && reviewsData.reviews.length > 0) {
                const reviewsWithLocation = reviewsData.reviews.map((review: {
                  reviewId?: string;
                  name?: string;
                  reviewer?: { displayName?: string };
                  starRating: string;
                  comment?: string;
                  reviewReply?: { comment?: string };
                  createTime?: string;
                }) => ({
                  id: review.reviewId || review.name,
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
                console.log(`✅ Found ${reviewsWithLocation.length} reviews in this page for ${location.title}`)
              }

              // Check if there are more pages
              pageToken = reviewsData.nextPageToken
            } else {
              const errorText = await reviewsResponse.text()
              console.error(`❌ Error fetching reviews for ${location.title}: ${reviewsResponse.status}`, errorText)
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

      return {
        success: true,
        reviews: allReviews,
        totalCount: allReviews.length,
        locationStats
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
