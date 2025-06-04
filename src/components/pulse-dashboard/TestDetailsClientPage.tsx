
'use client';

import { useRouter } from 'next/navigation'; // Keep useParams if needed for other things, but testId is a prop
import { useTestData } from '@/hooks/useTestData';
import type { DetailedTestResult, TestStep, ScreenshotAttachment } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, Paperclip, Image as ImageIcon, FileText, ExternalLink, LineChart } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { TestStepItemRecursive } from './TestStepItemRecursive';

function StatusIcon({ status }: { status: DetailedTestResult['status'] }) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    case 'failed':
      return <XCircle className="h-6 w-6 text-destructive" />;
    case 'skipped':
      return <AlertCircle className="h-6 w-6 text-accent" />;
    case 'timedOut':
      return <Clock className="h-6 w-6 text-destructive" />;
    case 'pending':
      return <Clock className="h-6 w-6 text-primary animate-pulse" />;
    default:
      return null;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = parseFloat((ms / 1000).toFixed(2));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = parseFloat((seconds % 60).toFixed(2));
  return `${minutes}m ${remainingSeconds}s`;
}

function getAttachmentIcon(contentType?: string) {
  if (contentType?.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-primary" />;
  if (contentType === 'application/zip' || contentType?.includes('trace')) return <Paperclip className="h-5 w-5 text-blue-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}


export function TestDetailsClientPage({ testId }: { testId: string }) {
  const router = useRouter();
  const { currentRun, loadingCurrent, errorCurrent } = useTestData();
  const [test, setTest] = useState<DetailedTestResult | null>(null);
  // suiteTitle is now directly on test object as suiteName

  useEffect(() => {
    if (currentRun?.results) {
      const foundTest = currentRun.results.find(t => t.id === testId);
      if (foundTest) {
        setTest(foundTest);
      } else {
        setTest(null); // Explicitly set to null if not found
      }
    }
  }, [currentRun, testId]);

  if (loadingCurrent) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-1/4 mb-4" /> {/* For TabsList */}
            <Skeleton className="h-40 w-full" /> {/* For TabContent */}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorCurrent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Error loading test data</AlertTitle>
          <AlertDescription>{errorCurrent}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Alert>
            <AlertTitle>Test Not Found</AlertTitle>
            <AlertDescription>The test with ID '{testId}' could not be found in the current report.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }
  
  const imageScreenshots = test.screenshots?.filter(s => s.contentType?.startsWith('image/')) || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Button onClick={() => router.push('/')} variant="outline" size="sm" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
                <CardTitle className="text-2xl font-headline text-primary flex items-center">
                <StatusIcon status={test.status} />
                <span className="ml-3">{test.name}</span>
                </CardTitle>
                {test.suiteName && <CardDescription className="mt-1 text-md">From suite: {test.suiteName}</CardDescription>}
                 <div className="mt-1 text-xs text-muted-foreground">
                    <p>ID: {test.id}</p>
                    {test.browser && <p>Browser: {test.browser}</p>}
                    {test.codeSnippet && <p>Defined at: {test.codeSnippet}</p>}
                 </div>
            </div>
            <div className="text-right flex-shrink-0">
                 <Badge variant={
                    test.status === 'passed' ? 'default' : 
                    test.status === 'failed' ? 'destructive' :
                    test.status === 'skipped' ? 'secondary' :
                    'outline'
                  } className="capitalize text-sm px-3 py-1">
                    {test.status}
                  </Badge>
                <p className="text-sm text-muted-foreground mt-1">Duration: {formatDuration(test.duration)}</p>
                <p className="text-xs text-muted-foreground">Retries: {test.retries}</p>
                {test.tags && test.tags.length > 0 && (
                    <div className="mt-1 space-x-1">
                        {test.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                    </div>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:w-auto lg:w-[600px]">
              <TabsTrigger value="steps">Execution Steps ({test.steps?.length || 0})</TabsTrigger>
              <TabsTrigger value="screenshots">Screenshots ({imageScreenshots.length || 0})</TabsTrigger>
              <TabsTrigger value="history">Test Run History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="steps" className="mt-4 p-1 md:p-4 border rounded-md bg-card">
              <h3 className="text-lg font-semibold text-foreground mb-3 px-3 md:px-0">Test Execution Steps</h3>
              {test.error && (
                 <div className="mb-4 p-3 md:p-0">
                  <h4 className="font-semibold text-md text-destructive mb-1">Overall Test Error:</h4>
                  <pre className="bg-destructive/10 text-destructive text-sm p-4 rounded-md whitespace-pre-wrap break-all font-code overflow-x-auto">{test.error}</pre>
                </div>
              )}
              {test.steps && test.steps.length > 0 ? (
                <ScrollArea className="h-[600px] w-full">
                  <div className="pr-4">
                    {test.steps.map((step, index) => (
                      <TestStepItemRecursive key={step.id || index} step={step} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground p-3 md:p-0">No detailed execution steps available for this test.</p>
              )}
            </TabsContent>

            <TabsContent value="screenshots" className="mt-4 p-4 border rounded-md bg-card">
              <h3 className="text-lg font-semibold text-foreground mb-4">Screenshots</h3>
              {imageScreenshots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imageScreenshots.map((att, index) => (
                    <a key={`img-preview-${index}`} href={att.path.startsWith('http') ? att.path : `/${att.path}`} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-lg overflow-hidden group border hover:border-primary transition-all">
                      <Image 
                        src={att.path.startsWith('http') ? att.path : `/${att.path}`}
                        alt={att.name || `screenshot ${index + 1}`}
                        layout="fill" 
                        objectFit="cover" 
                        className="group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint={att['data-ai-hint'] || 'screenshot test detail'}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                        <p className="text-white text-xs text-center break-all">{att.name || `Screenshot ${index + 1}`}</p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No screenshots available for this test.</p>
              )}
               <div className="mt-6 p-3 bg-muted/50 rounded-md border">
                 <p className="text-sm text-muted-foreground">
                    This tab displays screenshots captured during the test execution. 
                    For other types of attachments like trace files or logs, please check if they are linked within the specific test steps or provided through other reporting mechanisms.
                 </p>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4 p-4 border rounded-md bg-card">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                <LineChart className="h-5 w-5 mr-2 text-primary"/>
                Individual Test Run History
              </h3>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Feature Under Development</AlertTitle>
                <AlertDescription>
                  Displaying a detailed duration trend line chart for this specific test (with passed runs as green dots, 
                  failed as red, and skipped as yellow/orange) is planned for a future update. 
                  This enhancement requires a more granular historical data source that tracks individual test results (status and duration) across multiple runs.
                  The current historical data provides aggregated suite-level trends.
                  <br/><br/>
                  The "Trend Analysis" section on the main dashboard provides an overview of historical trends for the entire test suite.
                </AlertDescription>
              </Alert>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
