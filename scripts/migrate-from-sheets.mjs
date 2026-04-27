/**
 * One-time migration: Google Sheets → Supabase
 * Run: node scripts/migrate-from-sheets.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { SignJWT, importPKCS8 } from 'jose';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
}

// ── Supabase client ─────────────────────────────────────────
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Google Sheets auth ──────────────────────────────────────
async function getAccessToken() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const alg = 'RS256';
  const pkcs8 = await importPKCS8(privateKey, alg);
  const jwt = await new SignJWT({ iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token' })
    .setProtectedHeader({ alg }).setIssuedAt().setExpirationTime('1h').sign(pkcs8);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Cannot get Google access token');
  return data.access_token;
}

function parseMoney(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return Number(String(val).replace(/[^0-9]/g, '')) || 0;
}

function parseDecimal(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, '.')) || 0;
}

async function migrate() {
  console.log('Connecting to Google Sheets…');
  const token = await getAccessToken();
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, { token });
  await doc.loadInfo();
  console.log(`Sheet: "${doc.title}"\n`);

  // ── Funds ──────────────────────────────────────────────────
  const fundsSheet = doc.sheetsByTitle['Funds'];
  if (fundsSheet) {
    await fundsSheet.loadHeaderRow();
    const rows = await fundsSheet.getRows();
    const funds = rows.map(r => ({
      fund_name:      r.get('FundName') || 'Không tên',
      type:           r.get('Type') || 'Khác',
      initial_balance: parseMoney(r.get('InitialBalance')),
      goal_amount:    parseMoney(r.get('GoalAmount')) || null,
      target_date:    r.get('TargetDate') || null,
      monthly_target: parseMoney(r.get('MonthlyTarget')) || null,
    }));
    if (funds.length) {
      const { error } = await sb.from('funds').upsert(funds, { onConflict: 'fund_name' });
      if (error) console.error('Funds error:', error.message);
      else console.log(`✓ Funds: ${funds.length} rows`);
    }
  }

  // ── Investments ────────────────────────────────────────────
  const invSheet = doc.sheetsByTitle['Investments'];
  if (invSheet) {
    const rows = await invSheet.getRows();
    const inv = rows.map(r => ({
      asset:         r.get('Asset') || 'N/A',
      quantity:      parseDecimal(r.get('Quantity')),
      avg_price:     parseMoney(r.get('AvgPrice')),
      current_price: parseMoney(r.get('CurrentPrice')),
    }));
    if (inv.length) {
      const { error } = await sb.from('investments').upsert(inv, { onConflict: 'asset' });
      if (error) console.error('Investments error:', error.message);
      else console.log(`✓ Investments: ${inv.length} rows`);
    }
  }

  // ── Savings ────────────────────────────────────────────────
  const savSheet = doc.sheetsByTitle['Savings'];
  if (savSheet) {
    const rows = await savSheet.getRows();
    const savings = rows.map(r => ({
      bank_name:     r.get('BankName') || 'N/A',
      principal:     parseMoney(r.get('Principal')),
      interest_rate: parseDecimal(r.get('InterestRate')),
      start_date:    r.get('StartDate') || null,
      maturity_date: r.get('MaturityDate') || null,
    }));
    if (savings.length) {
      const { error } = await sb.from('savings').insert(savings);
      if (error) console.error('Savings error:', error.message);
      else console.log(`✓ Savings: ${savings.length} rows`);
    }
  }

  // ── Gold ───────────────────────────────────────────────────
  const goldSheet = doc.sheetsByTitle['Gold'];
  if (goldSheet) {
    const rows = await goldSheet.getRows();
    const gold = rows.map(r => ({
      type:          r.get('Type') || 'N/A',
      quantity:      parseDecimal(r.get('Quantity')),
      avg_price:     parseMoney(r.get('AvgPrice')),
      current_price: parseMoney(r.get('CurrentPrice')),
    }));
    if (gold.length) {
      const { error } = await sb.from('gold').insert(gold);
      if (error) console.error('Gold error:', error.message);
      else console.log(`✓ Gold: ${gold.length} rows`);
    }
  }

  // ── Transactions ───────────────────────────────────────────
  const txSheet = doc.sheetsByTitle['Transactions'];
  if (txSheet) {
    const rows = await txSheet.getRows();
    const txs = rows.map(r => ({
      date:             r.get('Date') || new Date().toISOString().split('T')[0],
      type:             r.get('Type') || '',
      source_fund:      r.get('SourceFund') || '',
      destination_fund: r.get('DestinationFund') || '',
      amount:           parseMoney(r.get('Amount')),
      note:             r.get('Note') || '',
      created_at:       r.get('CreatedAt') || new Date().toISOString(),
    }));
    if (txs.length) {
      // Insert in batches of 500
      for (let i = 0; i < txs.length; i += 500) {
        const batch = txs.slice(i, i + 500);
        const { error } = await sb.from('transactions').insert(batch);
        if (error) { console.error('Transactions error:', error.message); break; }
      }
      console.log(`✓ Transactions: ${txs.length} rows`);
    }
  }

  // ── History ────────────────────────────────────────────────
  const histSheet = doc.sheetsByTitle['History'];
  if (histSheet) {
    const rows = await histSheet.getRows();
    const histRaw = rows.map(r => ({
      date:              r.get('Date'),
      total_value:       parseMoney(r.get('TotalValue')),
      investments_value: parseMoney(r.get('InvestmentsValue')),
      savings_value:     parseMoney(r.get('SavingsValue')),
      gold_value:        parseMoney(r.get('GoldValue')),
      cash_value:        parseMoney(r.get('CashValue')),
    })).filter(r => r.date);
    // Deduplicate by date (keep last occurrence)
    const histMap = new Map();
    for (const r of histRaw) histMap.set(r.date, r);
    const hist = [...histMap.values()];
    if (hist.length) {
      const { error } = await sb.from('history').upsert(hist, { onConflict: 'date' });
      if (error) console.error('History error:', error.message);
      else console.log(`✓ History: ${hist.length} rows`);
    }
  }

  // ── Allocations ────────────────────────────────────────────
  const allocSheet = doc.sheetsByTitle['Allocations'];
  if (allocSheet) {
    const rows = await allocSheet.getRows();
    const allocs = rows.map(r => ({
      date:         r.get('Date') || new Date().toISOString().split('T')[0],
      month:        r.get('Month') || '',
      total_amount: parseMoney(r.get('TotalAmount')),
      note:         r.get('Note') || '',
      details:      r.get('Details') || '[]',
    }));
    if (allocs.length) {
      const { error } = await sb.from('allocations').insert(allocs);
      if (error) console.error('Allocations error:', error.message);
      else console.log(`✓ Allocations: ${allocs.length} rows`);
    }
  }

  // ── App Settings ───────────────────────────────────────────
  const settSheet = doc.sheetsByTitle['Settings'];
  if (settSheet) {
    const rows = await settSheet.getRows();
    const settings = rows
      .map(r => ({ key: r.get('Key'), value: r.get('Value') || '' }))
      .filter(r => r.key);
    if (settings.length) {
      const { error } = await sb.from('app_settings').upsert(settings, { onConflict: 'key' });
      if (error) console.error('Settings error:', error.message);
      else console.log(`✓ Settings: ${settings.length} rows`);
    }
  }

  console.log('\n✅ Migration complete!');
}

migrate().catch(e => { console.error('Migration failed:', e); process.exit(1); });
