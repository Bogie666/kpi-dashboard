'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Division {
  id?: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
  hasTechnicians: boolean;
  hasComfortAdvisors: boolean;
  _delete?: boolean;
}

interface BusinessUnit {
  divisionId: number;
  servicetitanId: string;
  name: string;
}

interface StepDivisionsProps {
  data?: Record<string, unknown>;
  onChange: (data: { divisions: Division[]; businessUnits: BusinessUnit[] }) => void;
}

const ICON_OPTIONS = [
  { value: 'snowflake', label: '❄️ HVAC' },
  { value: 'droplet', label: '💧 Plumbing' },
  { value: 'zap', label: '⚡ Electrical' },
  { value: 'wrench', label: '🔧 Service' },
  { value: 'building', label: '🏢 Commercial' },
  { value: 'sun', label: '☀️ Solar' },
  { value: 'hammer', label: '🔨 Construction' },
  { value: 'shield', label: '🛡️ Other' },
];

const COLOR_OPTIONS = ['#3B82F6', '#EF4444', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function StepDivisions({ data, onChange }: StepDivisionsProps) {
  const [divisions, setDivisions] = useState<Division[]>(
    (data?.divisions as Division[]) || []
  );
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>(
    (data?.businessUnits as BusinessUnit[]) || []
  );
  const [expandedDiv, setExpandedDiv] = useState<number | null>(null);
  const [newBuName, setNewBuName] = useState('');
  const [newBuStId, setNewBuStId] = useState('');

  useEffect(() => {
    if (!data?.divisions) {
      fetch('/api/setup?step=3')
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            if (json.data.divisions?.length > 0) {
              setDivisions(json.data.divisions);
            }
            if (json.data.businessUnits?.length > 0) {
              setBusinessUnits(json.data.businessUnits.map((bu: Record<string, unknown>) => ({
                divisionId: bu.divisionId,
                servicetitanId: bu.servicetitanId,
                name: bu.name,
              })));
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    onChange({ divisions, businessUnits });
  }, [divisions, businessUnits]);

  function addDivision() {
    setDivisions(prev => [
      ...prev,
      {
        name: '',
        slug: '',
        icon: 'snowflake',
        color: COLOR_OPTIONS[prev.length % COLOR_OPTIONS.length],
        displayOrder: prev.length,
        isActive: true,
        hasTechnicians: true,
        hasComfortAdvisors: false,
      },
    ]);
  }

  function updateDivision(index: number, field: string, value: string | boolean) {
    setDivisions(prev => {
      const next = [...prev];
      (next[index] as unknown as Record<string, string | number | boolean | undefined>)[field] = value;
      if (field === 'name' && !next[index].id) {
        next[index].slug = slugify(value as string);
      }
      return next;
    });
  }

  function removeDivision(index: number) {
    setDivisions(prev => {
      const div = prev[index];
      if (div.id) {
        const next = [...prev];
        next[index] = { ...next[index], _delete: true };
        return next;
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function addBusinessUnit(divisionIndex: number) {
    if (!newBuName.trim()) return;
    const div = divisions[divisionIndex];
    const divId = div.id || -(divisionIndex + 1); // temp negative ID for new divisions
    setBusinessUnits(prev => [...prev, {
      divisionId: divId,
      servicetitanId: newBuStId.trim(),
      name: newBuName.trim(),
    }]);
    setNewBuName('');
    setNewBuStId('');
  }

  function removeBusinessUnit(buIndex: number) {
    setBusinessUnits(prev => prev.filter((_, i) => i !== buIndex));
  }

  const activeDivisions = divisions.filter(d => !d._delete);

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
        <p className="font-medium mb-1">Division → Business Unit Mapping</p>
        <p className="text-blue-300/70">
          Create your divisions (e.g., HVAC, Plumbing, Electrical), then map
          ServiceTitan business units to each one. This controls how revenue and
          technician data is grouped throughout the dashboard.
        </p>
      </div>

      {activeDivisions.map((div, index) => {
        const realIndex = divisions.indexOf(div);
        const isExpanded = expandedDiv === realIndex;
        const divBus = businessUnits.filter(bu => bu.divisionId === (div.id || -(realIndex + 1)));

        return (
          <div key={realIndex} className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Division header */}
            <div
              className="flex items-center gap-3 p-4 bg-gray-750 cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={() => setExpandedDiv(isExpanded ? null : realIndex)}
            >
              <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: div.color }} />
              <input
                type="text"
                value={div.name}
                onChange={e => { e.stopPropagation(); updateDivision(realIndex, 'name', e.target.value); }}
                onClick={e => e.stopPropagation()}
                placeholder="Division name (e.g., HVAC)"
                className="flex-1 bg-transparent text-white font-medium placeholder-gray-500 outline-none"
              />
              <span className="text-xs text-gray-500">{divBus.length} business units</span>
              <button
                onClick={e => { e.stopPropagation(); removeDivision(realIndex); }}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="p-4 border-t border-gray-700 space-y-4">
                {/* Division settings */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Icon</label>
                    <select
                      value={div.icon}
                      onChange={e => updateDivision(realIndex, 'icon', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                    >
                      {ICON_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Color</label>
                    <div className="flex gap-1.5">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateDivision(realIndex, 'color', c)}
                          className={`w-6 h-6 rounded-full border-2 transition-colors ${div.color === c ? 'border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={div.hasTechnicians}
                        onChange={e => updateDivision(realIndex, 'hasTechnicians', e.target.checked)}
                        className="rounded"
                      />
                      Has Technicians
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={div.hasComfortAdvisors}
                        onChange={e => updateDivision(realIndex, 'hasComfortAdvisors', e.target.checked)}
                        className="rounded"
                      />
                      Has Comfort Advisors
                    </label>
                  </div>
                </div>

                {/* Business units list */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Units
                  </label>
                  {divBus.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {divBus.map((bu, buIdx) => {
                        const globalIdx = businessUnits.indexOf(bu);
                        return (
                          <div key={buIdx} className="flex items-center gap-2 bg-gray-700/50 rounded px-3 py-2 text-sm">
                            <span className="flex-1 text-gray-300">{bu.name}</span>
                            {bu.servicetitanId && (
                              <span className="text-xs text-gray-500 font-mono">ID: {bu.servicetitanId}</span>
                            )}
                            <button
                              onClick={() => removeBusinessUnit(globalIdx)}
                              className="text-gray-500 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add business unit */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBuName}
                      onChange={e => setNewBuName(e.target.value)}
                      placeholder="Business unit name"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
                      onFocus={() => setExpandedDiv(realIndex)}
                    />
                    <input
                      type="text"
                      value={newBuStId}
                      onChange={e => setNewBuStId(e.target.value)}
                      placeholder="ST ID (optional)"
                      className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      onClick={() => addBusinessUnit(realIndex)}
                      disabled={!newBuName.trim()}
                      className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded text-sm font-medium hover:bg-blue-600/30 disabled:opacity-30"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={addDivision}
        className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400
          hover:border-blue-500 hover:text-blue-400 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Add Division
      </button>
    </div>
  );
}
