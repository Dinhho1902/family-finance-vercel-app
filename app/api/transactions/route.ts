import { NextRequest, NextResponse } from 'next/server';
import { addTransaction, getSupabase } from '@/lib/supabase';
import { checkOrigin, errorResponse } from '@/lib/api-utils';

async function adjustFundBalance(fundName: string, delta: number) {
  const sb = getSupabase();
  const { data, error } = await sb.from('funds').select('initial_balance').eq('fund_name', fundName).single();
  if (error || !data) return;
  await sb.from('funds').update({ initial_balance: Number(data.initial_balance) + delta }).eq('fund_name', fundName);
}

export async function POST(req: NextRequest) {
  const forbidden = checkOrigin(req);
  if (forbidden) return forbidden;
  try {
    const body = await req.json();
    const { type, sourceFund, destinationFund, amount } = body;
    const delta = Number(amount);

    await addTransaction(body);

    if (type === 'Transfer') {
      if (sourceFund) await adjustFundBalance(sourceFund, -delta);
      if (destinationFund) await adjustFundBalance(destinationFund, +delta);
    } else if (type === 'Expense') {
      if (sourceFund) await adjustFundBalance(sourceFund, -delta);
    } else if (type === 'Income') {
      if (destinationFund) await adjustFundBalance(destinationFund, +delta);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return errorResponse('POST /api/transactions', e);
  }
}
