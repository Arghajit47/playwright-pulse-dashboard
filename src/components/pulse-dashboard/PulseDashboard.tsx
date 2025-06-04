
'use client';

import { useTestData } from '@/hooks/useTestData';
import { SummaryMetrics } from './SummaryMetrics';
import { LiveTestResults } from './LiveTestResults';
import { TrendAnalysis } from './TrendAnalysis';
import { FailurePatternAnalyzer } from './FailurePatternAnalyzer';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PulseDashboard() {
  const { 
    currentRun, 
    historicalTrends, 
    loadingCurrent, 
    loadingHistorical, 
    errorCurrent, 
    errorHistorical 
  } = useTestData();

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">
          Pulse Dashboard
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Real-time Playwright Test Execution Monitoring & Analysis
        </p>
      </header>

      <section aria-labelledby="summary-metrics">
        <h2 id="summary-metrics" className="sr-only">Summary Metrics</h2>
        <SummaryMetrics metadata={currentRun?.metadata || null} loading={loadingCurrent} />
      </section>
      
      <Separator className="my-8" />

      <Tabs defaultValue="live-results" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
          <TabsTrigger value="live-results">Live Test Results</TabsTrigger>
          <TabsTrigger value="trend-analysis">Trend Analysis</TabsTrigger>
          <TabsTrigger value="failure-analyzer">AI Failure Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="live-results">
          <section aria-labelledby="live-results-tab">
            <h2 id="live-results-tab" className="sr-only">Live Test Results</h2>
            <LiveTestResults report={currentRun} loading={loadingCurrent} error={errorCurrent} />
          </section>
        </TabsContent>

        <TabsContent value="trend-analysis">
          <section aria-labelledby="trend-analysis-tab">
            <h2 id="trend-analysis-tab" className="sr-only">Trend Analysis</h2>
            <TrendAnalysis trends={historicalTrends} loading={loadingHistorical} error={errorHistorical} />
          </section>
        </TabsContent>
        
        <TabsContent value="failure-analyzer">
          <section aria-labelledby="failure-analyzer-tab">
            <h2 id="failure-analyzer-tab" className="sr-only">Failure Pattern Analyzer</h2>
            <FailurePatternAnalyzer />
          </section>
        </TabsContent>
      </Tabs>
      
      <footer className="text-center mt-12 py-6 border-t">
        <p className="text-sm text-muted-foreground">
          Pulse Dashboard &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
