'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, SkipForward, Clock, Terminal, ListFilter } from 'lucide-react';
import { DashboardOverviewCharts } from './DashboardOverviewCharts';
function formatDuration(ms) {
    if (ms === 0)
        return '0s';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    let formatted = '';
    if (hours > 0)
        formatted += `${hours}h `;
    if (minutes > 0)
        formatted += `${minutes}m `;
    if (seconds > 0 || (hours === 0 && minutes === 0))
        formatted += `${seconds}s`;
    return formatted.trim() || '0s';
}
export function SummaryMetrics({ currentRun, loading, error, onMetricClick }) {
    const runMetadata = currentRun?.run;
    if (error && !runMetadata) { // Only show top-level error if no data at all
        return (<Alert variant="destructive" className="col-span-full md:col-span-2 lg:col-span-5">
        <Terminal className="h-4 w-4"/>
        <AlertTitle>Error Fetching Summary Metrics</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    if (loading && !runMetadata) {
        return (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (<Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-24"/>
              <Skeleton className="h-6 w-6"/>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16"/>
              <Skeleton className="h-4 w-32 mt-1"/>
            </CardContent>
          </Card>))}
      </div>);
    }
    const metrics = runMetadata ? [
        { title: 'Total Tests', value: runMetadata.totalTests.toString(), icon: <ListFilter className="h-5 w-5 text-muted-foreground"/>, change: null, filterKey: null },
        { title: 'Passed', value: runMetadata.passed.toString(), icon: <CheckCircle className="h-5 w-5 text-green-500"/>, change: `${runMetadata.totalTests > 0 ? ((runMetadata.passed / runMetadata.totalTests) * 100).toFixed(1) : '0.0'}% pass rate`, filterKey: 'passed' },
        { title: 'Failed', value: runMetadata.failed.toString(), icon: <XCircle className="h-5 w-5 text-destructive"/>, change: `${runMetadata.totalTests > 0 ? ((runMetadata.failed / runMetadata.totalTests) * 100).toFixed(1) : '0.0'}% fail rate`, filterKey: 'failed' },
        { title: 'Skipped', value: runMetadata.skipped.toString(), icon: <SkipForward className="h-5 w-5 text-accent"/>, change: null, filterKey: 'skipped' },
        { title: 'Duration', value: formatDuration(runMetadata.duration), icon: <Clock className="h-5 w-5 text-primary"/>, change: `Total execution time`, filterKey: null },
    ] : [];
    const handleCardClick = (filterKey) => {
        if (filterKey && onMetricClick) {
            onMetricClick(filterKey);
        }
    };
    return (<>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {metrics.map(metric => (<Card key={metric.title} className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${metric.filterKey && onMetricClick ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''}`} onClick={() => handleCardClick(metric.filterKey)} tabIndex={metric.filterKey && onMetricClick ? 0 : -1} onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && metric.filterKey && onMetricClick) {
                    handleCardClick(metric.filterKey);
                }
            }} role={metric.filterKey && onMetricClick ? "button" : undefined} aria-label={metric.filterKey && onMetricClick ? `View ${metric.filterKey} tests` : undefined}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{metric.value}</div>
              {metric.change && <p className="text-xs text-muted-foreground pt-1">{metric.change}</p>}
            </CardContent>
          </Card>))}
         {loading && runMetadata && ( // Show skeleton for cards if data is partially loaded
        [...Array(5 - metrics.length)].map((_, i) => (<Card key={`loading-${i}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-24"/>
                <Skeleton className="h-6 w-6"/>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16"/>
                <Skeleton className="h-4 w-32 mt-1"/>
              </CardContent>
            </Card>)))}
      </div>
      <DashboardOverviewCharts currentRun={currentRun} loading={loading} error={error}/>
    </>);
}
//# sourceMappingURL=SummaryMetrics.jsx.map