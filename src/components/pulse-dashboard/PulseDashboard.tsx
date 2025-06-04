
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTestData } from '@/hooks/useTestData';
import { SummaryMetrics } from './SummaryMetrics';
import { LiveTestResults, type TestStatusFilter } from './LiveTestResults';
import { TrendAnalysis } from './TrendAnalysis';
import { FailurePatternAnalyzer } from './FailurePatternAnalyzer';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter
} from '@/components/ui/sidebar';
import { LayoutDashboard, ListChecks, TrendingUp, Wand2 } from 'lucide-react';
import Link from 'next/link';


type ActiveView = 'dashboard' | 'live-results' | 'trend-analysis' | 'failure-analyzer';

interface MenuItem {
  id: ActiveView;
  label: string;
  icon: React.ElementType;
  description: string;
}

export function PulseDashboard() {
  const {
    currentRun,
    historicalTrends,
    loadingCurrent,
    loadingHistorical,
    errorCurrent,
    errorHistorical
  } = useTestData();

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [initialLiveResultsFilter, setInitialLiveResultsFilter] = useState<TestStatusFilter | undefined>(undefined);

  const handleMetricCardClick = (filter: TestStatusFilter) => {
    setInitialLiveResultsFilter(filter);
    setActiveView('live-results');
  };

  // Clear initial filter if navigating away from live results
  if (activeView !== 'live-results' && initialLiveResultsFilter) {
    setInitialLiveResultsFilter(undefined);
  }

  const menuItemsConfig: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: "Real-time Playwright Test Execution Monitoring & Analysis Overview" },
    { id: 'live-results', label: 'Live Test Results', icon: ListChecks, description: "Detailed view of the latest test run results with filters." },
    { id: 'trend-analysis', label: 'Trend Analysis', icon: TrendingUp, description: "Historical data visualization for test performance." },
    { id: 'failure-analyzer', label: 'AI Failure Analysis', icon: Wand2, description: "AI-powered analysis of test failure patterns." },
  ];

  const activeMenuItem = menuItemsConfig.find(item => item.id === activeView);

  let componentToRender;
  switch (activeView) {
    case 'dashboard':
      componentToRender = <SummaryMetrics currentRun={currentRun} loading={loadingCurrent} error={errorCurrent} onMetricClick={handleMetricCardClick} />;
      break;
    case 'live-results':
      componentToRender = <LiveTestResults report={currentRun} loading={loadingCurrent} error={errorCurrent} initialFilter={initialLiveResultsFilter} />;
      break;
    case 'trend-analysis':
      componentToRender = <TrendAnalysis trends={historicalTrends} loading={loadingHistorical} error={errorHistorical} />;
      break;
    case 'failure-analyzer':
      componentToRender = <FailurePatternAnalyzer />;
      break;
    default:
      componentToRender = <SummaryMetrics currentRun={currentRun} loading={loadingCurrent} error={errorCurrent} onMetricClick={handleMetricCardClick} />;
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between">
           <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden" onClick={() => setActiveView('dashboard')}>
            <Image
                src="https://i.postimg.cc/XqVn1NhF/pulse.png"
                alt="Pulse Dashboard Logo"
                width={32}
                height={32}
                className="rounded-sm"
                data-ai-hint="pulse logo"
            />
            <h2 className="font-semibold text-lg text-primary">Pulse</h2>
          </Link>
          <SidebarTrigger className="md:hidden group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItemsConfig.map(item => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id !== 'live-results') {
                       setInitialLiveResultsFilter(undefined);
                    }
                  }}
                  isActive={activeView === item.id}
                  tooltip={{children: item.label, side: 'right', align: 'center'}}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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
    </SidebarProvider>
  );
}
