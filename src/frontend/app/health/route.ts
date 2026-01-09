import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  try {
    // Check backend health
    const backendResponse = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
    });

    const backendHealth = await backendResponse.json();

    return NextResponse.json({
      status: 'healthy',
      frontend: 'ok',
      backend: backendHealth.status === 'healthy' ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: 'degraded',
      frontend: 'ok',
      backend: 'unreachable',
      timestamp: new Date().toISOString(),
    }, { status: 200 }); // Still return 200 so container doesn't restart
  }
}
