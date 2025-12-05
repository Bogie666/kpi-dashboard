'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { WidgetConfig } from './DashboardBuilder';

interface WidgetRendererProps {
  widget: WidgetConfig;
  isPreview?: boolean;
  data?: unknown;
}

// Mock data for preview - in production this would come from the API
const getMockData = (widget: WidgetConfig) => {
  const type = widget.type;
  const metric = widget.metric;

  // KPI values
  if (type === 'kpi_card' || type === 'stat_card' || type === 'sparkline') {
    const values: Record<string, { value: number; change: number; format: string }> = {
      total_sales: { value: 125450, change: 12.5, format: 'currency' },
      close_rate: { value: 78.5, change: 3.2, format: 'percentage' },
      completed_jobs: { value: 47, change: 5, format: 'number' },
      avg_ticket: { value: 2850, change: -2.1, format: 'currency' },
      revenue: { value: 285000, change: 8.7, format: 'currency' },
      jobs_completed: { value: 156, change: 12, format: 'number' },
      total_calls: { value: 342, change: 15, format: 'number' },
      booking_rate: { value: 82.3, change: 4.1, format: 'percentage' },
      memberships_sold: { value: 23, change: 8, format: 'number' },
    };
    return values[metric || 'total_sales'] || values.total_sales;
  }

  // Chart data
  if (type === 'bar_chart' || type === 'line_chart' || type === 'area_chart') {
    return [
      { name: 'John S.', value: 45000 },
      { name: 'Mike R.', value: 42000 },
      { name: 'Sarah T.', value: 38000 },
      { name: 'David L.', value: 35000 },
      { name: 'Lisa M.', value: 32000 },
    ];
  }

  // Pie chart data
  if (type === 'pie_chart' || type === 'donut_chart') {
    return [
      { name: 'HVAC', value: 45 },
      { name: 'Plumbing', value: 30 },
      { name: 'Electrical', value: 25 },
    ];
  }

  // Leaderboard data
  if (type === 'leaderboard' || type === 'data_table') {
    return [
      { rank: 1, name: 'John Smith', value: 45000, photo: null },
      { rank: 2, name: 'Mike Rodriguez', value: 42000, photo: null },
      { rank: 3, name: 'Sarah Thompson', value: 38000, photo: null },
      { rank: 4, name: 'David Lee', value: 35000, photo: null },
      { rank: 5, name: 'Lisa Martinez', value: 32000, photo: null },
    ];
  }

  // Gauge data
  if (type === 'gauge' || type === 'progress') {
    return { value: 75, target: 100 };
  }

  return null;
};

const formatValue = (value: number, format: string) => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
};

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function WidgetRenderer({ widget }: WidgetRendererProps) {
  const mockData = getMockData(widget);
  const colorTheme = (widget.displayOptions?.colorTheme as string) || 'blue';

  const themeColors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    amber: '#f59e0b',
    red: '#ef4444',
    cyan: '#06b6d4',
  };

  const primaryColor = themeColors[colorTheme] || themeColors.blue;

  // KPI Card
  if (widget.type === 'kpi_card' || widget.type === 'stat_card') {
    const data = mockData as { value: number; change: number; format: string };
    const isPositive = data.change >= 0;

    return (
      <div className="h-full flex flex-col justify-center p-4">
        <p className="text-sm text-slate-400 mb-1">{widget.title}</p>
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-white">
            {formatValue(data.value, data.format)}
          </span>
          {widget.displayOptions?.showTrend !== false && (
            <div
              className={`flex items-center gap-1 text-sm ${
                isPositive ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(data.change)}%</span>
            </div>
          )}
        </div>
        {widget.subtitle && (
          <p className="text-xs text-slate-500 mt-2">{widget.subtitle}</p>
        )}
      </div>
    );
  }

  // Bar Chart
  if (widget.type === 'bar_chart') {
    const data = mockData as { name: string; value: number }[];
    const isHorizontal = widget.displayOptions?.orientation === 'horizontal';

    return (
      <div className="h-full p-4">
        <p className="text-sm font-medium text-white mb-3">{widget.title}</p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart
            data={data}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            {widget.displayOptions?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            )}
            {isHorizontal ? (
              <>
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={80} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Line Chart
  if (widget.type === 'line_chart') {
    const data = mockData as { name: string; value: number }[];

    return (
      <div className="h-full p-4">
        <p className="text-sm font-medium text-white mb-3">{widget.title}</p>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            {widget.displayOptions?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            )}
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={primaryColor}
              strokeWidth={2}
              dot={{ fill: primaryColor, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Area Chart
  if (widget.type === 'area_chart') {
    const data = mockData as { name: string; value: number }[];

    return (
      <div className="h-full p-4">
        <p className="text-sm font-medium text-white mb-3">{widget.title}</p>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            {widget.displayOptions?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            )}
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />
            <defs>
              <linearGradient id={`gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={primaryColor}
              fill={`url(#gradient-${widget.id})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Pie Chart
  if (widget.type === 'pie_chart' || widget.type === 'donut_chart') {
    const data = mockData as { name: string; value: number }[];
    const isDonut = widget.type === 'donut_chart';

    return (
      <div className="h-full p-4">
        <p className="text-sm font-medium text-white mb-3">{widget.title}</p>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={isDonut ? '60%' : 0}
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              label={widget.displayOptions?.showLabels !== false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {widget.displayOptions?.showLegend !== false && (
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-slate-300">{value}</span>}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Leaderboard
  if (widget.type === 'leaderboard') {
    const data = mockData as { rank: number; name: string; value: number; photo: string | null }[];

    return (
      <div className="h-full p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <p className="text-sm font-medium text-white">{widget.title}</p>
        </div>
        <div className="space-y-2">
          {data.slice(0, widget.limit || 10).map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50"
            >
              {widget.displayOptions?.showRank !== false && (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0
                      ? 'bg-amber-500/20 text-amber-400'
                      : index === 1
                        ? 'bg-slate-400/20 text-slate-300'
                        : index === 2
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {item.rank}
                </div>
              )}
              {widget.displayOptions?.showPhoto !== false && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
              </div>
              <p className="text-sm font-bold text-white">
                {formatValue(item.value, 'currency')}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Data Table
  if (widget.type === 'data_table') {
    const data = mockData as { rank: number; name: string; value: number }[];

    return (
      <div className="h-full p-4 overflow-auto">
        <p className="text-sm font-medium text-white mb-3">{widget.title}</p>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs font-medium text-slate-400 py-2">#</th>
              <th className="text-left text-xs font-medium text-slate-400 py-2">Name</th>
              <th className="text-right text-xs font-medium text-slate-400 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border-b border-slate-800">
                <td className="py-2 text-sm text-slate-500">{item.rank}</td>
                <td className="py-2 text-sm text-white">{item.name}</td>
                <td className="py-2 text-sm text-white text-right">
                  {formatValue(item.value, 'currency')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Gauge / Progress
  if (widget.type === 'gauge' || widget.type === 'progress') {
    const data = mockData as { value: number; target: number };
    const percentage = Math.min(100, (data.value / data.target) * 100);

    if (widget.type === 'progress') {
      return (
        <div className="h-full flex flex-col justify-center p-4">
          <p className="text-sm text-slate-400 mb-2">{widget.title}</p>
          <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                backgroundColor: primaryColor,
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-white font-medium">{data.value}</span>
            <span className="text-sm text-slate-400">/ {data.target}</span>
          </div>
        </div>
      );
    }

    // Gauge (circular)
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <p className="text-sm text-slate-400 mb-4">{widget.title}</p>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#374151"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke={primaryColor}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 3.52} 352`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Text Block
  if (widget.type === 'text') {
    return (
      <div className="h-full p-4">
        <p className="text-sm font-medium text-white mb-2">{widget.title}</p>
        <p className="text-slate-300">
          {(widget.displayOptions?.content as string) || 'Enter your text...'}
        </p>
      </div>
    );
  }

  // Image
  if (widget.type === 'image') {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-slate-900/50">
        <p className="text-slate-500">Image placeholder</p>
      </div>
    );
  }

  // Fallback
  return (
    <div className="h-full flex items-center justify-center p-4">
      <p className="text-slate-500">Unknown widget type: {widget.type}</p>
    </div>
  );
}
