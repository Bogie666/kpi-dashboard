// src/app/api/cron/sync-competition/route.ts
import { NextResponse } from 'next/server'

const COMPETITION_API_URL = process.env.NEXT_PUBLIC_COMPETITION_API_URL ||
  'https://us-central1-new-dashboard-2025.cloudfunctions.net/competition-api'

async function syncCompetitions() {
  try {
    console.log('🔄 Starting competition sync via cron...')

    // Call the Google Cloud Function to sync all active competitions
    const response = await fetch(`${COMPETITION_API_URL}/sync-active-competitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Competition API returned ${response.status}: ${errorText}`)
    }

    const result = await response.json()

    console.log('✅ Competition sync completed:', result)

    return NextResponse.json({
      success: true,
      message: 'Competitions synced successfully',
      data: result
    })

  } catch (error) {
    console.error('💥 Error syncing competitions:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET handler for Vercel cron jobs
export async function GET() {
  return syncCompetitions()
}

// POST handler for manual triggers
export async function POST() {
  return syncCompetitions()
}
