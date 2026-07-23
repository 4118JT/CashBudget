'use client';

import { useMemo } from 'react';
import type { Category, Tx } from './types';

interface AnalyticsProps {
  transactions: Tx[];
  categories: Category[];
}

function Bar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function Analytics({ transactions, categories }: AnalyticsProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Last 6 months monthly breakdown
  const monthly = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const txs = transactions.filter((t) => {
        const td = new Date(t.occurred_at);
        return td.getFullYear() === year && td.getMonth() === month;
      });

      const income = txs.filter((t) => t.kind === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter((t) => t.kind === 'expense').reduce((s, t) => s + Number(t.amount), 0);

      months.push({ label, income, expense });
    }
    return months;
  }, [transactions]);

  const maxMonthly = useMemo(
    () => Math.max(...monthly.map((m) => Math.max(m.income, m.expense)), 1),
    [monthly]
  );

  // Category breakdown (all time)
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();

    for (const t of transactions) {
      if (t.kind !== 'expense') continue;
      const catId = t.category_id ?? '__none__';
      const catName = t.categories?.name ?? 'Uncategorized';
      const existing = map.get(catId) ?? { name: catName, total: 0 };
      map.set(catId, { name: catName, total: existing.total + Number(t.amount) });
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [transactions]);

  const maxCategory = useMemo(
    () => Math.max(...categoryBreakdown.map((c) => c.total), 1),
    [categoryBreakdown]
  );

  if (transactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Monthly breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Monthly Overview</h2>
        <div className="space-y-3">
          {monthly.map((m) => (
            <div key={m.label}>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span className="font-medium text-gray-700 w-12">{m.label}</span>
                <div className="flex gap-4">
                  <span className="text-green-600">+{fmt(m.income)}</span>
                  <span className="text-red-600">-{fmt(m.expense)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Bar value={m.income} max={maxMonthly} colorClass="bg-green-400" />
                <Bar value={m.expense} max={maxMonthly} colorClass="bg-red-400" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" /> Income</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" /> Expenses</span>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Spending by Category</h2>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-gray-400">No expense data yet.</p>
        ) : (
          <div className="space-y-3">
            {categoryBreakdown.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 font-medium">{c.name}</span>
                  <span className="text-gray-500">{fmt(c.total)}</span>
                </div>
                <Bar value={c.total} max={maxCategory} colorClass="bg-indigo-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
