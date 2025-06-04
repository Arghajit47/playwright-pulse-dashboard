'use client';

import type { ReportMetadata } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, SkipForward, AlertTriangle, Clock } from 'lucide-react';

interface SummaryMetricsProps {
  metadata: ReportMetadata | null;
  loading: boolean;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  let formatted = '';
  if (hours > 0) formatted += `${hours}h `;
  if (minutes > 0) formatted += `${minutes}m `;
  if (seconds > 0 || (hours === 0 && minutes === 0)) formatted += `${seconds}s`;
  return formatted.trim() || '0s';
}

export function SummaryMetrics({ metadata, loading }: SummaryMetricsProps) {
  if (loading || !metadata) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-6" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-32 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { totalTests, passed, failed, skipped, duration } = metadata;
  const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : '0.0';
  const failRate = totalTests > 0 ? ((failed / totalTests) * 100).toFixed(1) : '0.0';

  const metrics = [
    { title: 'Total Tests', value: totalTests.toString(), icon: <AlertTriangle className="h-5 w-5 text-muted-foreground" />, change: null },
    { title: 'Passed', value: passed.toString(), icon: <CheckCircle className="h-5 w-5 text-green-500" />, change: `${passRate}% pass rate` },
    { title: 'Failed', value: failed.toString(), icon: <XCircle className="h-5 w-5 text-destructive" />, change: `${failRate}% fail rate` },
    { title: 'Skipped', value: skipped.toString(), icon: <SkipForward className="h-5 w-5 text-accent" />, change: null },
    { title: 'Duration', value: formatDuration(duration), icon: <Clock className="h-5 w-5 text-primary" />, change: `Total execution time` },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
      {metrics.map(metric => (
        <Card key={metric.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
            {metric.icon}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{metric.value}</div>
            {metric.change && <p className="text-xs text-muted-foreground pt-1">{metric.change}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
