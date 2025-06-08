
'use client';

import type { DetailedTestResult } from '@/types/playwright';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, Clock, Eye, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestItemProps {
  test: DetailedTestResult;
}

function StatusIcon({ status }: { status: DetailedTestResult['status'] }) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'skipped':
      return <AlertCircle className="h-5 w-5 text-accent" />;
    case 'timedOut':
      return <Clock className="h-5 w-5 text-destructive" />;
    case 'pending':
      return <Clock className="h-5 w-5 text-primary animate-pulse" />;
    default:
      return null;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTestName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.split(" > ");
  return parts[parts.length - 1] || fullName;
}

function getStatusBadgeClass(status: DetailedTestResult['status']): string {
  switch (status) {
    case 'passed':
      return 'bg-[hsl(var(--chart-3))] text-primary-foreground hover:bg-[hsl(var(--chart-3))]';
    case 'failed':
    case 'timedOut':
      return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
    case 'skipped':
      return 'bg-[hsl(var(--accent))] text-accent-foreground hover:bg-[hsl(var(--accent))]';
    case 'pending':
      return 'bg-primary text-primary-foreground hover:bg-primary/90';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getAssetPath(relativePath: string | undefined | null): string {
  if (!relativePath || typeof relativePath !== 'string' || relativePath.trim() === '') return '#';
  if (relativePath.startsWith('http')) {
    return relativePath;
  }
  if (relativePath.startsWith('/')) {
    return relativePath;
  }
  return `/${relativePath}`;
}

export function TestItem({ test }: TestItemProps) {
  const validScreenshots = (test.screenshots || []).filter(p => typeof p === 'string' && p.trim() !== '');
  const hasDetailsInAccordion = test.errorMessage || validScreenshots.length > 0;
  const displayName = formatTestName(test.name);

  return (
    <div className="border-b border-border last:border-b-0 py-3 hover:bg-muted/10 transition-colors duration-200 px-4 rounded-md mb-2 shadow-sm bg-card hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <StatusIcon status={test.status} />
          <Link href={`/test/${test.id}`} className="font-medium text-foreground text-sm md:text-base hover:underline truncate" title={test.name}>
            {displayName}
          </Link>
        </div>
        <div className="flex items-center space-x-3 ml-2 flex-shrink-0">
          <Badge 
            className={cn(
              "capitalize text-xs px-2 py-0.5 border-transparent",
              getStatusBadgeClass(test.status)
            )}
          >
            {test.status}
          </Badge>
          <span className="text-sm text-muted-foreground w-20 text-right">{formatDuration(test.duration)}</span>
           <Link href={`/test/${test.id}`} aria-label={`View details for ${displayName}`}>
            <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>
      {hasDetailsInAccordion && (
        <Accordion type="single" collapsible className="w-full mt-2">
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="text-xs py-1 px-1 hover:no-underline text-muted-foreground justify-start hover:bg-accent/10 rounded-sm [&[data-state=open]>svg]:ml-2">
                Quick Look
            </AccordionTrigger>
            <AccordionContent className="pt-2 pl-2 pr-2 pb-1 bg-muted/20 rounded-md">
              {test.errorMessage && (
                <div className="mb-3">
                  <h4 className="font-semibold text-xs text-destructive mb-1">Error:</h4>
                  <pre className="bg-destructive/10 text-destructive text-xs p-2 rounded-md whitespace-pre-wrap break-all font-code max-h-20 overflow-y-auto">{test.errorMessage}</pre>
                </div>
              )}
              {validScreenshots.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs text-primary mb-1">Screenshots:</h4>
                   <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                    {validScreenshots.slice(0,4).map((path, index) => {
                        const imageSrc = getAssetPath(path);
                        if (imageSrc === '#') return null;
                        return (
                         <a key={`img-thumb-${index}`} href={imageSrc} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-sm overflow-hidden group border hover:border-primary">
                            <Image 
                                src={imageSrc}
                                alt={`Screenshot ${index + 1}`} 
                                fill={true}
                                style={{objectFit: "cover"}}
                                className="group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white"/>
                            </div>
                         </a>
                        );
                    })}
                    </div>
                </div>
              )}
               {(!test.errorMessage && validScreenshots.length === 0) && (
                  <p className="text-xs text-muted-foreground">No error or screenshots for quick look. Click to view full details.</p>
               )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
