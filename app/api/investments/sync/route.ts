import { NextRequest, NextResponse } from 'next/server';
import { getInvestmentsData, syncInvestmentPrice, updateAppSetting } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const investments = await getInvestmentsData();
    let updatedCount = 0;

    for (const inv of investments) {
      const asset = inv.asset;
      if (!asset || asset === 'Tiền chưa giải ngân' || asset.length !== 3) continue;

      try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - 10 * 24 * 3600;
        const res = await fetch(
          `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${from}&to=${to}&symbol=${asset}&resolution=1D`,
          { headers: { 'Referer': 'https://banggia.vps.com.vn' }, next: { revalidate: 3600 } }
        );

        if (!res.ok) continue;
        const data = await res.json();

        if (data.c && data.c.length > 0) {
          const latestPrice = Math.round(data.c[data.c.length - 1] * 1000);
          await syncInvestmentPrice(asset, latestPrice);
          updatedCount++;
        }
      } catch (e) {
        console.error(`Sync error for ${asset}:`, e);
      }
    }

    await updateAppSetting('last_investment_sync', new Date().toISOString());
    return NextResponse.json({ updatedCount, success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
