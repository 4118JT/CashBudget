'use client';

import { useMemo } from 'react';
import type { Goal, Loan, RecurringPayment, Tx } from './types';

interface FinancialPulseProps {
  transactions: Tx[];
  goals: Goal[];
  loans: Loan[];
  recurring: RecurringPayment[];
}

type Commitment = { name: string; date: string; amount: number; type: 'Recurring' | 'Goal' | 'Loan' };

const currency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

function daysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export default function FinancialPulse({ transactions, goals, loans, recurring }: FinancialPulseProps) {
  const data = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenses = transactions.filter((transaction) => transaction.kind === 'expense' && new Date(transaction.occurred_at) >= monthStart);
    const income = transactions.filter((transaction) => transaction.kind === 'income' && new Date(transaction.occurred_at) >= monthStart)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const spend = expenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const daysElapsed = Math.max(now.getDate(), 1);
    const projectedSpend = (spend / daysElapsed) * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const savingsRate = income > 0 ? ((income - spend) / income) * 100 : null;

    const commitments: Commitment[] = [
      ...recurring.filter((item) => item.is_active).map((item) => ({ name: item.name, date: item.next_due_date, amount: Number(item.amount), type: 'Recurring' as const })),
      ...goals.filter((item) => item.status === 'planned').map((item) => ({ name: item.title, date: item.due_date, amount: Number(item.amount), type: 'Goal' as const })),
      ...loans.filter((item) => item.status === 'active' && item.next_due_date).map((item) => ({ name: item.name, date: item.next_due_date!, amount: Number(item.monthly_payment), type: 'Loan' as const })),
    ].filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

    const topCategory = new Map<string, number>();
    for (const transaction of expenses) {
      const name = transaction.categories?.name ?? 'Uncategorized';
      topCategory.set(name, (topCategory.get(name) ?? 0) + Number(transaction.amount));
    }
    const leader = [...topCategory.entries()].sort((a, b) => b[1] - a[1])[0];

    return { income, spend, projectedSpend, savingsRate, commitments, leader };
  }, [transactions, goals, loans, recurring]);

  const insight = data.leader
    ? `${data.leader[0]} is your highest spending category this month at ${currency(data.leader[1])}.`
    : 'Add a few transactions to unlock personalized spending insights.';

  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Financial pulse</p><h2 className="mt-1 text-lg font-semibold text-slate-900">A forward look at your month</h2></div>
          <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Live from your activity</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">This month</p><p className="mt-1 text-lg font-semibold text-slate-900">{currency(data.spend)}</p><p className="text-xs text-slate-500">spent so far</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Projected</p><p className="mt-1 text-lg font-semibold text-slate-900">{currency(data.projectedSpend)}</p><p className="text-xs text-slate-500">month-end spend</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Income</p><p className="mt-1 text-lg font-semibold text-slate-900">{currency(data.income)}</p><p className="text-xs text-slate-500">this month</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Savings rate</p><p className="mt-1 text-lg font-semibold text-slate-900">{data.savingsRate === null ? '—' : `${data.savingsRate.toFixed(0)}%`}</p><p className="text-xs text-slate-500">after expenses</p></div>
        </div>
        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3"><p className="text-sm font-medium text-indigo-950">{insight}</p><p className="mt-1 text-xs text-indigo-700">Use the Analytics section to explore your spending pattern in detail.</p></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Upcoming</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Your next commitments</h2></div><a href="#planning" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Plan ahead</a></div>
        <div className="mt-4 divide-y divide-slate-100">
          {data.commitments.length === 0 ? <p className="py-5 text-sm text-slate-500">No upcoming commitments. Add a goal, recurring payment, or loan to see it here.</p> : data.commitments.map((item) => {
            const days = daysUntil(item.date);
            const timing = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `In ${days}d`;
            return <div key={`${item.type}-${item.name}-${item.date}`} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">{item.type} · {timing}</p></div><p className="shrink-0 text-sm font-semibold text-slate-900">{currency(item.amount)}</p></div>;
          })}
        </div>
      </div>
    </section>
  );
}
