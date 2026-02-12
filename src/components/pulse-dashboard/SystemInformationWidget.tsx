"use client";

import type { EnvironmentInfo } from "@/types/playwright";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Server,
  Cpu,
  MemoryStick,
  Cog,
  Puzzle,
  Play,
  Laptop,
  Info,
  Github,
  Briefcase,
  Globe,
  Compass,
  Chrome,
  HardDrive,
  Layers,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SystemInformationWidgetProps {
  environmentInfo: EnvironmentInfo | EnvironmentInfo[] | null | undefined;
  loading: boolean;
  error: string | null;
}

const getIcon = (key: string): React.ReactNode => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("os") || lowerKey.includes("operative system"))
    return <Laptop className="h-4 w-4 text-primary" />;
  if (lowerKey.includes("cpu")) return <Cpu className="h-4 w-4 text-primary" />;
  if (lowerKey.includes("mem") || lowerKey.includes("ram"))
    return <MemoryStick className="h-4 w-4 text-primary" />;
  if (lowerKey.includes("node"))
    return <Cog className="h-4 w-4 text-primary" />;
  if (lowerKey.includes("playwright"))
    return <Puzzle className="h-4 w-4 text-primary" />;
  if (lowerKey.includes("y playwright"))
    return <Play className="h-4 w-4 text-primary" />; // Assuming "Playwright" if "playwright" is present
  if (lowerKey.includes("browser"))
    return <Globe className="h-4 w-4 text-primary" />;
  if (lowerKey.includes("chromium") || lowerKey.includes("chrome"))
    return <Chrome className="h-4 w-4 text-primary" />;
  if (lowerKey.includes("firefox"))
    return <Globe className="h-4 w-4 text-primary" />; // No specific Firefox icon in Lucide
  if (lowerKey.includes("webkit") || lowerKey.includes("safari"))
    return <Compass className="h-4 w-4 text-primary" />;
  if (
    lowerKey.includes("provider") &&
    (key.toLowerCase().includes("ci") || key.toLowerCase().includes("cd"))
  )
    return <Github className="h-4 w-4 text-primary" />;
  if (
    lowerKey.includes("job") &&
    (key.toLowerCase().includes("ci") || key.toLowerCase().includes("cd"))
  )
    return <Briefcase className="h-4 w-4 text-primary" />;
  if (lowerKey.includes("disk") || lowerKey.includes("storage"))
    return <HardDrive className="h-4 w-4 text-primary" />;
  return <Info className="h-4 w-4 text-primary" />;
};

const renderEnvironmentValue = (
  value: any,
  keyPrefix = "",
): React.ReactNode => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return <span className="text-sm text-foreground">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside pl-4">
        {value.map((item, index) => (
          <li
            key={`${keyPrefix}-arr-${index}`}
            className="text-sm text-foreground"
          >
            {renderEnvironmentValue(item, `${keyPrefix}-arr-item-${index}`)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object" && value !== null) {
    return (
      <div className="ml-4 mt-1 space-y-1 border-l pl-3 border-border">
        {Object.entries(value).map(([key, val]) => (
          <div
            key={`${keyPrefix}-${key}`}
            className="flex items-start space-x-2"
          >
            <div className="flex-shrink-0 pt-0.5">{getIcon(key)}</div>
            <div className="flex-grow">
              <span className="text-xs font-medium text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, " $1")}:{" "}
              </span>
              {renderEnvironmentValue(val, `${keyPrefix}-${key}`)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-muted-foreground italic">N/A</span>;
};

const renderEnvironmentGrid = (envInfo: EnvironmentInfo, keyPrefix = "") => {
  const getDisplayValue = (val: any): string => {
    if (
      typeof val === "string" ||
      typeof val === "number" ||
      typeof val === "boolean"
    ) {
      return String(val);
    }
    if (Array.isArray(val)) {
      return val.length > 0 ? val.join(", ") : "Empty";
    }
    if (typeof val === "object" && val !== null) {
      const entries = Object.entries(val);
      if (entries.length === 0) return "Empty";
      if (entries.length <= 3) {
        return entries
          .map(([k, v]) => {
            const displayKey = k.replace(/([A-Z])/g, " $1").trim();
            return `${displayKey}: ${String(v)}`;
          })
          .join(", ");
      }
      return `${entries.length} items`;
    }
    return "N/A";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Object.entries(envInfo).map(([key, value]) => {
        const displayValue = getDisplayValue(value);
        const fullValue =
          typeof value === "object" && value !== null
            ? JSON.stringify(value, null, 2)
            : String(value);

        return (
          <div
            key={`${keyPrefix}${key}`}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 group/item"
          >
            <div className="flex-shrink-0">{getIcon(key)}</div>
            <div className="flex-grow min-w-0">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {key
                  .replace(/([A-Z]+)/g, " $1")
                  .replace(/([A-Z][a-z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </p>
              <div
                className="text-xs font-semibold text-foreground truncate"
                title={fullValue}
              >
                {displayValue}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function SystemInformationWidget({
  environmentInfo,
  loading,
}: SystemInformationWidgetProps) {
  const [activeShardTab, setActiveShardTab] = useState("0");

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

  const isEmptyEnvironment =
    !environmentInfo ||
    (Array.isArray(environmentInfo)
      ? environmentInfo.length === 0
      : Object.keys(environmentInfo).length === 0);

  if (isEmptyEnvironment) {
    return (
      <Card className="shadow-lg rounded-xl mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary flex items-center">
            <Server className="h-5 w-5 mr-2" /> System Information
          </CardTitle>
          <CardDescription className="text-xs">
            Details about the test execution environment.
          </CardDescription>
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

  const isShardedEnvironment = Array.isArray(environmentInfo);

  return (
    <Card className="shadow-lg rounded-xl mt-6 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-card to-card/95 group">
      <CardHeader className="pb-3">
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary transition-colors flex items-center">
              <Server className="h-4 w-4 mr-2" /> System Information
              {isShardedEnvironment && (
                <span className="ml-2 text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {environmentInfo.length}{" "}
                  {environmentInfo.length === 1 ? "Shard" : "Shards"}
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {isShardedEnvironment
                ? "Environment details from each test shard"
                : "Test execution environment details"}
            </CardDescription>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            {isShardedEnvironment ? (
              <Layers className="h-4 w-4 text-primary" />
            ) : (
              <Laptop className="h-4 w-4 text-primary" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isShardedEnvironment ? (
          <Tabs
            value={activeShardTab}
            onValueChange={setActiveShardTab}
            className="w-full"
          >
            <TabsList className="w-fit max-w-full h-auto p-1 bg-muted/50 flex justify-start overflow-x-auto">
              {environmentInfo.map((_, index) => (
                <TabsTrigger
                  key={index}
                  value={String(index)}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-primary/10 flex-shrink-0"
                >
                  Shard {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            {environmentInfo.map((shardEnv, index) => (
              <TabsContent key={index} value={String(index)} className="mt-4">
                {renderEnvironmentGrid(shardEnv, `shard-${index}-`)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          renderEnvironmentGrid(environmentInfo as EnvironmentInfo)
        )}
      </CardContent>
    </Card>
  );
}
