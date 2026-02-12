'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, SkipForward, Clock, Terminal, ListFilter, AlertTriangle, Repeat, Zap } from 'lucide-react';
import { SystemInformationWidget } from './SystemInformationWidget';
import dynamic from 'next/dynamic'; // Import next/dynamic
import { getEffectiveTestStatus } from '@/lib/testUtils';
// Dynamically import DashboardOverviewCharts with ssr: false
const DynamicDashboardOverviewCharts = dynamic(() => import('./DashboardOverviewCharts').then(mod => mod.DashboardOverviewCharts), {
    ssr: false,
    loading: () => (<div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
        {[...Array(6)].map((_, i) => ( // Assuming 6 chart skeletons, matches loader in DashboardOverviewCharts
        <Card key={`loader-chart-${i}`} className="shadow-lg rounded-xl">
            <CardHeader>
              <Skeleton className="h-5 w-3/4 rounded-md"/>
              <Skeleton className="h-4 w-1/2 mt-1 rounded-md"/>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full rounded-lg"/>
            </CardContent>
          </Card>))}
      </div>),
});
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
    const environmentData = currentRun?.run?.environment || currentRun?.environment;
    if (error && !runMetadata) {
        return (<Alert variant="destructive" className="col-span-full md:col-span-2 lg:col-span-5">
        <Terminal className="h-4 w-4"/>
        <AlertTitle>Error Fetching Summary Metrics</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    if (loading && !runMetadata) {
        return (<>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (<Card key={i} className="shadow-lg rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-24"/>
                <Skeleton className="h-6 w-6"/>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16"/>
                <Skeleton className="h-4 w-32 mt-1"/>
              </CardContent>
            </Card>))}
        </div>
        <SystemInformationWidget environmentInfo={null} loading={true} error={null}/>
        {/* Skeleton for charts will be handled by DynamicDashboardOverviewCharts's loader */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
            {[...Array(6)].map((_, i) => (<Card key={`skeleton-chart-main-${i}`} className="shadow-lg rounded-xl">
                    <CardHeader>
                        <Skeleton className="h-5 w-3/4 rounded-md"/>
                        <Skeleton className="h-4 w-1/2 mt-1 rounded-md"/>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full rounded-lg"/>
                    </CardContent>
                </Card>))}
        </div>
      </>);
    }
    // Calculate strict counts based on getEffectiveTestStatus
    const counts = {
        total: currentRun?.results?.length || 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        totalRetries: 0,
        retriedTests: 0,
        sumDuration: 0,
    };
    currentRun?.results?.forEach((test) => {
        const effectiveStatus = getEffectiveTestStatus(test);
        if (effectiveStatus === 'passed')
            counts.passed++;
        else if (effectiveStatus === 'failed' || effectiveStatus === 'timedOut')
            counts.failed++;
        else if (effectiveStatus === 'skipped')
            counts.skipped++;
        else if (effectiveStatus === 'flaky')
            counts.flaky++;
        // Retry stats
        if (test.retryHistory && test.retryHistory.length > 0) {
            const unsuccessfulRetries = test.retryHistory.filter(attempt => attempt.status === 'failed' || attempt.status === 'timedOut' || attempt.status === 'flaky');
            if (unsuccessfulRetries.length > 0) {
                counts.totalRetries += unsuccessfulRetries.length;
                counts.retriedTests++;
            }
        }
        counts.sumDuration += test.duration || 0;
    });
    const avgDuration = counts.total > 0 ? counts.sumDuration / counts.total : 0;
    const metrics = runMetadata ? [
        { title: 'Total Tests', value: counts.total.toString(), icon: <ListFilter className="h-5 w-5 text-muted-foreground"/>, change: null, filterKey: 'all' },
        { title: 'Passed', value: counts.passed.toString(), icon: <CheckCircle className="h-5 w-5 text-[hsl(var(--chart-3))]"/>, change: `${counts.total > 0 ? ((counts.passed / counts.total) * 100).toFixed(1) : '0.0'}% pass rate`, filterKey: 'passed' },
        { title: 'Flaky', value: counts.flaky.toString(), icon: <AlertTriangle className="h-5 w-5 text-[hsl(var(--flaky))]"/>, change: `${counts.total > 0 ? ((counts.flaky / counts.total) * 100).toFixed(1) : '0.0'}% flaky rate`, filterKey: 'flaky' },
        { title: 'Failed', value: counts.failed.toString(), icon: <XCircle className="h-5 w-5 text-destructive"/>, change: `${counts.total > 0 ? ((counts.failed / counts.total) * 100).toFixed(1) : '0.0'}% fail rate`, filterKey: 'failed' },
        { title: 'Skipped', value: counts.skipped.toString(), icon: <SkipForward className="h-5 w-5 text-[hsl(var(--accent))]"/>, change: `${counts.total > 0 ? ((counts.skipped / counts.total) * 100).toFixed(1) : '0.0'}% skip rate`, filterKey: 'skipped' },
        { title: 'Total Retries Count', value: counts.totalRetries.toString(), icon: <Repeat className="h-5 w-5 text-orange-500"/>, change: `${counts.retriedTests} tests retried`, filterKey: null },
        { title: 'Avg. Test Time', value: formatDuration(avgDuration), icon: <Zap className="h-5 w-5 text-yellow-500"/>, change: `Average per test`, filterKey: null },
        { title: 'Duration', value: formatDuration(runMetadata.duration), icon: <Clock className="h-5 w-5 text-primary"/>, change: `Total execution time`, filterKey: null },
    ] : [];
    const handleCardClick = (filterKey) => {
        if (filterKey && onMetricClick) {
            onMetricClick(filterKey);
        }
    };
    const getLastUpdatedText = () => {
        if (!runMetadata?.timestamp)
            return 'Just now';
        const startTime = new Date(runMetadata.timestamp).getTime();
        const now = Date.now();
        const diffMinutes = Math.floor((now - startTime) / (1000 * 60));
        if (diffMinutes < 1)
            return 'Just now';
        if (diffMinutes === 1)
            return '1 min ago';
        if (diffMinutes < 60)
            return `${diffMinutes} mins ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours === 1)
            return '1 hour ago';
        return `${diffHours} hours ago`;
    };
    return (<>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map(metric => (<Card key={metric.title} className={`relative overflow-hidden shadow-2xl hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.3)] transition-all duration-500 rounded-2xl border-0 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm group ${metric.filterKey && onMetricClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`} onClick={() => handleCardClick(metric.filterKey)} tabIndex={metric.filterKey && onMetricClick ? 0 : -1} onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && metric.filterKey && onMetricClick) {
                    handleCardClick(metric.filterKey);
                }
            }} role={metric.filterKey && onMetricClick ? "button" : undefined} aria-label={metric.filterKey && onMetricClick ? `View ${metric.filterKey} tests` : undefined}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground/90 uppercase tracking-wide">{metric.title}</CardTitle>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center backdrop-blur-sm">
                {metric.icon}
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-extrabold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{metric.value}</div>
              {metric.change && <p className="text-xs font-medium text-muted-foreground/70 pt-1.5">{metric.change}</p>}
            </CardContent>
          </Card>))}
         {loading && runMetadata && ([...Array(5 - metrics.length)].map((_, i) => (<Card key={`loading-${i}`} className="shadow-lg rounded-xl">
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
      <SystemInformationWidget environmentInfo={environmentData} loading={loading} error={error}/>
      <DynamicDashboardOverviewCharts currentRun={currentRun} loading={loading} error={error}/>
    </>);
}
//# sourceMappingURL=SummaryMetrics.jsx.map