import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, TrendingUp, Calendar, RefreshCw, AlertCircle } from 'lucide-react';

const YtdTrendChart = () => {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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
      const response = await fetch(`${API_BASE}/financial-trend/2025`);
      const data = await response.json();
      
      console.log('API Response:', data); // Debug log
      
      if (data.status === 'success' && data.data && data.data.length > 0) {
        // Use real data from API
        setTrendData(data.data);
        setLastUpdated(new Date().toLocaleTimeString());
        console.log(`✅ Loaded ${data.data.length} months of real financial data`);
        console.log('Sample data point:', data.data[0]); // Debug log
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
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{data.monthName} 2025</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-blue-400">Revenue:</span>
              <span className="text-white font-medium">${(data.revenue / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-green-400">Target:</span>
              <span className="text-white font-medium">${(data.budgetTarget / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-orange-400">Performance:</span>
              <span className={`font-medium ${data.budgetPercent >= 100 ? 'text-green-400' : data.budgetPercent >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                {data.budgetPercent.toFixed(1)}%
              </span>
            </div>
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

  // Calculate summary statistics
  const completedMonths = trendData.filter(d => d.isComplete);
  const totalRevenue = trendData.reduce((sum, d) => sum + d.revenue, 0);
  const totalBudget = trendData.reduce((sum, d) => sum + d.budgetTarget, 0);
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
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Year-to-Date Performance Trend</h3>
        </div>
        <div className="flex items-center space-x-4">
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
        <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="month" 
            stroke="#9CA3AF" 
            fontSize={12}
            tickFormatter={(value) => {
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
            tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          
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
                />
              );
            }}
            connectNulls={false}
            name="Actual Revenue"
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-0.5 bg-green-400"></div>
          <span className="text-gray-400">Budget Target</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-0.5 bg-blue-400"></div>
          <span className="text-gray-400">Actual Revenue</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <span className="text-gray-400">Completed Month</span>
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
  );
};

export default YtdTrendChart;