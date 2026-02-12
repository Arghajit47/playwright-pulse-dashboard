'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { TrendingUp, Terminal, Info, Users } from 'lucide-react';
const CustomTooltip = ({ active, payload, label, }) => {
    if (active && payload && payload.length) {
        return (<div className="custom-recharts-tooltip">
        <p className="label">{`Date: ${label}`}</p>
        {payload.map((entry, index) => (<p key={`item-${index}`} style={{ color: entry.color }} className="text-xs">
            {`${entry.name}: ${entry.value?.toLocaleString()}${entry.unit || ""}`}
          </p>))}
      </div>);
    }
    return null;
};
const DurationTooltip = ({ active, payload, }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const dateStr = new Date(data.dateRaw).toLocaleString();
        return (<div className="bg-[#0a0a0aeb] p-3 rounded-md shadow-2xl border border-white/10 text-white min-w-[180px] backdrop-blur-sm">
        <p className="font-bold text-sm mb-0.5">Run {new Date(data.dateRaw).getTime()}</p>
        <p className="text-[11px] text-gray-400 mb-2">Date: {dateStr}</p>
        <div className="flex items-center gap-1.5 text-[13px] mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff9800]"/>
          <span>Duration: <span className="font-bold">{data.durationSeconds}s</span></span>
        </div>
        <p className="text-[13px] mt-2 pt-2 border-t border-white/10 text-gray-300">
          Tests: {data.totalTests}
        </p>
      </div>);
    }
    return null;
};
const TrendAnalysisComponent = ({ trends, loading, error, currentResults, }) => {
    const outcomesChartRef = React.useRef(null);
    const durationChartRef = React.useRef(null);
    const describeDurationChartRef = React.useRef(null);
    const severityDistributionChartRef = React.useRef(null);
    const workerCountChartRef = React.useRef(null);
    const formattedTrends = React.useMemo(() => {
        if (!trends || trends.length === 0) {
            return [];
        }
        return trends.map((t, index) => ({
            ...t,
            date: new Date(t.date).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
            }),
            durationSeconds: parseFloat((t.duration / 1000).toFixed(2)),
            workerCount: t.workerCount, // workerCount is already a number or undefined
            flaky: t.flaky || 0, // Default to 0 if undefined to ensure line continuity
            runLabel: `Run ${index + 1}`, // Label like "Run 1", "Run 2"
            dateRaw: t.date, // Preserve raw date for full timestamp in tooltip
        }));
    }, [trends]);
    const describeDurationsData = React.useMemo(() => {
        console.log("[Describe Duration Chart] currentResults:", currentResults?.length, "items");
        if (!currentResults || currentResults.length === 0) {
            console.log("[Describe Duration Chart] No current results");
            return [];
        }
        const describeMap = new Map();
        let foundAnyDescribe = false;
        currentResults.forEach((test) => {
            if (test.describe) {
                const describeName = test.describe;
                if (!describeName ||
                    describeName.trim().toLowerCase() === "n/a" ||
                    describeName.trim() === "") {
                    return;
                }
                foundAnyDescribe = true;
                const fileName = test.spec_file || "Unknown File";
                const key = `${fileName}::${describeName}`;
                if (!describeMap.has(key)) {
                    describeMap.set(key, {
                        duration: 0,
                        file: fileName,
                        describe: describeName,
                    });
                }
                describeMap.get(key).duration += test.duration;
            }
        });
        if (!foundAnyDescribe) {
            console.log("[Describe Duration Chart] No valid describe blocks found");
            return [];
        }
        const result = Array.from(describeMap.values()).map((val) => ({
            describe: val.describe,
            duration: val.duration,
            durationSeconds: parseFloat((val.duration / 1000).toFixed(2)),
            file: val.file,
        }));
        console.log("[Describe Duration Chart] Processed data:", result.length, "describe blocks");
        return result;
    }, [currentResults]);
    const severityDistributionData = React.useMemo(() => {
        if (!currentResults || currentResults.length === 0) {
            return { series: [], categories: [] };
        }
        const severityLevels = ["Critical", "High", "Medium", "Low", "Minor"];
        const data = {
            passed: [0, 0, 0, 0, 0],
            failed: [0, 0, 0, 0, 0],
            skipped: [0, 0, 0, 0, 0],
            flaky: [0, 0, 0, 0, 0], // Added flaky
        };
        currentResults.forEach((test) => {
            const sev = test.severity || "Medium";
            const status = String(test.status).toLowerCase();
            let index = severityLevels.indexOf(sev);
            if (index === -1)
                index = 2;
            if (status === "passed") {
                data.passed[index]++;
            }
            else if (status === "flaky") { // Added flaky check
                data.flaky[index]++;
            }
            else if (status === "failed" ||
                status === "timedout" ||
                status === "interrupted") {
                data.failed[index]++;
            }
            else {
                data.skipped[index]++;
            }
        });
        const series = [
            { name: "Passed", data: data.passed },
            { name: "Failed", data: data.failed },
            { name: "Flaky", data: data.flaky }, // Added flaky series
            { name: "Skipped", data: data.skipped },
        ];
        return { series, categories: severityLevels };
    }, [currentResults]);
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
            <AlertTitle className="font-semibold">
              No Historical Data
            </AlertTitle>
            <AlertDescription>
              No historical trend data available. Ensure 'trend-*.json' files
              exist in 'pulse-report/history/' and are correctly formatted.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>);
    }
    const workerCountDataAvailable = formattedTrends.some((t) => typeof t.workerCount === "number" && t.workerCount > 0);
    return (<Card className="shadow-xl rounded-xl backdrop-blur-md bg-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center">
          <TrendingUp className="h-7 w-7 mr-2"/>
          Historical Trend Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-10 p-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-semibold text-foreground">
              Test Outcomes Over Time
            </h4>
          </div>
          <div ref={outcomesChartRef} className="w-full h-[350px] bg-muted/30 p-4 rounded-lg shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.2 }}/>
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                <Line type="monotone" dataKey="totalTests" name="Total Tests" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
                <Line type="monotone" dataKey="passed" name="Passed" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
                <Line type="monotone" dataKey="failed" name="Failed" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>

                <Line type="monotone" dataKey="flaky" name="Flaky" stroke="hsl(var(--flaky))" // Using flaky sky color
     strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
                <Line type="monotone" dataKey="skipped" name="Skipped" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-semibold text-foreground">
              Test Duration Over Time
            </h4>
          </div>
          <div ref={durationChartRef} className="w-full h-[350px] bg-muted/30 p-4 rounded-lg shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff9800" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ff9800" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <XAxis dataKey="runLabel" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} unit="s" name="Seconds"/>
                <RechartsTooltip content={<DurationTooltip />} cursor={{ stroke: '#ff9800', strokeWidth: 1 }}/>
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                <Area type="monotone" dataKey="durationSeconds" name="Duration (s)" stroke="#ff9800" fillOpacity={1} fill="url(#colorDuration)" strokeWidth={2.5} dot={{ r: 4, fill: '#ff9800', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#ff9800', stroke: '#fff', strokeWidth: 2 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {describeDurationsData.length > 0 && (<div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-semibold text-foreground">
                Test Describe Duration
              </h4>
            </div>
            <div ref={describeDurationChartRef} className="w-full h-[400px] bg-muted/30 p-4 rounded-lg shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={describeDurationsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="describe" hide={true} tick={false} axisLine={false}/>
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} label={{
                value: "Total Duration (s)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
            }}/>
                  <RechartsTooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (<div className="custom-recharts-tooltip">
                            <p className="label font-semibold">{`Describe: ${data.describe}`}</p>
                            <p className="text-xs" style={{ opacity: 0.8 }}>{`File: ${data.file}`}</p>
                            <p className="text-xs" style={{ color: payload[0].color }}>{`Duration: ${data.durationSeconds}s`}</p>
                          </div>);
                }
                return null;
            }} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.2 }}/>
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                  <Bar dataKey="durationSeconds" name="Duration (s)" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>)}

        {severityDistributionData.series.length > 0 && (<div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-semibold text-foreground">
                Severity Distribution
              </h4>
            </div>
            <div ref={severityDistributionChartRef} className="w-full h-[400px] bg-muted/30 p-4 rounded-lg shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityDistributionData.categories.map((category, idx) => {
                const dataPoint = { severity: category };
                severityDistributionData.series.forEach((s) => {
                    dataPoint[s.name] = s.data[idx];
                });
                return dataPoint;
            })} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="severity" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} label={{
                value: "Test Count",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
            }}/>
                  <RechartsTooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                    const validPayload = payload.filter((p) => p.value && Number(p.value) > 0);
                    if (validPayload.length === 0)
                        return null;
                    return (<div className="custom-recharts-tooltip">
                            <p className="label font-semibold">{`Severity: ${payload[0].payload.severity}`}</p>
                            {validPayload.map((entry, index) => (<p key={`item-${index}`} className="text-xs" style={{ color: entry.color }}>
                                {`${entry.name}: ${entry.value}`}
                              </p>))}
                            <p className="text-xs font-semibold mt-1">
                              {`Total: ${validPayload.reduce((sum, p) => sum + (p.value || 0), 0)}`}
                            </p>
                          </div>);
                }
                return null;
            }} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.2 }}/>
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                  <Bar dataKey="Passed" stackId="a" fill="hsl(var(--chart-3))" radius={[0, 0, 0, 0]}/>
                  <Bar dataKey="Failed" stackId="a" fill="hsl(var(--chart-4))" radius={[0, 0, 0, 0]}/>
                  <Bar dataKey="Flaky" stackId="a" fill="hsl(var(--flaky))" radius={[0, 0, 0, 0]}/>
                  <Bar dataKey="Skipped" stackId="a" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>)}

        {workerCountDataAvailable && (<div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-semibold text-foreground flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary"/> Active Worker
                Count Over Time
              </h4>
            </div>
            <div ref={workerCountChartRef} className="w-full h-[350px] bg-muted/30 p-4 rounded-lg shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedTrends.filter((t) => typeof t.workerCount === "number")} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} allowDecimals={false} domain={["dataMin", "dataMax"]}/>
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.2 }}/>
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}/>
                  <Line type="monotone" dataKey="workerCount" name="Active Workers" stroke="hsl(var(--chart-info))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} connectNulls={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: This chart shows the number of unique worker IDs detected in
              each historical run. Runs without worker information will not be
              plotted.
            </p>
          </div>)}
      </CardContent>
    </Card>);
};
export const TrendAnalysis = React.memo(TrendAnalysisComponent);
TrendAnalysis.displayName = 'TrendAnalysis';
//# sourceMappingURL=TrendAnalysis.jsx.map