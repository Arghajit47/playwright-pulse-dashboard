'use client';

import { useTestData } from '@/hooks/useTestData';
import { SummaryMetrics } from './SummaryMetrics';
import { LiveTestResults } from './LiveTestResults';
import { TrendAnalysis } from './TrendAnalysis';
import { FailurePatternAnalyzer } from './FailurePatternAnalyzer';
import { Separator } from '@/components/ui/separator';

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

      <section aria-labelledby="live-results">
        <h2 id="live-results" className="sr-only">Live Test Results</h2>
        <LiveTestResults report={currentRun} loading={loadingCurrent} error={errorCurrent} />
      </section>

      <Separator className="my-8" />

      <section aria-labelledby="trend-analysis">
        <h2 id="trend-analysis" className="sr-only">Trend Analysis</h2>
        <TrendAnalysis trends={historicalTrends} loading={loadingHistorical} error={errorHistorical} />
      </section>

      <Separator className="my-8" />

      <section aria-labelledby="failure-analyzer">
        <h2 id="failure-analyzer" className="sr-only">Failure Pattern Analyzer</h2>
        <FailurePatternAnalyzer />
      </section>
      
      <footer className="text-center mt-12 py-6 border-t">
        <p className="text-sm text-muted-foreground">
          Pulse Dashboard &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
