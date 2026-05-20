'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';

interface GoogleLocation {
  name: string;
  accountId: string;
  locationId: string;
  slug: string;
  isActive: boolean;
}

interface StepGoogleReviewsProps {
  data?: Record<string, unknown>;
  onChange: (data: { googleClientId?: string; googleClientSecret?: string; googleRefreshToken?: string; locations: GoogleLocation[] }) => void;
}

export default function StepGoogleReviews({ data, onChange }: StepGoogleReviewsProps) {
  const [googleClientId, setGoogleClientId] = useState((data?.googleClientId as string) || '');
  const [googleClientSecret, setGoogleClientSecret] = useState((data?.googleClientSecret as string) || '');
  const [googleRefreshToken, setGoogleRefreshToken] = useState((data?.googleRefreshToken as string) || '');
  const [locations, setLocations] = useState<GoogleLocation[]>((data?.locations as GoogleLocation[]) || []);
  const [skipReviews, setSkipReviews] = useState(false);

  useEffect(() => {
    if (!data?.locations) {
      fetch('/api/setup?step=5')
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            if (json.data.locations?.length > 0) {
              setLocations(json.data.locations);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    onChange({
      googleClientId: skipReviews ? '' : googleClientId,
      googleClientSecret: skipReviews ? '' : googleClientSecret,
      googleRefreshToken: skipReviews ? '' : googleRefreshToken,
      locations: skipReviews ? [] : locations,
    });
  }, [googleClientId, googleClientSecret, googleRefreshToken, locations, skipReviews]);

  function addLocation() {
    setLocations(prev => [...prev, {
      name: '',
      accountId: '',
      locationId: '',
      slug: '',
      isActive: true,
    }]);
  }

  function updateLocation(index: number, field: string, value: string | boolean) {
    setLocations(prev => {
      const next = [...prev];
      (next[index] as unknown as Record<string, string | boolean>)[field] = value;
      if (field === 'name' && !next[index].slug) {
        next[index].slug = (value as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
  }

  function removeLocation(index: number) {
    setLocations(prev => prev.filter((_, i) => i !== index));
  }

  if (skipReviews) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-700/50 rounded-lg p-6 text-center">
          <Star className="w-8 h-8 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">
            Google Reviews integration skipped. You can configure this later from the Admin panel.
          </p>
          <button
            onClick={() => setSkipReviews(false)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Actually, I want to set it up now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300 flex-1">
          <p className="font-medium mb-1">Google Business Profile Integration</p>
          <p className="text-blue-300/70">
            Connect your Google OAuth credentials and add your business locations.
            This enables the Reviews tab to show customer feedback.
          </p>
        </div>
      </div>

      <button
        onClick={() => setSkipReviews(true)}
        className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
      >
        Skip — I&apos;ll set this up later
      </button>

      {/* Google OAuth Credentials */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Google OAuth Credentials</h3>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Client ID</label>
          <input
            type="text"
            value={googleClientId}
            onChange={e => setGoogleClientId(e.target.value)}
            placeholder="xxxxx.apps.googleusercontent.com"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Client Secret</label>
          <input
            type="password"
            value={googleClientSecret}
            onChange={e => setGoogleClientSecret(e.target.value)}
            placeholder="GOCSPX-xxxxxxxxx"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Refresh Token</label>
          <input
            type="password"
            value={googleRefreshToken}
            onChange={e => setGoogleRefreshToken(e.target.value)}
            placeholder="1//xxxxxxxxxxxxxxxxx"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            Obtained via Google OAuth 2.0 Playground or your own OAuth flow.
          </p>
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Business Locations</h3>

        {locations.map((loc, index) => (
          <div key={index} className="border border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={loc.name}
                onChange={e => updateLocation(index, 'name', e.target.value)}
                placeholder="Location name (e.g., Main Office)"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
              />
              <button onClick={() => removeLocation(index)} className="text-gray-500 hover:text-red-400 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Account ID</label>
                <input
                  type="text"
                  value={loc.accountId}
                  onChange={e => updateLocation(index, 'accountId', e.target.value)}
                  placeholder="10226221..."
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Location ID</label>
                <input
                  type="text"
                  value={loc.locationId}
                  onChange={e => updateLocation(index, 'locationId', e.target.value)}
                  placeholder="22110624..."
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Slug</label>
                <input
                  type="text"
                  value={loc.slug}
                  onChange={e => updateLocation(index, 'slug', e.target.value)}
                  placeholder="main-office"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addLocation}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400
            hover:border-blue-500 hover:text-blue-400 transition-colors w-full justify-center"
        >
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>
    </div>
  );
}
