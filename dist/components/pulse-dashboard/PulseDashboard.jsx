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
import { SidebarProvider, Sidebar, SidebarHeader, SidebarTrigger, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarFooter } from '@/components/ui/sidebar';
import { LayoutDashboard, ListChecks, TrendingUp, Settings, Repeat, ListX } from 'lucide-react';
import Link from 'next/link';
export function PulseDashboard() {
    const { currentRun, historicalTrends, loadingCurrent, loadingHistorical, errorCurrent, errorHistorical } = useTestData();
    const [activeView, setActiveView] = useState('dashboard');
    const [initialLiveResultsFilter, setInitialLiveResultsFilter] = useState(undefined);
    const handleMetricCardClick = (filter) => {
        setInitialLiveResultsFilter(filter);
        setActiveView('live-results');
    };
    useEffect(() => {
        if (activeView !== 'live-results' && initialLiveResultsFilter) {
            setInitialLiveResultsFilter(undefined);
        }
    }, [activeView, initialLiveResultsFilter]);
    const menuItemsConfig = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: "Real-time Playwright Test Execution Monitoring & Analysis Overview" },
        { id: 'live-results', label: 'Test Results', icon: ListChecks, description: "Detailed view of the latest test run results with filters." },
        { id: 'trend-analysis', label: 'Trend Analysis', icon: TrendingUp, description: "Historical data visualization for test performance." },
        { id: 'flaky-tests', label: 'Flaky Tests', icon: Repeat, description: "Analysis of historically flaky tests." },
        { id: 'failure-categorization', label: 'Failure Categorization', icon: ListX, description: "Categorize and view common failure types." },
        { id: 'settings', label: 'Settings', icon: Settings, description: "Configure dashboard appearance and preferences." },
    ];
    const activeMenuItem = menuItemsConfig.find(item => item.id === activeView);
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
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4 flex items-start justify-between border-b border-sidebar-border">
           <Link href="/" className="flex items-start gap-2 group-data-[collapsible=icon]:hidden" onClick={() => setActiveView('dashboard')}>
            <Image src="https://i.postimg.cc/FHbZFDxq/pulse-removebg-preview.png" alt="Pulse Dashboard Logo" width={50} height={50} className="rounded-sm" data-ai-hint="pulse logo"/>
            <h2 className="font-bold text-lg text-primary">Pulse Dashboard</h2>
          </Link>
          <SidebarTrigger className="md:hidden group-data-[collapsible=icon]:hidden"/>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItemsConfig.map(item => (<SidebarMenuItem key={item.id}>
                <SidebarMenuButton onClick={() => {
                setActiveView(item.id);
            }} isActive={activeView === item.id} tooltip={{ children: item.label, side: 'right', align: 'center' }}>
                  <item.icon className="h-4 w-4"/>
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-muted-foreground">
              Pulse v1.0
            </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="container mx-auto px-4 py-6 space-y-6 min-h-screen flex flex-col">
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

          <footer className="text-center mt-auto py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Pulse Dashboard &copy; {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>);
}
//# sourceMappingURL=PulseDashboard.jsx.map