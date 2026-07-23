'use client';

import { useState } from 'react';
import type { Category } from './types';
import type { ToastType } from './Toast';

type NewTx = {
  amount: number;
  kind: 'expense' | 'income';
  merchant: string;
  category_id: string | null;
  occurred_at: string;
  note: string | null;
};

interface AddTransactionFormProps {
  categories: Category[];
  onAdd: (tx: NewTx) => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
}

export default function AddTransactionForm({
  categories,
  onAdd,
  addToast,
}: AddTransactionFormProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCategories = categories.filter((c) => c.kind === kind);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!amount || Number(amount) <= 0) next.amount = 'Enter a valid amount';
    if (!merchant.trim()) next.merchant = 'Merchant is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    try {
      await onAdd({
        amount: Number(amount),
        kind,
        merchant: merchant.trim(),
        category_id: categoryId || null,
        occurred_at: new Date(occurredAt).toISOString(),
        note: note.trim() || null,
      });

      setAmount('');
      setMerchant('');
      setCategoryId('');
      setNote('');
      setOccurredAt(new Date().toISOString().slice(0, 10));
      setErrors({});
      addToast('Transaction saved!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save transaction';
      console.error('Save transaction failed:', err);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (field: string) =>
    `block w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-300 focus:outline-none focus:ring-4 ${
      errors[field] ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
    }`;

  return (
    <div className="surface-card p-5 sm:p-6">
      <h2 className="mb-1 text-base font-bold text-slate-900">Add transaction</h2>

      <p className="mb-5 text-sm text-slate-500">Capture income and spending as it happens.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputCls('amount')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind('expense')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                kind === 'expense'
                  ? 'border-rose-500 bg-rose-500 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setKind('income')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                kind === 'income'
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Merchant / Description</label>
          <input
            type="text"
            className={inputCls('merchant')}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g. Starbucks"
          />
          {errors.merchant && <p className="text-xs text-red-500 mt-1">{errors.merchant}</p>}
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
          <select
            className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— None —</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
          <input
            type="date"
            className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes (optional)</label>
          <textarea
            className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details..."
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Transaction'}
        </button>
      </form>
    </div>
  );
}