
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTestData } from '@/hooks/useTestData';
import { SummaryMetrics } from './SummaryMetrics';
import { LiveTestResults, type TestStatusFilter } from './LiveTestResults';
import { TrendAnalysis } from './TrendAnalysis';
import { FlakyTestsWidget } from './FlakyTestsWidget';
import { SettingsView } from './SettingsView';
import { FailureCategorizationView } from './FailureCategorizationView';
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
import { LayoutDashboard, ListChecks, TrendingUp, Settings, Repeat, ListX, ShieldCheck } from 'lucide-react';
import Link from 'next/link';


type ActiveView = 'dashboard' | 'live-results' | 'trend-analysis' | 'flaky-tests' | 'settings' | 'failure-categorization';

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
  const [linkColor, setLinkColor] = useState('#7737BF'); // For footer link

  const handleMetricCardClick = (filter: TestStatusFilter) => {
    setInitialLiveResultsFilter(filter);
    setActiveView('live-results');
  };
  
  useEffect(() => {
    if (activeView !== 'live-results' && initialLiveResultsFilter) {
      setInitialLiveResultsFilter(undefined);
    }
  }, [activeView, initialLiveResultsFilter]);

  const menuItemsConfig: MenuItem[] = [
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
      componentToRender = <SummaryMetrics currentRun={currentRun} loading={loadingCurrent} error={errorCurrent} onMetricClick={handleMetricCardClick} />;
      break;
    case 'live-results':
      componentToRender = <LiveTestResults report={currentRun} loading={loadingCurrent} error={errorCurrent} initialFilter={initialLiveResultsFilter} />;
      break;
    case 'trend-analysis':
      componentToRender = <TrendAnalysis trends={historicalTrends} loading={loadingHistorical} error={errorHistorical} />;
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
      componentToRender = <SummaryMetrics currentRun={currentRun} loading={loadingCurrent} error={errorCurrent} onMetricClick={handleMetricCardClick} />;
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-lg">
        <SidebarHeader className="p-4 flex items-center justify-between border-b border-sidebar-border">
           <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden" onClick={() => setActiveView('dashboard')}>
            <Image
                src="https://i.postimg.cc/FHbZFDxq/pulse-removebg-preview.png"
                alt="Pulse Dashboard Logo"
                width={40}
                height={40}
                className="rounded-sm"
                data-ai-hint="pulse logo"
            />
            <h2 className="font-bold text-xl text-sidebar-foreground">Pulse</h2>
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
                  }}
                  isActive={activeView === item.id}
                  tooltip={{children: item.label, side: 'right', align: 'center'}}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-sidebar-foreground/70" />
              <span className="font-medium text-sidebar-foreground">Pulse</span>
              <span className="text-muted-foreground/80">v1.0</span>
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
              {activeMenuItem?.description || "Real-time Playwright Test Execution Monitoring & Analysis Overview"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Latest Run Date:{" "}
              {loadingCurrent ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : currentRun?.run?.timestamp ? (
                <span className="text-muted-foreground font-medium">{new Date(currentRun.run.timestamp).toLocaleString()}</span>
              ) : errorCurrent ? (
                <span className="text-destructive font-medium">Error loading data</span>
              ) : (
                <span className="text-muted-foreground font-medium">Not available</span>
              )}
            </p>
          </header>

          <main className="flex-grow mt-6">
            {componentToRender}
          </main>

          <footer
            style={{
              padding: '0.5rem',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              marginTop: 'auto', // Ensures footer is at the bottom
            }}
            className="text-foreground" 
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            >
              <span>Created by</span>
              <a
                href="https://github.com/Arghajit47"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: linkColor,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={() => setLinkColor('#BF5C37')}
                onMouseOut={() => setLinkColor('#7737BF')}
              >
                Arghajit Singha
              </a>
            </div>
            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
              }}
              className="text-muted-foreground"
            >
              Crafted with precision
            </div>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
