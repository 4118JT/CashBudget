'use client';

import { useMemo } from 'react';
import type { Tx } from './types';

interface SummaryCardsProps {
  transactions: Tx[];
}

export default function SummaryCards({ transactions }: SummaryCardsProps) {
  const { income, expense, net } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const monthly = transactions.filter((t) => t.occurred_at >= startOfMonth);

    const income = monthly
      .filter((t) => t.kind === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = monthly
      .filter((t) => t.kind === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { income, expense, net: income - expense };
  }, [transactions]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Income (this month)</p>
        <p className="mt-1 text-2xl font-bold text-green-600">{fmt(income)}</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Expenses (this month)</p>
        <p className="mt-1 text-2xl font-bold text-red-600">{fmt(expense)}</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-500">Net balance</p>
        <p
          className={`mt-1 text-2xl font-bold ${
            net >= 0 ? 'text-indigo-600' : 'text-orange-600'
          }`}
        >
          {fmt(net)}
        </p>
      </div>
    </div>
  );
}
