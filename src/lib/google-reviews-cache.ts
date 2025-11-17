// src/lib/google-reviews-cache.ts
import { Pool } from 'pg';

// Only create pool if DATABASE_URL is configured
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;

export interface CachedReview {
  id: number;
  review_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  review_reply: string | null;
  location_name: string;
  location_id: string;
  account_id: string;
  review_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SyncStatus {
  last_sync_at: Date;
  total_reviews_synced: number;
  sync_status: string;
  error_message: string | null;
  location_stats: Record<string, number>;
}

export interface ReviewData {
  id: string;
  name: string;
  rating: number;
  text: string;
  reply: string | null;
  locationName: string;
  locationId: string;
  accountId: string;
  date: string;
}

export class GoogleReviewsCacheService {
  /**
   * Get all cached reviews
   */
  async getCachedReviews(): Promise<{ reviews: ReviewData[], locationStats: Record<string, number> }> {
    if (!pool) {
      console.warn('⚠️ DATABASE_URL not configured - returning empty reviews');
      return { reviews: [], locationStats: {} };
    }

    const client = await pool.connect();

    try {
      // Get all reviews
      const reviewsResult = await client.query(`
        SELECT
          review_id as id,
          reviewer_name as name,
          rating,
          review_text as text,
          review_reply as reply,
          location_name as "locationName",
          location_id as "locationId",
          account_id as "accountId",
          review_date as date
        FROM google_reviews_cache
        ORDER BY review_date DESC
      `);

      // Get location stats
      const statsResult = await client.query(`
        SELECT
          location_id,
          COUNT(*) as count
        FROM google_reviews_cache
        GROUP BY location_id
      `);

      const locationStats: Record<string, number> = {};
      statsResult.rows.forEach(row => {
        locationStats[row.location_id] = parseInt(row.count);
      });

      return {
        reviews: reviewsResult.rows,
        locationStats
      };
    } finally {
      client.release();
    }
  }

  /**
   * Sync reviews from Google API to cache
   */
  async syncReviews(reviews: ReviewData[], locationStats: Record<string, number>): Promise<void> {
    if (!pool) {
      console.warn('⚠️ DATABASE_URL not configured - skipping sync');
      return;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Clear old reviews (optional - or you can do upserts)
      await client.query('DELETE FROM google_reviews_cache');

      // Insert new reviews
      for (const review of reviews) {
        await client.query(`
          INSERT INTO google_reviews_cache (
            review_id,
            reviewer_name,
            rating,
            review_text,
            review_reply,
            location_name,
            location_id,
            account_id,
            review_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (review_id)
          DO UPDATE SET
            reviewer_name = EXCLUDED.reviewer_name,
            rating = EXCLUDED.rating,
            review_text = EXCLUDED.review_text,
            review_reply = EXCLUDED.review_reply,
            location_name = EXCLUDED.location_name,
            location_id = EXCLUDED.location_id,
            account_id = EXCLUDED.account_id,
            review_date = EXCLUDED.review_date,
            updated_at = CURRENT_TIMESTAMP
        `, [
          review.id,
          review.name,
          review.rating,
          review.text,
          review.reply,
          review.locationName,
          review.locationId,
          review.accountId,
          review.date
        ]);
      }

      // Update sync status
      await client.query(`
        INSERT INTO google_reviews_sync_status (
          last_sync_at,
          total_reviews_synced,
          sync_status,
          location_stats
        ) VALUES ($1, $2, $3, $4)
      `, [
        new Date(),
        reviews.length,
        'success',
        JSON.stringify(locationStats)
      ]);

      await client.query('COMMIT');
      console.log(`✅ Successfully synced ${reviews.length} reviews to cache`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error syncing reviews to cache:', error);

      // Log the failed sync
      await client.query(`
        INSERT INTO google_reviews_sync_status (
          last_sync_at,
          total_reviews_synced,
          sync_status,
          error_message
        ) VALUES ($1, $2, $3, $4)
      `, [
        new Date(),
        0,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      ]);

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus | null> {
    if (!pool) {
      return null;
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          last_sync_at,
          total_reviews_synced,
          sync_status,
          error_message,
          location_stats
        FROM google_reviews_sync_status
        ORDER BY last_sync_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Check if cache needs refresh (older than X hours)
   */
  async needsRefresh(maxAgeHours: number = 24): Promise<boolean> {
    const status = await this.getSyncStatus();

    if (!status) {
      return true; // No sync yet
    }

    if (status.sync_status === 'error') {
      return true; // Last sync failed
    }

    const hoursSinceSync = (Date.now() - new Date(status.last_sync_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceSync >= maxAgeHours;
  }
}
