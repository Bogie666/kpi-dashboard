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

  // Load competition and leaderboard data
  useEffect(() => {
    if (competitionId) {
      loadCompetitionData();
    } else {
      // If no competitionId provided, fetch the active competition
      loadActiveCompetition();
    }
  }, [competitionId]);

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
            const leaderboardData = leaderboardResult.data.leaderboard || [];

            // Load photos for all technicians
            const photoPromises = leaderboardData.map(async (tech) => {
              const photoUrl = await technicianPhotoApi.getPhotoByName(tech.name);
              return { techId: tech.id, photoUrl };
            });

            const photoResults = await Promise.all(photoPromises);
            const photoMap = {};
            photoResults.forEach(({ techId, photoUrl }) => {
              if (photoUrl) photoMap[techId] = photoUrl;
            });

            setPhotos(photoMap);
            setLeaderboard(leaderboardData);
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
        const leaderboardData = result.data.leaderboard || [];

        // Load photos for all technicians
        const photoPromises = leaderboardData.map(async (tech) => {
          const photoUrl = await technicianPhotoApi.getPhotoByName(tech.name);
          return { techId: tech.id, photoUrl };
        });

        const photoResults = await Promise.all(photoPromises);
        const photoMap = {};
        photoResults.forEach(({ techId, photoUrl }) => {
          if (photoUrl) photoMap[techId] = photoUrl;
        });

        setPhotos(photoMap);
        setLeaderboard(leaderboardData);
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

    return (
      <div
        className={`relative bg-gradient-to-br ${getRankColor(tech.rank)} rounded-xl p-6 shadow-xl transform transition-all duration-300 hover:scale-105 ${
          tech.rank === 1 ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''
        }`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Rank Badge */}
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

        {/* Rank Change Indicator */}
        {rankChanged && (
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
            {(tech.photo || photos[tech.id]) ? (
              <img
                src={tech.photo || photos[tech.id]}
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
                {tech.rank === 1 && getRankIcon(tech.rank)}
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-2xl">{tech.totalPoints}</div>
                <div className="text-xs text-white opacity-75">points</div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">{tech.metrics.soldFlips}</div>
                <div className="text-xs text-white opacity-75">Sold Flips</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
                <div className="text-white font-bold text-lg">{tech.metrics.uvLights}</div>
                <div className="text-xs text-white opacity-75">UV Lights</div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-400 mr-4" />
            <h1 className="text-5xl md:text-6xl font-black text-white">
              {competition.name}
            </h1>
            <Trophy className="h-16 w-16 text-yellow-400 ml-4" />
          </div>

          <div className="flex items-center justify-center space-x-8 mb-6">
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
          <div className="flex items-center justify-center space-x-4">
            {competition.metrics.map((metric, index) => (
              <div key={index} className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg px-4 py-2">
                <Target className="h-5 w-5 text-purple-200 inline mr-2" />
                <span className="text-white font-medium">{metric.name}: {metric.target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Podium - Top 3 */}
        <div className="mb-8">
          <div className="flex items-end justify-center gap-4 mb-8">
            {/* 2nd Place */}
            {leaderboard[1] && (
              <div className="flex-1 max-w-xs transform hover:scale-105 transition-transform">
                <div className="bg-gradient-to-br from-gray-400 to-gray-600 rounded-t-2xl p-6 text-center">
                  <div className="text-6xl mb-2">🥈</div>
                  <div className="w-20 h-20 mx-auto mb-3">
                    {(leaderboard[1].photo || photos[leaderboard[1].id]) ? (
                      <img
                        src={leaderboard[1].photo || photos[leaderboard[1].id]}
                        alt={leaderboard[1].name}
                        className="w-full h-full rounded-full object-cover border-4 border-white"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 border-4 border-white flex items-center justify-center text-white font-bold text-xl">
                        {leaderboard[1].name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">{leaderboard[1].name}</h3>
                  <div className="bg-green-500 text-white px-3 py-1 rounded-lg mb-2 text-lg font-bold shadow-lg">
                    💵 $300
                  </div>
                  <div className="text-white text-3xl font-bold">{leaderboard[1].totalPoints}</div>
                  <div className="text-gray-200 text-sm">points</div>
                </div>
                <div className="bg-gray-500 h-24 rounded-b-2xl flex items-center justify-center text-white text-4xl font-bold">
                  2
                </div>
              </div>
            )}

            {/* 1st Place */}
            {leaderboard[0] && (
              <div className="flex-1 max-w-xs transform hover:scale-105 transition-transform">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-t-2xl p-8 text-center relative">
                  <Crown className="h-12 w-12 text-yellow-200 absolute -top-6 left-1/2 transform -translate-x-1/2" />
                  <div className="text-7xl mb-3">🏆</div>
                  <div className="w-24 h-24 mx-auto mb-4">
                    {(leaderboard[0].photo || photos[leaderboard[0].id]) ? (
                      <img
                        src={leaderboard[0].photo || photos[leaderboard[0].id]}
                        alt={leaderboard[0].name}
                        className="w-full h-full rounded-full object-cover border-4 border-white shadow-xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 border-4 border-white shadow-xl flex items-center justify-center text-white font-bold text-2xl">
                        {leaderboard[0].name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-2xl mb-3">{leaderboard[0].name}</h3>
                  <div className="bg-green-500 text-white px-4 py-2 rounded-lg mb-3 text-2xl font-black shadow-lg">
                    💰 $500 Prize
                  </div>
                  <div className="text-white text-4xl font-bold">{leaderboard[0].totalPoints}</div>
                  <div className="text-yellow-100 text-sm">points</div>
                </div>
                <div className="bg-yellow-500 h-32 rounded-b-2xl flex items-center justify-center text-white text-5xl font-bold">
                  1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {leaderboard[2] && (
              <div className="flex-1 max-w-xs transform hover:scale-105 transition-transform">
                <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-t-2xl p-6 text-center">
                  <div className="text-6xl mb-2">🥉</div>
                  <div className="w-20 h-20 mx-auto mb-3">
                    {(leaderboard[2].photo || photos[leaderboard[2].id]) ? (
                      <img
                        src={leaderboard[2].photo || photos[leaderboard[2].id]}
                        alt={leaderboard[2].name}
                        className="w-full h-full rounded-full object-cover border-4 border-white"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 border-4 border-white flex items-center justify-center text-white font-bold text-xl">
                        {leaderboard[2].name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">{leaderboard[2].name}</h3>
                  <div className="bg-green-500 text-white px-3 py-1 rounded-lg mb-2 text-lg font-bold shadow-lg">
                    💵 $150
                  </div>
                  <div className="text-white text-3xl font-bold">{leaderboard[2].totalPoints}</div>
                  <div className="text-amber-100 text-sm">points</div>
                </div>
                <div className="bg-amber-700 h-20 rounded-b-2xl flex items-center justify-center text-white text-4xl font-bold">
                  3
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rest of Leaderboard */}
        {leaderboard.length > 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <Award className="h-6 w-6 text-blue-400 mr-2" />
              Rest of the Pack
            </h2>
            {leaderboard.slice(3).map((tech, index) => (
              <LeaderboardCard key={tech.rank} tech={tech} index={index + 3} />
            ))}
          </div>
        )}

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
