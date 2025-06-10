'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Terminal, Download, Info } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (<div className="custom-recharts-tooltip">
        <p className="label">{`Date: ${label}`}</p>
        {payload.map((entry, index) => (<p key={`item-${index}`} style={{ color: entry.color }} className="text-xs">
            {`${entry.name}: ${entry.value?.toLocaleString()}${entry.unit || ''}`}
          </p>))}
      </div>);
    }
    return null;
};
const TrendAnalysisComponent = ({ trends, loading, error }) => {
    const outcomesChartRef = React.useRef(null);
    const durationChartRef = React.useRef(null);
    const flakinessChartRef = React.useRef(null);
    const formattedTrends = React.useMemo(() => {
        if (!trends || trends.length === 0) {
            return [];
        }
        return trends.map(t => ({
            ...t,
            date: new Date(t.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
            durationSeconds: parseFloat((t.duration / 1000).toFixed(2)),
            flakinessPercent: t.flakinessRate !== undefined && t.flakinessRate !== null
                ? parseFloat((t.flakinessRate * 100).toFixed(1))
                : undefined,
        }));
    }, [trends]);
    const handleDownloadChart = async (chartRef, fileName) => {
        if (chartRef.current) {
            try {
                const canvas = await html2canvas(chartRef.current, {
                    backgroundColor: null, // Use current background
                    logging: false,
                    useCORS: true,
                    scale: 2, // Higher resolution
                });
                const image = canvas.toDataURL('image/png', 1.0);
                const link = document.createElement('a');
                link.href = image;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            catch (err) {
                console.error('Error downloading chart:', err);
                // Consider adding a user-facing toast notification here
            }
        }
    };
    if (loading) {
        return (<Card className="shadow-xl rounded-xl backdrop-blur-md bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <TrendingUp className="h-7 w-7 mr-2"/>
            Historical Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 p-6">
          {[...Array(3)].map((_, i) => (<div key={i} className="bg-muted/30 p-4 rounded-lg shadow-inner">
               <Skeleton className="h-6 w-1/3 mb-4 rounded-md bg-muted/50"/>
               <Skeleton className="h-64 w-full rounded-md bg-muted/50"/>
             </div>))}
        </CardContent>
      </Card>);
    }
    if (error) {
        return (<Alert variant="destructive" className="mt-4 shadow-md rounded-lg">
        <Terminal className="h-4 w-4"/>
        <AlertTitle>Error Fetching Historical Trends</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    if (!trends || trends.length === 0) {
        return (<Card className="shadow-xl rounded-xl backdrop-blur-md bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <TrendingUp className="h-7 w-7 mr-2"/>
            Historical Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="rounded-lg border-primary/30 bg-primary/5 text-primary">
            <Info className="h-5 w-5 text-primary/80"/>
            <AlertTitle className="font-semibold">No Historical Data</AlertTitle>
            <AlertDescription>
              No historical trend data available. Ensure 'trend-*.json' files exist in 'pulse-report/history/' and are correctly formatted.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>);
    }
    return (<TooltipProvider>
    <Card className="shadow-xl rounded-xl backdrop-blur-md bg-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center">
          <TrendingUp className="h-7 w-7 mr-2"/>
          Historical Trend Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-10 p-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-semibold text-foreground">Test Outcomes Over Time</h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => handleDownloadChart(outcomesChartRef, 'test-outcomes-trend.png')} aria-label="Download Test Outcomes Chart" className="rounded-lg border-border/70 hover:border-primary/70">
                  <Download className="h-4 w-4"/>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-md shadow-lg">
                <p>Download as PNG</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div ref={outcomesChartRef} className="w-full h-[350px] bg-muted/30 p-4 rounded-lg shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.2 }}/>
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                <Line type="monotone" dataKey="totalTests" name="Total Tests" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
                <Line type="monotone" dataKey="passed" name="Passed" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
                <Line type="monotone" dataKey="failed" name="Failed" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
                <Line type="monotone" dataKey="skipped" name="Skipped" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-semibold text-foreground">Test Duration Over Time</h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => handleDownloadChart(durationChartRef, 'test-duration-trend.png')} aria-label="Download Test Duration Chart" className="rounded-lg border-border/70 hover:border-primary/70">
                  <Download className="h-4 w-4"/>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-md shadow-lg">
                <p>Download as PNG</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div ref={durationChartRef} className="w-full h-[350px] bg-muted/30 p-4 rounded-lg shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} unit="s" name="Seconds"/>
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.2 }}/>
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                <Bar dataKey="durationSeconds" name="Duration (s)" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} barSize={20}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {formattedTrends.some(t => t.flakinessPercent !== undefined) && (<div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-semibold text-foreground">Flakiness Rate Over Time</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => handleDownloadChart(flakinessChartRef, 'flakiness-rate-trend.png')} aria-label="Download Flakiness Rate Chart" className="rounded-lg border-border/70 hover:border-primary/70">
                    <Download className="h-4 w-4"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-md shadow-lg">
                  <p>Download as PNG</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div ref={flakinessChartRef} className="w-full h-[350px] bg-muted/30 p-4 rounded-lg shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} unit="%" name="Percentage"/>
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.2 }}/>
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                  <Line type="monotone" dataKey="flakinessPercent" name="Flakiness Rate (%)" stroke="hsl(var(--chart-info))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>)}

      </CardContent>
    </Card>
    </TooltipProvider>);
};
export const TrendAnalysis = React.memo(TrendAnalysisComponent);
TrendAnalysis.displayName = 'TrendAnalysis';
//# sourceMappingURL=TrendAnalysis.jsx.map