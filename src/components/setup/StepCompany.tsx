'use client';

import { useEffect, useState } from 'react';

interface StepCompanyProps {
  data?: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
];

export default function StepCompany({ data, onChange }: StepCompanyProps) {
  const [form, setForm] = useState({
    companyName: data?.companyName || '',
    logoUrl: data?.logoUrl || '',
    timezone: data?.timezone || 'America/Chicago',
  });

  useEffect(() => {
    if (!data) {
      fetch('/api/setup?step=1')
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            const loaded = {
              companyName: json.data.companyName || '',
              logoUrl: json.data.logoUrl || '',
              timezone: json.data.timezone || 'America/Chicago',
            };
            setForm(loaded);
            onChange(loaded);
          }
        })
        .catch(() => {});
    }
  }, []);

  function update(field: string, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    onChange(next);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Company Name</label>
        <input
          type="text"
          value={form.companyName}
          onChange={e => update('companyName', e.target.value)}
          placeholder="e.g., ServiceStar Brands"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Logo URL</label>
        <input
          type="url"
          value={form.logoUrl}
          onChange={e => update('logoUrl', e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        {form.logoUrl && (
          <div className="mt-2 p-3 bg-gray-700/50 rounded-lg">
            <img src={form.logoUrl} alt="Logo preview" className="max-h-12 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">Optional. Displayed in the dashboard header.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Timezone</label>
        <select
          value={form.timezone}
          onChange={e => update('timezone', e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Used for all date calculations (MTD, YTD, etc.)</p>
      </div>
    </div>
  );
}
