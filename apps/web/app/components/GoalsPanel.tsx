'use client';

import { useState } from 'react';
import type { ToastType } from './Toast';

type Goal = {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: 'planned' | 'paid' | 'skipped';
};

interface GoalsPanelProps {
  goals: Goal[];
  onAddGoal: (goal: { title: string; amount: number; due_date: string }) => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
}

export default function GoalsPanel({ goals, onAddGoal, addToast }: GoalsPanelProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Goal title is required', 'error');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      addToast('Enter a valid goal amount', 'error');
      return;
    }

    setSaving(true);
    try {
      await onAddGoal({
        title: title.trim(),
        amount: Number(amount),
        due_date: dueDate,
      });
      setTitle('');
      setAmount('');
      setDueDate(new Date().toISOString().slice(0, 10));
      addToast('Goal saved!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save goal';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Savings Goals</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title (e.g. New Console)"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
        />
        <input
          type="date"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-teal-600 text-white py-2.5 text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Add Goal'}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {goals.length === 0 ? (
          <p className="text-xs text-gray-400">No goals yet.</p>
        ) : (
          goals.map((g) => (
            <div key={g.id} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{g.title}</p>
                <span className="text-sm font-semibold text-teal-700">{fmt(Number(g.amount))}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Due {new Date(g.due_date).toLocaleDateString('en-US')} · {g.status}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
