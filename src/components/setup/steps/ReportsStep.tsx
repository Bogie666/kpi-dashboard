'use client';

import React from 'react';
import {
  Wrench,
  Phone,
  DollarSign,
  Users,
  Droplets,
  Zap,
  ClipboardCheck,
  Check,
} from 'lucide-react';
import { SetupData } from '../SetupWizard';

interface ReportsStepProps {
  data: SetupData;
  onChange: (data: Partial<SetupData>) => void;
}

const AVAILABLE_REPORTS = [
  {
    id: 'comfort_advisor',
    name: 'Comfort Advisor',
    description: 'Sales advisor performance, close rates, and TGL metrics',
    icon: Users,
    category: 'sales',
    metrics: ['Total Sales', 'Close Rate', 'Average Ticket', 'TGL Performance'],
  },
  {
    id: 'hvac_technician',
    name: 'HVAC Technician',
    description: 'HVAC tech revenue, jobs, and conversion metrics',
    icon: Wrench,
    category: 'hvac',
    metrics: ['Revenue', 'Jobs Completed', 'Conversions', 'Memberships'],
  },
  {
    id: 'hvac_maintenance',
    name: 'HVAC Maintenance',
    description: 'Maintenance technician performance tracking',
    icon: ClipboardCheck,
    category: 'hvac',
    metrics: ['Jobs', 'Revenue', 'Memberships', 'Recall Rate'],
  },
  {
    id: 'plumbing_technician',
    name: 'Plumbing',
    description: 'Plumbing department performance metrics',
    icon: Droplets,
    category: 'plumbing',
    metrics: ['Revenue', 'Jobs', 'Conversions', 'Leads Set'],
  },
  {
    id: 'electrical_technician',
    name: 'Electrical',
    description: 'Electrical department performance metrics',
    icon: Zap,
    category: 'electrical',
    metrics: ['Revenue', 'Jobs', 'Conversions', 'Leads Set'],
  },
  {
    id: 'call_center',
    name: 'Call Center',
    description: 'CSR call metrics, booking rates, and memberships',
    icon: Phone,
    category: 'call_center',
    metrics: ['Total Calls', 'Booking Rate', 'Memberships Sold', 'Avg Duration'],
  },
  {
    id: 'financial_department',
    name: 'Department Financials',
    description: 'Revenue and budget tracking by department',
    icon: DollarSign,
    category: 'financial',
    metrics: ['Revenue', 'Budget %', 'Jobs Completed', 'Average Ticket'],
  },
];

export default function ReportsStep({ data, onChange }: ReportsStepProps) {
  const toggleReport = (reportId: string) => {
    const current = data.selectedReports;
    const updated = current.includes(reportId)
      ? current.filter((id) => id !== reportId)
      : [...current, reportId];
    onChange({ selectedReports: updated });
  };

  const selectAll = () => {
    onChange({ selectedReports: AVAILABLE_REPORTS.map((r) => r.id) });
  };

  const selectNone = () => {
    onChange({ selectedReports: [] });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Select Your Reports
        </h2>
        <p className="text-slate-400">
          Choose which ServiceTitan reports to sync with your dashboard
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={selectAll}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Select All
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={selectNone}
          className="text-sm text-slate-400 hover:text-slate-300"
        >
          Clear Selection
        </button>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_REPORTS.map((report) => {
          const Icon = report.icon;
          const isSelected = data.selectedReports.includes(report.id);

          return (
            <button
              key={report.id}
              onClick={() => toggleReport(report.id)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }
              `}
            >
              {/* Checkbox */}
              <div
                className={`
                  absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center
                  ${isSelected ? 'bg-blue-500' : 'bg-slate-700'}
                `}
              >
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </div>

              {/* Content */}
              <div className="flex items-start gap-4 pr-8">
                <div
                  className={`
                    p-3 rounded-lg
                    ${isSelected ? 'bg-blue-500/20' : 'bg-slate-700/50'}
                  `}
                >
                  <Icon
                    className={`w-6 h-6 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}
                  >
                    {report.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {report.description}
                  </p>

                  {/* Metrics Preview */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {report.metrics.slice(0, 3).map((metric) => (
                      <span
                        key={metric}
                        className={`
                          text-xs px-2 py-0.5 rounded-full
                          ${isSelected
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-700 text-slate-400'
                          }
                        `}
                      >
                        {metric}
                      </span>
                    ))}
                    {report.metrics.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{report.metrics.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection Summary */}
      <div className="text-center text-slate-400 text-sm">
        {data.selectedReports.length} of {AVAILABLE_REPORTS.length} reports selected
      </div>

      {/* Info Box */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-sm text-amber-300">
          <strong>Note:</strong> You can always change your report selection later in the
          admin settings. Reports will sync automatically based on your configured schedule.
        </p>
      </div>
    </div>
  );
}
