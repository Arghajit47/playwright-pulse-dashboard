
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { getFailurePatternAnalysis } from '@/app/actions';
import { Wand2, Terminal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function FailurePatternAnalyzer() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await getFailurePatternAnalysis();
      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
      } else {
        setError(result.error || 'Failed to get analysis.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <Wand2 className="h-7 w-7 mr-2"/>
            AI Failure Pattern Analysis
        </CardTitle>
        <CardDescription>
          Leverage AI to analyze historical test failures, identify potential root causes, and get suggestions for fixes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Analysis Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {analysis && !isLoading && (
          <ScrollArea className="h-72 w-full rounded-md border p-4 bg-muted/30">
            <h4 className="font-semibold text-foreground mb-2">AI Analysis Results:</h4>
            <pre className="text-sm whitespace-pre-wrap break-words font-sans text-foreground">{analysis}</pre>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAnalyze} disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Analyze Failure Patterns
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function Loader2Icon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    )
  }

