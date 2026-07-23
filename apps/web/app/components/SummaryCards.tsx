'use client';

import { useMemo, useState } from 'react';
import type { Tx } from './types';

interface SummaryCardsProps {
  transactions: Tx[];
}

function MomBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? null : ((current - previous) / previous) * 100;
  const up = pct === null ? true : pct >= 0;
  const label = pct === null ? 'new' : `${Math.abs(pct).toFixed(1)}%`;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
        up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
      }`}
    >
      {pct === null ? '' : up ? '▲' : '▼'} {label} vs last month
    </span>
  );
}

export default function SummaryCards({ transactions }: SummaryCardsProps) {
  const [view, setView] = useState<'monthly' | 'alltime'>('monthly');
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const thisMonth = transactions.filter((t) => new Date(t.occurred_at) >= startOfMonth);
    const lastMonth = transactions.filter((t) => {
      const d = new Date(t.occurred_at);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    const sum = (list: Tx[], kind: string) =>
      list.filter((t) => t.kind === kind).reduce((s, t) => s + Number(t.amount), 0);

    const income = sum(thisMonth, 'income');
    const expense = sum(thisMonth, 'expense');
    const net = income - expense;
    const lastIncome = sum(lastMonth, 'income');
    const lastExpense = sum(lastMonth, 'expense');
    const lastNet = lastIncome - lastExpense;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null;
    const daysElapsed = now.getDate();
    const avgDailyExpense = daysElapsed > 0 ? expense / daysElapsed : 0;

    const catMap = new Map<string, number>();
    for (const t of thisMonth) {
      if (t.kind !== 'expense') continue;
      const name = t.categories?.name ?? 'Uncategorized';
      catMap.set(name, (catMap.get(name) ?? 0) + Number(t.amount));
    }
    const topCategory =
      catMap.size > 0
        ? [...catMap.entries()].sort((a, b) => b[1] - a[1])[0]
        : null;

    // Lifetime stats
    const lifetimeIncome = sum(transactions, 'income');
    const lifetimeExpense = sum(transactions, 'expense');
    const lifetimeNet = lifetimeIncome - lifetimeExpense;
    const lifetimeSavingsRate = lifetimeIncome > 0 ? ((lifetimeIncome - lifetimeExpense) / lifetimeIncome) * 100 : null;

    // Avg monthly spend (lifetime) — based on distinct months in data
    const monthSet = new Set(
      transactions.map((t) => {
        const d = new Date(t.occurred_at);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );
    const distinctMonths = Math.max(monthSet.size, 1);
    const avgMonthlyExpense = lifetimeExpense / distinctMonths;

    const lifetimeCatMap = new Map<string, number>();
    for (const t of transactions) {
      if (t.kind !== 'expense') continue;
      const name = t.categories?.name ?? 'Uncategorized';
      lifetimeCatMap.set(name, (lifetimeCatMap.get(name) ?? 0) + Number(t.amount));
    }
    const lifetimeTopCategory =
      lifetimeCatMap.size > 0
        ? [...lifetimeCatMap.entries()].sort((a, b) => b[1] - a[1])[0]
        : null;

    return {
      income, expense, net, lastIncome, lastExpense, lastNet, savingsRate, avgDailyExpense, topCategory,
      lifetimeIncome, lifetimeExpense, lifetimeNet, lifetimeSavingsRate, avgMonthlyExpense, lifetimeTopCategory, distinctMonths,
    };
  }, [transactions]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-4">
      {/* Header bar with toggle */}
      <div className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            {view === 'monthly' ? 'This Month' : 'All Time'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {view === 'monthly'
              ? 'Current month totals vs last month'
              : 'Lifetime totals across all transactions'}
          </p>
        </div>

        {/* Toggle switch */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setView('monthly')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              view === 'monthly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setView('alltime')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              view === 'alltime'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Monthly view */}
      {view === 'monthly' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="surface-card p-4 border-t-4 border-t-green-500 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Income</p>
            <p className="mt-1 text-xl font-bold text-green-600 truncate">{fmt(stats.income)}</p>
            <div className="mt-2">
              <MomBadge current={stats.income} previous={stats.lastIncome} />
            </div>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-red-500 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Expenses</p>
            <p className="mt-1 text-xl font-bold text-red-600 truncate">{fmt(stats.expense)}</p>
            <div className="mt-2">
              <MomBadge current={stats.expense} previous={stats.lastExpense} />
            </div>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-indigo-500 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Net</p>
            <p className={`mt-1 text-xl font-bold truncate ${stats.net >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
              {fmt(stats.net)}
            </p>
            <div className="mt-2">
              <MomBadge current={stats.net} previous={stats.lastNet} />
            </div>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-teal-500 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Savings Rate</p>
            <p className={`mt-1 text-xl font-bold ${(stats.savingsRate ?? 0) >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
              {stats.savingsRate === null ? '—' : `${stats.savingsRate.toFixed(1)}%`}
            </p>
            <p className="mt-1.5 text-xs text-gray-400">of income</p>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-amber-500 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Daily avg</p>
            <p className="mt-1 text-xl font-bold text-gray-800 truncate">{fmt(stats.avgDailyExpense)}</p>
            <p className="mt-1.5 text-xs text-gray-400">per day</p>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-pink-500 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Top category</p>
            {stats.topCategory ? (
              <>
                <p className="mt-1 text-sm font-bold text-gray-800 truncate leading-tight">{stats.topCategory[0]}</p>
                <p className="mt-1 text-xs font-semibold text-red-500">{fmt(stats.topCategory[1])}</p>
              </>
            ) : (
              <p className="mt-1 text-xl font-bold text-gray-300">—</p>
            )}
          </div>
        </div>
      )}

      {/* All Time view */}
      {view === 'alltime' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="surface-card p-4 border-t-4 border-t-green-400 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Income</p>
            <p className="mt-1 text-xl font-bold text-green-600 truncate">{fmt(stats.lifetimeIncome)}</p>
            <p className="mt-1.5 text-xs text-gray-400">all time</p>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-red-400 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Expenses</p>
            <p className="mt-1 text-xl font-bold text-red-600 truncate">{fmt(stats.lifetimeExpense)}</p>
            <p className="mt-1.5 text-xs text-gray-400">all time</p>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-indigo-400 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Net</p>
            <p className={`mt-1 text-xl font-bold truncate ${stats.lifetimeNet >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
              {fmt(stats.lifetimeNet)}
            </p>
            <p className="mt-1.5 text-xs text-gray-400">all time</p>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-teal-400 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Savings Rate</p>
            <p className={`mt-1 text-xl font-bold ${(stats.lifetimeSavingsRate ?? 0) >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
              {stats.lifetimeSavingsRate === null ? '—' : `${stats.lifetimeSavingsRate.toFixed(1)}%`}
            </p>
            <p className="mt-1.5 text-xs text-gray-400">of income</p>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-amber-400 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Avg/month</p>
            <p className="mt-1 text-xl font-bold text-gray-800 truncate">{fmt(stats.avgMonthlyExpense)}</p>
            <p className="mt-1.5 text-xs text-gray-400">{stats.distinctMonths} month{stats.distinctMonths !== 1 ? 's' : ''}</p>
          </div>

          <div className="surface-card p-4 border-t-4 border-t-pink-400 col-span-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Top category</p>
            {stats.lifetimeTopCategory ? (
              <>
                <p className="mt-1 text-sm font-bold text-gray-800 truncate leading-tight">{stats.lifetimeTopCategory[0]}</p>
                <p className="mt-1 text-xs font-semibold text-red-500">{fmt(stats.lifetimeTopCategory[1])}</p>
              </>
            ) : (
              <p className="mt-1 text-xl font-bold text-gray-300">—</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
