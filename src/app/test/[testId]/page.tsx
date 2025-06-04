
import { TestDetailsClientPage } from '@/components/pulse-dashboard/TestDetailsClientPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Details - Pulse Dashboard',
  description: 'Detailed view of a specific test run.',
};

export default function TestDetailsPage({ params }: { params: { testId: string } }) {
  return <TestDetailsClientPage testId={params.testId} />;
}

