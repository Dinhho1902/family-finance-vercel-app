import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, updateAppSetting } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actionType } = body;
    const sb = getSupabase();

    if (actionType === 'SYNC_PRICE') {
      const priceRes = await fetch('https://www.vang.today/api/prices');
      const data = await priceRes.json();
      if (!data.success || !data.prices) {
        return NextResponse.json({ error: 'Không lấy được giá vàng' }, { status: 502 });
      }
      const pSJC = data.prices['SJL1L10']?.buy || 0;
      const pNhan = data.prices['SJ9999']?.buy || data.prices['PQHN24NTT']?.buy || pSJC;

      const { data: rows, error: fetchErr } = await sb.from('gold').select('id, type');
      if (fetchErr) throw fetchErr;

      for (const row of rows ?? []) {
        const rawPrice = row.type.includes('Nhẫn') ? pNhan : pSJC;
        if (rawPrice > 0) {
          await sb.from('gold').update({
            current_price: Math.round(rawPrice / 10),
            updated_at: new Date().toISOString(),
          }).eq('id', row.id);
        }
      }
      await updateAppSetting('last_gold_sync', new Date().toISOString());
      return NextResponse.json({ ok: true });
    }

    if (actionType === 'DELETE_GOLD') {
      const { error } = await sb.from('gold').delete().eq('type', body.type);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (actionType === 'UPDATE_GOLD') {
      const { error } = await sb.from('gold').update({
        type: body.type,
        quantity: body.quantity,
        avg_price: body.avgPrice ?? 0,
        current_price: body.currentPrice,
        updated_at: new Date().toISOString(),
      }).eq('type', body.originalType);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ADD_NEW
    const { error } = await sb.from('gold').insert({
      type: body.type,
      quantity: body.quantity,
      avg_price: body.avgPrice ?? 0,
      current_price: body.currentPrice ?? 0,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
