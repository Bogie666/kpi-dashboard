import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, TrendingUp, Calendar, RefreshCw, AlertCircle } from 'lucide-react';

const YtdTrendChart = () => {
  const [trendData, setTrendData] = useState([]);
  const [allYearsData, setAllYearsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showPriorYear, setShowPriorYear] = useState(true);
  const [showAllYears, setShowAllYears] = useState(false);

  // Dynamic year calculation - automatically adjusts each new year
  const currentYear = new Date().getFullYear();
  const priorYear = currentYear - 1;
  const startYear = 2025; // First year with budget data

  // Mock data for development (will be replaced with real API data)
  const mockTrendData = [
    { month: '2025-01', revenue: 1700000, budgetTarget: 1800000, budgetPercent: 94.4, monthName: 'January', isComplete: true },
    { month: '2025-02', revenue: 2100000, budgetTarget: 1900000, budgetPercent: 110.5, monthName: 'February', isComplete: true },
    { month: '2025-03', revenue: 2300000, budgetTarget: 2700000, budgetPercent: 85.2, monthName: 'March', isComplete: true },
    { month: '2025-04', revenue: 3400000, budgetTarget: 3300000, budgetPercent: 103.0, monthName: 'April', isComplete: true },
    { month: '2025-05', revenue: 2400000, budgetTarget: 2400000, budgetPercent: 100.0, monthName: 'May', isComplete: true },
    { month: '2025-06', revenue: 3200000, budgetTarget: 2800000, budgetPercent: 114.3, monthName: 'June', isComplete: true },
    { month: '2025-07', revenue: 3600000, budgetTarget: 3200000, budgetPercent: 112.5, monthName: 'July', isComplete: true },
    { month: '2025-08', revenue: 2800000, budgetTarget: 2600000, budgetPercent: 107.7, monthName: 'August', isComplete: true },
    { month: '2025-09', revenue: 1380000, budgetTarget: 2400000, budgetPercent: 57.5, monthName: 'September', isComplete: false }
  ];

  // Load trend data from API
  const loadTrendData = async () => {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/dashboard_api';

      // Build list of years to fetch (from startYear to current year)
      const yearsToFetch = [];
      for (let year = startYear; year <= currentYear; year++) {
        yearsToFetch.push(year);
      }

      // Fetch all years plus live MTD financial data
      const yearFetches = yearsToFetch.map(year =>
        fetch(`${API_BASE}/financial-trend/${year}`).then(r => r.json())
      );
      const mtdFetch = fetch(`${API_BASE}/financial/mtd`).then(r => r.json());

      const [mtdData, ...yearDataResponses] = await Promise.all([mtdFetch, ...yearFetches]);

      console.log('Live MTD Financial Response:', mtdData);
      yearDataResponses.forEach((data, idx) => {
        console.log(`Year ${yearsToFetch[idx]} API Response:`, data);
      });

      // Calculate live MTD total revenue from financial endpoint
      let liveMtdRevenue = null;
      if (mtdData.status === 'success' && mtdData.data) {
        liveMtdRevenue = mtdData.data.reduce((sum, dept) => sum + (dept.totalRevenue || 0), 0);
        console.log('📊 Live MTD Revenue calculated:', liveMtdRevenue);
      }

      // Build all years continuous data
      const allYearsCombined = [];
      const yearDataMap = {};

      const currentMonth = new Date().getMonth() + 1;

      yearDataResponses.forEach((response, idx) => {
        const year = yearsToFetch[idx];
        if (response.status === 'success' && response.data) {
          yearDataMap[year] = response.data;
          response.data.forEach(item => {
            const isCurrentMonth = item.year === currentYear && item.monthNum === currentMonth;

            // Create a unique key for sorting and display
            // Explicitly set isComplete - only current month should be incomplete
            const monthData = {
              ...item,
              displayMonth: `${item.monthName.substring(0, 3)} ${item.year}`,
              sortKey: item.year * 100 + item.monthNum,
              isCurrentMonth,
              isComplete: !isCurrentMonth
            };

            // Update current month with live MTD if available
            if (isCurrentMonth && liveMtdRevenue !== null) {
              monthData.revenue = liveMtdRevenue;
              monthData.budgetPercent = item.budgetTarget > 0
                ? (liveMtdRevenue / item.budgetTarget) * 100
                : 0;
            }

            allYearsCombined.push(monthData);
          });
        }
      });

      // Sort by date
      allYearsCombined.sort((a, b) => a.sortKey - b.sortKey);
      setAllYearsData(allYearsCombined);
      console.log(`✅ Loaded ${allYearsCombined.length} months of all-years data`);

      // Build current year data with prior year comparison (existing logic)
      const currentYearData = yearDataMap[currentYear];
      const priorYearData = yearDataMap[priorYear];

      if (currentYearData && currentYearData.length > 0) {
        // Create a map of prior year revenue by month number
        const priorYearMap = {};
        if (priorYearData) {
          priorYearData.forEach(item => {
            priorYearMap[item.monthNum] = item.revenue;
          });
        }

        // Merge prior year data into current year data
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const mergedData = currentYearData.map(item => {
          const baseData = {
            ...item,
            priorYearRevenue: priorYearMap[item.monthNum] || null
          };

          // If this is the current month and we have live MTD data, use it
          if (item.monthNum === currentMonth && liveMtdRevenue !== null) {
            const updatedBudgetPercent = item.budgetTarget > 0
              ? (liveMtdRevenue / item.budgetTarget) * 100
              : 0;
            console.log(`📊 Updating ${item.monthName} with live MTD: $${liveMtdRevenue} (was $${item.revenue})`);
            return {
              ...baseData,
              revenue: liveMtdRevenue,
              budgetPercent: updatedBudgetPercent,
              isComplete: false
            };
          }

          return baseData;
        });

        setTrendData(mergedData);
        setLastUpdated(new Date().toLocaleTimeString());
        console.log(`✅ Loaded ${mergedData.length} months of real financial data with prior year comparison and live MTD`);
      } else {
        // Fall back to mock data if no real data available yet
        console.log('No real trend data available, using mock data');
        setTrendData(mockTrendData);
        setLastUpdated('Mock Data');
      }
    } catch (error) {
      console.log('API not available, using mock data:', error);
      // Use mock data when API is not available
      setTrendData(mockTrendData);
      setLastUpdated('Mock Data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrendData();
    // Refresh every 30 minutes
    const interval = setInterval(loadTrendData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const displayYear = data.year || currentYear;
      const yoyChange = data.priorYearRevenue
        ? ((data.revenue - data.priorYearRevenue) / data.priorYearRevenue * 100)
        : null;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{data.monthName} {displayYear}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-blue-400">Revenue:</span>
              <span className="text-white font-medium">${(data.revenue / 1000000).toFixed(3)}M</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-green-400">Target:</span>
              <span className="text-white font-medium">${(data.budgetTarget / 1000000).toFixed(3)}M</span>
            </div>
            {!showAllYears && data.priorYearRevenue && (
              <div className="flex items-center justify-between space-x-4">
                <span className="text-gray-400">{priorYear}:</span>
                <span className="text-gray-300 font-medium">${(data.priorYearRevenue / 1000000).toFixed(3)}M</span>
              </div>
            )}
            <div className="flex items-center justify-between space-x-4">
              <span className="text-orange-400">vs Target:</span>
              <span className={`font-medium ${data.budgetPercent >= 100 ? 'text-green-400' : data.budgetPercent >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                {data.budgetPercent.toFixed(2)}%
              </span>
            </div>
            {!showAllYears && yoyChange !== null && (
              <div className="flex items-center justify-between space-x-4">
                <span className="text-purple-400">vs {priorYear}:</span>
                <span className={`font-medium ${yoyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(2)}%
                </span>
              </div>
            )}
            {!data.isComplete && (
              <div className="text-xs text-gray-400 mt-1">
                * Month-to-date data
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Select the active data set based on toggle
  const activeData = showAllYears ? allYearsData : trendData;

  // Calculate summary statistics
  const completedMonths = activeData.filter(d => d.isComplete);
  const totalRevenue = activeData.reduce((sum, d) => sum + d.revenue, 0);
  const totalBudget = activeData.reduce((sum, d) => sum + d.budgetTarget, 0);
  const avgPerformance = completedMonths.length > 0
    ? completedMonths.reduce((sum, d) => sum + d.budgetPercent, 0) / completedMonths.length
    : 0;

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-300">Loading trend data...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Pulse animation for MTD dot */}
      <style>{`
        @keyframes mtd-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
        .mtd-pulse {
          animation: mtd-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className="bg-gray-800 rounded-lg p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">
            {showAllYears ? 'All-Time Performance Trend' : 'Year-to-Date Performance Trend'}
          </h3>
        </div>
        <div className="flex items-center space-x-4">
          {/* All Years Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <span className="text-sm text-gray-400">All Years</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={showAllYears}
                onChange={(e) => setShowAllYears(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${showAllYears ? 'bg-blue-500' : 'bg-gray-600'}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showAllYears ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>
          </label>
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded ${lastUpdated === 'Mock Data' ? 'bg-orange-400' : 'bg-green-400'}`}></div>
            <span className="text-gray-400">{lastUpdated === 'Mock Data' ? 'Sample Data' : 'Live Data'}</span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated: {lastUpdated}
            </span>
          )}
          <button
            onClick={loadTrendData}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={activeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey={showAllYears ? "displayMonth" : "month"}
            stroke="#9CA3AF"
            fontSize={showAllYears ? 10 : 12}
            angle={showAllYears ? -45 : 0}
            textAnchor={showAllYears ? "end" : "middle"}
            height={showAllYears ? 60 : 30}
            interval={showAllYears ? 2 : 0}
            tickFormatter={(value) => {
              if (showAllYears) {
                return value; // displayMonth is already formatted like "Jan 2024"
              }
              // Handle both 'YYYY-MM' format and full date strings
              let date;
              if (value && value.includes('-')) {
                // If it's YYYY-MM format, add day
                const dateParts = value.split('-');
                if (dateParts.length >= 2) {
                  date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, 1);
                } else {
                  date = new Date(value);
                }
              } else {
                date = new Date(value);
              }

              // Fallback if date is invalid
              if (isNaN(date.getTime())) {
                return value;
              }

              return date.toLocaleDateString('en-US', { month: 'short' });
            }}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000000).toFixed(2)}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Prior Year Revenue Line (Gray, dashed) - render first so it's behind */}
          {/* Only show in YTD mode, not in all-years mode */}
          {!showAllYears && showPriorYear && (
            <Line
              type="monotone"
              dataKey="priorYearRevenue"
              stroke="#6B7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#6B7280', strokeWidth: 1, r: 3 }}
              connectNulls={false}
              name={`${priorYear} Revenue`}
            />
          )}

          {/* Budget Target Line (Green) */}
          <Line
            type="monotone"
            dataKey="budgetTarget"
            stroke="#10B981"
            strokeWidth={3}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
            connectNulls={false}
            name="Budget Target"
          />

          {/* Revenue Line (Blue) */}
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={(props) => {
              const { payload, cx, cy, key, ...circleProps } = props;
              // Remove non-DOM props that shouldn't be spread to circle element
              const { dataKey, value, index, ...validProps } = circleProps;

              return (
                <circle
                  key={key}
                  cx={cx}
                  cy={cy}
                  fill={payload.isComplete ? '#3B82F6' : '#F59E0B'}
                  strokeWidth={2}
                  r={5}
                  opacity={payload.isComplete ? 1 : 0.8}
                  className={!payload.isComplete ? 'mtd-pulse' : ''}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
              );
            }}
            connectNulls={false}
            name="Actual Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-0.5 bg-blue-400"></div>
          <span className="text-gray-400">{showAllYears ? 'Revenue' : `${currentYear} Revenue`}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-0.5 bg-green-400"></div>
          <span className="text-gray-400">Budget Target</span>
        </div>
        {!showAllYears && (
          <button
            onClick={() => setShowPriorYear(!showPriorYear)}
            className={`flex items-center space-x-2 px-2 py-1 rounded transition-colors ${
              showPriorYear ? 'bg-gray-700' : 'bg-gray-800 opacity-50'
            }`}
            title="Toggle prior year comparison"
          >
            <div className="w-4 h-0.5 bg-gray-400" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #9CA3AF 0, #9CA3AF 3px, transparent 3px, transparent 6px)' }}></div>
            <span className="text-gray-400">{priorYear} Revenue</span>
          </button>
        )}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <span className="text-gray-400">Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-orange-400 opacity-80"></div>
          <span className="text-gray-400">Month-to-Date</span>
        </div>
      </div>

      {/* Data Source Info */}
      {lastUpdated === 'Mock Data' && (
        <div className="mt-4 p-3 bg-orange-900 bg-opacity-20 border border-orange-500 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <span className="text-orange-200 text-sm">
              Currently displaying sample data. Real monthly data will appear after tonight's sync at 8 PM.
            </span>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default YtdTrendChart;