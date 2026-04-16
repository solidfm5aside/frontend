import { Metadata } from 'next';
import ResultsClient from '@/components/public/ResultsClient';

export const metadata: Metadata = {
  title: 'Tournament Results',
  description: 'Relive the action with the official Solid FM 5-Aside match results, goal scorers, and match day archives.',
  openGraph: {
    title: 'Match Results | Solid FM 5-Aside',
    description: 'The ledger of war - browse all scores and match events.',
  }
};

export default function ResultsPage() {
  return <ResultsClient />;
}
