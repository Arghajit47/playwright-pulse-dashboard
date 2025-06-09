'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PulseDashboard = PulseDashboard;
const react_1 = require("react");
const image_1 = __importDefault(require("next/image"));
const useTestData_1 = require("@/hooks/useTestData");
const SummaryMetrics_1 = require("./SummaryMetrics");
const LiveTestResults_1 = require("./LiveTestResults");
const TrendAnalysis_1 = require("./TrendAnalysis");
const FlakyTestsWidget_1 = require("./FlakyTestsWidget");
const SettingsView_1 = require("./SettingsView");
const FailureCategorizationView_1 = require("./FailureCategorizationView");
const sidebar_1 = require("@/components/ui/sidebar");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
function PulseDashboard() {
    const { currentRun, historicalTrends, loadingCurrent, loadingHistorical, errorCurrent, errorHistorical } = (0, useTestData_1.useTestData)();
    const [activeView, setActiveView] = (0, react_1.useState)('dashboard');
    const [initialLiveResultsFilter, setInitialLiveResultsFilter] = (0, react_1.useState)(undefined);
    const [linkColor, setLinkColor] = (0, react_1.useState)('#7737BF'); // For footer link
    const handleMetricCardClick = (filter) => {
        setInitialLiveResultsFilter(filter);
        setActiveView('live-results');
    };
    (0, react_1.useEffect)(() => {
        if (activeView !== 'live-results' && initialLiveResultsFilter) {
            setInitialLiveResultsFilter(undefined);
        }
    }, [activeView, initialLiveResultsFilter]);
    const menuItemsConfig = [
        { id: 'dashboard', label: 'Dashboard', icon: lucide_react_1.LayoutDashboard, description: "Real-time Playwright Test Execution Monitoring & Analysis Overview" },
        { id: 'live-results', label: 'Test Results', icon: lucide_react_1.ListChecks, description: "Detailed view of the latest test run results with filters." },
        { id: 'trend-analysis', label: 'Trend Analysis', icon: lucide_react_1.TrendingUp, description: "Historical data visualization for test performance." },
        { id: 'flaky-tests', label: 'Flaky Tests', icon: lucide_react_1.Repeat, description: "Analysis of historically flaky tests." },
        { id: 'failure-categorization', label: 'Failure Categorization', icon: lucide_react_1.ListX, description: "Categorize and view common failure types." },
        { id: 'settings', label: 'Settings', icon: lucide_react_1.Settings, description: "Configure dashboard appearance and preferences." },
    ];
    const activeMenuItem = menuItemsConfig.find(item => item.id === activeView);
    let componentToRender;
    switch (activeView) {
        case 'dashboard':
            componentToRender = <SummaryMetrics_1.SummaryMetrics currentRun={currentRun} loading={loadingCurrent} error={errorCurrent} onMetricClick={handleMetricCardClick}/>;
            break;
        case 'live-results':
            componentToRender = <LiveTestResults_1.LiveTestResults report={currentRun} loading={loadingCurrent} error={errorCurrent} initialFilter={initialLiveResultsFilter}/>;
            break;
        case 'trend-analysis':
            componentToRender = <TrendAnalysis_1.TrendAnalysis trends={historicalTrends} loading={loadingHistorical} error={errorHistorical}/>;
            break;
        case 'flaky-tests':
            componentToRender = <FlakyTestsWidget_1.FlakyTestsWidget />;
            break;
        case 'failure-categorization':
            componentToRender = <FailureCategorizationView_1.FailureCategorizationView />;
            break;
        case 'settings':
            componentToRender = <SettingsView_1.SettingsView />;
            break;
        default:
            componentToRender = <SummaryMetrics_1.SummaryMetrics currentRun={currentRun} loading={loadingCurrent} error={errorCurrent} onMetricClick={handleMetricCardClick}/>;
    }
    return (<sidebar_1.SidebarProvider defaultOpen>
      <sidebar_1.Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-lg">
        <sidebar_1.SidebarHeader className="p-4 flex items-center justify-between border-b border-sidebar-border">
           <link_1.default href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden" onClick={() => setActiveView('dashboard')}>
            <image_1.default src="https://i.postimg.cc/FHbZFDxq/pulse-removebg-preview.png" alt="Pulse Dashboard Logo" width={40} height={40} className="rounded-sm" data-ai-hint="pulse logo"/>
            <h2 className="font-bold text-xl text-sidebar-foreground">Pulse</h2>
          </link_1.default>
          <sidebar_1.SidebarTrigger className="md:hidden group-data-[collapsible=icon]:hidden"/>
        </sidebar_1.SidebarHeader>
        <sidebar_1.SidebarContent>
          <sidebar_1.SidebarMenu>
            {menuItemsConfig.map(item => (<sidebar_1.SidebarMenuItem key={item.id}>
                <sidebar_1.SidebarMenuButton onClick={() => {
                setActiveView(item.id);
            }} isActive={activeView === item.id} tooltip={{ children: item.label, side: 'right', align: 'center' }}>
                  <item.icon className="h-5 w-5"/>
                  <span>{item.label}</span>
                </sidebar_1.SidebarMenuButton>
              </sidebar_1.SidebarMenuItem>))}
          </sidebar_1.SidebarMenu>
        </sidebar_1.SidebarContent>
        <sidebar_1.SidebarFooter className="p-4 mt-auto border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-muted-foreground">
              Pulse v1.0
            </p>
        </sidebar_1.SidebarFooter>
      </sidebar_1.Sidebar>
      <sidebar_1.SidebarInset>
        <div className="container mx-auto p-6 md:p-8 space-y-6 min-h-screen flex flex-col rounded-xl shadow-lg bg-background">
          <header className="mb-0">
            <h1 className="text-3xl font-bold font-headline text-primary tracking-tight">
              {activeMenuItem?.label || "Pulse Dashboard"}
            </h1>
            <p className="text-md text-muted-foreground mt-1">
              {activeMenuItem?.description || "Real-time Playwright Test Execution Monitoring & Analysis Overview"}
            </p>
          </header>

          <main className="flex-grow">
            {componentToRender}
          </main>

          <footer style={{
            padding: '0.5rem',
            boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            marginTop: 'auto', // Ensures footer is at the bottom
        }}>
            <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
        }} className="text-foreground">
              <span>Created by</span>
              <a href="https://github.com/Arghajit47" target="_blank" rel="noopener noreferrer" style={{
            color: linkColor,
            fontWeight: 700,
            fontStyle: 'italic',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
        }} onMouseOver={() => setLinkColor('#BF5C37')} onMouseOut={() => setLinkColor('#7737BF')}>
                Arghajit Singha
              </a>
            </div>
            <div style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
        }} className="text-muted-foreground">
              Crafted with precision
            </div>
          </footer>
        </div>
      </sidebar_1.SidebarInset>
    </sidebar_1.SidebarProvider>);
}
//# sourceMappingURL=PulseDashboard.jsx.map