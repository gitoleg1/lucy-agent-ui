import { NextResponse } from 'next/server';

export async function GET() {
  const base = process.env.NEXT_PUBLIC_AGENT_API_BASE || 'http://127.0.0.1:8000';
  try {
    const r = await fetch(`${base}/health`, { cache: 'no-store' });
    const json = await r.json();
    return NextResponse.json({ ok: true, base, backend: json });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, base, error: msg }, { status: 502 });
  }
}
