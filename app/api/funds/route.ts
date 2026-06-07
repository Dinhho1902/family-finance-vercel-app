import { NextRequest, NextResponse } from 'next/server';
import { upsertFund, deleteFund } from '@/lib/supabase';
import { checkOrigin, errorResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  const forbidden = checkOrigin(req);
  if (forbidden) return forbidden;
  try {
    const body = await req.json();
    await upsertFund(body);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return errorResponse('POST /api/funds', e);
  }
}

export async function DELETE(req: NextRequest) {
  const forbidden = checkOrigin(req);
  if (forbidden) return forbidden;
  try {
    const name = req.nextUrl.searchParams.get('name');
    if (!name) return NextResponse.json({ error: 'Thiếu tên quỹ' }, { status: 400 });
    await deleteFund(name);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return errorResponse('DELETE /api/funds', e);
  }
}
