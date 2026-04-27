import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchBars(ticker: string) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 365 * 24 * 3600;
  const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${from}&to=${to}&symbol=${ticker}&resolution=1D`;
  const res = await fetch(url, { headers: { 'Referer': 'https://banggia.vps.com.vn' }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.t?.length) throw new Error('No data');
  return json.t.map((t: number, i: number) => ({
    open:   json.o[i] * 1000,
    high:   json.h[i] * 1000,
    low:    json.l[i] * 1000,
    close:  json.c[i] * 1000,
    volume: json.v[i]
  }));
}

function computeRisk(ticker: string, bars: Array<{ open: number; high: number; low: number; close: number; volume: number }>) {
  const closes = bars.map(b => b.close);
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const volumes = bars.map(b => b.volume);

  // Returns & Volatility
  const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const vol_daily = Math.sqrt(variance);
  const vol_annual = +(vol_daily * Math.sqrt(252) * 100).toFixed(1);

  // Max Drawdown
  let peak = closes[0], maxDrawdown = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  maxDrawdown = +(maxDrawdown * 100).toFixed(1);

  // ATR (Average True Range) - 14 day
  const atrPeriod = Math.min(14, closes.length - 1);
  let trSum = 0;
  for (let i = 1; i <= atrPeriod; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trSum += tr;
  }
  const atr = trSum / atrPeriod;
  const atr_pct = +(atr / closes[closes.length - 1] * 100).toFixed(2);

  // Volume Coefficient of Variation (volatility in volume)
  const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const volVariance = volumes.reduce((a, b) => a + (b - avgVol) ** 2, 0) / volumes.length;
  const volStdDev = Math.sqrt(volVariance);
  const vol_cov = avgVol > 0 ? +(volStdDev / avgVol).toFixed(2) : 0;

  // Average Turnover (in billions)
  const avgVolBillion = +(avgVol * closes[closes.length - 1] / 1e9).toFixed(1);

  // ADX (Simplified - use trend strength)
  const shortTermReturn = (closes[closes.length - 1] - closes[Math.max(0, closes.length - 15)]) / closes[Math.max(0, closes.length - 15)] * 100;
  const adx = +(Math.abs(shortTermReturn) / 2).toFixed(1);

  // P/E Ratio (mock - would need earnings data)
  const pe_ratio = 20; // Placeholder

  // CAGR
  const lastClose = closes[closes.length - 1];
  const firstClose = closes[0];
  const cagr = +((lastClose / firstClose - 1) * 100).toFixed(1);

  // Recovery Days (avg bars to recover from drawdown)
  const recovery_days = Math.max(1, Math.round(maxDrawdown / (vol_daily * 100)));

  // Risk Score
  const riskScore = Math.round(Math.min(100, vol_annual * 1.5 + maxDrawdown * 0.5));
  const riskLevel = riskScore >= 65 ? 'high' : riskScore >= 35 ? 'medium' : 'low';

  return {
    ticker,
    current_price: lastClose,
    risk_score: riskScore,
    risk_level: riskLevel,
    risk_bg: riskLevel === 'high' ? '#fef2f2' : riskLevel === 'medium' ? '#fffbeb' : '#f0fdf4',
    risk_border: riskLevel === 'high' ? '#fecaca' : riskLevel === 'medium' ? '#fde68a' : '#bbf7d0',
    features: {
      atr_pct,
      vol_annual,
      max_drawdown: +maxDrawdown,
      avg_turnover: avgVolBillion,
      recovery_days,
      vol_cov,
      pe_ratio,
      adx,
    },
    feature_ratings: {
      atr_pct: atr_pct > 2 ? 'high' : atr_pct > 1 ? 'medium' : 'low',
      vol_annual: vol_annual > 30 ? 'high' : vol_annual > 20 ? 'medium' : 'low',
      max_drawdown: maxDrawdown > 30 ? 'high' : maxDrawdown > 15 ? 'medium' : 'low',
      avg_turnover: avgVolBillion > 50 ? 'low' : avgVolBillion > 10 ? 'medium' : 'high',
      recovery_days: recovery_days > 30 ? 'high' : recovery_days > 10 ? 'medium' : 'low',
      vol_cov: vol_cov > 1 ? 'high' : vol_cov > 0.5 ? 'medium' : 'low',
      pe_ratio: 'medium', // Placeholder
      adx: adx > 25 ? 'high' : adx > 15 ? 'medium' : 'low',
    },
    maxDrawdown: +maxDrawdown,
    volatility: vol_annual,
    sharpeRatio: 0,
    cagr,
    riskLevel,
  };
}

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get('tickers') || '';
  const tickers = tickersParam.split(',').filter(Boolean);

  const data = await Promise.all(tickers.map(async (ticker) => {
    try {
      const bars = await fetchBars(ticker);
      return computeRisk(ticker, bars);
    } catch (e: any) {
      return { ticker, error: e.message, risk_level: 'medium', risk_score: 50 };
    }
  }));

  const summary = { high: [] as string[], medium: [] as string[], low: [] as string[] };
  data.forEach(d => { if (!('error' in d) && d.risk_level in summary) (summary as any)[d.risk_level].push(d.ticker); });

  return NextResponse.json({ data, summary });
}
