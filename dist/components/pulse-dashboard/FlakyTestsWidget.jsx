'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlakyTestsAnalysis } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Repeat, Terminal, CheckCircle, XCircle, SkipForward, Clock, CalendarDays, BarChartHorizontalBig } from 'lucide-react';
function StatusBadge({ status }) {
    let badgeStyle = {};
    let icon = <Clock className="h-3 w-3 mr-1"/>;
    let text = status;
    switch (status) {
        case 'passed':
            badgeStyle = {
                backgroundColor: 'hsl(var(--chart-3) / 0.1)',
                color: 'hsl(var(--chart-3))',
                borderColor: 'hsl(var(--chart-3) / 0.3)'
            };
            icon = <CheckCircle className="h-3 w-3 mr-1" style={{ color: 'hsl(var(--chart-3))' }}/>;
            text = "passed";
            break;
        case 'failed':
        case 'timedOut':
            badgeStyle = {
                backgroundColor: 'hsl(var(--destructive) / 0.1)',
                color: 'hsl(var(--destructive))',
                borderColor: 'hsl(var(--destructive) / 0.3)'
            };
            icon = <XCircle className="h-3 w-3 mr-1" style={{ color: 'hsl(var(--destructive))' }}/>;
            text = status === 'failed' ? "failed" : "timedOut";
            break;
        case 'skipped':
            badgeStyle = {
                backgroundColor: 'hsl(var(--accent) / 0.1)',
                color: 'hsl(var(--accent))',
                borderColor: 'hsl(var(--accent) / 0.3)'
            };
            icon = <SkipForward className="h-3 w-3 mr-1" style={{ color: 'hsl(var(--accent))' }}/>;
            text = "skipped";
            break;
        case 'pending':
            badgeStyle = {
                backgroundColor: 'hsl(var(--primary) / 0.1)',
                color: 'hsl(var(--primary))',
                borderColor: 'hsl(var(--primary) / 0.3)'
            };
            icon = <Clock className="h-3 w-3 mr-1" style={{ color: 'hsl(var(--primary))' }}/>;
            text = "pending";
            break;
        default:
            badgeStyle = {
                backgroundColor: 'hsl(var(--muted) / 0.5)',
                color: 'hsl(var(--muted-foreground))',
                borderColor: 'hsl(var(--border))'
            };
    }
    return (<Badge variant="outline" className="capitalize text-xs px-2 py-0.5 whitespace-nowrap border" style={badgeStyle}>
      {icon}
      {text}
    </Badge>);
}
export function FlakyTestsWidget() {
    const [flakyTests, setFlakyTests] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);
            const result = await getFlakyTestsAnalysis();
            if (result.success && result.flakyTests) {
                setFlakyTests(result.flakyTests);
            }
            else {
                setError(result.error || 'Failed to fetch flaky test analysis.');
            }
            setIsLoading(false);
        }
        fetchData();
    }, []);
    if (isLoading) {
        return (<Card className="shadow-xl">
        <CardHeader>
          <Skeleton className="h-7 w-48 mb-1"/>
          <Skeleton className="h-4 w-3/4"/>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (<div key={i} className="p-4 border rounded-lg space-y-2">
              <Skeleton className="h-5 w-2/3"/>
              <Skeleton className="h-4 w-1/2"/>
              <Skeleton className="h-4 w-1/3"/>
            </div>))}
        </CardContent>
      </Card>);
    }
    if (error) {
        return (<Alert variant="destructive">
        <Terminal className="h-4 w-4"/>
        <AlertTitle>Flaky Test Analysis Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    if (!flakyTests || flakyTests.length === 0) {
        return (<Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Repeat className="h-7 w-7 mr-2"/>
            Flaky Test Analysis
          </CardTitle>
          <CardDescription>
            Analysis of tests that have shown inconsistent pass/fail behavior across historical runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4"/>
            <AlertTitle>No Flaky Tests Identified</AlertTitle>
            <AlertDescription>
              No tests were identified as flaky based on the available historical data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>);
    }
    const formatTestNameForDisplay = (fullName) => {
        if (!fullName)
            return 'Unknown Test';
        const parts = fullName.split(' > ');
        return parts[parts.length - 1] || fullName;
    };
    return (<Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center">
          <Repeat className="h-7 w-7 mr-2"/>
          Flaky Test Analysis ({flakyTests.length})
        </CardTitle>
        <CardDescription>
          Tests that have shown inconsistent pass/fail behavior across historical runs. Click on a test to see its run history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full space-y-3">
          {flakyTests.map((test, index) => (<AccordionItem value={`flaky-${test.id}-${index}`} key={test.id + index} className="border rounded-lg bg-card hover:bg-muted/20 transition-colors">
              <AccordionTrigger className="p-4 text-left hover:no-underline">
                <div className="flex flex-col w-full">
                  <Link href={`/test/${test.id}`} className="hover:underline text-base font-semibold text-primary" onClick={(e) => e.stopPropagation()}>
                    {formatTestNameForDisplay(test.name)}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">Suite: {test.suiteName}</p>
                  <div className="flex flex-wrap gap-2 text-xs mt-2 items-center">
                     <Badge variant="outline" style={{ borderColor: 'hsl(var(--chart-3))', color: 'hsl(var(--chart-3))' }}>
                      <CheckCircle className="h-3 w-3 mr-1.5"/> {test.passedCount} Passed
                    </Badge>
                     <Badge variant="outline" style={{ borderColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive))' }}>
                      <XCircle className="h-3 w-3 mr-1.5"/> {test.failedCount} Failed
                    </Badge>
                    <Badge variant="secondary">
                      <BarChartHorizontalBig className="h-3 w-3 mr-1.5"/> {test.totalRuns} Total Runs
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        <CalendarDays className="h-3 w-3 mr-1.5"/> 
                        Seen: {new Date(test.firstSeen).toLocaleDateString()} - {new Date(test.lastSeen).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <h4 className="text-sm font-semibold mb-2 text-foreground">Run History ({test.occurrences.length}):</h4>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2">
                  {test.occurrences.map((occ, occIndex) => (<div key={occIndex} className="flex justify-between items-center text-xs p-1.5 bg-muted/30 rounded-md">
                      <span>{new Date(occ.runTimestamp).toLocaleString()}</span>
                      <StatusBadge status={occ.status}/>
                    </div>))}
                </div>
              </AccordionContent>
            </AccordionItem>))}
        </Accordion>
      </CardContent>
    </Card>);
}
//# sourceMappingURL=FlakyTestsWidget.jsx.map