import type { Metadata } from 'next';
import RevenueWidget from './RevenueWidget';

export const metadata: Metadata = {
  title: 'Revenue by Department Widget',
  robots: { index: false, follow: false },
};

export default function RevenueWidgetPage() {
  return <RevenueWidget />;
}
