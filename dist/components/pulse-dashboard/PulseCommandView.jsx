"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Eye, FileText, Mail, Paperclip, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
export function PulseCommandView() {
    const [runningCommand, setRunningCommand] = useState(null);
    const [commandStatus, setCommandStatus] = useState({});
    const commands = [
        {
            id: "attachment",
            name: "Generate Attachment Based Report",
            command: "npx generate-pulse-report",
            icon: Paperclip,
            description: "Generates a comprehensive report with attachments including screenshots, videos, and traces.",
            outputFile: "playwright-pulse-report.html",
        },
        {
            id: "embedded",
            name: "Generate Embedded Single File Report",
            command: "npx generate-report",
            icon: FileText,
            description: "Creates a self-contained HTML report with all assets embedded inline.",
            outputFile: "playwright-pulse-static-report.html",
        },
        {
            id: "email",
            name: "Generate Email Report",
            command: "npx generate-email-report",
            icon: Mail,
            description: "Produces an email-optimized report format suitable for direct email distribution.",
            outputFile: "pulse-email-summary.html",
        },
    ];
    const handleReRun = async (commandOption) => {
        setRunningCommand(commandOption.id);
        setCommandStatus((prev) => ({ ...prev, [commandOption.id]: null }));
        try {
            const response = await fetch("/api/run-command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: commandOption.command }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setCommandStatus((prev) => ({
                    ...prev,
                    [commandOption.id]: {
                        success: true,
                        message: "Command executed successfully!",
                    },
                }));
            }
            else {
                setCommandStatus((prev) => ({
                    ...prev,
                    [commandOption.id]: {
                        success: false,
                        message: data.error || "Command execution failed",
                    },
                }));
            }
        }
        catch (error) {
            setCommandStatus((prev) => ({
                ...prev,
                [commandOption.id]: {
                    success: false,
                    message: "Failed to execute command. Please try running it manually in your terminal.",
                },
            }));
        }
        finally {
            setRunningCommand(null);
        }
    };
    const handleView = (commandOption) => {
        const baseUrl = window.location.origin;
        const fileUrl = `${baseUrl}/api/reports/${commandOption.outputFile}`;
        window.open(fileUrl, "_blank", "noopener,noreferrer");
    };
    return (<div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4"/>
        <AlertDescription>
          These commands require <strong>playwright-pulse-report</strong> to be
          installed in your project. Run commands to generate different report
          formats from your test results.
        </AlertDescription>
      </Alert>

      <Alert>
        <Info className="h-4 w-4"/>
        <AlertDescription>
          <strong>Note:</strong> These report generation commands are only valid
          if the report directory is <strong>'pulse-report'</strong>, default
          report folder. Otherwise kindly use the CLI commands, for custom
          report directory.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        {commands.map((cmd) => {
            const Icon = cmd.icon;
            const status = commandStatus[cmd.id];
            return (<Card key={cmd.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{cmd.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {cmd.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    <code>{cmd.command}</code>
                  </div>

                  {status && (<Alert variant={status.success ? "default" : "destructive"}>
                      <AlertDescription>{status.message}</AlertDescription>
                    </Alert>)}

                  <div className="flex gap-3">
                    <Button onClick={() => handleReRun(cmd)} disabled={runningCommand === cmd.id} className="flex-1" variant="default">
                      <PlayCircle className="h-4 w-4 mr-2"/>
                      {runningCommand === cmd.id ? "Running..." : "Re-run"}
                    </Button>
                    <Button onClick={() => handleView(cmd)} variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-2"/>
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>);
        })}
      </div>
    </div>);
}
//# sourceMappingURL=PulseCommandView.jsx.map