import type { Metadata } from 'next';
import SetupWizard from '@/components/setup/SetupWizard';

export const metadata: Metadata = {
  title: 'Setup | KPI Platform',
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  return <SetupWizard />;
}
