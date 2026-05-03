import { NextRequest, NextResponse } from 'next/server';
import { upsertFund, deleteFund } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await upsertFund(body);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');
    if (!name) return NextResponse.json({ error: 'Thiếu tên quỹ' }, { status: 400 });
    await deleteFund(name);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
