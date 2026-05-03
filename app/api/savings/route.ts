import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
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
    if (error) throw new Error(error.code === '23505' ? 'Tên ngân hàng đã tồn tại!' : error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
