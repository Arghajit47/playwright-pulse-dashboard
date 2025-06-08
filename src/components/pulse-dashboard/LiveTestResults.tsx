
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { PlaywrightPulseReport, DetailedTestResult } from '@/types/playwright';
import { TestItem } from './TestItem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Info, ChevronDown, XCircle, FilterX, Repeat1 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [selectedBrowser, setSelectedBrowser] = useState<string>('all');
  const [allBrowsers, setAllBrowsers] = useState<string[]>(['all']);
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [allSuites, setAllSuites] = useState<string[]>(['all']);
  const [showRetriesOnly, setShowRetriesOnly] = useState<boolean>(false);

  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  useEffect(() => {
    if (report?.results) {
      const uniqueTags = new Set<string>();
      const uniqueBrowsers = new Set<string>();
      const uniqueSuites = new Set<string>();

      report.results.forEach(test => {
        test.tags?.forEach(tag => uniqueTags.add(tag));
        if (test.browser) uniqueBrowsers.add(test.browser);
        if (test.suiteName) uniqueSuites.add(test.suiteName);
      });

      setAllTags(Array.from(uniqueTags).sort());
      setAllBrowsers(['all', ...Array.from(uniqueBrowsers).sort()]);
      setAllSuites(['all', ...Array.from(uniqueSuites).sort()]);
    }
  }, [report]);

  const isAnyFilterActive = useMemo(() => {
    return statusFilter !== 'all' ||
           searchTerm !== '' ||
           selectedTags.length > 0 ||
           selectedBrowser !== 'all' ||
           selectedSuite !== 'all' ||
           showRetriesOnly;
  }, [statusFilter, searchTerm, selectedTags, selectedBrowser, selectedSuite, showRetriesOnly]);

  const handleClearAllFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setSelectedTags([]);
    setSelectedBrowser('all');
    setSelectedSuite('all');
    setShowRetriesOnly(false);
  };

  const groupedAndFilteredSuites = useMemo(() => {
    if (!report?.results) return [];

    const filteredTests = report.results.filter(test => {
      const statusMatch = statusFilter === 'all' || test.status === statusFilter;
      const searchTermMatch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              test.suiteName.toLowerCase().includes(searchTerm.toLowerCase());
      const tagMatch = selectedTags.length === 0 || (test.tags && test.tags.some(tag => selectedTags.includes(tag)));
      const browserMatch = selectedBrowser === 'all' || test.browser === selectedBrowser;
      const suiteMatch = selectedSuite === 'all' || test.suiteName === selectedSuite;
      const retriesMatch = !showRetriesOnly || (showRetriesOnly && test.retries > 0);
      
      return statusMatch && searchTermMatch && tagMatch && browserMatch && suiteMatch && retriesMatch;
    });

    const suitesMap = new Map<string, DetailedTestResult[]>();
    filteredTests.forEach(test => {
      const suiteTests = suitesMap.get(test.suiteName) || [];
      suiteTests.push(test);
      suitesMap.set(test.suiteName, suiteTests);
    });

    return Array.from(suitesMap.entries()).map(([title, tests]) => ({ title, tests }));
  }, [report, statusFilter, searchTerm, selectedTags, selectedBrowser, selectedSuite, showRetriesOnly]);

  if (loading) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" /> 
            <Skeleton className="h-10 w-full" />
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
      <Alert variant="destructive" className="mt-4 shadow-md">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Live Test Results</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!report || !report.results || report.results.length === 0) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Live Test Results</CardTitle>
           {(report?.metadata?.generatedAt || report?.run?.timestamp) && (
            <CardDescription>
              Last updated: {new Date(report.metadata?.generatedAt || report.run?.timestamp || Date.now()).toLocaleString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
           <Alert className="shadow-sm">
            <Info className="h-4 w-4" />
            <AlertTitle>No Test Data</AlertTitle>
            <AlertDescription>No test results available. Ensure 'playwright-pulse-report.json' exists in 'public/pulse-report/' and is correctly formatted, or that the data source is providing results.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Live Test Results</CardTitle>
        {(report.metadata?.generatedAt || report.run?.timestamp) && (
          <CardDescription>
            Last updated: {new Date(report.metadata.generatedAt || report.run.timestamp).toLocaleString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg bg-card/70 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TestStatusFilter)}>
                <SelectTrigger id="status-filter" className="w-full bg-background shadow-inner">
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
            <div className="space-y-1.5">
              <Label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground">Search by Name/Suite</Label>
              <Input
                id="search-filter"
                type="text"
                placeholder="Enter test or suite name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background shadow-inner"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Filter by Tags</Label>
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                  <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full bg-background shadow-inner justify-between">
                          {selectedTags.length > 0 ? `Tags (${selectedTags.length})` : "Select Tags"}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <div className="p-2 border-b">
                          <p className="text-sm font-medium">Filter by Tags</p>
                      </div>
                      <ScrollArea className="h-48">
                          <div className="p-2 space-y-1">
                          {allTags.length > 0 ? allTags.map(tag => (
                              <Label key={tag} htmlFor={`tag-${tag}`} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-accent/10 cursor-pointer">
                                  <Checkbox
                                      id={`tag-${tag}`}
                                      checked={selectedTags.includes(tag)}
                                      onCheckedChange={(checked) => {
                                          setSelectedTags(prev =>
                                              checked
                                                  ? [...prev, tag]
                                                  : prev.filter(t => t !== tag)
                                          );
                                      }}
                                  />
                                  <span>{tag}</span>
                              </Label>
                          )) : <p className="text-xs text-muted-foreground p-2">No tags available in this report.</p>}
                          </div>
                      </ScrollArea>
                      {selectedTags.length > 0 && (
                          <div className="p-2 border-t flex justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>Clear selected</Button>
                          </div>
                      )}
                  </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="browser-filter" className="text-sm font-medium text-muted-foreground">Filter by Browser</Label>
              <Select value={selectedBrowser} onValueChange={setSelectedBrowser}>
                <SelectTrigger id="browser-filter" className="w-full bg-background shadow-inner">
                  <SelectValue placeholder="Select browser" />
                </SelectTrigger>
                <SelectContent>
                  {allBrowsers.map(browser => (
                    <SelectItem key={browser} value={browser} className="capitalize">
                      {browser === 'all' ? 'All Browsers' : browser}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suite-filter" className="text-sm font-medium text-muted-foreground">Filter by Test Suite</Label>
              <Select value={selectedSuite} onValueChange={setSelectedSuite}>
                <SelectTrigger id="suite-filter" className="w-full bg-background shadow-inner">
                  <SelectValue placeholder="Select test suite" />
                </SelectTrigger>
                <SelectContent>
                  {allSuites.map(suite => (
                    <SelectItem key={suite} value={suite} className="capitalize truncate">
                      {suite === 'all' ? 'All Suites' : (suite.length > 40 ? suite.substring(0, 37) + '...' : suite)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-5"> {/* Adjusted pt- for alignment */}
              <Checkbox
                id="retries-filter"
                checked={showRetriesOnly}
                onCheckedChange={(checked) => setShowRetriesOnly(Boolean(checked))}
              />
              <Label htmlFor="retries-filter" className="text-sm font-medium text-muted-foreground cursor-pointer flex items-center">
                <Repeat1 className="h-4 w-4 mr-1.5 text-muted-foreground"/>
                Retries Only
              </Label>
            </div>
          </div>
          {isAnyFilterActive && (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={handleClearAllFilters} className="text-sm">
                <FilterX className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
        
        {selectedTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Active tags:</span>
                {selectedTags.map(tag => (
                    <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center"
                    >
                        {tag}
                        <button
                            type="button"
                            aria-label={`Remove ${tag} filter`}
                            onClick={() => {
                                setSelectedTags(prev => prev.filter(t => t !== tag));
                            }}
                            className="ml-1.5 p-0.5 rounded-full hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                        </button>
                    </Badge>
                ))}
            </div>
        )}

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
                <p className="text-sm text-muted-foreground pl-4">No tests in this suite match the current filters.</p>
              )}
            </div>
          ))
        ) : (
           <div className="text-center py-8">
             <p className="text-muted-foreground text-lg">No test results match your current filters.</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting the status, search term, or tag filters.</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}

