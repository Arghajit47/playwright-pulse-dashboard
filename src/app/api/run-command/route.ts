import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid command" },
        { status: 400 }
      );
    }

    const allowedCommands = [
      "npx generate-pulse-report",
      "npx generate-report",
      "npx generate-email-report",
    ];

    if (!allowedCommands.includes(command)) {
      return NextResponse.json(
        { success: false, error: "Command not allowed" },
        { status: 403 }
      );
    }

    const userCwd = process.env.PULSE_USER_CWD || process.cwd();

    const { stdout, stderr } = await execAsync(command, {
      cwd: userCwd,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return NextResponse.json({
      success: true,
      stdout,
      stderr: stderr || undefined,
    });
  } catch (error: any) {
    console.error("Command execution error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Command execution failed",
        stderr: error.stderr,
        stdout: error.stdout,
      },
      { status: 500 }
    );
  }
}
