'use client';

import { useState } from 'react';
import type { Category } from './types';
import type { ToastType } from './Toast';

const validate = (): boolean => {
  const next: Record<string, string> = {};
  if (!amount || Number(amount) <= 0) next.amount = 'Enter a valid amount';
  if (!merchant.trim()) next.merchant = 'Merchant is required';
  setErrors(next);
  return Object.keys(next).length === 0;
};

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!validate()) return;
  setSaving(true);

  try {
    await onAdd({
      amount: Number(amount),
      transaction_type: kind,
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
    addToast(err instanceof Error ? err.message : 'Failed to save transaction', 'error');
  } finally {
    setSaving(false);
  }
}

export default function AddTransactionForm({ categories, onAdd, addToast }: AddTransactionFormProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCategories = categories.filter((c) => c.kind === kind);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const amt = Number(amount);
    if (!amount.trim()) errs.amount = 'Amount is required';
    else if (isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid positive amount';
    if (!occurredAt) errs.occurredAt = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onAdd({
        amount: Number(amount),
        type: type.toLowerCase(),
        merchant: merchant.trim(),
        category: categoryId || null,
        date: new Date(occurredAt).toISOString().slice(0, 10), // YYYY-MM-DD
        notes: note.trim() || null,
        status: 'completed',
      });
      setAmount('');
      setMerchant('');
      setCategoryId('');
      setNote('');
      setOccurredAt(new Date().toISOString().slice(0, 10));
      setErrors({});
      addToast('Transaction saved!', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to save transaction', 'error');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (field: string) =>
    `block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Add Transaction</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
          <input
            className={inputCls('amount')}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['expense', 'income'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { setKind(k); setCategoryId(''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  kind === k
                    ? k === 'expense'
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Merchant / Description</label>
          <input
            className={inputCls('merchant')}
            placeholder="e.g. Starbucks"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            className={inputCls('category')}
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

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            className={inputCls('occurredAt')}
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
          {errors.occurredAt && <p className="mt-1 text-xs text-red-500">{errors.occurredAt}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <textarea
            className={`${inputCls('note')} resize-none`}
            rows={2}
            placeholder="Any details…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving…' : 'Save Transaction'}
        </button>
      </form>
    </div>
  );
}
