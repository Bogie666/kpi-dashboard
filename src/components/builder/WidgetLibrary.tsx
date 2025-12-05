'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Trophy,
  Gauge,
  Activity,
  Hash,
  Target,
  ArrowLeftRight,
  Circle,
  FileText,
  Image,
  Search,
} from 'lucide-react';
import { WidgetConfig } from './DashboardBuilder';

interface WidgetLibraryProps {
  onAddWidget: (type: string, config: Partial<WidgetConfig>) => void;
}

interface WidgetType {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'metric' | 'chart' | 'table' | 'content';
  defaultConfig: Partial<WidgetConfig>;
}

const WIDGET_TYPES: WidgetType[] = [
  // Metrics
  {
    type: 'kpi_card',
    name: 'KPI Card',
    description: 'Single metric with trend indicator',
    icon: TrendingUp,
    category: 'metric',
    defaultConfig: {
      title: 'KPI Metric',
      displayOptions: { width: 3, height: 2, showTrend: true, showTarget: true },
    },
  },
  {
    type: 'stat_card',
    name: 'Stat Card',
    description: 'Simple statistic display',
    icon: Hash,
    category: 'metric',
    defaultConfig: {
      title: 'Statistic',
      displayOptions: { width: 3, height: 2, showIcon: true },
    },
  },
  {
    type: 'gauge',
    name: 'Gauge',
    description: 'Progress gauge towards target',
    icon: Gauge,
    category: 'metric',
    defaultConfig: {
      title: 'Progress',
      displayOptions: { width: 3, height: 3, min: 0, max: 100 },
    },
  },
  {
    type: 'sparkline',
    name: 'Sparkline Card',
    description: 'Compact metric with inline chart',
    icon: Activity,
    category: 'metric',
    defaultConfig: {
      title: 'Trend Metric',
      displayOptions: { width: 3, height: 2, period: 7 },
    },
  },
  {
    type: 'progress',
    name: 'Progress Bar',
    description: 'Progress towards goal',
    icon: Target,
    category: 'metric',
    defaultConfig: {
      title: 'Goal Progress',
      displayOptions: { width: 4, height: 2, showPercentage: true },
    },
  },
  {
    type: 'comparison',
    name: 'Comparison',
    description: 'Compare two values',
    icon: ArrowLeftRight,
    category: 'metric',
    defaultConfig: {
      title: 'Comparison',
      displayOptions: { width: 4, height: 2, showPercentage: true },
    },
  },

  // Charts
  {
    type: 'bar_chart',
    name: 'Bar Chart',
    description: 'Vertical or horizontal bars',
    icon: BarChart3,
    category: 'chart',
    defaultConfig: {
      title: 'Bar Chart',
      displayOptions: { width: 6, height: 4, orientation: 'vertical' },
    },
  },
  {
    type: 'line_chart',
    name: 'Line Chart',
    description: 'Time series trend line',
    icon: LineChart,
    category: 'chart',
    defaultConfig: {
      title: 'Trend Line',
      displayOptions: { width: 6, height: 4, smooth: true },
    },
  },
  {
    type: 'area_chart',
    name: 'Area Chart',
    description: 'Filled area chart',
    icon: Activity,
    category: 'chart',
    defaultConfig: {
      title: 'Area Chart',
      displayOptions: { width: 6, height: 4, gradient: true },
    },
  },
  {
    type: 'pie_chart',
    name: 'Pie Chart',
    description: 'Proportional breakdown',
    icon: PieChart,
    category: 'chart',
    defaultConfig: {
      title: 'Pie Chart',
      displayOptions: { width: 4, height: 4, showLabels: true },
    },
  },
  {
    type: 'donut_chart',
    name: 'Donut Chart',
    description: 'Donut with center label',
    icon: Circle,
    category: 'chart',
    defaultConfig: {
      title: 'Donut Chart',
      displayOptions: { width: 4, height: 4, showCenter: true },
    },
  },

  // Tables
  {
    type: 'leaderboard',
    name: 'Leaderboard',
    description: 'Ranked list with photos',
    icon: Trophy,
    category: 'table',
    defaultConfig: {
      title: 'Top Performers',
      displayOptions: { width: 6, height: 5, showRank: true, showPhoto: true },
      limit: 10,
      sortOrder: 'desc',
    },
  },
  {
    type: 'data_table',
    name: 'Data Table',
    description: 'Sortable data table',
    icon: Table,
    category: 'table',
    defaultConfig: {
      title: 'Data Table',
      displayOptions: { width: 6, height: 5, sortable: true, pageSize: 10 },
    },
  },

  // Content
  {
    type: 'text',
    name: 'Text Block',
    description: 'Custom text or markdown',
    icon: FileText,
    category: 'content',
    defaultConfig: {
      title: 'Text',
      displayOptions: { width: 4, height: 2, content: 'Enter your text here...' },
    },
  },
  {
    type: 'image',
    name: 'Image',
    description: 'Custom image display',
    icon: Image,
    category: 'content',
    defaultConfig: {
      title: 'Image',
      displayOptions: { width: 4, height: 3, fit: 'contain' },
    },
  },
];

const CATEGORIES = [
  { key: 'metric', label: 'Metrics', description: 'Single value displays' },
  { key: 'chart', label: 'Charts', description: 'Data visualizations' },
  { key: 'table', label: 'Tables', description: 'Data listings' },
  { key: 'content', label: 'Content', description: 'Custom content' },
];

export default function WidgetLibrary({ onAddWidget }: WidgetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredWidgets = WIDGET_TYPES.filter((widget) => {
    const matchesSearch =
      !searchQuery ||
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !activeCategory || widget.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedWidgets = CATEGORIES.map((category) => ({
    ...category,
    widgets: filteredWidgets.filter((w) => w.category === category.key),
  })).filter((group) => group.widgets.length > 0);

  return (
    <div className="p-4 space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search widgets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === null
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(category.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === category.key
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Widget List */}
      <div className="space-y-6">
        {groupedWidgets.map((group) => (
          <div key={group.key}>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.widgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <button
                    key={widget.type}
                    onClick={() => onAddWidget(widget.type, widget.defaultConfig)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 rounded-lg transition-all text-left group"
                  >
                    <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white">{widget.name}</h4>
                      <p className="text-sm text-slate-500 truncate">
                        {widget.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredWidgets.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">No widgets found matching your search.</p>
        </div>
      )}
    </div>
  );
}
