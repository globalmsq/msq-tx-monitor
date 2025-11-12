import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'tx-dashboard-v2',
    version: '1.0.0',
  });
}
