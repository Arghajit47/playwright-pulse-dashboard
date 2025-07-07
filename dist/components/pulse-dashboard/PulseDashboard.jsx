'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTestData } from '@/hooks/useTestData';
import { SummaryMetrics } from './SummaryMetrics';
import { LiveTestResults } from './LiveTestResults';
import { TrendAnalysis } from './TrendAnalysis';
import { FlakyTestsWidget } from './FlakyTestsWidget';
import { SettingsView } from './SettingsView';
import { FailureCategorizationView } from './FailureCategorizationView';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { LayoutDashboard, ListChecks, TrendingUp, Settings, Repeat, ListX, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
export function PulseDashboard() {
    const { currentRun, historicalTrends, loadingCurrent, loadingHistorical, errorCurrent, errorHistorical } = useTestData();
    const [activeView, setActiveView] = useState('dashboard');
    const [initialLiveResultsFilter, setInitialLiveResultsFilter] = useState(undefined);
    const [linkColor, setLinkColor] = useState('#7737BF'); // For footer link
    const handleMetricCardClick = (filter) => {
        setInitialLiveResultsFilter(filter);
        setActiveView('live-results');
    };
    useEffect(() => {
        if (activeView !== 'live-results' && initialLiveResultsFilter) {
            setInitialLiveResultsFilter(undefined);
        }
    }, [activeView, initialLiveResultsFilter]);
    const allMenuItemsConfig = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: "Real-time Playwright Test Execution Monitoring & Analysis Overview", labelColorVar: '--sidebar-tab-dashboard-color-hsl' },
        { id: 'live-results', label: 'Test Results', icon: ListChecks, description: "Detailed view of the latest test run results with filters.", labelColorVar: '--sidebar-tab-results-color-hsl' },
        { id: 'trend-analysis', label: 'Trend Analysis', icon: TrendingUp, description: "Historical data visualization for test performance.", labelColorVar: '--sidebar-tab-trends-color-hsl' },
        { id: 'flaky-tests', label: 'Flaky Tests', icon: Repeat, description: "Analysis of historically flaky tests.", labelColorVar: '--sidebar-tab-flaky-color-hsl' },
        { id: 'failure-categorization', label: 'Failure Categorization', icon: ListX, description: "Categorize and view common failure types.", labelColorVar: '--sidebar-tab-failures-color-hsl' },
        { id: 'settings', label: 'Settings', icon: Settings, description: "Configure dashboard appearance and preferences.", labelColorVar: '--sidebar-tab-settings-color-hsl' },
    ];
    const settingsMenuItem = allMenuItemsConfig.find(item => item.id === 'settings');
    const mainMenuItems = allMenuItemsConfig.filter(item => item.id !== 'settings');
    const activeMenuItem = allMenuItemsConfig.find(item => item.id === activeView);
    let componentToRender;
    switch (activeView) {
        case 'dashboard':
            componentToRender = <SummaryMetrics currentRun={currentRun} loading={loadingCurrent} error={errorCurrent} onMetricClick={handleMetricCardClick}/>;
            break;
        case 'live-results':
            componentToRender = <LiveTestResults report={currentRun} loading={loadingCurrent} error={errorCurrent} initialFilter={initialLiveResultsFilter}/>;
            break;
        case 'trend-analysis':
            componentToRender = <TrendAnalysis trends={historicalTrends} loading={loadingHistorical} error={errorHistorical}/>;
            break;
        case 'flaky-tests':
            componentToRender = <FlakyTestsWidget />;
            break;
        case 'failure-categorization':
            componentToRender = <FailureCategorizationView />;
            break;
        case 'settings':
            componentToRender = <SettingsView />;
            break;
        default:
            componentToRender = <SummaryMetrics currentRun={currentRun} loading={loadingCurrent} error={errorCurrent} onMetricClick={handleMetricCardClick}/>;
    }
    return (<SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-lg">
        <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2 flex items-center justify-between group-data-[collapsible=icon]:justify-center border-b border-sidebar-border">
          <Link href="/" className="flex items-center" onClick={() => setActiveView("dashboard")}>
            <Image src="https://i.postimg.cc/v817w4sg/logo.png" alt="Pulse Dashboard Logo" width={120} // Adjusted width for the new logo
     height={30} // Adjusted height for the new logo
     style={{ objectFit: "fill" }} // Ensures the logo scales nicely
     className="transition-all duration-200" data-ai-hint="pulse logo"/>
            <span style={{ marginLeft: "10px", color: "#489ef9", fontWeight: 900 }}>
              PULSE DASHBOARD
            </span>
          </Link>
          <SidebarTrigger className="md:hidden"/>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {mainMenuItems.map((item) => (<SidebarMenuItem key={item.id}>
                <SidebarMenuButton onClick={() => {
                setActiveView(item.id);
            }} isActive={activeView === item.id} tooltip={{
                children: item.label,
                side: "right",
                align: "center",
            }}>
                  <item.icon className="h-5 w-5"/>
                  <span style={activeView === item.id
                ? undefined // Active: inherit color from button's active state
                : item.labelColorVar
                    ? { color: `hsl(var(${item.labelColorVar}))` } // Inactive: use labelColorVar
                    : undefined}>
                    {item.label}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
          {settingsMenuItem && (<SidebarMenu className="group-data-[collapsible=icon]:py-2">
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => {
                setActiveView(settingsMenuItem.id);
            }} isActive={activeView === settingsMenuItem.id} tooltip={{
                children: settingsMenuItem.label,
                side: "right",
                align: "center",
            }}>
                  <settingsMenuItem.icon className="h-5 w-5"/>
                  <span className="group-data-[collapsible=icon]:hidden" style={activeView === settingsMenuItem.id
                ? undefined // Active: inherit color from button's active state
                : settingsMenuItem.labelColorVar
                    ? {
                        color: `hsl(var(${settingsMenuItem.labelColorVar}))`,
                    } // Inactive: use labelColorVar
                    : undefined}>
                    {settingsMenuItem.label}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>)}
          <div className="pt-2 group-data-[collapsible=icon]:hidden">
            <SidebarSeparator className="my-1 group-data-[collapsible=icon]:hidden"/>
            <div className="flex items-center justify-center gap-1.5 text-xs p-2">
              <ShieldCheck className="h-3.5 w-3.5 text-sidebar-foreground/70"/>
              <span className="font-medium text-sidebar-foreground">
                Version
              </span>
              <span className="text-muted-foreground/80">1.1.2</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="container mx-auto p-6 md:p-8 space-y-6 min-h-screen flex flex-col rounded-xl shadow-lg bg-background">
          <header className="mb-0">
            <h1 className="text-3xl font-bold font-headline text-primary tracking-tight">
              {activeMenuItem?.label || "Pulse Dashboard"}
            </h1>
            <p className="text-md text-muted-foreground mt-1">
              {activeMenuItem?.description ||
            "Real-time Playwright Test Execution Monitoring & Analysis Overview"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Latest Run Date:{" "}
              {loadingCurrent ? (<span className="text-muted-foreground">Loading...</span>) : currentRun?.run?.timestamp ? (<span className="text-muted-foreground font-medium">
                  {new Date(currentRun.run.timestamp).toLocaleString()}
                </span>) : errorCurrent ? (<span className="text-destructive font-medium">
                  Error loading data
                </span>) : (<span className="text-muted-foreground font-medium">
                  Not available
                </span>)}
            </p>
          </header>

          <main className="flex-grow mt-6">{componentToRender}</main>

          <footer style={{
            padding: "0.5rem",
            boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
            textAlign: "center",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            marginTop: "auto", // Ensures footer is at the bottom
        }} className="text-foreground">
            <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            letterSpacing: "0.5px",
        }}>
              <span>Created by</span>
              <a href="https://github.com/Arghajit47" target="_blank" rel="noopener noreferrer" style={{
            color: linkColor,
            fontWeight: 700,
            fontStyle: "italic",
            textDecoration: "none",
            transition: "all 0.2s ease",
        }} onMouseOver={() => setLinkColor("#BF5C37")} onMouseOut={() => setLinkColor("#7737BF")}>
                Arghajit Singha
              </a>
            </div>
            <div style={{
            marginTop: "0.5rem",
            fontSize: "0.75rem",
        }} className="text-muted-foreground">
              Crafted with precision
            </div>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>);
}
//# sourceMappingURL=PulseDashboard.jsx.map