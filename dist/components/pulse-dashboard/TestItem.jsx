'use client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, Clock, Eye, ChevronRight, Info } from 'lucide-react';
import { ansiToHtml, getAssetPath as getUtilAssetPath } from '@/lib/utils';
import { useMemo } from 'react';
function StatusIcon({ status }) {
    switch (status) {
        case 'passed':
            return <CheckCircle2 className="h-5 w-5 text-[hsl(var(--chart-3))]"/>;
        case 'failed':
            return <XCircle className="h-5 w-5 text-destructive"/>;
        case 'skipped':
            return <AlertCircle className="h-5 w-5 text-[hsl(var(--accent))]"/>;
        case 'timedOut':
            return <Clock className="h-5 w-5 text-destructive"/>;
        case 'pending':
            return <Clock className="h-5 w-5 text-primary animate-pulse"/>;
        default:
            return <Info className="h-5 w-5 text-muted-foreground"/>;
    }
}
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}
function formatTestName(fullName) {
    if (!fullName)
        return '';
    const parts = fullName.split(" > ");
    return parts[parts.length - 1] || fullName;
}
function getStatusBadgeStyle(status) {
    switch (status) {
        case 'passed':
            return { backgroundColor: 'hsl(var(--chart-3))', color: 'hsl(var(--primary-foreground))' };
        case 'failed':
        case 'timedOut':
            return { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' };
        case 'skipped':
            return { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' };
        case 'pending':
            return { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' };
        default:
            return { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
    }
}
function getAttachmentNameFromPath(path, defaultName = 'Attachment') {
    if (!path || typeof path !== 'string')
        return defaultName;
    const parts = path.split(/[/\\]/);
    return parts.pop() || defaultName;
}
export function TestItem({ test }) {
    const quickLookScreenshots = useMemo(() => {
        if (!test.screenshots || !Array.isArray(test.screenshots))
            return [];
        return test.screenshots.slice(0, 4).map((path, index) => ({
            name: getAttachmentNameFromPath(path, `Screenshot ${index + 1}`),
            path: path,
            contentType: 'image/png', // Assuming image type
            'data-ai-hint': 'test screenshot thumbnail'
        }));
    }, [test.screenshots]);
    const hasDetailsInAccordion = test.errorMessage || quickLookScreenshots.length > 0;
    const displayName = formatTestName(test.name);
    return (<div className="border-b border-border last:border-b-0 py-3 hover:bg-muted/20 transition-colors duration-200 px-4 rounded-lg mb-2 shadow-md bg-card hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <StatusIcon status={test.status}/>
          <Link href={`/test/${test.id}`} className="font-medium text-foreground text-sm md:text-base hover:underline truncate" title={test.name}>
            {displayName}
          </Link>
        </div>
        <div className="flex items-center space-x-3 ml-2 flex-shrink-0">
          <Badge variant="outline" className="capitalize text-xs px-2 py-0.5 rounded-full border" style={getStatusBadgeStyle(test.status)}>
            {test.status}
          </Badge>
          <span className="text-sm text-muted-foreground w-20 text-right">{formatDuration(test.duration)}</span>
           <Link href={`/test/${test.id}`} aria-label={`View details for ${displayName}`}>
            <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"/>
          </Link>
        </div>
      </div>
      {hasDetailsInAccordion && (<Accordion type="single" collapsible className="w-full mt-2">
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="text-xs py-1 px-1 hover:no-underline text-muted-foreground justify-start hover:bg-accent/10 rounded-md [&[data-state=open]>svg]:ml-2">
                Quick Look
            </AccordionTrigger>
            <AccordionContent className="pt-2 pl-2 pr-2 pb-1 bg-muted/30 rounded-lg">
              {test.errorMessage && (<div className="mb-3">
                  <h4 className="font-semibold text-xs text-destructive mb-1">Error:</h4>
                  <pre className="bg-destructive/10 text-xs p-2 rounded-md whitespace-pre-wrap break-all font-code max-h-20 overflow-y-auto">
                    <span dangerouslySetInnerHTML={{ __html: ansiToHtml(test.errorMessage) }}/>
                  </pre>
                </div>)}
              {quickLookScreenshots.length > 0 && (<div>
                  <h4 className="font-semibold text-xs text-primary mb-1">Screenshots:</h4>
                   <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                    {quickLookScreenshots.map((attachment, index) => {
                    const imageSrc = getUtilAssetPath(attachment.path);
                    if (imageSrc === '#')
                        return null;
                    return (<a key={`img-thumb-${index}`} href={imageSrc} target="_blank" rel="noopener noreferrer" className="relative aspect-video rounded-md overflow-hidden group border hover:border-primary shadow-sm">
                            <Image src={imageSrc} alt={attachment.name} fill={true} style={{ objectFit: "cover" }} className="group-hover:scale-105 transition-transform duration-300" data-ai-hint={attachment['data-ai-hint']}/>
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white"/>
                            </div>
                         </a>);
                })}
                    </div>
                </div>)}
               {(!test.errorMessage && quickLookScreenshots.length === 0) && (<p className="text-xs text-muted-foreground">No error or screenshots for quick look. Click to view full details.</p>)}
            </AccordionContent>
          </AccordionItem>
        </Accordion>)}
    </div>);
}
//# sourceMappingURL=TestItem.jsx.map