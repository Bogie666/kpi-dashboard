import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, BarChart3, ArrowUp, ArrowDown, AlertCircle, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const RevenueTTMDashboard = ({ ttmData = [], summary = {}, loading = false }) => {
  const [displayData, setDisplayData] = useState([]);
  const [dataSource, setDataSource] = useState('loading');
  const [selectedDepartment, setSelectedDepartment] = useState('total');

  // Department labels mapping
  const departmentLabels = {
    'total': 'Total Revenue',
    'hvac_replacement': 'HVAC Replacement',
    'hvac_service': 'HVAC Service',
    'hvac_maintenance': 'HVAC Maintenance',
    'commercial_hvac': 'Commercial HVAC',
    'plumbing': 'Plumbing',
    'electrical': 'Electrical',
    'tyler': 'Tyler'
  };

  // Sample TTM data as fallback with department breakdown
  const mockTTMData = [
    {
      month: 'Nov 2024',
      monthName: 'Nov',
      year: 2024,
      isComplete: true,
      total: 2100000,
      hvac_replacement: 450000,
      hvac_service: 380000,
      hvac_maintenance: 320000,
      commercial_hvac: 280000,
      plumbing: 350000,
      electrical: 220000,
      tyler: 100000
    },
    {
      month: 'Dec 2024',
      monthName: 'Dec',
      year: 2024,
      isComplete: true,
      total: 1900000,
      hvac_replacement: 400000,
      hvac_service: 350000,
      hvac_maintenance: 280000,
      commercial_hvac: 250000,
      plumbing: 320000,
      electrical: 200000,
      tyler: 100000
    },
    {
      month: 'Jan 2025',
      monthName: 'Jan',
      year: 2025,
      isComplete: true,
      total: 1700000,
      hvac_replacement: 350000,
      hvac_service: 320000,
      hvac_maintenance: 250000,
      commercial_hvac: 220000,
      plumbing: 280000,
      electrical: 180000,
      tyler: 100000
    },
    {
      month: 'Feb 2025',
      monthName: 'Feb',
      year: 2025,
      isComplete: true,
      total: 2100000,
      hvac_replacement: 450000,
      hvac_service: 380000,
      hvac_maintenance: 320000,
      commercial_hvac: 280000,
      plumbing: 350000,
      electrical: 220000,
      tyler: 100000
    },
    {
      month: 'Mar 2025',
      monthName: 'Mar',
      year: 2025,
      isComplete: true,
      total: 2300000,
      hvac_replacement: 500000,
      hvac_service: 410000,
      hvac_maintenance: 350000,
      commercial_hvac: 300000,
      plumbing: 380000,
      electrical: 260000,
      tyler: 100000
    },
    {
      month: 'Apr 2025',
      monthName: 'Apr',
      year: 2025,
      isComplete: true,
      total: 3400000,
      hvac_replacement: 750000,
      hvac_service: 620000,
      hvac_maintenance: 520000,
      commercial_hvac: 450000,
      plumbing: 580000,
      electrical: 380000,
      tyler: 100000
    },
    {
      month: 'May 2025',
      monthName: 'May',
      year: 2025,
      isComplete: true,
      total: 2400000,
      hvac_replacement: 520000,
      hvac_service: 430000,
      hvac_maintenance: 360000,
      commercial_hvac: 310000,
      plumbing: 400000,
      electrical: 280000,
      tyler: 100000
    },
    {
      month: 'Jun 2025',
      monthName: 'Jun',
      year: 2025,
      isComplete: true,
      total: 3200000,
      hvac_replacement: 700000,
      hvac_service: 580000,
      hvac_maintenance: 480000,
      commercial_hvac: 420000,
      plumbing: 540000,
      electrical: 380000,
      tyler: 100000
    },
    {
      month: 'Jul 2025',
      monthName: 'Jul',
      year: 2025,
      isComplete: true,
      total: 3600000,
      hvac_replacement: 800000,
      hvac_service: 650000,
      hvac_maintenance: 550000,
      commercial_hvac: 470000,
      plumbing: 600000,
      electrical: 430000,
      tyler: 100000
    },
    {
      month: 'Aug 2025',
      monthName: 'Aug',
      year: 2025,
      isComplete: true,
      total: 2800000,
      hvac_replacement: 600000,
      hvac_service: 500000,
      hvac_maintenance: 420000,
      commercial_hvac: 360000,
      plumbing: 480000,
      electrical: 340000,
      tyler: 100000
    },
    {
      month: 'Sep 2025',
      monthName: 'Sep',
      year: 2025,
      isComplete: true,
      total: 2400000,
      hvac_replacement: 520000,
      hvac_service: 430000,
      hvac_maintenance: 360000,
      commercial_hvac: 310000,
      plumbing: 400000,
      electrical: 280000,
      tyler: 100000
    },
    {
      month: 'Oct 2025',
      monthName: 'Oct',
      year: 2025,
      isComplete: false,
      total: 3200000,
      hvac_replacement: 700000,
      hvac_service: 580000,
      hvac_maintenance: 480000,
      commercial_hvac: 420000,
      plumbing: 540000,
      electrical: 380000,
      tyler: 100000
    }
  ];

  useEffect(() => {
    if (ttmData && ttmData.length > 0) {
      // Use real data from API
      setDisplayData(ttmData);
      setDataSource('api');
      console.log('✅ Using real TTM data from API:', ttmData.length, 'months');
    } else if (!loading) {
      // Fall back to mock data
      setDisplayData(mockTTMData);
      setDataSource('mock');
      console.log('⚠️ Using mock TTM data (API data not available)');
    }
  }, [ttmData, loading]);

  // Get revenue value for selected department
  const getDepartmentRevenue = (month) => {
    if (selectedDepartment === 'total') {
      return month.total || month.revenue || 0;
    }
    return month[selectedDepartment] || 0;
  };

  // Calculate TTM metrics from actual data for selected department
  const totalTTMRevenue = displayData.reduce((sum, month) => sum + getDepartmentRevenue(month), 0);
  const averageMonthlyRevenue = displayData.length > 0 ? totalTTMRevenue / displayData.length : 0;

  const lastMonthRevenue = displayData.length > 0 ? getDepartmentRevenue(displayData[displayData.length - 1]) : 0;
  const previousMonthRevenue = displayData.length > 1 ? getDepartmentRevenue(displayData[displayData.length - 2]) : 0;
  const monthOverMonthChange = previousMonthRevenue > 0
    ? ((lastMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : 0;

  const highestMonth = displayData.length > 0
    ? displayData.reduce((max, month) => getDepartmentRevenue(month) > getDepartmentRevenue(max) ? month : max, displayData[0])
    : { monthName: 'N/A' };

  const lowestMonth = displayData.length > 0
    ? displayData.reduce((min, month) => getDepartmentRevenue(month) < getDepartmentRevenue(min) ? month : min, displayData[0])
    : { monthName: 'N/A' };

  // Prepare chart data with growth calculations
  const chartData = displayData.map(month => {
    const revenue = getDepartmentRevenue(month);
    const growth = averageMonthlyRevenue > 0
      ? ((revenue - averageMonthlyRevenue) / averageMonthlyRevenue) * 100
      : 0;
    return {
      ...month,
      revenue,
      growth,
      avgMonthly: averageMonthlyRevenue
    };
  });

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{data.monthName || data.month}</p>
          <p className="text-blue-400 text-sm">
            Revenue: {formatCurrency(data.revenue)}
          </p>
          {data.growth !== undefined && (
            <p className="text-gray-400 text-sm">
              vs Avg: {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
            </p>
          )}
          {data.isComplete === false && (
            <p className="text-orange-400 text-xs mt-1">Month-to-Date</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <TrendingUp className="h-7 w-7 text-blue-400 mr-3" />
            Revenue TTM Analysis
          </h2>
          <p className="text-gray-400 text-sm mt-1">Trailing Twelve Months Performance by Department</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Last 12 Months</div>
          <div className="text-sm text-gray-400">
            {displayData.length > 0 && displayData[0].monthName && displayData[displayData.length - 1].monthName
              ? `${displayData[0].monthName} - ${displayData[displayData.length - 1].monthName}`
              : summary.period || 'Loading...'}
          </div>
        </div>
      </div>

      {/* Department Selector */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <label className="text-sm text-gray-400 mb-2 block">Select Department:</label>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {Object.entries(departmentLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedDepartment(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDepartment === key
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 text-center">
          <span className="text-lg font-semibold text-blue-400">
            {departmentLabels[selectedDepartment]}
          </span>
        </div>
      </div>

      {/* Data Source Indicator */}
      {dataSource === 'mock' && (
        <div className="bg-orange-900 bg-opacity-20 border border-orange-500 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <span className="text-orange-200 text-sm">
              Currently displaying sample data. Real TTM data will appear after the monthly sync completes.
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total TTM Revenue */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-sm font-medium">Total TTM Revenue</div>
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(totalTTMRevenue)}
          </div>
          <div className="text-xs text-gray-500">Last 12 months combined</div>
        </div>

        {/* Average Monthly */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-sm font-medium">Avg Monthly Revenue</div>
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(averageMonthlyRevenue)}
          </div>
          <div className="text-xs text-gray-500">Per month average</div>
        </div>

        {/* Last Month Performance */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-sm font-medium">Latest Month</div>
            <Calendar className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(lastMonthRevenue)}
          </div>
          <div className={`flex items-center text-xs ${monthOverMonthChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {monthOverMonthChange >= 0 ? (
              <ArrowUp className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDown className="h-3 w-3 mr-1" />
            )}
            {Math.abs(monthOverMonthChange).toFixed(1)}% vs prior month
          </div>
        </div>

        {/* Highest Month */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-sm font-medium">Peak Month</div>
            <TrendingUp className="h-5 w-5 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(getDepartmentRevenue(highestMonth))}
          </div>
          <div className="text-xs text-gray-500">{highestMonth.monthName || highestMonth.month}</div>
        </div>
      </div>

      {/* Main TTM Trend Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">TTM Revenue Trend</h3>
          <p className="text-gray-400 text-sm">Monthly revenue performance over the last 12 months</p>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="monthName" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={averageMonthlyRevenue} 
              stroke="#F59E0B" 
              strokeDasharray="5 5"
              label={{ 
                value: 'Average', 
                position: 'insideTopRight',
                fill: '#F59E0B',
                fontSize: 12
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={payload.isComplete === false ? '#F59E0B' : '#3B82F6'}
                    opacity={payload.isComplete === false ? 0.8 : 1}
                  />
                );
              }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-blue-400"></div>
            <span className="text-gray-400">Monthly Revenue</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-orange-400 opacity-60"></div>
            <span className="text-gray-400">12-Month Average</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span className="text-gray-400">Complete Month</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-400 opacity-80"></div>
            <span className="text-gray-400">Month-to-Date</span>
          </div>
        </div>
      </div>

      {/* Bar Chart - Growth vs Average */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Monthly Performance vs Average</h3>
          <p className="text-gray-400 text-sm">Percentage variance from 12-month average</p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="monthName" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-semibold mb-1">{data.monthName || data.month}</p>
                      <p className={`text-sm ${data.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.growth >= 0 ? '+' : ''}{data.growth ? data.growth.toFixed(1) : '0.0'}% vs average
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
            <Bar
              dataKey="growth"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              fillOpacity={0.8}
            >
              {chartData.map((entry, index) => (
                <rect
                  key={`bar-${index}`}
                  fill={(entry.growth || 0) >= 0 ? '#10B981' : '#EF4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Statistics Table */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 pb-3 text-sm font-medium">Month</th>
                <th className="text-right text-gray-400 pb-3 text-sm font-medium">Revenue</th>
                <th className="text-right text-gray-400 pb-3 text-sm font-medium">vs Average</th>
                <th className="text-right text-gray-400 pb-3 text-sm font-medium">Growth %</th>
                <th className="text-right text-gray-400 pb-3 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((month, index) => (
                <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="py-3 text-white text-sm">
                    {month.monthName || month.month}
                    {month.isComplete === false && (
                      <span className="ml-2 text-xs text-orange-400">(MTD)</span>
                    )}
                  </td>
                  <td className="py-3 text-right text-white font-semibold text-sm">
                    {formatCurrency(month.revenue)}
                  </td>
                  <td className="py-3 text-right text-gray-300 text-sm">
                    {formatCurrency((month.revenue || 0) - averageMonthlyRevenue)}
                  </td>
                  <td className={`py-3 text-right text-sm font-medium ${
                    (month.growth || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(month.growth || 0) >= 0 ? '+' : ''}{(month.growth || 0).toFixed(1)}%
                  </td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (month.growth || 0) >= 20 ? 'bg-green-900/40 text-green-300' :
                      (month.growth || 0) >= 0 ? 'bg-blue-900/40 text-blue-300' :
                      (month.growth || 0) >= -10 ? 'bg-yellow-900/40 text-yellow-300' :
                      'bg-red-900/40 text-red-300'
                    }`}>
                      {(month.growth || 0) >= 20 ? 'Excellent' :
                       (month.growth || 0) >= 0 ? 'Above Avg' :
                       (month.growth || 0) >= -10 ? 'Below Avg' :
                       'Needs Focus'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-600">
                <td className="py-3 text-white font-bold text-sm">Total / Average</td>
                <td className="py-3 text-right text-white font-bold text-sm">
                  {formatCurrency(totalTTMRevenue)}
                </td>
                <td className="py-3 text-right text-gray-400 text-sm">—</td>
                <td className="py-3 text-right text-gray-400 text-sm">—</td>
                <td className="py-3 text-right">
                  <span className="text-xs text-gray-400">
                    {formatCurrency(averageMonthlyRevenue)}/mo
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Best Month</div>
            <div className="text-white font-semibold">{highestMonth.monthName || highestMonth.month}</div>
            <div className="text-lg text-green-400 font-bold">{formatCurrency(getDepartmentRevenue(highestMonth))}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Lowest Month</div>
            <div className="text-white font-semibold">{lowestMonth.monthName || lowestMonth.month}</div>
            <div className="text-lg text-orange-400 font-bold">{formatCurrency(getDepartmentRevenue(lowestMonth))}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Months Above Average</div>
            <div className="text-white font-semibold">
              {chartData.filter(m => (m.growth || 0) >= 0).length} of {chartData.length} months
            </div>
            <div className="text-lg text-blue-400 font-bold">
              {chartData.length > 0 ? ((chartData.filter(m => (m.growth || 0) >= 0).length / chartData.length) * 100).toFixed(0) : '0'}%
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Revenue Variance</div>
            <div className="text-white font-semibold">High to Low</div>
            <div className="text-lg text-purple-400 font-bold">
              {formatCurrency(getDepartmentRevenue(highestMonth) - getDepartmentRevenue(lowestMonth))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueTTMDashboard;