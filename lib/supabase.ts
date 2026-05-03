import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// ─── Types (same as google-sheets.ts) ───────────────────────

export type Fund = {
  fundName: string;
  type: string;
  initialBalance: number;
  currentBalance: number;
  goalAmount: number | null;
  targetDate: string | null;
  monthlyTarget: number | null;
  isVirtual?: boolean;
};

export type Investment = {
  asset: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
};

export type Saving = {
  bankName: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
};

export type Gold = {
  type: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
};

export type Transaction = {
  date: string;
  type: string;
  sourceFund: string;
  destinationFund: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type HistoryPoint = {
  date: string;
  totalValue: number;
};

export type AllocationRecord = {
  date: string;
  month: string;
  totalAmount: number;
  note: string;
  details: string;
};

// ─── Reads ───────────────────────────────────────────────────

export async function getInvestmentsData(): Promise<Investment[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('investments').select('*').order('asset');
    if (error) throw error;
    return (data ?? []).map(r => ({
      asset: r.asset,
      quantity: Number(r.quantity),
      avgPrice: Number(r.avg_price),
      currentPrice: Number(r.current_price),
    }));
  } catch (e) {
    console.error('getInvestmentsData:', e);
    return [];
  }
}

export async function getSavingsData(): Promise<Saving[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('savings').select('*').order('id');
    if (error) throw error;
    return (data ?? []).map(r => ({
      bankName: r.bank_name,
      principal: Number(r.principal),
      interestRate: Number(r.interest_rate),
      startDate: r.start_date ?? '',
      maturityDate: r.maturity_date ?? '',
    }));
  } catch (e) {
    console.error('getSavingsData:', e);
    return [];
  }
}

export async function getGoldData(): Promise<Gold[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('gold').select('*').order('id');
    if (error) throw error;
    return (data ?? []).map(r => ({
      type: r.type,
      quantity: Number(r.quantity),
      avgPrice: Number(r.avg_price),
      currentPrice: Number(r.current_price),
    }));
  } catch (e) {
    console.error('getGoldData:', e);
    return [];
  }
}

export async function getFundsData(): Promise<Fund[]> {
  try {
    const sb = getSupabase();
    const [{ data: fundsRaw, error }, investments, savingsList, gold] = await Promise.all([
      sb.from('funds').select('*').order('id'),
      getInvestmentsData(),
      getSavingsData(),
      getGoldData(),
    ]);
    if (error) throw error;

    const totalInvestmentValue = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
    const totalSavingsValue = savingsList.reduce((s, i) => s + i.principal, 0);
    const totalGoldValue = gold.reduce((s, i) => s + i.quantity * i.currentPrice, 0);

    const fundsList: Fund[] = (fundsRaw ?? []).map(r => ({
      fundName: r.fund_name,
      type: r.type,
      initialBalance: Number(r.initial_balance),
      currentBalance: Number(r.initial_balance),
      goalAmount: r.goal_amount != null ? Number(r.goal_amount) : null,
      targetDate: r.target_date ?? null,
      monthlyTarget: r.monthly_target != null ? Number(r.monthly_target) : null,
    }));

    let hasInvestmentFund = false;
    let hasSavingsFund = false;
    let hasGoldFund = false;

    fundsList.forEach(f => {
      if (f.fundName === 'Quỹ Chứng Khoán') {
        f.initialBalance = totalInvestmentValue;
        f.currentBalance = totalInvestmentValue;
        f.isVirtual = true;
        hasInvestmentFund = true;
      }
      if (f.fundName === 'Quỹ Tiết Kiệm') {
        f.initialBalance = totalSavingsValue;
        f.currentBalance = totalSavingsValue;
        f.isVirtual = true;
        hasSavingsFund = true;
      }
      if (f.fundName === 'Quỹ Vàng') {
        f.initialBalance = totalGoldValue;
        f.currentBalance = totalGoldValue;
        f.isVirtual = true;
        hasGoldFund = true;
      }
    });

    if (!hasInvestmentFund) fundsList.push({ fundName: 'Quỹ Chứng Khoán', type: 'Đầu tư', initialBalance: totalInvestmentValue, currentBalance: totalInvestmentValue, goalAmount: null, targetDate: null, monthlyTarget: null, isVirtual: true });
    if (!hasSavingsFund)    fundsList.push({ fundName: 'Quỹ Tiết Kiệm',   type: 'Tiết kiệm', initialBalance: totalSavingsValue,    currentBalance: totalSavingsValue,    goalAmount: null, targetDate: null, monthlyTarget: null, isVirtual: true });
    if (!hasGoldFund)       fundsList.push({ fundName: 'Quỹ Vàng',         type: 'Vàng',      initialBalance: totalGoldValue,        currentBalance: totalGoldValue,        goalAmount: null, targetDate: null, monthlyTarget: null, isVirtual: true });

    return fundsList;
  } catch (e) {
    console.error('getFundsData:', e);
    return [];
  }
}

export async function getTransactionsData(limit = 5): Promise<Transaction[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(r => ({
      date: r.date ?? '',
      type: r.type ?? '',
      sourceFund: r.source_fund ?? '',
      destinationFund: r.destination_fund ?? '',
      amount: Number(r.amount),
      note: r.note ?? '',
      createdAt: r.created_at ?? '',
    }));
  } catch (e) {
    console.error('getTransactionsData:', e);
    return [];
  }
}

export async function getHistoryData(): Promise<HistoryPoint[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('history').select('date, total_value').order('date');
    if (error) throw error;
    return (data ?? []).map(r => ({ date: r.date, totalValue: Number(r.total_value) }));
  } catch (e) {
    console.error('getHistoryData:', e);
    return [];
  }
}

export async function getAllocationHistory(): Promise<AllocationRecord[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('allocations').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => ({
      date: r.date ?? '',
      month: r.month ?? '',
      totalAmount: Number(r.total_amount),
      note: r.note ?? '',
      details: r.details ?? '[]',
    }));
  } catch (e) {
    console.error('getAllocationHistory:', e);
    return [];
  }
}

export async function getAppSettings(): Promise<Record<string, string>> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('app_settings').select('key, value');
    if (error) throw error;
    return Object.fromEntries((data ?? []).map(r => [r.key, r.value]));
  } catch (e) {
    console.error('getAppSettings:', e);
    return {};
  }
}

// ─── Writes ──────────────────────────────────────────────────

export async function recordNetWorthSnapshot(total: number, invest: number, savings: number, gold: number, cash: number) {
  try {
    const sb = getSupabase();
    const today = new Date().toISOString().split('T')[0];
    await sb.from('history').upsert(
      { date: today, total_value: total, investments_value: invest, savings_value: savings, gold_value: gold, cash_value: cash },
      { onConflict: 'date' }
    );
  } catch (e) {
    console.error('recordNetWorthSnapshot:', e);
  }
}

export async function saveAllocationRecord(record: AllocationRecord) {
  const sb = getSupabase();
  const { error } = await sb.from('allocations').upsert(
    {
      date: record.date,
      month: record.month,
      total_amount: record.totalAmount,
      note: record.note,
      details: record.details,
    },
    { onConflict: 'month' }
  );
  if (error) throw error;
}

export async function updateAppSetting(key: string, value: string) {
  try {
    const sb = getSupabase();
    await sb.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
  } catch (e) {
    console.error('updateAppSetting:', e);
  }
}

export async function upsertFund(body: {
  fundName: string; type: string; initialBalance: number;
  goalAmount?: number; targetDate?: string; monthlyTarget?: number;
  isUpdate?: boolean;
}) {
  const sb = getSupabase();
  if (body.isUpdate) {
    const { error } = await sb.from('funds').update({
      type: body.type,
      initial_balance: body.initialBalance,
      goal_amount: body.goalAmount ?? null,
      target_date: body.targetDate || null,
      monthly_target: body.monthlyTarget ?? null,
    }).eq('fund_name', body.fundName);
    if (error) throw error;
  } else {
    const { error } = await sb.from('funds').insert({
      fund_name: body.fundName,
      type: body.type,
      initial_balance: body.initialBalance,
      goal_amount: body.goalAmount ?? null,
      target_date: body.targetDate || null,
      monthly_target: body.monthlyTarget ?? null,
    });
    if (error) throw new Error(error.code === '23505' ? 'Tên Quỹ đã tồn tại!' : error.message);
  }
}

export async function deleteFund(name: string) {
  const sb = getSupabase();
  const { error } = await sb.from('funds').delete().eq('fund_name', name);
  if (error) throw error;
}

export async function upsertInvestment(body: {
  actionType?: string; asset: string; originalAsset?: string;
  quantity?: number; avgPrice?: number; currentPrice?: number;
}) {
  const sb = getSupabase();
  if (body.actionType === 'DELETE_ASSET') {
    const { error } = await sb.from('investments').delete().eq('asset', body.asset);
    if (error) throw error;
  } else if (body.actionType === 'UPDATE_ASSET') {
    const { error } = await sb.from('investments').update({
      asset: body.asset,
      quantity: body.quantity,
      avg_price: body.avgPrice,
      ...(body.currentPrice != null && { current_price: body.currentPrice }),
      updated_at: new Date().toISOString(),
    }).eq('asset', body.originalAsset ?? body.asset);
    if (error) throw error;
  } else {
    const { error } = await sb.from('investments').insert({
      asset: body.asset,
      quantity: body.quantity ?? 0,
      avg_price: body.avgPrice ?? 0,
      current_price: body.currentPrice ?? body.avgPrice ?? 0,
    });
    if (error) throw new Error(error.code === '23505' ? 'Mã CP đã tồn tại!' : error.message);
  }
}

export async function syncInvestmentPrice(asset: string, price: number) {
  const sb = getSupabase();
  const { error } = await sb.from('investments')
    .update({ current_price: price, updated_at: new Date().toISOString() })
    .eq('asset', asset);
  if (error) throw error;
}

// Savings mutations
export async function upsertSaving(body: {
  id?: number; bankName: string; principal: number; interestRate: number;
  startDate?: string; maturityDate?: string;
}) {
  const sb = getSupabase();
  if (body.id) {
    const { error } = await sb.from('savings').update({
      bank_name: body.bankName,
      principal: body.principal,
      interest_rate: body.interestRate,
      start_date: body.startDate || null,
      maturity_date: body.maturityDate || null,
    }).eq('id', body.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from('savings').insert({
      bank_name: body.bankName,
      principal: body.principal,
      interest_rate: body.interestRate,
      start_date: body.startDate || null,
      maturity_date: body.maturityDate || null,
    });
    if (error) throw error;
  }
}

export async function deleteSaving(id: number) {
  const sb = getSupabase();
  const { error } = await sb.from('savings').delete().eq('id', id);
  if (error) throw error;
}

// Gold mutations
export async function upsertGold(body: {
  id?: number; type: string; quantity: number; avgPrice: number; currentPrice?: number;
}) {
  const sb = getSupabase();
  if (body.id) {
    const { error } = await sb.from('gold').update({
      type: body.type,
      quantity: body.quantity,
      avg_price: body.avgPrice,
      ...(body.currentPrice != null && { current_price: body.currentPrice }),
      updated_at: new Date().toISOString(),
    }).eq('id', body.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from('gold').insert({
      type: body.type,
      quantity: body.quantity,
      avg_price: body.avgPrice,
      current_price: body.currentPrice ?? body.avgPrice,
    });
    if (error) throw error;
  }
}

export async function deleteGold(id: number) {
  const sb = getSupabase();
  const { error } = await sb.from('gold').delete().eq('id', id);
  if (error) throw error;
}

// Transaction insert
export async function addTransaction(tx: Omit<Transaction, 'createdAt'>) {
  const sb = getSupabase();
  const { error } = await sb.from('transactions').insert({
    date: tx.date,
    type: tx.type,
    source_fund: tx.sourceFund,
    destination_fund: tx.destinationFund,
    amount: tx.amount,
    note: tx.note,
  });
  if (error) throw error;
}
