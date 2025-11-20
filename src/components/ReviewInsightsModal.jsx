"use client";

import React, { useState } from 'react';
import {
  X,
  Star,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  BarChart3,
  Download,
  Sparkles,
  Target,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';

const ReviewInsightsModal = ({ isOpen, onClose, locations, reviews }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('3months');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const timeframes = [
    { value: '1week', label: 'Last Week' },
    { value: '2weeks', label: 'Last 2 Weeks' },
    { value: '1month', label: 'Last Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: 'year', label: 'Last Year' }
  ];

  const generateInsights = async () => {
    setLoading(true);
    try {
      console.log('Generating customer insights...');

      const response = await fetch('/api/google/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe: selectedTimeframe,
          locationId: selectedLocation,
          reviews: reviews
        })
      });

      const data = await response.json();

      if (data.success) {
        setInsights(data.insights);
      } else {
        alert(`Failed to generate insights: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate customer insights');
    } finally {
      setLoading(false);
    }
  };

  const getRatingIcon = (rating) => {
    if (rating >= 4.5) return '🌟';
    if (rating >= 4.0) return '⭐';
    if (rating >= 3.5) return '🔸';
    if (rating >= 3.0) return '🔶';
    return '🔻';
  };

  const getSentimentColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSentimentLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const exportInsights = () => {
    if (!insights) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Helper function to add text with word wrap
    const addText = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    };

    // Helper to check if we need a new page
    const checkPageBreak = (requiredSpace) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    try {
      // Header with gradient background (simulated with rectangle)
      doc.setFillColor(37, 99, 235); // Blue
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.text('Customer Insights Report', margin, 20);

      // Subtitle
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('AI-Powered Review Analysis', margin, 30);

      // Reset text color
      doc.setTextColor(0, 0, 0);
      yPos = 50;

      // Metadata box
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos, contentWidth, 20, 'F');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(`Generated: ${new Date(insights.generatedAt).toLocaleString()}`, margin + 5, yPos + 7);
      doc.text(`Timeframe: ${timeframes.find(tf => tf.value === selectedTimeframe)?.label}`, margin + 5, yPos + 14);
      doc.text(`Location: ${selectedLocation === 'all' ? 'All Locations' : locations.find(l => l.id === selectedLocation)?.name}`, pageWidth / 2, yPos + 7);
      yPos += 28;

      // Overview Stats Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Overview', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const statsY = yPos;

      // Stats in columns
      doc.text('Total Reviews:', margin, statsY);
      doc.setFont(undefined, 'bold');
      doc.text(`${insights.totalReviews}`, margin + 40, statsY);

      doc.setFont(undefined, 'normal');
      doc.text('Avg Rating:', margin + 70, statsY);
      doc.setFont(undefined, 'bold');
      doc.text(`${insights.averageRating} / 5.0`, margin + 105, statsY);

      doc.setFont(undefined, 'normal');
      doc.text('Sentiment Score:', margin + 145, statsY);
      doc.setFont(undefined, 'bold');
      doc.text(`${insights.sentimentScore}/100`, margin + 180, statsY);

      yPos = statsY + 10;

      // Rating Distribution
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Rating Distribution', margin, yPos);
      yPos += 8;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      [5, 4, 3, 2, 1].forEach((rating) => {
        const count = insights.ratingDistribution[rating] || 0;
        const percentage = insights.totalReviews > 0 ? (count / insights.totalReviews) * 100 : 0;
        const barWidth = (percentage / 100) * (contentWidth - 40);

        doc.text(`${rating}★`, margin, yPos);

        // Draw bar
        const color = rating >= 4 ? [34, 197, 94] : rating >= 3 ? [234, 179, 8] : [239, 68, 68];
        doc.setFillColor(...color);
        doc.rect(margin + 15, yPos - 3, barWidth, 4, 'F');

        doc.text(`${count} (${percentage.toFixed(0)}%)`, margin + 15 + barWidth + 3, yPos);
        yPos += 6;
      });
      yPos += 5;

      // Common Praise Section
      checkPageBreak(40);
      doc.setFillColor(220, 252, 231); // Light green
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(22, 163, 74); // Green
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('✓ What Customers Love', margin + 3, yPos + 5);
      yPos += 12;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      insights.commonPraise?.slice(0, 5).forEach((praise, index) => {
        const praiseText = `• ${praise}`;
        yPos = addText(praiseText, margin + 3, yPos, contentWidth - 6, 9);
        yPos += 2;
        checkPageBreak(20);
      });
      yPos += 5;

      // Areas for Improvement Section
      checkPageBreak(40);
      doc.setFillColor(254, 226, 226); // Light red
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(220, 38, 38); // Red
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('⚠ Areas for Improvement', margin + 3, yPos + 5);
      yPos += 12;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      insights.commonComplaints?.slice(0, 4).forEach((complaint, index) => {
        const complaintText = `• ${complaint}`;
        yPos = addText(complaintText, margin + 3, yPos, contentWidth - 6, 9);
        yPos += 2;
        checkPageBreak(20);
      });
      yPos += 5;

      // Key Themes Section
      checkPageBreak(40);
      doc.setFillColor(243, 244, 246); // Light gray
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Key Themes', margin + 3, yPos + 5);
      yPos += 12;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      insights.keyThemes?.slice(0, 4).forEach((theme, index) => {
        checkPageBreak(25);
        const sentimentColor = theme.sentiment === 'positive' ? [34, 197, 94] :
                              theme.sentiment === 'negative' ? [239, 68, 68] : [107, 114, 128];
        doc.setTextColor(...sentimentColor);
        doc.setFont(undefined, 'bold');
        doc.text(`${theme.theme} (${theme.frequency}x)`, margin + 3, yPos);
        yPos += 5;
        doc.setTextColor(75, 85, 99);
        doc.setFont(undefined, 'italic');
        yPos = addText(`"${theme.examples[0]?.substring(0, 120)}..."`, margin + 3, yPos, contentWidth - 6, 8);
        yPos += 4;
      });
      yPos += 5;

      // AI Recommendations Section
      checkPageBreak(40);
      doc.setFillColor(219, 234, 254); // Light blue
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('💡 AI Recommendations', margin + 3, yPos + 5);
      yPos += 12;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      insights.recommendations?.slice(0, 5).forEach((rec, index) => {
        const recText = `${index + 1}. ${rec}`;
        yPos = addText(recText, margin + 3, yPos, contentWidth - 6, 9);
        yPos += 2;
        checkPageBreak(20);
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Generated by Claude AI • Customer Insights Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save the PDF
      doc.save(`customer-insights-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">AI Customer Insights</h2>
              <p className="text-blue-100 text-sm">Powered by Ryan™ </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-gray-300 font-medium mb-2 text-sm">Timeframe</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                {timeframes.map(tf => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-2 text-sm">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Locations</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateInsights}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Generate Insights</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Insights Display */}
          {insights && (
            <div className="space-y-6">
              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={exportInsights}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Report</span>
                </button>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <BarChart3 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white">
                    {insights.totalReviews}
                  </div>
                  <div className="text-sm text-gray-400">Total Reviews</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white flex items-center justify-center gap-1">
                    {getRatingIcon(insights.averageRating)}
                    {insights.averageRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-400">Average Rating</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <ThumbsUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-green-400">
                    {insights.commonPraise?.length || 0}
                  </div>
                  <div className="text-sm text-gray-400">Praise Themes</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <Target className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <div className={`text-3xl font-bold ${getSentimentColor(insights.sentimentScore || 0)}`}>
                    {insights.sentimentScore || 0}
                  </div>
                  <div className="text-sm text-gray-400">Sentiment Score</div>
                </div>
              </div>

              {/* Sentiment Indicator */}
              {insights.sentimentScore !== undefined && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Target className="h-5 w-5 text-purple-400 mr-2" />
                    Overall Customer Sentiment
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${
                          insights.sentimentScore >= 80 ? 'bg-green-500' :
                          insights.sentimentScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${insights.sentimentScore}%` }}
                      ></div>
                    </div>
                    <span className={`text-xl font-bold ${getSentimentColor(insights.sentimentScore)}`}>
                      {getSentimentLabel(insights.sentimentScore)}
                    </span>
                  </div>
                </div>
              )}

              {/* Rating Distribution */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 mr-2" />
                  Rating Distribution
                </h3>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = insights.ratingDistribution[rating] || 0;
                    const percentage = insights.totalReviews > 0 ? (count / insights.totalReviews) * 100 : 0;

                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-300 w-8">{rating}★</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                              rating >= 4 ? 'bg-green-500' :
                              rating >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-400 w-16 text-right">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Praise and Complaints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Common Praise */}
                <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    What Customers Love
                  </h3>
                  <ul className="space-y-2">
                    {insights.commonPraise?.map((praise, index) => (
                      <li key={index} className="text-sm text-gray-200 flex items-start gap-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>{praise}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Common Complaints */}
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                    <ThumbsDown className="h-5 w-5 mr-2" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {insights.commonComplaints?.map((complaint, index) => (
                      <li key={index} className="text-sm text-gray-200 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span>{complaint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Key Themes */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 text-blue-400 mr-2" />
                  Key Themes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.keyThemes?.map((theme, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        theme.sentiment === 'positive' ? 'bg-green-900/20 border-green-700/30' :
                        theme.sentiment === 'negative' ? 'bg-red-900/20 border-red-700/30' :
                        'bg-gray-900/50 border-gray-700/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white text-sm">{theme.theme}</h4>
                        <span className={`px-2 py-1 text-xs rounded font-semibold ${
                          theme.sentiment === 'positive' ? 'bg-green-600 text-white' :
                          theme.sentiment === 'negative' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {theme.frequency}x
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 italic">
                        "{theme.examples?.[0]?.substring(0, 100) || 'No example available'}..."
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  AI-Powered Recommendations
                </h3>
                <ul className="space-y-3">
                  {insights.recommendations?.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-200 flex items-start gap-3">
                      <span className="text-blue-400 text-lg mt-0.5">💡</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Metadata */}
              <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
                Generated on {new Date(insights.generatedAt).toLocaleString()} •
                Timeframe: {timeframes.find(tf => tf.value === selectedTimeframe)?.label} •
                Location: {selectedLocation === 'all' ? 'All Locations' : locations.find(l => l.id === selectedLocation)?.name}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!insights && !loading && (
            <div className="text-center py-16">
              <Sparkles className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Ready to Analyze</h3>
              <p className="text-gray-400 mb-6">
                Select your preferences above and click "Generate Insights" to get AI-powered analysis of your customer reviews.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewInsightsModal;
