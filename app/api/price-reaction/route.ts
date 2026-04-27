import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Bar = { open: number; high: number; low: number; close: number; volume: number; time: number };

async function fetchBars(ticker: string): Promise<Bar[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 120 * 24 * 3600; // 120 days
  const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${from}&to=${to}&symbol=${ticker}&resolution=1D`;
  const res = await fetch(url, { headers: { 'Referer': 'https://banggia.vps.com.vn' }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.t?.length) throw new Error('No data');
  return json.t.map((t: number, i: number) => ({
    time: t,
    open:   json.o[i] * 1000,
    high:   json.h[i] * 1000,
    low:    json.l[i] * 1000,
    close:  json.c[i] * 1000,
    volume: json.v[i]
  }));
}

function computeReactionPoints(bars: Bar[], currentPrice: number) {
  const points: Array<{ price: number; score: number; zone_type: 'support' | 'resistance'; dist_pct: number }> = [];
  const window = 5;
  const maxVolume = Math.max(...bars.map(b => b.volume));

  for (let i = window; i < bars.length - window; i++) {
    const bar = bars[i];
    const leftHighs  = bars.slice(i - window, i).map(b => b.high);
    const rightHighs = bars.slice(i + 1, i + window + 1).map(b => b.high);
    const leftLows   = bars.slice(i - window, i).map(b => b.low);
    const rightLows  = bars.slice(i + 1, i + window + 1).map(b => b.low);

    const isResistance = bar.high >= Math.max(...leftHighs) && bar.high >= Math.max(...rightHighs);
    const isSupport    = bar.low  <= Math.min(...leftLows)  && bar.low  <= Math.min(...rightLows);

    const touches = bars.filter(b => Math.abs(b.high - bar.high) / bar.high < 0.025 || Math.abs(b.low - bar.low) / bar.low < 0.025).length;
    const touchScore = Math.min(100, (touches / (bars.length / 10)) * 100);
    const volumeScore = maxVolume > 0 ? (bar.volume / maxVolume) * 100 : 0;
    const score = Math.round((touchScore + volumeScore) / 2);

    if (isResistance) {
      const dist_pct = +((bar.high - currentPrice) / currentPrice * 100).toFixed(1);
      if (bar.high > currentPrice) {
        points.push({ price: bar.high, score: Math.round(score), zone_type: 'resistance', dist_pct });
      }
    }
    if (isSupport) {
      const dist_pct = +((bar.low - currentPrice) / currentPrice * 100).toFixed(1);
      if (bar.low < currentPrice) {
        points.push({ price: bar.low, score: Math.round(score), zone_type: 'support', dist_pct });
      }
    }
  }

  // Deduplicate: merge zones within 1.5%
  const merged: typeof points = [];
  for (const p of points.sort((a, b) => b.price - a.price)) {
    const existing = merged.find(m => m.zone_type === p.zone_type && Math.abs(m.price - p.price) / p.price < 0.015);
    if (existing) { if (p.score > existing.score) existing.score = p.score; }
    else merged.push({ ...p });
  }

  return merged;
}

type ReactionPoint = { price: number; score: number; zone_type: 'support' | 'resistance'; dist_pct: number };
function classifyPosition(supports: ReactionPoint[], resistances: ReactionPoint[], currentPrice: number) {
  const nearResist = resistances[0] && resistances[0].dist_pct < 3;
  const nearSupport = supports[0] && Math.abs(supports[0].dist_pct) < 3;
  if (nearResist) return 'near_resistance';
  if (nearSupport) return 'near_support';
  if (supports[0] && resistances[0]) return 'mid_range';
  return 'neutral';
}

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get('tickers') || '';
  const tickers = tickersParam.split(',').filter(Boolean);

  const results = await Promise.all(tickers.map(async (ticker) => {
    try {
      const bars = await fetchBars(ticker);
      const currentPrice = bars[bars.length - 1].close;
      const reaction_points = computeReactionPoints(bars, currentPrice);
      const supports    = reaction_points.filter(p => p.zone_type === 'support').sort((a, b) => b.price - a.price);
      const resistances = reaction_points.filter(p => p.zone_type === 'resistance').sort((a, b) => a.price - b.price);
      console.log(`${ticker}: ${reaction_points.length} zones, supports: ${supports.length}, resistances: ${resistances.length}`);
      return {
        ticker,
        current_price: currentPrice,
        latest_date: new Date(bars[bars.length - 1].time * 1000).toISOString().split('T')[0],
        reaction_points,
        nearest_support: supports[0] ?? null,
        nearest_resistance: resistances[0] ?? null,
        position_note: classifyPosition(supports, resistances, currentPrice),
      };
    } catch (e: any) {
      return { ticker, error: e.message, current_price: 0, latest_date: '', reaction_points: [], nearest_support: null, nearest_resistance: null, position_note: 'neutral' as const };
    }
  }));

  return NextResponse.json({ data: results });
}
