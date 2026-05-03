import { NextRequest, NextResponse } from 'next/server';
import { saveAllocationRecord, upsertSaving } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { month, date, totalAmount, note, allocations, savingsData } = await req.json();

    await saveAllocationRecord({
      date,
      month,
      totalAmount,
      note,
      details: JSON.stringify(allocations),
    });

    if (savingsData) {
      await upsertSaving({
        bankName: savingsData.bankName,
        principal: savingsData.principal,
        interestRate: savingsData.interestRate,
        startDate: savingsData.startDate,
        maturityDate: savingsData.maturityDate,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
