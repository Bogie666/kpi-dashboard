'use client';

import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Phone,
  DollarSign,
  Users,
  Check,
  Sparkles,
} from 'lucide-react';
import { SetupData } from '../SetupWizard';

interface DashboardStepProps {
  data: SetupData;
  onChange: (data: Partial<SetupData>) => void;
}

const DASHBOARD_TEMPLATES = [
  {
    id: 'blank',
    name: 'Start from Scratch',
    description: 'Build your own dashboard with our drag-and-drop builder',
    icon: Sparkles,
    color: 'slate',
    preview: null,
  },
  {
    id: 'hvac_overview',
    name: 'HVAC Overview',
    description: 'Complete HVAC department dashboard with tech performance and financials',
    icon: Wrench,
    color: 'blue',
    preview: ['Revenue MTD', 'Jobs Completed', 'Avg Ticket', 'Top Performers'],
  },
  {
    id: 'call_center_command',
    name: 'Call Center Command',
    description: 'Real-time call center monitoring with booking rates and agent metrics',
    icon: Phone,
    color: 'green',
    preview: ['Total Calls', 'Booking Rate', 'Agent Performance', 'Top Bookers'],
  },
  {
    id: 'sales_performance',
    name: 'Sales Performance',
    description: 'Comfort advisor and sales team performance tracking',
    icon: Users,
    color: 'purple',
    preview: ['Total Sales', 'Close Rate', 'Average Ticket', 'Leaderboard'],
  },
  {
    id: 'executive_overview',
    name: 'Executive Overview',
    description: 'High-level financial and performance summary for leadership',
    icon: DollarSign,
    color: 'amber',
    preview: ['Total Revenue', 'Budget Progress', 'By Department', 'Trends'],
  },
];

const colorClasses = {
  slate: {
    bg: 'bg-slate-700/50',
    border: 'border-slate-600',
    icon: 'text-slate-400',
    activeBg: 'bg-slate-600/50',
    activeBorder: 'border-slate-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    activeBg: 'bg-blue-500/20',
    activeBorder: 'border-blue-500',
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    activeBg: 'bg-green-500/20',
    activeBorder: 'border-green-500',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    activeBg: 'bg-purple-500/20',
    activeBorder: 'border-purple-500',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    activeBg: 'bg-amber-500/20',
    activeBorder: 'border-amber-500',
  },
};

export default function DashboardStep({ data, onChange }: DashboardStepProps) {
  const selectTemplate = (templateId: string) => {
    onChange({
      selectedTemplate: templateId === 'blank' ? null : templateId,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Choose Your Dashboard
        </h2>
        <p className="text-slate-400">
          Start with a template or build from scratch - you can customize everything later
        </p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 gap-4">
        {DASHBOARD_TEMPLATES.map((template) => {
          const Icon = template.icon;
          const colors = colorClasses[template.color as keyof typeof colorClasses];
          const isSelected =
            (template.id === 'blank' && data.selectedTemplate === null) ||
            data.selectedTemplate === template.id;

          return (
            <button
              key={template.id}
              onClick={() => selectTemplate(template.id)}
              className={`
                relative p-5 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? `${colors.activeBg} ${colors.activeBorder}`
                  : `${colors.bg} ${colors.border} hover:border-opacity-60`
                }
              `}
            >
              {/* Selection Indicator */}
              <div
                className={`
                  absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center
                  transition-all
                  ${isSelected ? 'bg-white' : 'bg-slate-700/50'}
                `}
              >
                {isSelected && <Check className="w-4 h-4 text-slate-900" />}
              </div>

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                  <Icon className={`w-8 h-8 ${colors.icon}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                  <h3 className="text-lg font-semibold text-white">
                    {template.name}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {template.description}
                  </p>

                  {/* Preview Widgets */}
                  {template.preview && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {template.preview.map((widget) => (
                        <span
                          key={widget}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700"
                        >
                          {widget}
                        </span>
                      ))}
                    </div>
                  )}

                  {template.id === 'blank' && (
                    <div className="mt-4 flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-500">
                        Drag & drop dashboard builder
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="text-sm text-slate-500">
          All templates are fully customizable. You can add, remove, or rearrange
          any widget after setup.
        </p>
      </div>
    </div>
  );
}
