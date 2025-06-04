
'use client';

import type { TestResult, TestAttachment } from '@/types/playwright';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, Clock, Paperclip, Eye, ChevronRight } from 'lucide-react';

interface TestItemProps {
  test: TestResult;
}

function StatusIcon({ status }: { status: TestResult['status'] }) {
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

export function TestItem({ test }: TestItemProps) {
  const hasDetailsInAccordion = test.error || (test.attachments && test.attachments.length > 0);

  return (
    <div className="border-b border-border last:border-b-0 py-3 hover:bg-card/50 transition-colors duration-200 px-4 rounded-md mb-2 shadow-sm bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <StatusIcon status={test.status} />
          <Link href={`/test/${test.id}`} className="font-medium text-foreground text-sm md:text-base hover:underline truncate" title={test.title}>
            {test.title}
          </Link>
        </div>
        <div className="flex items-center space-x-3 ml-2 flex-shrink-0">
          <Badge variant={
            test.status === 'passed' ? 'default' : 
            test.status === 'failed' ? 'destructive' :
            test.status === 'skipped' ? 'secondary' :
            'outline'
          } className="capitalize text-xs px-2 py-0.5">
            {test.status}
          </Badge>
          <span className="text-sm text-muted-foreground w-20 text-right">{formatDuration(test.duration)}</span>
           <Link href={`/test/${test.id}`} aria-label={`View details for ${test.title}`}>
            <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>
      {hasDetailsInAccordion && (
        <Accordion type="single" collapsible className="w-full mt-2">
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="text-xs py-1 hover:no-underline text-muted-foreground justify-start [&[data-state=open]>svg]:ml-2">
                Quick Look
            </AccordionTrigger>
            <AccordionContent className="pt-2 pl-2 pr-2 pb-1 bg-muted/30 rounded-md">
              {test.error && (
                <div className="mb-3">
                  <h4 className="font-semibold text-xs text-destructive mb-1">Error:</h4>
                  <pre className="bg-destructive/10 text-destructive text-xs p-2 rounded-md whitespace-pre-wrap break-all font-code max-h-20 overflow-y-auto">{test.error}</pre>
                </div>
              )}
              {test.attachments && test.attachments.filter(att => att.contentType.startsWith('image/')).length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs text-primary mb-1">Screenshots:</h4>
                   <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                    {test.attachments.filter(att => att.contentType.startsWith('image/')).slice(0,4).map((att, index) => (
                         <a key={`img-thumb-${index}`} href={att.path} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-sm overflow-hidden group">
                            <Image 
                                src={att.path} 
                                alt={att.name} 
                                layout="fill" 
                                objectFit="cover" 
                                className="group-hover:scale-105 transition-transform duration-300"
                                data-ai-hint={att['data-ai-hint'] || 'screenshot test'}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white"/>
                            </div>
                         </a>
                    ))}
                    </div>
                </div>
              )}
               {(!test.error && (!test.attachments || test.attachments.filter(att => att.contentType.startsWith('image/')).length === 0)) && (
                  <p className="text-xs text-muted-foreground">No error or screenshots for quick look. Click to view full details.</p>
               )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

