
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { PlaywrightPulseReport } from '@/types/playwright';

export async function GET() {
  console.log('[API /api/current-run] Raw process.env.PULSE_USER_CWD:', process.env.PULSE_USER_CWD);
  console.log('[API /api/current-run] Current process.cwd() for Next.js server:', process.cwd());

  const pulseUserCwdFromEnv = process.env.PULSE_USER_CWD;
  const currentProcessCwd = process.cwd();
  const baseDir = (pulseUserCwdFromEnv && pulseUserCwdFromEnv.trim() !== '') ? pulseUserCwdFromEnv.trim() : currentProcessCwd;
  
  console.log('[API /api/current-run] Effective baseDir determined:', baseDir);
  
  const filePath = path.join(baseDir, 'pulse-report', 'playwright-pulse-report.json');
  console.log('[API /api/current-run] Attempting to read current run report from:', filePath);

  let fileContent: string;
  try {
    fileContent = await fs.readFile(filePath, 'utf-8');
  } catch (fileReadError: any) {
    console.error(`[API /api/current-run] ENTERED CATCH for fs.readFile. Path: ${filePath}. Error: ${fileReadError.message}. Code: ${fileReadError.code}. Stack: ${fileReadError.stack}`);
    const errorMessage = `Report file not found or unreadable at '${filePath}'. Base directory used: '${baseDir}'. Error: ${fileReadError.message || 'Unknown file read error.'}${fileReadError.code ? ` (Code: ${fileReadError.code})` : ''}`;
    return NextResponse.json({ 
      message: errorMessage, 
      pathAttempted: filePath,
      baseDirUsed: baseDir,
      errorCode: fileReadError.code || 'N/A'
    }, { status: fileReadError.code === 'ENOENT' ? 404 : 500 });
  }

  try {
    const jsonData: PlaywrightPulseReport = JSON.parse(fileContent);
    // Augment metadata with the base directory for constructing file:/// URLs later
    if (jsonData.metadata) {
      jsonData.metadata.userProjectDir = baseDir;
    } else {
      jsonData.metadata = { generatedAt: new Date().toISOString(), userProjectDir: baseDir };
    }
    return NextResponse.json(jsonData);
  } catch (parseError: any) {
    console.error(`[API /api/current-run] ENTERED CATCH for JSON.parse. Path: ${filePath}. Error: ${parseError.message}. Stack: ${parseError.stack}`);
    const errorMessage = `Invalid JSON format in report file '${filePath}'. Error: ${parseError.message || 'Unknown parsing error.'}`;
    return NextResponse.json({ 
      message: errorMessage,
      pathAttempted: filePath
    }, { status: 400 });
  }
}

