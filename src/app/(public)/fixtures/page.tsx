import { Metadata } from 'next';
import FixturesClient from '@/components/public/FixturesClient';

export const metadata: Metadata = {
  title: 'Match Fixtures',
  description: 'View the official match schedule, kickoff times, and venues for the Solid FM 5-Aside tournament.',
  openGraph: {
    title: 'Match Fixtures | Solid FM 5-Aside',
    description: 'Track upcoming matches and tournament stages live.',
  }
};

export default function FixturesPage() {
  return <FixturesClient />;
}
