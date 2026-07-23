'use client';

import { useState } from 'react';
import type { Category, RecurringPayment } from './types';
import type { ToastType } from './Toast';

interface RecurringPanelProps {
  recurring: RecurringPayment[];
  categories: Category[];
  onAdd: (item: {
    name: string;
    amount: number;
    frequency: RecurringPayment['frequency'];
    next_due_date: string;
    category_id: string | null;
  }) => Promise<void>;
  onToggleActive: (id: string, is_active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
}

const FREQ_LABELS: Record<RecurringPayment['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

function getDefaultNextDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function RecurringPanel({
  recurring,
  categories,
  onAdd,
  onToggleActive,
  onDelete,
  addToast,
}: RecurringPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurringPayment['frequency']>('monthly');
  const [nextDueDate, setNextDueDate] = useState(getDefaultNextDate());
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const expenseCategories = categories.filter((c) => c.kind === 'expense');

  const active = recurring.filter((r) => r.is_active).sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
  const inactive = recurring.filter((r) => !r.is_active);

  const monthlyTotal = active.reduce((s, r) => {
    if (r.frequency === 'weekly') return s + Number(r.amount) * 4.33;
    if (r.frequency === 'biweekly') return s + Number(r.amount) * 2.17;
    if (r.frequency === 'monthly') return s + Number(r.amount);
    if (r.frequency === 'yearly') return s + Number(r.amount) / 12;
    return s;
  }, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) { addToast('Name is required', 'error'); return; }
    if (!amount || Number(amount) <= 0) { addToast('Enter a valid amount', 'error'); return; }
    if (!nextDueDate) { addToast('Next due date is required', 'error'); return; }

    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        amount: Number(amount),
        frequency,
        next_due_date: nextDueDate,
        category_id: categoryId || null,
      });
      setName(''); setAmount(''); setFrequency('monthly');
      setNextDueDate(getDefaultNextDate()); setCategoryId('');
      setShowForm(false);
      addToast('Recurring payment added!', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to add recurring payment', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setActingId(id);
    try { await onToggleActive(id, !current); }
    catch (err: unknown) { addToast(err instanceof Error ? err.message : 'Failed to update', 'error'); }
    finally { setActingId(null); }
  }

  async function handleDelete(id: string) {
    setActingId(id);
    try { await onDelete(id); addToast('Recurring payment deleted.', 'info'); }
    catch (err: unknown) { addToast(err instanceof Error ? err.message : 'Failed to delete', 'error'); }
    finally { setActingId(null); }
  }

  const inputCls = 'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Recurring Payments</h2>
        {active.length > 0 && (
          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            ~{fmt(monthlyTotal)}/mo
          </span>
        )}
      </div>

      {/* Active recurring list */}
      <div className="space-y-2 mb-4">
        {active.length === 0 && !showForm && (
          <p className="text-xs text-gray-400">No recurring payments set up.</p>
        )}
        {active.map((r) => {
          const days = daysUntil(r.next_due_date);
          const dueSoon = days <= 7;
          const overdue = days < 0;
          const dueLabel = overdue
            ? `${Math.abs(days)}d overdue`
            : days === 0
            ? 'Due today'
            : `Due in ${days}d`;

          return (
            <div key={r.id} className="rounded-lg border border-gray-100 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400">{FREQ_LABELS[r.frequency]}</p>
                </div>
                <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{fmt(Number(r.amount))}</p>
              </div>
              <div className="flex items-center justify-between mt-1.5 gap-2">
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    overdue
                      ? 'bg-red-100 text-red-600'
                      : dueSoon
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {dueLabel}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={actingId === r.id}
                    onClick={() => handleToggle(r.id, r.is_active)}
                    className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title="Pause"
                  >
                    ⏸
                  </button>
                  <button
                    disabled={actingId === r.id}
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-gray-300 hover:text-red-400 disabled:opacity-50"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Paused payments */}
        {inactive.length > 0 && (
          <div className="mt-1">
            {inactive.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-50 mb-1">
                <p className="text-xs text-gray-400 truncate">{r.name} <span className="italic">(paused)</span></p>
                <div className="flex gap-1.5 ml-2">
                  <button
                    disabled={actingId === r.id}
                    onClick={() => handleToggle(r.id, r.is_active)}
                    className="text-xs text-gray-400 hover:text-green-600 disabled:opacity-50"
                    title="Resume"
                  >
                    ▶
                  </button>
                  <button
                    disabled={actingId === r.id}
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-gray-300 hover:text-red-400 disabled:opacity-50"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-2.5 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-1">New Recurring Payment</p>

          <input type="text" className={inputCls} placeholder="Name (e.g. Netflix, Rent)" value={name} onChange={(e) => setName(e.target.value)} required />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount ($)</label>
              <input type="number" step="0.01" min="0" className={inputCls} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Frequency</label>
              <select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringPayment['frequency'])}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Next due date</label>
            <input type="date" className={inputCls} value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Category (optional)</label>
            <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— None —</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-orange-500 text-white py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-60">
              {saving ? 'Saving…' : 'Add Payment'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 text-gray-600 px-3 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 text-gray-400 py-2 text-sm hover:border-orange-400 hover:text-orange-500 transition-colors"
        >
          + Add recurring payment
        </button>
      )}
    </div>
  );
}
