'use client';

import type { PlaywrightPulseReport, Suite } from '@/types/playwright';
import { TestItem } from './TestItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

interface LiveTestResultsProps {
  report: PlaywrightPulseReport | null;
  loading: boolean;
  error: string | null;
}

export function LiveTestResults({ report, loading, error }: LiveTestResultsProps) {
  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 p-2 border rounded-md">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Live Results</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!report || !report.suites || report.suites.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Live Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No test results available or report is empty.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Live Test Results</CardTitle>
        {report.metadata && (
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(report.metadata.reportGeneratedAt).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {report.suites.map((suite: Suite, index: number) => (
          <div key={index} className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-3 pb-2 border-b-2 border-primary/30">{suite.title}</h3>
            {suite.tests.length > 0 ? (
              <div className="space-y-1">
                {suite.tests.map(test => (
                  <TestItem key={test.id} test={test} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground pl-4">No tests in this suite.</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
