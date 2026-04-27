import { NextRequest, NextResponse } from 'next/server';
import {
  getFundsData, getInvestmentsData, getSavingsData,
  getTransactionsData, getGoldData, getAppSettings,
  getHistoryData, getAllocationHistory,
  recordNetWorthSnapshot, saveAllocationRecord,
  updateAppSetting, upsertFund, deleteFund, upsertInvestment,
  upsertSaving, deleteSaving, upsertGold, deleteGold, addTransaction,
} from '@/lib/supabase';

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: any) { cache.set(key, { data, time: Date.now() }); }
function invalidateCache() { cache.clear(); }

export async function GET(req: NextRequest) {
  const resource = req.nextUrl.searchParams.get('resource');
  const limit = req.nextUrl.searchParams.get('limit');

  try {
    const cacheKey = `${resource}:${limit || ''}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    let result: any = null;

    switch (resource) {
      case 'dashboard': {
        const [funds, investments, savings, transactions, gold] = await Promise.all([
          getFundsData(), getInvestmentsData(), getSavingsData(),
          getTransactionsData(limit ? parseInt(limit) : 5), getGoldData(),
        ]);
        result = { funds, investments, savings, transactions, gold };
        break;
      }
      case 'investments': {
        const [investments, settings] = await Promise.all([getInvestmentsData(), getAppSettings()]);
        result = { investments, settings };
        break;
      }
      case 'savings':      result = await getSavingsData(); break;
      case 'gold':         result = await getGoldData(); break;
      case 'funds':        result = await getFundsData(); break;
      case 'transactions': result = await getTransactionsData(limit ? parseInt(limit) : 20); break;
      case 'history':      result = await getHistoryData(); break;
      case 'allocations':  result = await getAllocationHistory(); break;
      case 'settings':     result = await getAppSettings(); break;
      case 'allocation-page': {
        const [funds, investments, savings, gold, allocationHistory, historyData] = await Promise.all([
          getFundsData(), getInvestmentsData(), getSavingsData(), getGoldData(),
          getAllocationHistory(), getHistoryData(),
        ]);
        result = { funds, investments, savings, gold, allocationHistory, historyData };
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
    }

    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const resource = req.nextUrl.searchParams.get('resource');
  const body = await req.json();

  try {
    switch (resource) {
      case 'snapshot':
        await recordNetWorthSnapshot(body.total, body.invest, body.savings, body.gold, body.cash);
        break;
      case 'allocation':
        await saveAllocationRecord(body);
        break;
      case 'setting':
        await updateAppSetting(body.key, body.value);
        break;
      case 'fund':
        await upsertFund(body);
        break;
      case 'delete-fund':
        await deleteFund(body.name);
        break;
      case 'investment':
        await upsertInvestment(body);
        break;
      case 'saving':
        await upsertSaving(body);
        break;
      case 'delete-saving':
        await deleteSaving(body.id);
        break;
      case 'gold':
        await upsertGold(body);
        break;
      case 'delete-gold':
        await deleteGold(body.id);
        break;
      case 'transaction':
        await addTransaction(body);
        break;
      default:
        return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
    }

    invalidateCache();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
