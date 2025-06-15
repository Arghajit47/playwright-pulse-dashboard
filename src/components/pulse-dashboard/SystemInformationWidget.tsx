
'use client';

import type { EnvironmentInfo } from '@/types/playwright';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Server, Cpu, MemoryStick, Cog, Puzzle, Play, Terminal, Laptop, Info, Github, Briefcase, Globe, Compass, Chrome, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemInformationWidgetProps {
  environmentInfo: EnvironmentInfo | null | undefined;
  loading: boolean;
  error: string | null; // Though not directly used here, good for consistency
}

const getIcon = (key: string): React.ReactNode => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('os') || lowerKey.includes('operative system')) return <Laptop className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('cpu')) return <Cpu className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('mem') || lowerKey.includes('ram')) return <MemoryStick className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('node')) return <Cog className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('playwright')) return <Puzzle className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('y playwright')) return <Play className="h-4 w-4 text-primary" />; // Assuming "Playwright" if "playwright" is present
  if (lowerKey.includes('browser')) return <Globe className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('chromium') || lowerKey.includes('chrome')) return <Chrome className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('firefox')) return <Globe className="h-4 w-4 text-primary" />; // No specific Firefox icon in Lucide
  if (lowerKey.includes('webkit') || lowerKey.includes('safari')) return <Compass className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('provider') && (key.toLowerCase().includes('ci') || key.toLowerCase().includes('cd'))) return <Github className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('job') && (key.toLowerCase().includes('ci') || key.toLowerCase().includes('cd'))) return <Briefcase className="h-4 w-4 text-primary" />;
  if (lowerKey.includes('disk') || lowerKey.includes('storage')) return <HardDrive className="h-4 w-4 text-primary" />;
  return <Info className="h-4 w-4 text-primary" />;
};

const renderEnvironmentValue = (value: any, keyPrefix = ''): React.ReactNode => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-sm text-foreground">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside pl-4">
        {value.map((item, index) => (
          <li key={`${keyPrefix}-arr-${index}`} className="text-sm text-foreground">{renderEnvironmentValue(item, `${keyPrefix}-arr-item-${index}`)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object' && value !== null) {
    return (
      <div className="ml-4 mt-1 space-y-1 border-l pl-3 border-border">
        {Object.entries(value).map(([key, val]) => (
          <div key={`${keyPrefix}-${key}`} className="flex items-start space-x-2">
            <div className="flex-shrink-0 pt-0.5">{getIcon(key)}</div>
            <div className="flex-grow">
              <span className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
              {renderEnvironmentValue(val, `${keyPrefix}-${key}`)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-muted-foreground italic">N/A</span>;
};


export function SystemInformationWidget({ environmentInfo, loading }: SystemInformationWidgetProps) {
  if (loading) {
    return (
      <Card className="shadow-lg rounded-xl mt-6">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!environmentInfo || Object.keys(environmentInfo).length === 0) {
    return (
      <Card className="shadow-lg rounded-xl mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary flex items-center">
            <Server className="h-5 w-5 mr-2" /> System Information
          </CardTitle>
           <CardDescription className="text-xs">Details about the test execution environment.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="border-muted-foreground/30">
            <Info className="h-4 w-4" />
            <AlertTitle>No Environment Data</AlertTitle>
            <AlertDescription>
              Environment information is not available in the current report.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-xl mt-6 hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary flex items-center">
          <Server className="h-5 w-5 mr-2" /> System Information
        </CardTitle>
        <CardDescription className="text-xs">Details about the test execution environment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pr-2">
        {Object.entries(environmentInfo).map(([key, value]) => (
          <div key={key} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
            <div className="flex-shrink-0 pt-1">{getIcon(key)}</div>
            <div className="flex-grow">
              <span className="text-sm font-semibold text-muted-foreground capitalize">
                {key.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1").replace(/^./, str => str.toUpperCase())}:
              </span>
              {renderEnvironmentValue(value, key)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
