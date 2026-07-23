'use client';

import { useMemo } from 'react';
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

    // Top expense category this month
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

    return { income, expense, net, lastIncome, lastExpense, lastNet, savingsRate, avgDailyExpense, topCategory };
  }, [transactions]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Income */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Income (this month)</p>
        <p className="mt-1 text-2xl font-bold text-green-600">{fmt(stats.income)}</p>
        <div className="mt-2">
          <MomBadge current={stats.income} previous={stats.lastIncome} />
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Expenses (this month)</p>
        <p className="mt-1 text-2xl font-bold text-red-600">{fmt(stats.expense)}</p>
        <div className="mt-2">
          <MomBadge current={stats.expense} previous={stats.lastExpense} />
        </div>
      </div>

      {/* Net */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Net balance</p>
        <p className={`mt-1 text-2xl font-bold ${stats.net >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
          {fmt(stats.net)}
        </p>
        <div className="mt-2">
          <MomBadge current={stats.net} previous={stats.lastNet} />
        </div>
      </div>

      {/* Savings Rate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Savings rate</p>
        <p className={`mt-1 text-2xl font-bold ${(stats.savingsRate ?? 0) >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
          {stats.savingsRate === null ? '—' : `${stats.savingsRate.toFixed(1)}%`}
        </p>
        <p className="mt-1 text-xs text-gray-400">of income saved this month</p>
      </div>

      {/* Avg Daily Expense */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Avg daily spend</p>
        <p className="mt-1 text-2xl font-bold text-gray-800">{fmt(stats.avgDailyExpense)}</p>
        <p className="mt-1 text-xs text-gray-400">per day so far this month</p>
      </div>

      {/* Top Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Top expense category</p>
        {stats.topCategory ? (
          <>
            <p className="mt-1 text-xl font-bold text-gray-800 truncate">{stats.topCategory[0]}</p>
            <p className="mt-0.5 text-sm font-semibold text-red-500">{fmt(stats.topCategory[1])}</p>
          </>
        ) : (
          <p className="mt-1 text-2xl font-bold text-gray-300">—</p>
        )}
      </div>
    </div>
  );
}
