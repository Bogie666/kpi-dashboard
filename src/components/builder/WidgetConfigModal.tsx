'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Save } from 'lucide-react';
import { WidgetConfig } from './DashboardBuilder';

interface WidgetConfigModalProps {
  widget: WidgetConfig;
  onUpdate: (config: Partial<WidgetConfig>) => void;
  onClose: () => void;
  onDelete: () => void;
}

const DATA_SOURCES = [
  { value: 'comfort_advisor', label: 'Comfort Advisor Performance' },
  { value: 'hvac_technician', label: 'HVAC Technician Performance' },
  { value: 'hvac_maintenance', label: 'HVAC Maintenance Performance' },
  { value: 'plumbing_technician', label: 'Plumbing Performance' },
  { value: 'electrical_technician', label: 'Electrical Performance' },
  { value: 'call_center', label: 'Call Center Performance' },
  { value: 'financial_department', label: 'Department Financials' },
];

const METRICS_BY_SOURCE: Record<string, { value: string; label: string }[]> = {
  comfort_advisor: [
    { value: 'total_sales', label: 'Total Sales' },
    { value: 'close_rate', label: 'Close Rate %' },
    { value: 'completed_jobs', label: 'Completed Jobs' },
    { value: 'avg_ticket', label: 'Average Ticket' },
    { value: 'tgl_sales', label: 'TGL Sales' },
    { value: 'tgl_close_rate', label: 'TGL Close Rate' },
    { value: 'marketing_sales', label: 'Marketing Sales' },
    { value: 'options_per_opportunity', label: 'Options per Opportunity' },
  ],
  hvac_technician: [
    { value: 'revenue', label: 'Revenue' },
    { value: 'jobs_completed', label: 'Jobs Completed' },
    { value: 'conversions', label: 'Conversions' },
    { value: 'memberships_sold', label: 'Memberships Sold' },
    { value: 'leads_set', label: 'Leads Set' },
    { value: 'avg_ticket', label: 'Average Ticket' },
    { value: 'recall_rate', label: 'Recall Rate %' },
  ],
  hvac_maintenance: [
    { value: 'revenue', label: 'Revenue' },
    { value: 'jobs_completed', label: 'Jobs Completed' },
    { value: 'memberships_sold', label: 'Memberships Sold' },
    { value: 'recall_rate', label: 'Recall Rate %' },
  ],
  plumbing_technician: [
    { value: 'revenue', label: 'Revenue' },
    { value: 'jobs_completed', label: 'Jobs Completed' },
    { value: 'conversions', label: 'Conversions' },
    { value: 'memberships_sold', label: 'Memberships Sold' },
    { value: 'leads_set', label: 'Leads Set' },
  ],
  electrical_technician: [
    { value: 'revenue', label: 'Revenue' },
    { value: 'jobs_completed', label: 'Jobs Completed' },
    { value: 'conversions', label: 'Conversions' },
    { value: 'memberships_sold', label: 'Memberships Sold' },
    { value: 'leads_set', label: 'Leads Set' },
  ],
  call_center: [
    { value: 'total_calls', label: 'Total Calls' },
    { value: 'booking_rate', label: 'Booking Rate %' },
    { value: 'booked_calls', label: 'Booked Calls' },
    { value: 'memberships_sold', label: 'Memberships Sold' },
    { value: 'avg_call_duration', label: 'Avg Call Duration' },
    { value: 'lead_calls', label: 'Lead Calls' },
  ],
  financial_department: [
    { value: 'revenue', label: 'Revenue' },
    { value: 'budget_percentage', label: 'Budget %' },
    { value: 'jobs_completed', label: 'Jobs Completed' },
    { value: 'avg_ticket', label: 'Average Ticket' },
  ],
};

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'wtd', label: 'Week to Date' },
  { value: 'mtd', label: 'Month to Date' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_month', label: 'Last Month' },
];

const AGGREGATION_OPTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'count', label: 'Count' },
  { value: 'last', label: 'Last Value' },
];

export default function WidgetConfigModal({
  widget,
  onUpdate,
  onClose,
  onDelete,
}: WidgetConfigModalProps) {
  const [config, setConfig] = useState<WidgetConfig>(widget);
  const [activeTab, setActiveTab] = useState<'data' | 'display' | 'target'>('data');

  useEffect(() => {
    setConfig(widget);
  }, [widget]);

  const handleSave = () => {
    onUpdate(config);
    onClose();
  };

  const updateConfig = (updates: Partial<WidgetConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const updateFilters = (key: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }));
  };

  const updateDisplayOptions = (key: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      displayOptions: { ...prev.displayOptions, [key]: value },
    }));
  };

  const availableMetrics = config.dataSource
    ? METRICS_BY_SOURCE[config.dataSource] || []
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Configure Widget</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {[
            { key: 'data', label: 'Data Source' },
            { key: 'display', label: 'Display Options' },
            { key: 'target', label: 'Target Settings' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'data' | 'display' | 'target')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'data' && (
            <>
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Widget Title
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => updateConfig({ title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Subtitle (optional)
                </label>
                <input
                  type="text"
                  value={config.subtitle || ''}
                  onChange={(e) => updateConfig({ subtitle: e.target.value })}
                  placeholder="e.g., Month to Date"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Data Source */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Data Source
                </label>
                <select
                  value={config.dataSource || ''}
                  onChange={(e) => updateConfig({ dataSource: e.target.value, metric: '' })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select data source...</option>
                  {DATA_SOURCES.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Metric */}
              {config.dataSource && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Metric
                  </label>
                  <select
                    value={config.metric || ''}
                    onChange={(e) => updateConfig({ metric: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select metric...</option>
                    {availableMetrics.map((metric) => (
                      <option key={metric.value} value={metric.value}>
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time Period */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Time Period
                </label>
                <select
                  value={(config.filters?.period_type as string) || 'mtd'}
                  onChange={(e) => updateFilters('period_type', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {PERIOD_OPTIONS.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aggregation */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Aggregation
                </label>
                <select
                  value={config.aggregation || 'sum'}
                  onChange={(e) => updateConfig({ aggregation: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {AGGREGATION_OPTIONS.map((agg) => (
                    <option key={agg.value} value={agg.value}>
                      {agg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group By (for charts/tables) */}
              {['bar_chart', 'pie_chart', 'donut_chart', 'leaderboard', 'data_table'].includes(
                config.type
              ) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Group By
                  </label>
                  <select
                    value={config.groupBy || ''}
                    onChange={(e) => updateConfig({ groupBy: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No grouping</option>
                    <option value="employee_name">Employee</option>
                    <option value="department">Department</option>
                    <option value="category">Category</option>
                  </select>
                </div>
              )}

              {/* Limit */}
              {['leaderboard', 'data_table', 'bar_chart'].includes(config.type) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Limit Results
                  </label>
                  <input
                    type="number"
                    value={config.limit || 10}
                    onChange={(e) => updateConfig({ limit: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={100}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'display' && (
            <>
              {/* Show Trend */}
              {['kpi_card', 'stat_card', 'sparkline'].includes(config.type) && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(config.displayOptions?.showTrend as boolean) ?? true}
                    onChange={(e) => updateDisplayOptions('showTrend', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Show trend indicator</span>
                </label>
              )}

              {/* Show Legend */}
              {['bar_chart', 'line_chart', 'pie_chart', 'donut_chart'].includes(config.type) && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(config.displayOptions?.showLegend as boolean) ?? true}
                    onChange={(e) => updateDisplayOptions('showLegend', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Show legend</span>
                </label>
              )}

              {/* Show Grid */}
              {['bar_chart', 'line_chart', 'area_chart'].includes(config.type) && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(config.displayOptions?.showGrid as boolean) ?? true}
                    onChange={(e) => updateDisplayOptions('showGrid', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Show grid lines</span>
                </label>
              )}

              {/* Show Rank */}
              {config.type === 'leaderboard' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(config.displayOptions?.showRank as boolean) ?? true}
                    onChange={(e) => updateDisplayOptions('showRank', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Show rank numbers</span>
                </label>
              )}

              {/* Show Photo */}
              {config.type === 'leaderboard' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(config.displayOptions?.showPhoto as boolean) ?? true}
                    onChange={(e) => updateDisplayOptions('showPhoto', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">Show employee photos</span>
                </label>
              )}

              {/* Chart Orientation */}
              {config.type === 'bar_chart' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Orientation
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orientation"
                        checked={(config.displayOptions?.orientation as string) === 'vertical'}
                        onChange={() => updateDisplayOptions('orientation', 'vertical')}
                        className="w-4 h-4 border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-slate-300">Vertical</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orientation"
                        checked={(config.displayOptions?.orientation as string) === 'horizontal'}
                        onChange={() => updateDisplayOptions('orientation', 'horizontal')}
                        className="w-4 h-4 border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-slate-300">Horizontal</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Color Theme */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Color Theme
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'blue', color: 'bg-blue-500' },
                    { value: 'green', color: 'bg-green-500' },
                    { value: 'purple', color: 'bg-purple-500' },
                    { value: 'amber', color: 'bg-amber-500' },
                    { value: 'red', color: 'bg-red-500' },
                    { value: 'cyan', color: 'bg-cyan-500' },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => updateDisplayOptions('colorTheme', theme.value)}
                      className={`w-8 h-8 rounded-full ${theme.color} ${
                        config.displayOptions?.colorTheme === theme.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'target' && (
            <>
              {/* Show Target */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showTarget ?? false}
                  onChange={(e) => updateConfig({ showTarget: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-slate-300">Show target comparison</span>
              </label>

              {config.showTarget && (
                <>
                  {/* Target Value */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Target Value
                    </label>
                    <input
                      type="number"
                      value={config.targetValue || ''}
                      onChange={(e) =>
                        updateConfig({ targetValue: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="e.g., 50000"
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Warning/Success Thresholds */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Warning Below %
                      </label>
                      <input
                        type="number"
                        value={(config.displayOptions?.warningThreshold as number) || 80}
                        onChange={(e) =>
                          updateDisplayOptions('warningThreshold', parseInt(e.target.value) || 80)
                        }
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Danger Below %
                      </label>
                      <input
                        type="number"
                        value={(config.displayOptions?.dangerThreshold as number) || 60}
                        onChange={(e) =>
                          updateDisplayOptions('dangerThreshold', parseInt(e.target.value) || 60)
                        }
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Widget
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
