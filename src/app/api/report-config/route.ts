import { NextResponse } from 'next/server';

export async function GET() {
  const reportDir = process.env.PULSE_REPORT_DIR?.split('/').pop() || 'pulse-report';
  
  return NextResponse.json({
    reportDir,
    success: true
  });
}
