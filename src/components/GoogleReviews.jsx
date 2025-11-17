"use client";

import React, { useState, useEffect } from 'react';
import { Star, MapPin, Calendar, User, TrendingUp, Award, MessageCircle } from 'lucide-react';

const GoogleReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationStats, setLocationStats] = useState({});

  // Three locations
  const locations = [
    { id: 'lex', name: 'Lex', fullName: 'Lex - Air Conditioning, Heating, Plumbing, Electrical' },
    { id: 'lex-etx', name: 'Lex ETX', fullName: 'Lex ETX - Air Conditioning, Heating, Plumbing, Electrical' },
    { id: 'lyons', name: 'Lyons', fullName: 'Lyons Air Conditioning and Heating' },
  ];

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real reviews from Google Business Profile API (no auth required)
      const response = await fetch('/api/google/reviews');
      const data = await response.json();

      if (data.success && data.reviews) {
        setReviews(data.reviews);
        setLocationStats(data.locationStats || {});
      } else {
        console.error('Failed to load reviews:', data.error);
        setError(data.error || 'Failed to load reviews');
        setReviews([]);
        setLocationStats({});
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError('Failed to connect to reviews API');
      setLoading(false);
    }
  };

  // Temporary mock data generator
  const generateMockReviews = () => {
    const mockNames = ['John Smith', 'Sarah Johnson', 'Mike Williams', 'Emily Brown', 'David Lee', 'Jennifer Davis', 'Robert Miller', 'Lisa Wilson', 'James Taylor', 'Patricia Martinez', 'Michael Anderson', 'Mary Garcia'];
    const mockComments = [
      'Excellent service! The technician was professional and knowledgeable. Fixed our AC issue quickly.',
      'Very happy with the work done. Quick response and fair pricing. Would definitely recommend.',
      'Great experience from start to finish. Highly recommend! The team was amazing.',
      'The team was courteous and did a fantastic job. Our heating system is working perfectly now.',
      'Professional service and excellent communication throughout. Very satisfied with the results.',
      'Fast, efficient, and reasonably priced. Will use again! Best HVAC company in the area.',
      'Impressed with the quality of work and attention to detail. They went above and beyond.',
      'Outstanding customer service. Fixed the problem quickly and explained everything clearly.',
      'Best HVAC service we\'ve had. The technician was knowledgeable and friendly.',
      'Highly professional team. They arrived on time and completed the work efficiently.',
      'Very pleased with the service. Our plumbing issue was resolved quickly.',
      'Great job! The electrical work was done perfectly. Very professional crew.'
    ];

    const locationIds = ['lex', 'lex-etx', 'lyons'];
    const reviewCount = 50; // Generate more reviews

    return Array.from({ length: reviewCount }, (_, i) => {
      const locationId = locationIds[Math.floor(Math.random() * locationIds.length)];
      const location = locations.find(l => l.id === locationId);

      // Weight towards higher ratings (80% are 4-5 stars)
      const rand = Math.random();
      let rating;
      if (rand < 0.5) rating = 5;
      else if (rand < 0.8) rating = 4;
      else if (rand < 0.9) rating = 3;
      else if (rand < 0.95) rating = 2;
      else rating = 1;

      return {
        id: `review-${i}`,
        name: mockNames[Math.floor(Math.random() * mockNames.length)],
        rating: rating,
        text: mockComments[Math.floor(Math.random() * mockComments.length)],
        locationName: location.fullName,
        locationId: location.id,
        date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(), // Last 60 days
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getLocationStats = (locationId) => {
    // Filter and sort reviews by date (most recent first)
    const locationReviews = reviews
      .filter(r => r.locationId === locationId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Use the actual total from the API if available, otherwise fallback to filtered count
    const actualTotal = locationStats[locationId] || locationReviews.length;

    if (locationReviews.length === 0) {
      return {
        totalReviews: actualTotal,
        avgRating: 0,
        daysSinceLastReview: null,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentPositive: 0,
        recentTrend: 0
      };
    }

    const totalReviews = actualTotal;
    const avgRating = locationReviews.reduce((sum, r) => sum + r.rating, 0) / locationReviews.length;

    // Days since last review (now using the most recent review after sorting)
    const lastReviewDate = new Date(locationReviews[0].date);
    const daysSinceLastReview = Math.floor((new Date() - lastReviewDate) / (1000 * 60 * 60 * 24));

    // Rating breakdown
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    locationReviews.forEach(r => {
      breakdown[r.rating]++;
    });

    // Percentage of 4-5 star reviews
    const percentPositive = ((breakdown[5] + breakdown[4]) / totalReviews) * 100;

    // Recent trend (compare last 10 reviews avg to overall avg)
    const recentReviews = locationReviews.slice(0, 10);
    const recentAvg = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
    const recentTrend = recentAvg - avgRating;

    return {
      totalReviews,
      avgRating,
      daysSinceLastReview,
      breakdown,
      percentPositive,
      recentTrend
    };
  };

  const getStarRating = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'border-green-500';
    if (rating >= 3) return 'border-yellow-500';
    return 'border-red-500';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const LocationCard = ({ location }) => {
    const stats = getLocationStats(location.id);

    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{location.name}</h2>
          <MapPin className="h-6 w-6 text-blue-400" />
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Total Reviews */}
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {stats.totalReviews}
            </div>
            <div className="text-xs text-gray-400">Total Reviews</div>
          </div>

          {/* Average Rating */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="text-3xl font-bold text-white">
                {stats.avgRating.toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-gray-400">Avg Rating</div>
          </div>

          {/* Days Since Last Review */}
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {stats.daysSinceLastReview !== null ? stats.daysSinceLastReview : '-'}
            </div>
            <div className="text-xs text-gray-400">Days Since Last</div>
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="space-y-2 mb-6">
          {[5, 4, 3, 2, 1].map(rating => {
            const count = stats.breakdown[rating];
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

            return (
              <div key={rating} className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 w-12">
                  <span className="text-sm text-gray-300">{rating}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400 w-12 text-right">
                  {count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400 mb-1">
              {stats.percentPositive.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Positive (4-5★)</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {stats.recentTrend > 0.1 ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : stats.recentTrend < -0.1 ? (
                <TrendingUp className="h-5 w-5 text-red-400 transform rotate-180" />
              ) : (
                <span className="text-lg font-bold text-gray-400">—</span>
              )}
            </div>
            <div className="text-xs text-gray-400">Recent Trend</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400 mx-auto mb-4" />
          <div className="text-white text-xl">Loading reviews...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center bg-gray-800 rounded-xl p-8 shadow-xl max-w-md">
          <MessageCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Reviews</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadReviews}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center">
            <MessageCircle className="h-8 w-8 mr-3 text-blue-400" />
            Google Reviews
          </h1>
          <p className="text-gray-400">Track and monitor customer feedback across all locations</p>
        </div>

        {/* Location Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {locations.map(location => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>

        {/* Recent Reviews Feed */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Award className="h-6 w-6 mr-2 text-yellow-400" />
            Recent Reviews
          </h2>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <Star className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Reviews Found</h3>
            <p className="text-gray-400">No reviews available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.slice(0, 15).map((review, index) => (
              <div
                key={review.id}
                className={`bg-gray-800 border-2 ${getRatingColor(review.rating)} rounded-xl p-6 shadow-xl transform transition-all duration-300 hover:scale-105`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Rating */}
                <div className="mb-4">
                  {getStarRating(review.rating)}
                </div>

                {/* Review Text */}
                <p className="text-gray-200 text-sm mb-4 line-clamp-4">
                  "{review.text}"
                </p>

                {/* Reviewer Info */}
                <div className="border-t border-gray-700 pt-4 space-y-2">
                  <div className="flex items-center space-x-2 text-white text-sm">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{review.name}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-400 text-xs">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{locations.find(l => l.id === review.locationId)?.name}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-gray-400 text-xs">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(review.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleReviews;
