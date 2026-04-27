/**
 * Fix duplicate rows in savings and gold tables caused by running migration twice.
 * Run: node scripts/fix-duplicates.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLines = readFileSync(resolve(__dirname, '../.env.local'), 'utf8').split('\n');
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function dedupTable(table) {
  // Get all rows ordered by id
  const { data, error } = await sb.from(table).select('id').order('id');
  if (error) { console.error(table, error.message); return; }

  // Keep only the first half (original migration)
  const half = Math.ceil(data.length / 2);
  const toDelete = data.slice(half).map(r => r.id);

  if (toDelete.length === 0) { console.log(`✓ ${table}: no duplicates`); return; }

  const { error: delErr } = await sb.from(table).delete().in('id', toDelete);
  if (delErr) console.error(`${table} delete error:`, delErr.message);
  else console.log(`✓ ${table}: removed ${toDelete.length} duplicate rows`);
}

await dedupTable('savings');
await dedupTable('gold');
console.log('Done.');
