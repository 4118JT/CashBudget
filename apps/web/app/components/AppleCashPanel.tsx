'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Account, Tx } from './types';
import type { ToastType } from './Toast';

interface AppleCashPanelProps {
  account: Account | null;
  transactions: Tx[];
  onCreate: (balance: number) => Promise<void>;
  onUpdateBalance: (balance: number) => Promise<void>;
  addToast: (message: string, type?: ToastType) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export default function AppleCashPanel({ account, transactions, onCreate, onUpdateBalance, addToast }: AppleCashPanelProps) {
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setBalance(account ? String(account.starting_balance) : ''), [account]);

  const activity = useMemo(() => {
    if (!account) return { income: 0, expenses: 0 };
    return transactions.filter((transaction) => transaction.account_id === account.id).reduce((total, transaction) => ({
      income: total.income + (transaction.kind === 'income' ? Number(transaction.amount) : 0),
      expenses: total.expenses + (transaction.kind === 'expense' ? Number(transaction.amount) : 0),
    }), { income: 0, expenses: 0 });
  }, [account, transactions]);

  async function saveBalance() {
    const nextBalance = Number(balance);
    if (!Number.isFinite(nextBalance) || nextBalance < 0) {
      addToast('Enter a valid Apple Cash balance.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (account) await onUpdateBalance(nextBalance);
      else await onCreate(nextBalance);
      addToast(account ? 'Apple Cash balance updated.' : 'Apple Cash account created.', 'success');
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : 'Unable to update Apple Cash.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const estimatedBalance = account ? Number(account.starting_balance) + activity.income - activity.expenses : 0;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Manual account</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Apple Cash</h2><p className="mt-1 text-sm text-slate-600">Track your Apple Cash card without bank linking.</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Visa</span></div>
      {account ? <div className="mt-5 rounded-xl bg-emerald-950 px-4 py-4 text-white"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Estimated balance</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(estimatedBalance)}</p><p className="mt-1 text-xs text-emerald-200">Starting balance plus Apple Cash activity recorded here.</p></div> : <div className="mt-5 rounded-xl border border-dashed border-emerald-300 bg-white/70 p-4 text-sm text-slate-600">Create your Apple Cash account to track its balance separately.</div>}
      {account && <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-white/80 p-3"><p className="text-xs text-slate-500">Received</p><p className="mt-1 font-semibold text-emerald-700">{formatCurrency(activity.income)}</p></div><div className="rounded-lg bg-white/80 p-3"><p className="text-xs text-slate-500">Spent</p><p className="mt-1 font-semibold text-slate-900">{formatCurrency(activity.expenses)}</p></div></div>}
      <div className="mt-4 flex gap-2"><input type="number" min="0" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="Current balance" className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400" /><button type="button" onClick={saveBalance} disabled={saving} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">{saving ? 'Saving…' : account ? 'Update' : 'Add Apple Cash'}</button></div>
    </section>
  );
}
