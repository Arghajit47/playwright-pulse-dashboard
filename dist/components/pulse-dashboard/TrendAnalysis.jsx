'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendAnalysis = void 0;
const React = __importStar(require("react"));
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const skeleton_1 = require("@/components/ui/skeleton");
const alert_1 = require("@/components/ui/alert");
const recharts_1 = require("recharts");
const lucide_react_1 = require("lucide-react");
const html2canvas_1 = __importDefault(require("html2canvas"));
const tooltip_1 = require("@/components/ui/tooltip");
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (<div className="bg-card p-3 border border-border rounded-lg shadow-lg">
        <p className="label text-sm font-semibold text-foreground">{`Date: ${label}`}</p>
        {payload.map((entry, index) => (<p key={`item-${index}`} style={{ color: entry.color }} className="text-xs">
            {`${entry.name}: ${entry.value.toLocaleString()}${entry.name === 'Flakiness Rate (%)' ? '%' : ''}`}
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
    const handleDownloadChart = async (chartRef, fileName) => {
        if (chartRef.current) {
            try {
                const canvas = await (0, html2canvas_1.default)(chartRef.current, {
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
            }
            catch (err) {
                console.error('Error downloading chart:', err);
            }
        }
    };
    if (loading) {
        return (<card_1.Card className="shadow-xl rounded-lg">
        <card_1.CardHeader>
          <card_1.CardTitle><skeleton_1.Skeleton className="h-6 w-40 rounded-md"/></card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <skeleton_1.Skeleton className="h-64 w-full rounded-md"/>
          <skeleton_1.Skeleton className="h-64 w-full rounded-md"/>
        </card_1.CardContent>
      </card_1.Card>);
    }
    if (error) {
        return (<alert_1.Alert variant="destructive" className="mt-4 shadow-md rounded-lg">
        <lucide_react_1.Terminal className="h-4 w-4"/>
        <alert_1.AlertTitle>Error Fetching Historical Trends</alert_1.AlertTitle>
        <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
      </alert_1.Alert>);
    }
    if (!trends || trends.length === 0) { // This check handles when original trends data is empty
        return (<card_1.Card className="shadow-xl rounded-lg">
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center text-2xl font-headline text-primary">
            <lucide_react_1.TrendingUp className="h-7 w-7 mr-2"/>
            Historical Trend Analysis
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <p className="text-muted-foreground">No historical trend data available. Ensure 'trend-*.json' files exist in 'pulse-report/history/' and are correctly formatted.</p>
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<tooltip_1.TooltipProvider>
    <card_1.Card className="shadow-xl rounded-lg">
      <card_1.CardHeader>
        <card_1.CardTitle className="text-2xl font-headline text-primary flex items-center">
          <lucide_react_1.TrendingUp className="h-7 w-7 mr-2"/>
          Historical Trend Analysis
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-8">
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-foreground">Test Outcomes Over Time</h4>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(outcomesChartRef, 'test-outcomes-trend.png')} aria-label="Download Test Outcomes Chart" className="rounded-md">
                  <lucide_react_1.Download className="h-4 w-4"/>
                </button_1.Button>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent className="rounded-md">
                <p>Download as PNG</p>
              </tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
          </div>
          <div ref={outcomesChartRef} className="w-full h-[300px] bg-card p-4 rounded-lg shadow-inner">
            <recharts_1.ResponsiveContainer width="100%" height="100%">
              <recharts_1.LineChart data={formattedTrends}>
                <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <recharts_1.XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <recharts_1.YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <recharts_1.Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <recharts_1.Legend wrapperStyle={{ fontSize: "12px" }}/>
                <recharts_1.Line type="monotone" dataKey="passed" name="Passed" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}/>
                <recharts_1.Line type="monotone" dataKey="failed" name="Failed" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}/>
                <recharts_1.Line type="monotone" dataKey="skipped" name="Skipped" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}/>
              </recharts_1.LineChart>
            </recharts_1.ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-foreground">Test Duration Over Time (Seconds)</h4>
            <tooltip_1.Tooltip>
              <tooltip_1.TooltipTrigger asChild>
                <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(durationChartRef, 'test-duration-trend.png')} aria-label="Download Test Duration Chart" className="rounded-md">
                  <lucide_react_1.Download className="h-4 w-4"/>
                </button_1.Button>
              </tooltip_1.TooltipTrigger>
              <tooltip_1.TooltipContent className="rounded-md">
                <p>Download as PNG</p>
              </tooltip_1.TooltipContent>
            </tooltip_1.Tooltip>
          </div>
          <div ref={durationChartRef} className="w-full h-[300px] bg-card p-4 rounded-lg shadow-inner">
            <recharts_1.ResponsiveContainer width="100%" height="100%">
              <recharts_1.BarChart data={formattedTrends}>
                <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                <recharts_1.XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <recharts_1.YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                <recharts_1.Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                <recharts_1.Legend wrapperStyle={{ fontSize: "12px" }}/>
                <recharts_1.Bar dataKey="durationSeconds" name="Duration (s)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}/>
              </recharts_1.BarChart>
            </recharts_1.ResponsiveContainer>
          </div>
        </div>

        {formattedTrends.some(t => t.flakinessPercent !== undefined) && (<div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-foreground">Flakiness Rate Over Time (%)</h4>
              <tooltip_1.Tooltip>
                <tooltip_1.TooltipTrigger asChild>
                  <button_1.Button variant="outline" size="icon" onClick={() => handleDownloadChart(flakinessChartRef, 'flakiness-rate-trend.png')} aria-label="Download Flakiness Rate Chart" className="rounded-md">
                    <lucide_react_1.Download className="h-4 w-4"/>
                  </button_1.Button>
                </tooltip_1.TooltipTrigger>
                <tooltip_1.TooltipContent className="rounded-md">
                  <p>Download as PNG</p>
                </tooltip_1.TooltipContent>
              </tooltip_1.Tooltip>
            </div>
            <div ref={flakinessChartRef} className="w-full h-[300px] bg-card p-4 rounded-lg shadow-inner">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={formattedTrends}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <recharts_1.XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }}/>
                  <recharts_1.YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} unit="%"/>
                  <recharts_1.Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}/>
                  <recharts_1.Legend wrapperStyle={{ fontSize: "12px" }}/>
                  <recharts_1.Line type="monotone" dataKey="flakinessPercent" name="Flakiness Rate (%)" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>
            </div>
          </div>)}

      </card_1.CardContent>
    </card_1.Card>
    </tooltip_1.TooltipProvider>);
};
exports.TrendAnalysis = React.memo(TrendAnalysisComponent);
exports.TrendAnalysis.displayName = 'TrendAnalysis';
//# sourceMappingURL=TrendAnalysis.jsx.map