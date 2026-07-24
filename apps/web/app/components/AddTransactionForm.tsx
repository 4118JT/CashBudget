'use client';

import { useState } from 'react';
import type { Account, Category } from './types';
import type { ToastType } from './Toast';

type NewTx = {
  amount: number;
  kind: 'expense' | 'income';
  merchant: string;
  category_id: string | null;
  occurred_at: string;
  account_id: string;
  note: string | null;
};

interface AddTransactionFormProps {
  categories: Category[];
  accounts: Account[];
  defaultAccountId: string | null;
  onAdd: (tx: NewTx) => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
}

export default function AddTransactionForm({
  categories,
  accounts,
  defaultAccountId,
  onAdd,
  addToast,
}: AddTransactionFormProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(defaultAccountId ?? '');
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
        account_id: accountId || defaultAccountId || '',
        occurred_at: new Date(occurredAt).toISOString(),
        note: note.trim() || null,
      });

      setAmount('');
      setMerchant('');
      setCategoryId('');
      setAccountId(defaultAccountId ?? '');
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
    `block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Add Transaction</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Amount ($)</label>
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
          <label className="block text-sm text-gray-600 mb-1">Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind('expense')}
              className={`rounded-lg border px-3 py-2 text-sm ${
                kind === 'expense'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setKind('income')}
              className={`rounded-lg border px-3 py-2 text-sm ${
                kind === 'income'
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Merchant / Description</label>
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
          <label className="block text-sm text-gray-600 mb-1">Account</label>
          <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Category</label>
          <select
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
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
          <label className="block text-sm text-gray-600 mb-1">Date</label>
          <input
            type="date"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details..."
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 text-white py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Transaction'}
        </button>
      </form>
    </div>
  );
}