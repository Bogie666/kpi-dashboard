"use client";

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Target,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Star,
  Award,
  Zap,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { competitionApi } from '../utils/competitionApi';

const CompetitionAdmin = () => {
  const [competitions, setCompetitions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalParticipants, setTotalParticipants] = useState(0);

  // Manual review entry state
  const [showReviewEntry, setShowReviewEntry] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({
    competitionId: '',
    technicianName: '',
    reviewCount: 0
  });

  // Load competitions from API
  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const result = await competitionApi.getCompetitions();

      if (result.status === 'success') {
        setCompetitions(result.data || []);

        // Calculate total participants across all competitions
        let total = 0;
        for (const comp of result.data || []) {
          try {
            const leaderboard = await competitionApi.getLeaderboard(comp.id);
            if (leaderboard.status === 'success') {
              total += leaderboard.data?.leaderboard?.length || 0;
            }
          } catch (e) {
            console.error('Error loading leaderboard for competition', comp.id, e);
          }
        }
        setTotalParticipants(total);
      } else {
        console.error('Failed to load competitions:', result.message);
      }
    } catch (error) {
      console.error('Error loading competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualReviewSubmit = async (e) => {
    e.preventDefault();

    try {
      const { competitionId, technicianName, reviewCount } = reviewFormData;

      if (!competitionId || !technicianName || reviewCount < 0) {
        alert('Please fill in all fields correctly');
        return;
      }

      // Call the backend API to update the reviews for this technician
      const response = await fetch(
        `https://us-central1-new-dashboard-2025.cloudfunctions.net/competition-api/competitions/${competitionId}/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            technician_name: technicianName,
            review_count: parseInt(reviewCount)
          }),
        }
      );

      const result = await response.json();

      if (result.status === 'success') {
        alert('Review count updated successfully!');
        setReviewFormData({
          competitionId: '',
          technicianName: '',
          reviewCount: 0
        });
        setShowReviewEntry(false);
      } else {
        alert('Failed to update review count: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating review count:', error);
      alert('Error updating review count. Please try again.');
    }
  };

  const CompetitionModal = () => {
    const [formData, setFormData] = useState(() => {
      if (editingCompetition) {
        return {
          name: editingCompetition.name || '',
          startDate: editingCompetition.startDate || '',
          endDate: editingCompetition.endDate || '',
          status: editingCompetition.status || 'draft',
          itemCode: editingCompetition.itemCode || '',
          metrics: editingCompetition.metrics || []
        };
      }
      return {
        name: '',
        startDate: '',
        endDate: '',
        status: 'draft',
        itemCode: 'MUV-7-50DR-12',
        metrics: [
          { name: 'soldFlips', target: 0, current: 0 },
          { name: 'itemsSold', target: 0, current: 0 },
          { name: 'reviews', target: 0, current: 0 }
        ]
      };
    });

    const handleSubmit = async (e) => {
      e.preventDefault();

      try {
        let result;
        if (editingCompetition) {
          result = await competitionApi.updateCompetition(editingCompetition.id, formData);
        } else {
          result = await competitionApi.createCompetition(formData);
        }

        if (result.status === 'success') {
          setShowModal(false);
          setEditingCompetition(null);
          loadCompetitions(); // Reload competitions
        } else {
          alert('Error saving competition: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving competition:', error);
        alert('Error saving competition. Please try again.');
      }
    };

    const updateMetric = (index, field, value) => {
      const newMetrics = [...formData.metrics];
      newMetrics[index][field] = value;
      setFormData({ ...formData, metrics: newMetrics });
    };

    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <Trophy className="h-6 w-6 text-yellow-400 mr-2" />
              {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
            </h3>
            <button
              onClick={() => {
                setShowModal(false);
                setEditingCompetition(null);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Competition Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Competition Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., November Hustle, Q4 Sales Sprint"
                required
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Item Code */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Item Code to Track
                <span className="text-xs text-gray-400 ml-2">(for Items Sold metric)</span>
              </label>
              <input
                type="text"
                value={formData.itemCode}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., MUV-7-50DR-12"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                This code will be used to filter items in the ServiceTitan reports
              </p>
            </div>

            {/* Metrics */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Competition Metrics & Targets
              </label>
              <div className="space-y-3">
                {formData.metrics.map((metric, index) => {
                  const metricLabels = {
                    'soldFlips': 'Sold Flips',
                    'itemsSold': 'Items Sold',
                    'reviews': 'Google Reviews'
                  };

                  return (
                    <div key={index} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white font-medium">
                          {metricLabels[metric.name] || metric.name}
                        </span>
                        {metric.name === 'itemsSold' && formData.itemCode && (
                          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                            Item Code: {formData.itemCode}
                          </span>
                        )}
                      </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Target</label>
                        <input
                          type="number"
                          value={metric.target}
                          onChange={(e) => updateMetric(index, 'target', parseInt(e.target.value))}
                          className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm border border-gray-500 focus:border-blue-500 focus:outline-none"
                          min="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Current Progress</label>
                        <input
                          type="number"
                          value={metric.current}
                          onChange={(e) => updateMetric(index, 'current', parseInt(e.target.value))}
                          className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm border border-gray-500 focus:border-blue-500 focus:outline-none"
                          min="0"
                          readOnly={!editingCompetition}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingCompetition(null);
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{editingCompetition ? 'Update' : 'Create'} Competition</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const CompetitionCard = ({ competition }) => {
    const [expanded, setExpanded] = useState(false);
    const isActive = competition.status === 'active';
    const daysLeft = Math.ceil(
      (new Date(competition.endDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div className={`bg-gray-800 rounded-lg p-6 border-2 ${
        isActive ? 'border-blue-500' : 'border-gray-700'
      } hover:border-blue-400 transition-all`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${
              isActive ? 'bg-blue-600' : 'bg-gray-700'
            }`}>
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{competition.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isActive ? 'bg-green-600 text-green-100' :
                  competition.status === 'completed' ? 'bg-gray-600 text-gray-100' :
                  'bg-yellow-600 text-yellow-100'
                }`}>
                  {competition.status.toUpperCase()}
                </span>
                {isActive && (
                  <span className="text-sm text-gray-400 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {daysLeft} days left
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setEditingCompetition(competition);
                setShowModal(true);
              }}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to delete this competition?')) {
                  try {
                    const result = await competitionApi.deleteCompetition(competition.id);
                    if (result.status === 'success') {
                      loadCompetitions(); // Reload the list
                    } else {
                      alert('Failed to delete competition: ' + result.message);
                    }
                  } catch (error) {
                    console.error('Error deleting competition:', error);
                    alert('Error deleting competition. Please try again.');
                  }
                }
              }}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
          <Calendar className="h-4 w-4" />
          <span>
            {new Date(competition.startDate).toLocaleDateString()} - {new Date(competition.endDate).toLocaleDateString()}
          </span>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {competition.metrics.map((metric, index) => {
            const percentage = (metric.current / metric.target) * 100;
            return (
              <div key={index} className="bg-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">{metric.name}</div>
                <div className="text-lg font-bold text-white mb-1">
                  {metric.current} / {metric.target}
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      percentage >= 100 ? 'bg-green-500' :
                      percentage >= 75 ? 'bg-blue-500' :
                      percentage >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">{percentage.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>

        {/* Participants */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Users className="h-4 w-4" />
            <span>{competition.participants} participants</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1 transition-colors"
          >
            <span>View Leaderboard</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Expanded Leaderboard Preview */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 text-center">
              Leaderboard preview will be implemented with live data
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Trophy className="h-8 w-8 text-yellow-400 mr-3" />
              Competition Management
            </h1>
            <p className="text-gray-400 mt-2">
              Create and manage technician competitions to drive performance
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCompetition(null);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Competition</span>
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100 text-sm">Active Competitions</span>
              <TrendingUp className="h-5 w-5 text-blue-200" />
            </div>
            <div className="text-3xl font-bold text-white">
              {competitions.filter(c => c.status === 'active').length}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-sm">Total Participants</span>
              <Users className="h-5 w-5 text-green-200" />
            </div>
            <div className="text-3xl font-bold text-white">
              {totalParticipants}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100 text-sm">Completed</span>
              <Award className="h-5 w-5 text-purple-200" />
            </div>
            <div className="text-3xl font-bold text-white">
              {competitions.filter(c => c.status === 'completed').length}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Review Entry Section */}
      <div className="mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <Star className="h-6 w-6 text-yellow-400 mr-2" />
                Manual Review Entry
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Manually add Google review counts for technicians
              </p>
            </div>
            <button
              onClick={() => setShowReviewEntry(!showReviewEntry)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showReviewEntry ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
            </button>
          </div>

          {showReviewEntry && (
            <form onSubmit={handleManualReviewSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Competition
                  </label>
                  <select
                    value={reviewFormData.competitionId}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, competitionId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Competition</option>
                    {competitions.filter(c => c.status === 'active').map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Technician Name
                  </label>
                  <input
                    type="text"
                    value={reviewFormData.technicianName}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, technicianName: e.target.value })}
                    placeholder="e.g., John Smith"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Review Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reviewFormData.reviewCount}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, reviewCount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Save className="h-5 w-5" />
                  <span>Update Reviews</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Competitions List */}
      <div className="space-y-4">
        {competitions.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No competitions yet</h3>
            <p className="text-gray-500 mb-4">Create your first competition to get started!</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Create Competition
            </button>
          </div>
        ) : (
          competitions.map(competition => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))
        )}
      </div>

      {/* Modal */}
      <CompetitionModal />
    </div>
  );
};

export default CompetitionAdmin;
