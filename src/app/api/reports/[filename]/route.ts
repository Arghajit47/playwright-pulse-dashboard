import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  const pulseUserCwdFromEnv = process.env.PULSE_USER_CWD;
  const pulseReportDirFromEnv = process.env.PULSE_REPORT_DIR;
  const currentProcessCwd = process.cwd();

  const baseDir =
    pulseUserCwdFromEnv && pulseUserCwdFromEnv.trim() !== ""
      ? pulseUserCwdFromEnv.trim()
      : currentProcessCwd;

  const reportDir =
    pulseReportDirFromEnv && pulseReportDirFromEnv.trim() !== ""
      ? pulseReportDirFromEnv.trim()
      : path.join(baseDir, "pulse-report");

  const allowedFiles = [
    "playwright-pulse-report.html",
    "playwright-pulse-static-report.html",
    "pulse-email-summary.html",
  ];

  if (!allowedFiles.includes(filename)) {
    return NextResponse.json({ error: "File not allowed" }, { status: 403 });
  }

  const filePath = path.join(reportDir, filename);

  try {
    const fileContent = await fs.readFile(filePath, "utf-8");

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error(`[API /api/reports/${filename}] Error reading file:`, error);

    if (error.code === "ENOENT") {
      return NextResponse.json(
        {
          error: "Report file not found",
          message: `The file ${filename} does not exist. Please generate the report first.`,
          path: filePath,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to read report file",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
