'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface StepServiceTitanProps {
  data?: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
}

export default function StepServiceTitan({ data, onChange }: StepServiceTitanProps) {
  const [form, setForm] = useState({
    tenantId: data?.tenantId || '',
    clientId: data?.clientId || '',
    clientSecret: data?.clientSecret || '',
    appKey: data?.appKey || '',
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (!data) {
      fetch('/api/setup?step=2')
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            setForm(prev => ({
              ...prev,
              tenantId: json.data.tenantId || '',
            }));
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

  async function testConnection() {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const res = await fetch('/api/setup/test-st', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setTestStatus('success');
        setTestMessage('Connection successful! ServiceTitan API is accessible.');
      } else {
        setTestStatus('error');
        setTestMessage(json.error || 'Connection failed. Check your credentials.');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Connection test failed. The test endpoint may not be configured yet.');
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
        <p className="font-medium mb-1">Where to find these credentials</p>
        <p className="text-blue-300/70">
          Log into ServiceTitan &rarr; Settings &rarr; Integrations &rarr; API Application.
          Your Tenant ID is visible in your ServiceTitan URL.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Tenant ID</label>
        <input
          type="text"
          value={form.tenantId}
          onChange={e => update('tenantId', e.target.value)}
          placeholder="e.g., 1498628772"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Client ID</label>
        <input
          type="text"
          value={form.clientId}
          onChange={e => update('clientId', e.target.value)}
          placeholder="cit.xxxxxxxxxxxxx"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Client Secret</label>
        <input
          type="password"
          value={form.clientSecret}
          onChange={e => update('clientSecret', e.target.value)}
          placeholder="cs2.xxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Application Key</label>
        <input
          type="password"
          value={form.appKey}
          onChange={e => update('appKey', e.target.value)}
          placeholder="ak1.xxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
        />
      </div>

      <div className="pt-2">
        <button
          onClick={testConnection}
          disabled={testStatus === 'testing' || !form.tenantId || !form.clientId || !form.clientSecret || !form.appKey}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium text-gray-300
            hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {testStatus === 'testing' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
          ) : (
            'Test Connection'
          )}
        </button>
        {testStatus === 'success' && (
          <div className="flex items-center gap-2 mt-2 text-sm text-green-400">
            <CheckCircle className="w-4 h-4" /> {testMessage}
          </div>
        )}
        {testStatus === 'error' && (
          <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
            <XCircle className="w-4 h-4" /> {testMessage}
          </div>
        )}
      </div>
    </div>
  );
}
