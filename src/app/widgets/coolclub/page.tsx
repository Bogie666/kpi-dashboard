import type { Metadata } from 'next';
import CoolClubWidget from './CoolClubWidget';

export const metadata: Metadata = {
  title: 'Cool Club Members Widget',
  robots: { index: false, follow: false },
};

export default function CoolClubWidgetPage() {
  return <CoolClubWidget />;
}
