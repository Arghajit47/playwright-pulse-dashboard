
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { PlaywrightPulseReport, DetailedTestResult } from '@/types/playwright';
import { TestItem } from './TestItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const testStatuses = ['all', 'passed', 'failed', 'skipped', 'timedOut', 'pending'] as const;
export type TestStatusFilter = typeof testStatuses[number];

interface GroupedSuite {
  title: string;
  tests: DetailedTestResult[];
}

interface LiveTestResultsProps {
  report: PlaywrightPulseReport | null;
  loading: boolean;
  error: string | null;
  initialFilter?: TestStatusFilter;
}

export function LiveTestResults({ report, loading, error, initialFilter }: LiveTestResultsProps) {
  const [statusFilter, setStatusFilter] = useState<TestStatusFilter>(initialFilter || 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);


  const groupedAndFilteredSuites = useMemo(() => {
    if (!report?.results) return [];

    const filteredTests = report.results.filter(test => {
      const statusMatch = statusFilter === 'all' || test.status === statusFilter;
      const searchTermMatch = test.name.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && searchTermMatch;
    });

    const suitesMap = new Map<string, DetailedTestResult[]>();
    filteredTests.forEach(test => {
      const suiteTests = suitesMap.get(test.suiteName) || [];
      suiteTests.push(test);
      suitesMap.set(test.suiteName, suiteTests);
    });

    return Array.from(suitesMap.entries()).map(([title, tests]) => ({ title, tests }));
  }, [report, statusFilter, searchTerm]);

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-64" /></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 border rounded-lg">
            <Skeleton className="h-10 w-full sm:w-[180px]" />
            <Skeleton className="h-10 w-full flex-1" />
          </div>
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
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Live Test Results</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!report || !report.results || report.results.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Live Test Results</CardTitle>
           {(report?.metadata?.generatedAt || report?.run?.timestamp) && (
            <CardDescription>
              Last updated: {new Date(report.metadata?.generatedAt || report.run?.timestamp || Date.now()).toLocaleString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No test results available or report is empty. Please ensure 'playwright-pulse-report.json' exists in the 'public/pulse-report' directory and is correctly formatted.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Live Test Results</CardTitle>
        {(report.metadata.generatedAt || report.run.timestamp) && (
          <CardDescription>
            Last updated: {new Date(report.metadata.generatedAt || report.run.timestamp).toLocaleString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 border rounded-lg bg-card/80 shadow-sm">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TestStatusFilter)}>
              <SelectTrigger id="status-filter" className="w-full sm:w-[200px] bg-background">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {testStatuses.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground">Search by Name</Label>
            <Input
              id="search-filter"
              type="text"
              placeholder="Enter test name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background"
            />
          </div>
        </div>

        {groupedAndFilteredSuites.length > 0 ? (
          groupedAndFilteredSuites.map((suite: GroupedSuite, index: number) => (
            <div key={index} className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3 pb-2 border-b-2 border-primary/30">{suite.title}</h3>
              {suite.tests.length > 0 ? (
                <div className="space-y-1">
                  {suite.tests.map(test => (
                    <TestItem key={test.id} test={test} />
                  ))}
                </div>
              ) : (
                // This case should ideally not be hit if outer filter handles empty suites
                <p className="text-sm text-muted-foreground pl-4">No tests in this suite match the current filters.</p>
              )}
            </div>
          ))
        ) : (
           <div className="text-center py-8">
             <p className="text-muted-foreground text-lg">No test results match your current filters.</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}

