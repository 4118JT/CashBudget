'use client';

import { useState } from 'react';
import type { Category } from './types';
import type { ToastType } from './Toast';

interface AddTransactionFormProps {
  categories: Category[];
  onAdd: (tx: {
    amount: number;
    kind: 'expense' | 'income';
    merchant: string;
    category_id: string;
    occurred_at: string;
    note: string;
  }) => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
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
        kind,
        merchant: merchant.trim(),
        category_id: categoryId || '',
        occurred_at: new Date(occurredAt).toISOString(),
        note: note.trim(),
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
    `block w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p
