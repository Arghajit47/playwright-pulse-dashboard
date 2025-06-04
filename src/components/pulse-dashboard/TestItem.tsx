'use client';

import type { TestResult, TestAttachment } from '@/types/playwright';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { CheckCircle2, XCircle, AlertCircle, Clock, Paperclip, Eye } from 'lucide-react';

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
  const hasDetails = test.error || (test.attachments && test.attachments.length > 0);

  return (
    <div className="border-b border-border last:border-b-0 py-3 hover:bg-card/50 transition-colors duration-200 px-4 rounded-md mb-2 shadow-sm bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <StatusIcon status={test.status} />
          <span className="font-medium text-foreground text-sm md:text-base">{test.title}</span>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={
            test.status === 'passed' ? 'default' : 
            test.status === 'failed' ? 'destructive' :
            test.status === 'skipped' ? 'secondary' : // Using secondary for skipped, as accent is orange (like warning)
            'outline'
          } className="capitalize text-xs px-2 py-0.5">
            {test.status}
          </Badge>
          <span className="text-sm text-muted-foreground w-20 text-right">{formatDuration(test.duration)}</span>
        </div>
      </div>
      {hasDetails && (
        <Accordion type="single" collapsible className="w-full mt-2">
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="text-xs py-1 hover:no-underline text-muted-foreground justify-start [&[data-state=open]>svg]:ml-2">
                Show Details
            </AccordionTrigger>
            <AccordionContent className="pt-2 pl-2 pr-2 pb-1 bg-muted/30 rounded-md">
              {test.error && (
                <div className="mb-3">
                  <h4 className="font-semibold text-sm text-destructive mb-1">Error Message:</h4>
                  <pre className="bg-destructive/10 text-destructive text-xs p-3 rounded-md whitespace-pre-wrap break-all font-code">{test.error}</pre>
                </div>
              )}
              {test.attachments && test.attachments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-primary mb-1">Attachments:</h4>
                  <ul className="space-y-2">
                    {test.attachments.map((att, index) => (
                      <li key={index} className="flex items-center justify-between text-xs p-2 bg-primary/10 rounded-md">
                        <div className="flex items-center space-x-2">
                           <Paperclip className="h-4 w-4 text-primary" />
                           <span>{att.name} ({att.contentType})</span>
                        </div>
                        {att.path && att.contentType.startsWith('image/') && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={att.path} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1">
                              <Eye className="h-3 w-3"/>
                              <span>View</span>
                            </a>
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {test.attachments.some(att => att.contentType.startsWith('image/')) && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {test.attachments.filter(att => att.contentType.startsWith('image/')).map((att, index) => (
                         <a key={`img-${index}`} href={att.path} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-md overflow-hidden group">
                            <Image 
                                src={att.path} 
                                alt={att.name} 
                                layout="fill" 
                                objectFit="cover" 
                                className="group-hover:scale-105 transition-transform duration-300"
                                data-ai-hint={att['data-ai-hint'] || 'screenshot test'}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Eye className="h-8 w-8 text-white"/>
                            </div>
                         </a>
                    ))}
                    </div>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
