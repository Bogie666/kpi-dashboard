import type { Metadata } from 'next';
import ReviewsWidget from './ReviewsWidget';

export const metadata: Metadata = {
  title: 'Google Reviews Widget',
  robots: { index: false, follow: false },
};

export default function ReviewsWidgetPage() {
  return <ReviewsWidget />;
}
