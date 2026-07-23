'use client';

import { useState } from 'react';
import type { Loan } from './types';
import type { ToastType } from './Toast';

interface LoansPanelProps {
  loans: Loan[];
  onAddLoan: (loan: {
    name: string;
    lender: string | null;
    original_amount: number;
    remaining_balance: number;
    interest_rate: number;
    monthly_payment: number;
    next_due_date: string | null;
  }) => Promise<void>;
  onMarkPaidOff: (id: string) => Promise<void>;
  onDeleteLoan: (id: string) => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
}

function getDefaultDueDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function LoansPanel({ loans, onAddLoan, onMarkPaidOff, onDeleteLoan, addToast }: LoansPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [remainingBalance, setRemainingBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [nextDueDate, setNextDueDate] = useState(getDefaultDueDate());
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const activeLoans = loans.filter((l) => l.status === 'active');
  const paidOffLoans = loans.filter((l) => l.status === 'paid_off');
  const totalDebt = activeLoans.reduce((s, l) => s + Number(l.remaining_balance), 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) { addToast('Loan name is required', 'error'); return; }
    if (!originalAmount || Number(originalAmount) <= 0) { addToast('Enter a valid loan amount', 'error'); return; }
    const orig = Number(originalAmount);
    const rem = remainingBalance ? Number(remainingBalance) : orig;

    setSaving(true);
    try {
      await onAddLoan({
        name: name.trim(),
        lender: lender.trim() || null,
        original_amount: orig,
        remaining_balance: rem,
        interest_rate: Number(interestRate) || 0,
        monthly_payment: Number(monthlyPayment) || 0,
        next_due_date: nextDueDate || null,
      });
      setName(''); setLender(''); setOriginalAmount(''); setRemainingBalance('');
      setInterestRate(''); setMonthlyPayment(''); setNextDueDate(getDefaultDueDate());
      setShowForm(false);
      addToast('Loan added!', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to add loan', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(id: string) {
    setActingId(id);
    try { await onMarkPaidOff(id); addToast('Loan marked as paid off! 🎉', 'success'); }
    catch (err: unknown) { addToast(err instanceof Error ? err.message : 'Failed to update loan', 'error'); }
    finally { setActingId(null); }
  }

  async function handleDelete(id: string) {
    setActingId(id);
    try { await onDeleteLoan(id); addToast('Loan deleted.', 'info'); }
    catch (err: unknown) { addToast(err instanceof Error ? err.message : 'Failed to delete loan', 'error'); }
    finally { setActingId(null); }
  }

  const inputCls = 'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Loans</h2>
        {activeLoans.length > 0 && (
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            {fmt(totalDebt)} owed
          </span>
        )}
      </div>

      {/* Active loans list */}
      <div className="space-y-3 mb-4">
        {activeLoans.length === 0 && !showForm && (
          <p className="text-xs text-gray-400">No active loans.</p>
        )}
        {activeLoans.map((loan) => {
          const orig = Number(loan.original_amount);
          const rem = Number(loan.remaining_balance);
          const paidPct = orig > 0 ? Math.min(100, Math.round(((orig - rem) / orig) * 100)) : 0;
          const dueLabel = loan.next_due_date
            ? new Date(loan.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : null;

          return (
            <div key={loan.id} className="rounded-lg border border-gray-100 px-3 py-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{loan.name}</p>
                  {loan.lender && <p className="text-xs text-gray-400">{loan.lender}</p>}
                </div>
                <p className="text-sm font-bold text-red-600 whitespace-nowrap">{fmt(rem)}</p>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{paidPct}% paid off</span>
                  <span>of {fmt(orig)}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                {loan.interest_rate > 0 && <span>{loan.interest_rate}% APR</span>}
                {loan.monthly_payment > 0 && <span>{fmt(loan.monthly_payment)}/mo</span>}
                {dueLabel && <span>Next: {dueLabel}</span>}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  disabled={actingId === loan.id}
                  onClick={() => handleMarkPaid(loan.id)}
                  className="flex-1 rounded-md bg-green-50 text-green-700 text-xs py-1.5 font-medium hover:bg-green-100 disabled:opacity-50"
                >
                  Mark paid off
                </button>
                <button
                  disabled={actingId === loan.id}
                  onClick={() => handleDelete(loan.id)}
                  className="rounded-md text-gray-300 hover:text-red-400 text-xs py-1.5 px-2 disabled:opacity-50"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {/* Paid-off loans (collapsed) */}
        {paidOffLoans.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            +{paidOffLoans.length} paid off loan{paidOffLoans.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Add loan form */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-2.5 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-1">New Loan</p>

          <input type="text" className={inputCls} placeholder="Loan name (e.g. Car Loan)" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="text" className={inputCls} placeholder="Lender (optional, e.g. Chase)" value={lender} onChange={(e) => setLender(e.target.value)} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Original amount</label>
              <input type="number" step="0.01" min="0" className={inputCls} placeholder="0.00" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Remaining balance</label>
              <input type="number" step="0.01" min="0" className={inputCls} placeholder="0.00" value={remainingBalance} onChange={(e) => setRemainingBalance(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Interest rate (%)</label>
              <input type="number" step="0.01" min="0" className={inputCls} placeholder="0.00" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monthly payment</label>
              <input type="number" step="0.01" min="0" className={inputCls} placeholder="0.00" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Next due date</label>
            <input type="date" className={inputCls} value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Add Loan'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 text-gray-600 px-3 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 text-gray-400 py-2 text-sm hover:border-indigo-400 hover:text-indigo-500 transition-colors"
        >
          + Add loan
        </button>
      )}
    </div>
  );
}
