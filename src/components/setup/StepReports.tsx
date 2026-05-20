'use client';

import { useEffect, useState } from 'react';
import { FileBarChart, ToggleLeft, ToggleRight } from 'lucide-react';

interface Report {
  reportKey: string;
  reportName: string;
  servicetitanReportId: string;
  reportCategory: string;
  description: string | null;
  isActive: boolean;
  divisionId: number | null;
  businessUnitIds: string | null;
}

interface StepReportsProps {
  data?: Record<string, unknown>;
  onChange: (data: { reports: Report[] }) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  technician: 'text-blue-400',
  operations: 'text-green-400',
  accounting: 'text-yellow-400',
  marketing: 'text-purple-400',
};

export default function StepReports({ data, onChange }: StepReportsProps) {
  const [reports, setReports] = useState<Report[]>((data?.reports as Report[]) || []);

  useEffect(() => {
    if (!data?.reports) {
      fetch('/api/setup?step=4')
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data?.reports) {
            setReports(json.data.reports);
            onChange({ reports: json.data.reports });
          }
        })
        .catch(() => {});
    }
  }, []);

  function updateReport(index: number, field: string, value: string | boolean | number | null) {
    setReports(prev => {
      const next = [...prev];
      (next[index] as unknown as Record<string, unknown>)[field] = value;
      onChange({ reports: next });
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
        <p className="font-medium mb-1">ServiceTitan Report IDs</p>
        <p className="text-blue-300/70">
          These are pre-configured with the default report IDs. If your ServiceTitan instance uses
          different report templates, update the IDs here. You can disable reports you don&apos;t need.
        </p>
      </div>

      <div className="space-y-2">
        {reports.map((report, index) => (
          <div
            key={report.reportKey}
            className={`border rounded-lg p-4 transition-colors ${
              report.isActive ? 'border-gray-700 bg-gray-750' : 'border-gray-800 bg-gray-800/50 opacity-60'
            }`}
          >
            <div className="flex items-start gap-3">
              <FileBarChart className={`w-5 h-5 mt-0.5 ${CATEGORY_COLORS[report.reportCategory] || 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-white text-sm">{report.reportName}</h3>
                  <button
                    onClick={() => updateReport(index, 'isActive', !report.isActive)}
                    className="flex-shrink-0"
                  >
                    {report.isActive ? (
                      <ToggleRight className="w-6 h-6 text-blue-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-600" />
                    )}
                  </button>
                </div>
                {report.description && (
                  <p className="text-xs text-gray-500 mb-2">{report.description}</p>
                )}
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-400">Report ID:</label>
                  <input
                    type="text"
                    value={report.servicetitanReportId}
                    onChange={e => updateReport(index, 'servicetitanReportId', e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2.5 py-1 text-sm text-white font-mono w-36 outline-none focus:border-blue-500"
                  />
                  <span className={`text-xs ${CATEGORY_COLORS[report.reportCategory] || 'text-gray-500'}`}>
                    {report.reportCategory}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No report configurations found. Save Step 2 first to seed defaults.
        </p>
      )}
    </div>
  );
}
