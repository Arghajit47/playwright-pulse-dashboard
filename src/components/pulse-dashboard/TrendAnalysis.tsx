
'use client';

import type { HistoricalTrend } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Terminal } from 'lucide-react';

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
            {`${entry.name}: ${entry.value.toLocaleString()}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


export function TrendAnalysis({ trends, loading, error }: TrendAnalysisProps) {
  if (loading) {
    return (
      <Card className="shadow-lg">
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
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Historical Trends</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!trends || trends.length === 0) {
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

  const formattedTrends = trends.map(t => ({
    ...t,
    date: new Date(t.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }), // Short date format
    durationSeconds: parseFloat((t.duration / 1000).toFixed(2)),
  })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ensure chronological for chart

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
          <h4 className="text-lg font-semibold text-foreground mb-3">Test Outcomes Over Time</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }} />
              <Legend wrapperStyle={{fontSize: "12px"}} />
              <Line type="monotone" dataKey="passed" name="Passed" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="failed" name="Failed" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="skipped" name="Skipped" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-foreground mb-3">Test Duration Over Time (Seconds)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
              <Legend wrapperStyle={{fontSize: "12px"}} />
              <Bar dataKey="durationSeconds" name="Duration (s)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {trends.some(t => t.flakinessRate !== undefined && t.flakinessRate !== null) && (
           <div>
            <h4 className="text-lg font-semibold text-foreground mb-3">Flakiness Rate Over Time (%)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formattedTrends.map(t => ({...t, flakinessPercent: (t.flakinessRate ?? 0) * 100 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} unit="%"/>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }} />
                <Legend wrapperStyle={{fontSize: "12px"}} />
                <Line type="monotone" dataKey="flakinessPercent" name="Flakiness Rate (%)" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

