
'use client';

import { useState } from 'react';
import { useTestData } from '@/hooks/useTestData';
import { SummaryMetrics } from './SummaryMetrics';
import { LiveTestResults } from './LiveTestResults';
import { TrendAnalysis } from './TrendAnalysis';
import { FailurePatternAnalyzer } from './FailurePatternAnalyzer';
import { Button } from '@/components/ui/button';
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
import { LayoutDashboard, ListChecks, TrendingUp, Wand2, BarChartHorizontalBig } from 'lucide-react';

type ActiveView = 'dashboard' | 'live-results' | 'trend-analysis' | 'failure-analyzer';

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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: <SummaryMetrics metadata={currentRun?.metadata || null} loading={loadingCurrent} /> },
    { id: 'live-results', label: 'Live Test Results', icon: ListChecks, component: <LiveTestResults report={currentRun} loading={loadingCurrent} error={errorCurrent} /> },
    { id: 'trend-analysis', label: 'Trend Analysis', icon: TrendingUp, component: <TrendAnalysis trends={historicalTrends} loading={loadingHistorical} error={errorHistorical} /> },
    { id: 'failure-analyzer', label: 'AI Failure Analysis', icon: Wand2, component: <FailurePatternAnalyzer /> },
  ];

  const currentComponent = menuItems.find(item => item.id === activeView)?.component;

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between">
           <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <BarChartHorizontalBig className="h-5 w-5" />
            </Button>
            <h2 className="font-semibold text-lg text-primary">Pulse</h2>
          </div>
          <SidebarTrigger className="md:hidden group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  onClick={() => setActiveView(item.id as ActiveView)}
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
        <div className="container mx-auto px-4 py-8 space-y-8 min-h-screen flex flex-col">
          <header className="mb-0"> {/* Reduced mb from mb-8 */}
            <h1 className="text-3xl font-bold font-headline text-primary tracking-tight">
              {menuItems.find(item => item.id === activeView)?.label || "Pulse Dashboard"}
            </h1>
            <p className="text-md text-muted-foreground mt-1">
              {activeView === 'dashboard' && "Real-time Playwright Test Execution Monitoring & Analysis Overview"}
              {activeView === 'live-results' && "Detailed view of the latest test run results with filters."}
              {activeView === 'trend-analysis' && "Historical data visualization for test performance."}
              {activeView === 'failure-analyzer' && "AI-powered analysis of test failure patterns."}
            </p>
          </header>
          
          <main className="flex-grow">
            {currentComponent}
          </main>
          
          <footer className="text-center mt-8 py-4 border-t"> {/* Reduced mt from mt-12, py from py-6 */}
            <p className="text-sm text-muted-foreground">
              Pulse Dashboard &copy; {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

