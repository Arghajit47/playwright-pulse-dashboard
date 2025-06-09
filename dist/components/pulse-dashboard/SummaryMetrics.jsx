'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryMetrics = SummaryMetrics;
const card_1 = require("@/components/ui/card");
const skeleton_1 = require("@/components/ui/skeleton");
const alert_1 = require("@/components/ui/alert");
const lucide_react_1 = require("lucide-react");
const DashboardOverviewCharts_1 = require("./DashboardOverviewCharts");
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
function SummaryMetrics({ currentRun, loading, error, onMetricClick }) {
    const runMetadata = currentRun?.run;
    if (error && !runMetadata) { // Only show top-level error if no data at all
        return (<alert_1.Alert variant="destructive" className="col-span-full md:col-span-2 lg:col-span-5">
        <lucide_react_1.Terminal className="h-4 w-4"/>
        <alert_1.AlertTitle>Error Fetching Summary Metrics</alert_1.AlertTitle>
        <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    if (loading && !runMetadata) {
        return (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (<card_1.Card key={i} className="shadow-lg">
            <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <skeleton_1.Skeleton className="h-5 w-24"/>
              <skeleton_1.Skeleton className="h-6 w-6"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <skeleton_1.Skeleton className="h-8 w-16"/>
              <skeleton_1.Skeleton className="h-4 w-32 mt-1"/>
            </card_1.CardContent>
          </card_1.Card>))}
      </div>);
    }
    const metrics = runMetadata ? [
        { title: 'Total Tests', value: runMetadata.totalTests.toString(), icon: <lucide_react_1.ListFilter className="h-5 w-5 text-muted-foreground"/>, change: null, filterKey: null },
        { title: 'Passed', value: runMetadata.passed.toString(), icon: <lucide_react_1.CheckCircle className="h-5 w-5 text-green-500"/>, change: `${runMetadata.totalTests > 0 ? ((runMetadata.passed / runMetadata.totalTests) * 100).toFixed(1) : '0.0'}% pass rate`, filterKey: 'passed' },
        { title: 'Failed', value: runMetadata.failed.toString(), icon: <lucide_react_1.XCircle className="h-5 w-5 text-destructive"/>, change: `${runMetadata.totalTests > 0 ? ((runMetadata.failed / runMetadata.totalTests) * 100).toFixed(1) : '0.0'}% fail rate`, filterKey: 'failed' },
        { title: 'Skipped', value: runMetadata.skipped.toString(), icon: <lucide_react_1.SkipForward className="h-5 w-5 text-accent"/>, change: null, filterKey: 'skipped' },
        { title: 'Duration', value: formatDuration(runMetadata.duration), icon: <lucide_react_1.Clock className="h-5 w-5 text-primary"/>, change: `Total execution time`, filterKey: null },
    ] : [];
    const handleCardClick = (filterKey) => {
        if (filterKey && onMetricClick) {
            onMetricClick(filterKey);
        }
    };
    return (<>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {metrics.map(metric => (<card_1.Card key={metric.title} className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${metric.filterKey && onMetricClick ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''}`} onClick={() => handleCardClick(metric.filterKey)} tabIndex={metric.filterKey && onMetricClick ? 0 : -1} onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && metric.filterKey && onMetricClick) {
                    handleCardClick(metric.filterKey);
                }
            }} role={metric.filterKey && onMetricClick ? "button" : undefined} aria-label={metric.filterKey && onMetricClick ? `View ${metric.filterKey} tests` : undefined}>
            <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</card_1.CardTitle>
              {metric.icon}
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-3xl font-bold text-foreground">{metric.value}</div>
              {metric.change && <p className="text-xs text-muted-foreground pt-1">{metric.change}</p>}
            </card_1.CardContent>
          </card_1.Card>))}
         {loading && runMetadata && ( // Show skeleton for cards if data is partially loaded
        [...Array(5 - metrics.length)].map((_, i) => (<card_1.Card key={`loading-${i}`} className="shadow-lg">
              <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <skeleton_1.Skeleton className="h-5 w-24"/>
                <skeleton_1.Skeleton className="h-6 w-6"/>
              </card_1.CardHeader>
              <card_1.CardContent>
                <skeleton_1.Skeleton className="h-8 w-16"/>
                <skeleton_1.Skeleton className="h-4 w-32 mt-1"/>
              </card_1.CardContent>
            </card_1.Card>)))}
      </div>
      <DashboardOverviewCharts_1.DashboardOverviewCharts currentRun={currentRun} loading={loading} error={error}/>
    </>);
}
//# sourceMappingURL=SummaryMetrics.jsx.map