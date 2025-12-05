'use client';

import AdminSettings from '@/components/admin/AdminSettings';

export default function SettingsPage() {
  const tenantId = typeof window !== 'undefined' ? sessionStorage.getItem('tenantId') : null;

  return <AdminSettings tenantId={tenantId || undefined} />;
}
