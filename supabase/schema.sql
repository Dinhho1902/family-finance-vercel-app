-- ============================================================
-- Family Finance App — Supabase Schema
-- Run this in the Supabase SQL Editor to set up all tables
-- ============================================================

-- Funds
create table if not exists funds (
  id            bigserial primary key,
  fund_name     text        not null unique,
  type          text        not null default 'Khác',
  initial_balance bigint    not null default 0,
  goal_amount   bigint,
  target_date   date,
  monthly_target bigint,
  created_at    timestamptz not null default now()
);

-- Investments (stocks / ETFs)
create table if not exists investments (
  id            bigserial primary key,
  asset         text        not null unique,
  quantity      numeric     not null default 0,
  avg_price     bigint      not null default 0,
  current_price bigint      not null default 0,
  updated_at    timestamptz not null default now()
);

-- Savings (fixed-income bank accounts)
create table if not exists savings (
  id            bigserial primary key,
  bank_name     text        not null,
  principal     bigint      not null default 0,
  interest_rate numeric     not null default 0,
  start_date    date,
  maturity_date date,
  created_at    timestamptz not null default now()
);

-- Gold holdings
create table if not exists gold (
  id            bigserial primary key,
  type          text        not null,
  quantity      numeric     not null default 0,
  avg_price     bigint      not null default 0,
  current_price bigint      not null default 0,
  updated_at    timestamptz not null default now()
);

-- Transactions ledger
create table if not exists transactions (
  id              bigserial primary key,
  date            date        not null,
  type            text        not null, -- Income | Expense | Transfer
  source_fund     text        not null default '',
  destination_fund text       not null default '',
  amount          bigint      not null default 0,
  note            text        not null default '',
  created_at      timestamptz not null default now()
);

-- Daily net-worth snapshots
create table if not exists history (
  id                bigserial primary key,
  date              date        not null unique,
  total_value       bigint      not null default 0,
  investments_value bigint      not null default 0,
  savings_value     bigint      not null default 0,
  gold_value        bigint      not null default 0,
  cash_value        bigint      not null default 0
);

-- Monthly allocation records
create table if not exists allocations (
  id           bigserial primary key,
  date         date        not null,
  month        text        not null,  -- e.g. "3/2024"
  total_amount bigint      not null default 0,
  note         text        not null default '',
  details      text        not null default '[]',  -- JSON
  created_at   timestamptz not null default now()
);

-- App settings (key-value store)
create table if not exists app_settings (
  id         bigserial primary key,
  key        text        not null unique,
  value      text        not null default ''
);

-- ============================================================
-- Row Level Security — enable but keep permissive for now
-- (tighten once you add Supabase Auth users)
-- ============================================================
alter table funds         enable row level security;
alter table investments   enable row level security;
alter table savings       enable row level security;
alter table gold          enable row level security;
alter table transactions  enable row level security;
alter table history       enable row level security;
alter table allocations   enable row level security;
alter table app_settings  enable row level security;

-- The service-role key (used server-side only) bypasses RLS automatically, so
-- ALL legitimate access goes through the Next.js API routes. The public anon
-- key is shipped in the client bundle (unavoidable with Supabase), so it must
-- have NO direct access to any table. With RLS enabled and no permissive
-- policy, the anon/authenticated roles get zero rows on read and are blocked
-- on write — closing the direct-REST-API auth bypass.
--
-- NOTE: a brand-new schema run never creates these policies. The drops below
-- are idempotent cleanup for databases that already ran the old permissive
-- version. Run this whole block in the Supabase SQL Editor to remediate.
drop policy if exists "allow_all_funds"         on funds;
drop policy if exists "allow_all_investments"   on investments;
drop policy if exists "allow_all_savings"       on savings;
drop policy if exists "allow_all_gold"          on gold;
drop policy if exists "allow_all_transactions"  on transactions;
drop policy if exists "allow_all_history"       on history;
drop policy if exists "allow_all_allocations"   on allocations;
drop policy if exists "allow_all_app_settings"  on app_settings;

-- ============================================================
-- Migration: ngăn chặn duplicate phân bổ cùng tháng
-- Chạy lệnh này 1 lần trong Supabase SQL Editor nếu bảng đã tồn tại:
-- ALTER TABLE allocations ADD CONSTRAINT allocations_month_unique UNIQUE (month);
-- ============================================================
alter table allocations add constraint if not exists allocations_month_unique unique (month);
