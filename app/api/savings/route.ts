import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { checkOrigin, errorResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  const forbidden = checkOrigin(req);
  if (forbidden) return forbidden;
  try {
    const body = await req.json();
    const { actionType } = body;
    const sb = getSupabase();

    if (actionType === 'DELETE_SAVING') {
      const { error } = await sb.from('savings').delete().eq('bank_name', body.bankName);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (actionType === 'UPDATE_SAVING') {
      const { error } = await sb.from('savings').update({
        bank_name: body.bankName,
        principal: body.principal,
        interest_rate: body.interestRate,
        start_date: body.startDate || null,
        maturity_date: body.maturityDate || null,
      }).eq('bank_name', body.originalBank ?? body.bankName);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ADD_NEW
    const { error } = await sb.from('savings').insert({
      bank_name: body.bankName,
      principal: body.principal,
      interest_rate: body.interestRate,
      start_date: body.startDate || null,
      maturity_date: body.maturityDate || null,
    });
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Tên ngân hàng đã tồn tại!' }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return errorResponse('POST /api/savings', e);
  }
}
