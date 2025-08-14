
import { TestDetailsClientPage } from '@/components/pulse-dashboard/TestDetailsClientPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Details - Pulse Dashboard',
  description: 'Detailed view of a specific test run.',
};

export default async function TestDetailsPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return <TestDetailsClientPage testId={testId} />;
}

