
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTestData } from '@/hooks/useTestData';
import type { TestResult, Suite, TestAttachment } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, Paperclip, Image as ImageIcon, FileText, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

function StatusIcon({ status }: { status: TestResult['status'] }) {
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

function getAttachmentIcon(contentType: string) {
  if (contentType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-primary" />;
  if (contentType === 'application/zip' || contentType.includes('trace')) return <Paperclip className="h-5 w-5 text-blue-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}


export function TestDetailsClientPage({ testId }: { testId: string }) {
  const router = useRouter();
  const { currentRun, loadingCurrent, errorCurrent } = useTestData();
  const [test, setTest] = useState<TestResult | null>(null);
  const [suiteTitle, setSuiteTitle] = useState<string | null>(null);

  useEffect(() => {
    if (currentRun?.suites) {
      for (const suite of currentRun.suites) {
        const foundTest = suite.tests.find(t => t.id === testId);
        if (foundTest) {
          setTest(foundTest);
          setSuiteTitle(suite.title);
          break;
        }
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
            <Skeleton className="h-10 w-1/4 mb-4" />
            <Skeleton className="h-40 w-full" />
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
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
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
                <span className="ml-3">{test.title}</span>
                </CardTitle>
                {suiteTitle && <CardDescription className="mt-1 text-md">From suite: {suiteTitle}</CardDescription>}
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
              <TabsTrigger value="steps">Test Details</TabsTrigger>
              <TabsTrigger value="attachments">Attachments ({test.attachments?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="steps" className="mt-4 p-4 border rounded-md bg-card">
              <h3 className="text-lg font-semibold text-foreground mb-3">Execution Details</h3>
              {test.error ? (
                <div>
                  <h4 className="font-semibold text-md text-destructive mb-1">Error Message:</h4>
                  <pre className="bg-destructive/10 text-destructive text-sm p-4 rounded-md whitespace-pre-wrap break-all font-code overflow-x-auto">{test.error}</pre>
                </div>
              ) : (
                <p className="text-muted-foreground">No errors reported for this test.</p>
              )}
              <div className="mt-4">
                 <p className="text-sm text-muted-foreground">
                    This section shows the primary outcome of the test. For more granular step-by-step execution, refer to Playwright's trace viewer if available (often included in attachments).
                 </p>
              </div>
            </TabsContent>
            <TabsContent value="attachments" className="mt-4 p-4 border rounded-md bg-card">
              <h3 className="text-lg font-semibold text-foreground mb-4">Associated Files</h3>
              {test.attachments && test.attachments.length > 0 ? (
                <ul className="space-y-3">
                  {test.attachments.map((att, index) => (
                    <li key={index} className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-md border hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-3">
                        {getAttachmentIcon(att.contentType)}
                        <span className="font-medium">{att.name}</span>
                        <span className="text-xs text-muted-foreground">({att.contentType})</span>
                      </div>
                      {att.path && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={att.path.startsWith('http') ? att.path : `/${att.path}`} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1.5">
                            <ExternalLink className="h-4 w-4" />
                            <span>View / Download</span>
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No attachments available for this test.</p>
              )}
              
              {test.attachments?.some(att => att.contentType.startsWith('image/')) && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-foreground mb-3">Image Previews:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {test.attachments.filter(att => att.contentType.startsWith('image/')).map((att, index) => (
                      <a key={`img-preview-${index}`} href={att.path.startsWith('http') ? att.path : `/${att.path}`} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-lg overflow-hidden group border hover:border-primary transition-all">
                        <Image 
                          src={att.path.startsWith('http') ? att.path : `/${att.path}`}
                          alt={att.name} 
                          layout="fill" 
                          objectFit="cover" 
                          className="group-hover:scale-105 transition-transform duration-300"
                          data-ai-hint={att['data-ai-hint'] || 'screenshot test detail'}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                          <p className="text-white text-xs text-center break-all">{att.name}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Need to re-declare useState and useEffect here because they are not auto-imported by the Studio
// and this component will be in its own file.
import { useState, useEffect } from 'react';
