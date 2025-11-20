import { NextResponse } from 'next/server';
import { claudeService } from '@/lib/claude-service';

export async function POST(request) {
  try {
    console.log('Insights API called');
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);

    if (!claudeService.isConfigured()) {
      console.error('Claude service not configured');
      return NextResponse.json(
        { success: false, error: 'AI service not configured. Please check Claude API key in environment.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { timeframe, locationId, reviews } = body;

    if (!reviews || !Array.isArray(reviews)) {
      return NextResponse.json(
        { success: false, error: 'Reviews data is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Generating insights for ${reviews.length} reviews`);

    // Filter reviews based on timeframe and location
    const filteredReviews = filterReviewsByTimeframe(reviews, timeframe, locationId);

    console.log(`📊 Filtered to ${filteredReviews.length} reviews for timeframe: ${timeframe}, location: ${locationId}`);

    if (filteredReviews.length === 0) {
      return NextResponse.json({
        success: true,
        insights: {
          timeframe,
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          commonPraise: [],
          commonComplaints: [],
          keyThemes: [],
          recommendations: ['No reviews found for the selected timeframe and location.'],
          sentimentScore: 0,
          generatedAt: new Date().toISOString()
        }
      });
    }

    // Calculate basic statistics
    const stats = calculateReviewStats(filteredReviews);

    // Generate AI insights using Claude
    console.log(`Calling Claude AI to analyze ${filteredReviews.length} reviews...`);
    const aiResult = await claudeService.analyzeReviews(filteredReviews, {
      timeframe: getTimeframeLabel(timeframe),
      location: locationId === 'all' ? 'all locations' : locationId
    });

    if (!aiResult.success) {
      console.error('AI analysis failed:', aiResult.error);
      return NextResponse.json(
        { success: false, error: `AI analysis failed: ${aiResult.error}` },
        { status: 500 }
      );
    }

    console.log('AI analysis successful');

    // Combine stats with AI insights
    const insights = {
      timeframe,
      ...stats,
      ...aiResult.insights,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('Error generating customer insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate insights'
      },
      { status: 500 }
    );
  }
}

function filterReviewsByTimeframe(reviews, timeframe, locationId) {
  const now = new Date();
  let cutoffDate;

  switch (timeframe) {
    case '1week':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '2weeks':
      cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case '1month':
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3months':
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6months':
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'year':
      cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  }

  return reviews.filter(review => {
    const reviewDate = new Date(review.date);
    const isInTimeframe = reviewDate >= cutoffDate;
    const isInLocation = locationId === 'all' || review.locationId === locationId;

    return isInTimeframe && isInLocation;
  });
}

function calculateReviewStats(reviews) {
  const totalReviews = reviews.length;
  const validRatings = reviews.filter(review => review.rating && typeof review.rating === 'number');
  const totalRating = validRatings.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = validRatings.length > 0 ? totalRating / validRatings.length : 0;

  // Rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  validRatings.forEach(review => {
    const rating = review.rating;
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating]++;
    }
  });

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution
  };
}

function getTimeframeLabel(timeframe) {
  const labels = {
    '1week': 'Last Week',
    '2weeks': 'Last 2 Weeks',
    '1month': 'Last Month',
    '3months': 'Last 3 Months',
    '6months': 'Last 6 Months',
    'year': 'Last Year'
  };
  return labels[timeframe] || 'Last 3 Months';
}
