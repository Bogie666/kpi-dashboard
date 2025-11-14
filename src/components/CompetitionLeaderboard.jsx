"use client";

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Zap,
  Star,
  Award,
  Target,
  Crown,
  Flame,
  ThumbsUp
} from 'lucide-react';
import { competitionApi, technicianPhotoApi } from '../utils/competitionApi';

const CompetitionLeaderboard = ({ competitionId }) => {
  const [competition, setCompetition] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState({});

  const PHOTO_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/photo_api';

  // Load competition and leaderboard data
  useEffect(() => {
    const loadData = async () => {
      await loadPhotos(); // Load all photos first
      if (competitionId) {
        loadCompetitionData();
      } else {
        loadActiveCompetition();
      }
    };
    loadData();
  }, [competitionId]);

  const loadPhotos = async () => {
    try {
      const response = await fetch(`${PHOTO_API}/technicians`);
      const data = await response.json();
      if (data.status === 'success') {
        const photoMap = {};
        data.data.forEach(tech => {
          photoMap[tech.name.toLowerCase()] = tech.photo_url;
        });
        setPhotos(photoMap);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const loadActiveCompetition = async () => {
    try {
      setLoading(true);

      // Get all competitions
      const result = await competitionApi.getCompetitions();

      if (result.status === 'success' && result.data) {
        // Find the first active competition
        const activeComp = result.data.find(comp => comp.status === 'active');

        if (activeComp) {
          // Load this competition's leaderboard
          const leaderboardResult = await competitionApi.getLeaderboard(activeComp.id);

          if (leaderboardResult.status === 'success') {
            setCompetition(leaderboardResult.data.competition);
            setLeaderboard(leaderboardResult.data.leaderboard || []);
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading active competition:', error);
      setLoading(false);
    }
  };

  const loadCompetitionData = async () => {
    try {
      setLoading(true);

      // Get leaderboard data
      const result = await competitionApi.getLeaderboard(competitionId);

      if (result.status === 'success') {
        setCompetition(result.data.competition);
        setLeaderboard(result.data.leaderboard || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading competition data:', error);
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'from-yellow-500 to-yellow-600';
      case 2: return 'from-gray-400 to-gray-500';
      case 3: return 'from-amber-600 to-amber-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="h-8 w-8 text-yellow-300" />;
      case 2: return <Medal className="h-7 w-7 text-gray-300" />;
      case 3: return <Medal className="h-6 w-6 text-amber-400" />;
      default: return null;
    }
  };

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '🏆';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  const getPrize = (rank) => {
    switch (rank) {
      case 1: return '$500';
      case 2: return '$300';
      case 3: return '$150';
      default: return null;
    }
  };

  const getBadgeInfo = (badge) => {
    const badges = {
      top_performer: { icon: Star, color: 'text-yellow-400', label: 'Top Performer' },
      hot_streak: { icon: Flame, color: 'text-orange-400', label: 'Hot Streak' },
      review_master: { icon: ThumbsUp, color: 'text-blue-400', label: 'Review Master' },
      rising_star: { icon: TrendingUp, color: 'text-green-400', label: 'Rising Star' }
    };
    return badges[badge] || null;
  };

  const LeaderboardCard = ({ tech, index }) => {
    const isTopThree = tech.rank <= 3;
    const rankChanged = tech.rank !== tech.previousRank;
    const rankUp = tech.previousRank > tech.rank;
    const minimumPoints = competition?.minimumToQualify || 25;
    const isQualified = tech.totalPoints >= minimumPoints;

    // Only use special colors for qualified technicians
    const cardColor = isQualified ? getRankColor(tech.rank) : 'from-gray-600 to-gray-700';

    return (
      <div
        className={`relative bg-gradient-to-br ${cardColor} rounded-xl p-6 shadow-xl transform transition-all duration-300 hover:scale-105 ${
          isQualified && tech.rank === 1 ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''
        }`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Rank Badge - only show for qualified technicians */}
        {isQualified && (
          <div className="absolute -top-4 -left-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
              tech.rank === 1 ? 'bg-yellow-500' :
              tech.rank === 2 ? 'bg-gray-400' :
              tech.rank === 3 ? 'bg-amber-600' :
              'bg-gray-700'
            }`}>
              {tech.rank <= 3 ? getRankEmoji(tech.rank) : `#${tech.rank}`}
            </div>
          </div>
        )}

        {/* Rank Change Indicator - only show for qualified technicians */}
        {isQualified && rankChanged && (
          <div className="absolute -top-2 -right-2">
            <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
              rankUp ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {rankUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(tech.rank - tech.previousRank)}</span>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-4">
          {/* Photo */}
          <div className={`flex-shrink-0 ${isTopThree ? 'w-20 h-20' : 'w-16 h-16'}`}>
            {photos[tech.name.toLowerCase()] ? (
              <img
                src={photos[tech.name.toLowerCase()]}
                alt={tech.name}
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className={`w-full h-full rounded-full bg-gray-700 border-4 border-white shadow-lg flex items-center justify-center text-white font-bold ${
                isTopThree ? 'text-2xl' : 'text-xl'
              }`}>
                {tech.name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h3 className={`font-bold text-white ${isTopThree ? 'text-2xl' : 'text-xl'}`}>
                  {tech.name}
                </h3>
                {isQualified && tech.rank === 1 && getRankIcon(tech.rank)}
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <div className="text-white font-bold text-2xl">{tech.totalPoints}</div>
                  {competition && tech.totalPoints >= (competition.minimumToQualify || 25) && (
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      QUALIFIED
                    </div>
                  )}
                </div>
                <div className="text-xs text-white opacity-75">
                  points {competition && `(min: ${competition.minimumToQualify || 25})`}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">{tech.metrics.soldFlips}</div>
                <div className="text-xs text-white opacity-75">Sold Flips</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">{tech.metrics.itemsSold}</div>
                <div className="text-xs text-white opacity-75">Items Sold</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">{tech.metrics.reviews}</div>
                <div className="text-xs text-white opacity-75">Reviews</div>
              </div>
            </div>

            {/* Badges and Streak */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {tech.badges.map(badge => {
                  const badgeInfo = getBadgeInfo(badge);
                  if (!badgeInfo) return null;
                  const BadgeIcon = badgeInfo.icon;
                  return (
                    <div
                      key={badge}
                      className="bg-white bg-opacity-20 rounded-full px-2 py-1 flex items-center space-x-1"
                      title={badgeInfo.label}
                    >
                      <BadgeIcon className={`h-3 w-3 ${badgeInfo.color}`} />
                      <span className="text-xs text-white font-medium">{badgeInfo.label}</span>
                    </div>
                  );
                })}
              </div>
              {tech.streak > 0 && (
                <div className="bg-orange-500 rounded-full px-2 py-1 flex items-center space-x-1">
                  <Flame className="h-3 w-3 text-white" />
                  <span className="text-xs text-white font-bold">{tech.streak} day streak</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4" />
          <div className="text-white text-xl">Loading competition...</div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-center">
          <Trophy className="h-24 w-24 text-gray-600 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">No Active Competitions</h2>
          <p className="text-gray-400 text-lg">Check back soon for upcoming competitions!</p>
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(competition.endDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="hidden sm:block h-12 md:h-16 w-12 md:w-16 text-yellow-400 mr-2 md:mr-4" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white">
              {competition.name}
            </h1>
            <Trophy className="hidden sm:block h-12 md:h-16 w-12 md:w-16 text-yellow-400 ml-2 md:ml-4" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-lg px-6 py-3">
              <div className="text-yellow-400 text-sm font-medium mb-1">Days Remaining</div>
              <div className="text-white text-3xl font-bold">{daysLeft}</div>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-lg px-6 py-3">
              <div className="text-blue-400 text-sm font-medium mb-1">Participants</div>
              <div className="text-white text-3xl font-bold">{leaderboard.length}</div>
            </div>
          </div>

          {/* Competition Metrics */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {competition.metrics.map((metric, index) => (
              <div key={index} className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg px-4 py-2">
                <Target className="h-5 w-5 text-purple-200 inline mr-2" />
                <span className="text-white font-medium text-sm md:text-base">{metric.name}: {metric.target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Podium - Top 3 (only qualified technicians) */}
        <div className="mb-8">
          {(() => {
            // Filter leaderboard to only include technicians who meet the minimum
            const minimumPoints = competition?.minimumToQualify || 25;
            const qualifiedLeaderboard = leaderboard.filter(tech => tech.totalPoints >= minimumPoints);

            // If no one qualifies, show a message
            if (qualifiedLeaderboard.length === 0) {
              return (
                <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-8 text-center border-2 border-dashed border-gray-500">
                  <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white text-2xl font-bold mb-2">No Qualified Leaders Yet</h3>
                  <p className="text-gray-300 text-lg">
                    Reach {minimumPoints} points to appear on the podium and qualify for prizes!
                  </p>
                </div>
              );
            }

            return (
              <div className="flex flex-col md:flex-row md:items-end justify-center gap-4 mb-8">
                {/* 2nd Place */}
                {qualifiedLeaderboard[1] && (
              <div className="w-full md:flex-1 md:max-w-xs mx-auto transform hover:scale-105 transition-transform order-2 md:order-1">
                <div className="bg-gradient-to-br from-gray-400 to-gray-600 rounded-t-2xl p-6 text-center">
                  <div className="text-6xl mb-2">🥈</div>
                  <div className="w-20 h-20 mx-auto mb-3">
                    {photos[qualifiedLeaderboard[1].name.toLowerCase()] ? (
                      <img
                        src={photos[qualifiedLeaderboard[1].name.toLowerCase()]}
                        alt={qualifiedLeaderboard[1].name}
                        className="w-full h-full rounded-full object-cover border-4 border-white"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 border-4 border-white flex items-center justify-center text-white font-bold text-xl">
                        {qualifiedLeaderboard[1].name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">{qualifiedLeaderboard[1].name}</h3>
                  <div className="bg-green-500 text-white px-3 py-1 rounded-lg mb-2 text-lg font-bold shadow-lg">
                    💵 $300
                  </div>
                  <div className="text-white text-3xl font-bold">{qualifiedLeaderboard[1].totalPoints}</div>
                  <div className="text-gray-200 text-sm">points</div>
                  <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold mb-2">
                    ✓ QUALIFIED
                  </div>
                  <div className="flex justify-center gap-2 text-xs text-gray-200 mt-2">
                    <span>Flips: {qualifiedLeaderboard[1].metrics.soldFlips}</span>
                    <span>•</span>
                    <span>Items: {qualifiedLeaderboard[1].metrics.itemsSold}</span>
                    <span>•</span>
                    <span>Reviews: {qualifiedLeaderboard[1].metrics.reviews}</span>
                  </div>
                </div>
                <div className="bg-gray-500 h-24 rounded-b-2xl flex items-center justify-center text-white text-4xl font-bold">
                  2
                </div>
              </div>
            )}

            {/* 1st Place */}
            {qualifiedLeaderboard[0] && (
              <div className="w-full md:flex-1 md:max-w-xs mx-auto transform hover:scale-105 transition-transform order-1 md:order-2">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-t-2xl p-8 text-center relative">
                  <Crown className="h-12 w-12 text-yellow-200 absolute -top-6 left-1/2 transform -translate-x-1/2" />
                  <div className="text-7xl mb-3">🏆</div>
                  <div className="w-24 h-24 mx-auto mb-4">
                    {photos[qualifiedLeaderboard[0].name.toLowerCase()] ? (
                      <img
                        src={photos[qualifiedLeaderboard[0].name.toLowerCase()]}
                        alt={qualifiedLeaderboard[0].name}
                        className="w-full h-full rounded-full object-cover border-4 border-white shadow-xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 border-4 border-white shadow-xl flex items-center justify-center text-white font-bold text-2xl">
                        {qualifiedLeaderboard[0].name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-2xl mb-3">{qualifiedLeaderboard[0].name}</h3>
                  <div className="bg-green-500 text-white px-4 py-2 rounded-lg mb-3 text-2xl font-black shadow-lg">
                    💰 $500 Prize
                  </div>
                  <div className="text-white text-4xl font-bold">{qualifiedLeaderboard[0].totalPoints}</div>
                  <div className="text-yellow-100 text-sm">points</div>
                  <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold mb-2">
                    ✓ QUALIFIED
                  </div>
                  <div className="flex justify-center gap-2 text-xs text-yellow-100 mt-2">
                    <span>Flips: {qualifiedLeaderboard[0].metrics.soldFlips}</span>
                    <span>•</span>
                    <span>Items: {qualifiedLeaderboard[0].metrics.itemsSold}</span>
                    <span>•</span>
                    <span>Reviews: {qualifiedLeaderboard[0].metrics.reviews}</span>
                  </div>
                </div>
                <div className="bg-yellow-500 h-32 rounded-b-2xl flex items-center justify-center text-white text-5xl font-bold">
                  1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {qualifiedLeaderboard[2] && (
              <div className="w-full md:flex-1 md:max-w-xs mx-auto transform hover:scale-105 transition-transform order-3">
                <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-t-2xl p-6 text-center">
                  <div className="text-6xl mb-2">🥉</div>
                  <div className="w-20 h-20 mx-auto mb-3">
                    {photos[qualifiedLeaderboard[2].name.toLowerCase()] ? (
                      <img
                        src={photos[qualifiedLeaderboard[2].name.toLowerCase()]}
                        alt={qualifiedLeaderboard[2].name}
                        className="w-full h-full rounded-full object-cover border-4 border-white"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 border-4 border-white flex items-center justify-center text-white font-bold text-xl">
                        {qualifiedLeaderboard[2].name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">{qualifiedLeaderboard[2].name}</h3>
                  <div className="bg-green-500 text-white px-3 py-1 rounded-lg mb-2 text-lg font-bold shadow-lg">
                    💵 $150
                  </div>
                  <div className="text-white text-3xl font-bold">{qualifiedLeaderboard[2].totalPoints}</div>
                  <div className="text-amber-100 text-sm">points</div>
                  <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold mb-2">
                    ✓ QUALIFIED
                  </div>
                  <div className="flex justify-center gap-2 text-xs text-amber-100 mt-2">
                    <span>Flips: {qualifiedLeaderboard[2].metrics.soldFlips}</span>
                    <span>•</span>
                    <span>Items: {qualifiedLeaderboard[2].metrics.itemsSold}</span>
                    <span>•</span>
                    <span>Reviews: {qualifiedLeaderboard[2].metrics.reviews}</span>
                  </div>
                </div>
                <div className="bg-amber-700 h-20 rounded-b-2xl flex items-center justify-center text-white text-4xl font-bold">
                  3
                </div>
              </div>
            )}
          </div>
            );
          })()}
        </div>

        {/* Rest of Leaderboard */}
        {(() => {
          // Get the minimum points for qualification
          const minimumPoints = competition?.minimumToQualify || 25;
          const qualifiedLeaderboard = leaderboard.filter(tech => tech.totalPoints >= minimumPoints);

          // Get technicians to show in "rest of pack" - everyone not on the podium
          const podiumCount = Math.min(qualifiedLeaderboard.length, 3);
          const restOfPack = leaderboard.slice(podiumCount);

          return restOfPack.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <Award className="h-6 w-6 text-blue-400 mr-2" />
                Rest of the Pack
              </h2>
              {restOfPack.map((tech, index) => (
                <LeaderboardCard key={tech.rank} tech={tech} index={index + podiumCount} />
              ))}
            </div>
          );
        })()}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-lg p-6 inline-block">
            <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-white text-lg font-medium">
              Keep pushing! The race isn't over yet!
            </p>
            <p className="text-gray-300 text-sm mt-2">
              Competition ends: {new Date(competition.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitionLeaderboard;
