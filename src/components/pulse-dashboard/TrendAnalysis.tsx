
'use client';

import * as React from 'react';
import type { HistoricalTrend } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Terminal, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TrendAnalysisProps {
  trends: HistoricalTrend[];
  loading: boolean;
  error: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 border border-border rounded-md shadow-lg">
        <p className="label text-sm font-semibold text-foreground">{`Date: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="text-xs">
            {`${entry.name}: ${entry.value.toLocaleString()}${entry.name === 'Flakiness Rate (%)' ? '%' : ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


const TrendAnalysisComponent: React.FC<TrendAnalysisProps> = ({ trends, loading, error }) => {
  const outcomesChartRef = React.useRef<HTMLDivElement>(null);
  const durationChartRef = React.useRef<HTMLDivElement>(null);
  const flakinessChartRef = React.useRef<HTMLDivElement>(null);

  const formattedTrends = React.useMemo(() => {
    if (!trends || trends.length === 0) {
      return [];
    }
    // Assuming `trends` prop is already sorted by date from the API
    return trends.map(t => ({
      ...t,
      date: new Date(t.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      durationSeconds: parseFloat((t.duration / 1000).toFixed(2)),
      flakinessPercent: t.flakinessRate !== undefined && t.flakinessRate !== null 
        ? parseFloat((t.flakinessRate * 100).toFixed(1)) 
        : undefined,
    }));
  }, [trends]);

  const handleDownloadChart = async (chartRef: React.RefObject<HTMLDivElement>, fileName: string) => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: null,
          logging: false,
          useCORS: true,
          scale: 2,
        });
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = image;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error downloading chart:', err);
      }
    }
  };

  if (loading) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive" className="mt-4 shadow-md">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Historical Trends</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!trends || trends.length === 0) { // This check handles when original trends data is empty
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-headline text-primary">
            <TrendingUp className="h-7 w-7 mr-2" />
            Historical Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No historical trend data available. Ensure 'trend-*.json' files exist in 'public/pulse-report/history/' and are correctly formatted.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center">
          <TrendingUp className="h-7 w-7 mr-2" />
          Historical Trend Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-foreground">Test Outcomes Over Time</h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => handleDownloadChart(outcomesChartRef, 'test-outcomes-trend.png')} aria-label="Download Test Outcomes Chart">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download as PNG</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div ref={outcomesChartRef} className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }} />
                <Legend wrapperStyle={{fontSize: "12px"}} />
                <Line type="monotone" dataKey="passed" name="Passed" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="skipped" name="Skipped" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-foreground">Test Duration Over Time (Seconds)</h4>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => handleDownloadChart(durationChartRef, 'test-duration-trend.png')} aria-label="Download Test Duration Chart">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download as PNG</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div ref={durationChartRef} className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <Legend wrapperStyle={{fontSize: "12px"}} />
                <Bar dataKey="durationSeconds" name="Duration (s)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {formattedTrends.some(t => t.flakinessPercent !== undefined) && (
           <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-foreground">Flakiness Rate Over Time (%)</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => handleDownloadChart(flakinessChartRef, 'flakiness-rate-trend.png')} aria-label="Download Flakiness Rate Chart">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download as PNG</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div ref={flakinessChartRef} className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} unit="%"/>
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }} />
                  <Legend wrapperStyle={{fontSize: "12px"}} />
                  <Line type="monotone" dataKey="flakinessPercent" name="Flakiness Rate (%)" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

export const TrendAnalysis = React.memo(TrendAnalysisComponent);
TrendAnalysis.displayName = 'TrendAnalysis';
