"use client";

import { useState } from "react"; // <-- Added import
import type { TestStep } from "@/types/playwright.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // <-- Added import
// --- START: Updated Import ---
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Info,
  Code2,
  Copy,
  Check,
} from "lucide-react";
// --- END: Updated Import ---
import { ansiToHtml, ansiToText, cn } from "@/lib/utils"; // <-- Added 'cn' import

// --- START: Added CodeBlockWithCopy Component ---
interface CodeBlockWithCopyProps {
  rawContent: string;
  className?: string;
  preClassName?: string;
}

const CodeBlockWithCopy: React.FC<CodeBlockWithCopyProps> = ({
  rawContent,
  className,
  preClassName,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!rawContent) return;
    navigator.clipboard.writeText(ansiToText(rawContent)).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      },
      (err) => {
        console.error("Failed to copy text: ", err);
      }
    );
  };

  return (
    <div className={cn("relative", className)}>
      <pre
        className={cn(
          "text-sm p-3 pr-12 whitespace-pre-wrap break-all font-code",
          preClassName
        )}
      >
        <span
          dangerouslySetInnerHTML={{ __html: ansiToHtml(rawContent || "") }}
        />
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-1 right-1 h-6 w-6" // Adjusted for smaller size
        onClick={handleCopy}
      >
        {isCopied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        <span className="sr-only">Copy code</span>
      </Button>
    </div>
  );
};
// --- END: Added CodeBlockWithCopy Component ---

interface TestStepItemRecursiveProps {
  step: TestStep;
  level?: number;
}

function StepStatusIcon({ status }: { status: TestStep["status"] }) {
  const lowerStatus = typeof status === "string" ? status.toLowerCase() : "";
  switch (lowerStatus) {
    case "passed":
      return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
    case "skipped":
      return <AlertCircle className="h-4 w-4 text-accent flex-shrink-0" />;
    case "timedout": // Playwright often uses 'timedOut'
      return <Clock className="h-4 w-4 text-destructive flex-shrink-0" />;
    case "pending":
      return (
        <Clock className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
      );
    default:
      return <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
}

function formatStepDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function TestStepItemRecursive({
  step,
  level = 0,
}: TestStepItemRecursiveProps) {
  const hasSubSteps = step.steps && step.steps.length > 0;

  const stepContent = (
    <div
      className={`flex flex-col space-y-2 ${
        level > 0 ? "pl-4 border-l border-muted ml-2" : ""
      }`}
    >
      <div className="flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2 min-w-0">
          <StepStatusIcon status={step.status} />
          <span
            className="text-sm font-medium text-foreground truncate"
            title={step.title}
          >
            {step.title}
          </span>
          {step.isHook && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              {step.hookType || "hook"}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formatStepDuration(step.duration)}
        </span>
      </div>
      {step.codeLocation && (
        <div className="flex items-center text-xs text-muted-foreground space-x-1 pl-6">
          <Code2 className="h-3 w-3" />
          <span>{step.codeLocation}</span>
        </div>
      )}
      {step.errorMessage && (
        <div className="pl-6 mt-1">
          <p className="text-xs font-semibold text-destructive mb-0.5">
            Error:
          </p>
          {/* --- START: Modified Code --- */}
          <CodeBlockWithCopy
            rawContent={step.errorMessage}
            className="bg-destructive/10 rounded-md max-h-32 overflow-y-auto"
            preClassName="text-xs p-2"
          />
          {/* --- END: Modified Code --- */}
        </div>
      )}
    </div>
  );

  if (hasSubSteps) {
    return (
      <Accordion type="single" collapsible className="w-full py-1">
        <AccordionItem value={`step-${step.id}`} className="border-none">
          <AccordionTrigger className="p-1 hover:no-underline hover:bg-muted/50 rounded-md text-left [&[data-state=open]>svg]:rotate-90">
            {stepContent}
          </AccordionTrigger>
          <AccordionContent className="pt-0 pb-0">
            <div className="mt-1">
              {step.steps.map((subStep: TestStep) => (
                <TestStepItemRecursive
                  key={subStep.id}
                  step={subStep}
                  level={level + 1}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <div className="py-2 px-1 hover:bg-muted/50 rounded-md">{stepContent}</div>
  );
}
