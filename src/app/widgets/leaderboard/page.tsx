import type { Metadata } from 'next';
import LeaderboardWidget from './LeaderboardWidget';

export const metadata: Metadata = {
  title: 'Top Performers Widget',
  robots: { index: false, follow: false },
};

export default function LeaderboardWidgetPage() {
  return <LeaderboardWidget />;
}
