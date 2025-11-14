import React, { useState, useEffect } from 'react';
import { Trophy, Star, Loader } from 'lucide-react';

const TopPerformersDashboard = ({ initialTab = 'comfort_advisor' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState({});
  const [photoData, setPhotoData] = useState({});

  const API_BASE = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/dashboard_api';
  const PHOTO_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/photo_api';

  const departments = [
    { id: 'comfort_advisor', label: 'Comfort Advisors', metric: 'Revenue' },
    { id: 'hvac_tech', label: 'HVAC Tech', metric: 'Revenue' },
    { id: 'hvac_maintenance', label: 'HVAC Maintenance', metric: 'Revenue' },
    { id: 'plumbing', label: 'Plumbing', metric: 'Revenue' },
    { id: 'electrical', label: 'Electrical', metric: 'Revenue' },
    { id: 'call_center', label: 'Call Center', metric: 'Booking Rate' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPerformanceData(),
        loadPhotos()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await fetch(`${PHOTO_API}/technicians`);
      const data = await response.json();
      if (data.status === 'success') {
        const photoMap = {};
        data.data.forEach(tech => {
          photoMap[tech.name.toLowerCase()] = tech.photo_url;
        });
        setPhotoData(photoMap);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const loadPerformanceData = async () => {
    try {
      // Fetch all data sources in parallel
      const [comfortAdvisors, hvacTech, hvacMaintenance, plumbing, electrical, callCenter] = await Promise.all([
        fetch(`${API_BASE}/comfort-advisors/last_month`).then(r => r.json()),
        fetch(`${API_BASE}/hvac-tech/last_month`).then(r => r.json()),
        fetch(`${API_BASE}/hvac-maintenance/last_month`).then(r => r.json()),
        fetch(`${API_BASE}/plumbing/last_month`).then(r => r.json()),
        fetch(`${API_BASE}/electrical/last_month`).then(r => r.json()),
        fetch(`${API_BASE}/call-center/last_month`).then(r => r.json())
      ]);

      console.log('Full Comfort Advisor Response:', comfortAdvisors);
      console.log('Full HVAC Tech Response:', hvacTech);
      console.log('Full HVAC Maintenance Response:', hvacMaintenance);
      console.log('Full Plumbing Response:', plumbing);
      console.log('Full Electrical Response:', electrical);
      console.log('Full Call Center Response:', callCenter);

      setPerformanceData({
        comfort_advisor: comfortAdvisors.data || [],
        hvac_tech: hvacTech.data || [],
        hvac_maintenance: hvacMaintenance.data || [],
        plumbing: plumbing.data || [],
        electrical: electrical.data || [],
        call_center: callCenter.data || []
      });
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  };

  const getTopPerformers = (department) => {
    let data = [];
    let sortFunction;

    if (department === 'comfort_advisor') {
      data = performanceData.comfort_advisor || [];
      console.log('Comfort Advisor raw data:', data[0]); // Debug log
      sortFunction = (a, b) => (b.sales || 0) - (a.sales || 0);
    } else if (department === 'call_center') {
      data = performanceData.call_center || [];
      console.log('Call Center raw data:', data[0]); // Debug log
      sortFunction = (a, b) => {
        const bookingDiff = (b.bookingPercent || 0) - (a.bookingPercent || 0);
        if (Math.abs(bookingDiff) > 0.01) return bookingDiff;
        return (b.coolClubMemberships || 0) - (a.coolClubMemberships || 0);
      };
    } else if (department === 'hvac_tech') {
      // UPDATED: Use hvac_tech data directly - no filtering
      data = performanceData.hvac_tech || [];
      sortFunction = (a, b) => (b.totalSales || 0) - (a.totalSales || 0);
    } else if (department === 'hvac_maintenance') {
      // UPDATED: Use hvac_maintenance data directly - no filtering
      data = performanceData.hvac_maintenance || [];
      sortFunction = (a, b) => (b.totalSales || 0) - (a.totalSales || 0);
    } else if (department === 'plumbing') {
      // NEW: Use dedicated plumbing endpoint data
      data = performanceData.plumbing || [];
      sortFunction = (a, b) => (b.totalSales || 0) - (a.totalSales || 0);
    } else if (department === 'electrical') {
      // NEW: Use dedicated electrical endpoint data
      data = performanceData.electrical || [];
      sortFunction = (a, b) => (b.totalSales || 0) - (a.totalSales || 0);
    }

    const sorted = [...data].sort(sortFunction);
    const top3 = sorted.slice(0, 3);

    console.log(`Department: ${department}, Top 3 count: ${top3.length}`);
    console.log('Top 3 raw data:', top3);

    return top3.map((performer, index) => {
      try {
        const name = performer.name || performer.employee_name || performer.employeeName || 'Unknown';
        const photoUrl = photoData[name.toLowerCase()] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
        
        console.log(`Processing performer: ${name}`, performer);
        
        let metrics = {};
        if (department === 'comfort_advisor') {
          metrics = {
            revenue: `${(performer.sales || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            closeRate: `${(performer.closingPercent || 0).toFixed(1)}%`,
            jobs: performer.jobs || 0
          };
        } else if (department === 'call_center') {
          metrics = {
            bookingRate: `${(performer.bookingPercent || 0).toFixed(1)}%`,
            memberships: performer.coolClubMemberships || 0,
            calls: performer.totalCalls || 0
          };
        } else {
          metrics = {
            revenue: `${((performer.totalSales || performer.totalJobTotal || performer.total_job_total || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            closeRate: `${(performer.closeRatePercent || performer.closeRate || performer.close_rate || 0).toFixed(1)}%`,
            jobs: performer.completedJobs || performer.completed_jobs || 0
          };
        }

        return {
          rank: index + 1,
          name,
          photo: photoUrl,
          metrics
        };
      } catch (error) {
        console.error('Error processing performer:', error);
        return null;
      }
    }).filter(Boolean);
  };

  const getRankColor = (rank) => {
    switch(rank) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-amber-600 to-amber-800';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  const getPodiumHeight = (rank) => {
    switch(rank) {
      case 1: return 'h-64';
      case 2: return 'h-48';
      case 3: return 'h-40';
      default: return 'h-32';
    }
  };

  const getMedalEmoji = (rank) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const performers = getTopPerformers(activeTab);
  const currentDept = departments.find(d => d.id === activeTab);

  // Reorder for podium display on desktop: 2nd, 1st, 3rd
  // On mobile, keep natural order: 1st, 2nd, 3rd
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const podiumOrder = isMobile
  ? performers
  : performers.length >= 3
    ? [performers[1], performers[0], performers[2]]
    : performers.length === 2
    ? [performers[1], performers[0]]
    : performers;

// Define isDisplayMode ONCE here
const isDisplayMode = typeof window !== 'undefined' && 
  window.location.search.includes('display=true');

if (loading) {
  // REMOVE the duplicate isDisplayMode definition from here
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <Loader className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-4" />
        <p className="text-gray-300 text-xl">Loading Top Performers...</p>
      </div>
    </div>
  );
}

return (
  <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-4 md:p-8 ${isDisplayMode ? 'tv-display' : ''}`}>
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-4">
          <Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" />
          <h1 className="text-2xl md:text-4xl font-bold text-white">Top Performers</h1>
          <Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" />
        </div>
        <p className="text-base md:text-xl text-gray-300">Last Month's Champions</p>
      </div>

      {/* Department Tabs - Hide in display mode */}
      {!isDisplayMode && (
        <div className="flex flex-wrap justify-center gap-2 mb-6 md:mb-8">
          {departments.map(dept => (
            <button
              key={dept.id}
              onClick={() => setActiveTab(dept.id)}
              className={`px-3 py-2 md:px-6 md:py-3 rounded-lg font-medium text-xs md:text-base transition-all ${
                activeTab === dept.id
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>
      )}

        {/* Podium */}
        {performers.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <Trophy className="h-12 w-12 md:h-16 md:w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg md:text-xl">No performance data available for this department</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 mb-6 md:mb-8">
            {podiumOrder.map((performer) => (
              <div key={performer.rank} className="flex flex-col items-center w-full md:w-auto">
                {/* Card above podium */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 md:p-6 mb-4 transform hover:scale-105 transition-transform duration-300 w-full md:w-72">
                  {/* Medal */}
                  <div className="text-3xl md:text-5xl text-center mb-3 md:mb-4">
                    {getMedalEmoji(performer.rank)}
                  </div>
                  
                  {/* Photo */}
                  <div className="relative mb-3 md:mb-4">
                    <div className={`w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full bg-gradient-to-br ${getRankColor(performer.rank)} p-1`}>
                      <img 
                        src={performer.photo}
                        alt={performer.name}
                        className="w-full h-full rounded-full bg-white object-cover"
                      />
                    </div>
                    {performer.rank === 1 && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2">
                        <Star className="w-4 h-4 md:w-6 md:h-6 text-yellow-700 fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg md:text-xl font-bold text-center text-white mb-3 md:mb-4">
                    {performer.name}
                  </h3>

                  {/* Metrics */}
                  <div className="space-y-2">
                    {activeTab === 'call_center' ? (
                      <>
                        <div className="flex justify-between items-center px-3 py-2 bg-blue-900/30 border border-blue-800/50 rounded-lg">
                          <span className="text-xs md:text-sm text-gray-300">Booking Rate</span>
                          <span className="font-bold text-blue-400 text-sm md:text-base">{performer.metrics.bookingRate}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-purple-900/30 border border-purple-800/50 rounded-lg">
                          <span className="text-xs md:text-sm text-gray-300">Memberships</span>
                          <span className="font-bold text-purple-400 text-sm md:text-base">{performer.metrics.memberships}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-green-900/30 border border-green-800/50 rounded-lg">
                          <span className="text-xs md:text-sm text-gray-300">Total Calls</span>
                          <span className="font-bold text-green-400 text-sm md:text-base">{performer.metrics.calls}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center px-3 py-2 bg-green-900/30 border border-green-800/50 rounded-lg">
                          <span className="text-xs md:text-sm text-gray-300">Revenue</span>
                          <span className="font-bold text-green-400 text-sm md:text-base">${performer.metrics.revenue}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-blue-900/30 border border-blue-800/50 rounded-lg">
                          <span className="text-xs md:text-sm text-gray-300">Close Rate</span>
                          <span className="font-bold text-blue-400 text-sm md:text-base">{performer.metrics.closeRate}</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-purple-900/30 border border-purple-800/50 rounded-lg">
                          <span className="text-xs md:text-sm text-gray-300">Jobs</span>
                          <span className="font-bold text-purple-400 text-sm md:text-base">{performer.metrics.jobs}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Podium base - hidden on mobile, shown on desktop */}
                <div className={`hidden md:flex w-40 ${getPodiumHeight(performer.rank)} bg-gradient-to-br ${getRankColor(performer.rank)} rounded-t-xl shadow-lg items-center justify-center`}>
                  <span className="text-6xl font-bold text-white opacity-30">
                    {performer.rank}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-400 text-xs md:text-sm mt-6 md:mt-8">
          {currentDept && `${currentDept.label} ranked by ${currentDept.metric}`}
        </div>
      </div>
    </div>
  );
};

export default TopPerformersDashboard;
