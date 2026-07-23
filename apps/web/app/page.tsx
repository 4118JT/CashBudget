'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import AddTransactionForm from './components/AddTransactionForm';
import Analytics from './components/Analytics';
import AuthForm from './components/AuthForm';
import GoalsPanel from './components/GoalsPanel';
import LoansPanel from './components/LoansPanel';
import NavBar from './components/NavBar';
import RecurringPanel from './components/RecurringPanel';
import SummaryCards from './components/SummaryCards';
import { ToastContainer, useToasts } from './components/Toast';
import TransactionList from './components/TransactionList';
import type { Category, Goal, Loan, RecurringPayment, Tx } from './components/types';

const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Entertainment',
  'Games',
  'Bills & Utilities',
  'Healthcare',
  'Savings',
  'Other',
];
const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Other Income'];
const MISSING_PLANNED_EXPENSES_REASON =
  'Savings goals are unavailable until the planned_expenses database migration is applied.';

function isMissingPlannedExpensesTableError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? '';
  return error?.code === 'PGRST205' || message.includes('planned_expenses') && message.includes('schema cache');
}

export default function HomePage() {
  const { toasts, addToast } = useToasts();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [goalsDisabledReason, setGoalsDisabledReason] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'transactions' | 'planning' | 'insights'>('overview');

  const loadData = useCallback(
    async (uid: string) => {
      const [txRes, catRes, goalRes, loanRes, recurRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, amount, kind, merchant, occurred_at, status, category_id, note, categories(name, kind)')
          .eq('user_id', uid)
          .order('occurred_at', { ascending: false })
          .limit(2000),
        supabase.from('categories').select('id, name, kind').eq('user_id', uid).order('name'),
        supabase
          .from('planned_expenses')
          .select('id, title, amount, due_date, recurrence, status')
          .eq('user_id', uid)
          .order('due_date', { ascending: true })
          .limit(100),
        supabase
          .from('loans')
          .select('id, name, lender, original_amount, remaining_balance, interest_rate, monthly_payment, next_due_date, status')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
        supabase
          .from('recurring_payments')
          .select('id, name, amount, frequency, next_due_date, category_id, is_active')
          .eq('user_id', uid)
          .order('next_due_date', { ascending: true }),
      ]);

      if (txRes.error) addToast(txRes.error.message, 'error');
      else setTransactions((txRes.data as unknown as Tx[]) ?? []);

      if (catRes.error) addToast(catRes.error.message, 'error');
      else setCategories((catRes.data as unknown as Category[]) ?? []);

      if (goalRes.error) {
        if (isMissingPlannedExpensesTableError(goalRes.error)) {
          setGoals([]);
          setGoalsDisabledReason(MISSING_PLANNED_EXPENSES_REASON);
        } else {
          addToast(goalRes.error.message, 'error');
        }
      } else {
        setGoals((goalRes.data as unknown as Goal[]) ?? []);
        setGoalsDisabledReason(null);
      }

      // Loans and recurring payments are optional — silently skip if table doesn't exist yet
      if (!loanRes.error) setLoans((loanRes.data as unknown as Loan[]) ?? []);
      if (!recurRes.error) setRecurring((recurRes.data as unknown as RecurringPayment[]) ?? []);
    },
    [addToast]
  );

  const ensureUserSetup = useCallback(async (uid: string) => {
    await supabase
      .from('profiles')
      .upsert({ user_id: uid }, { onConflict: 'user_id', ignoreDuplicates: true });

    const { data: existingAccounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', uid)
      // Use the first created account as the default primary account for transaction/goal inserts.
      .order('created_at', { ascending: true })
      .limit(1);

    let primaryAccountId = existingAccounts?.[0]?.id ?? null;
    if (!primaryAccountId) {
      const { data: insertedAccount, error: accountInsertError } = await supabase
        .from('accounts')
        .insert({ user_id: uid, name: 'Main Account', type: 'wallet', starting_balance: 0 })
        .select('id')
        .single();
      if (accountInsertError) {
        addToast(accountInsertError.message, 'error');
      } else {
        primaryAccountId = insertedAccount.id;
      }
    }
    setAccountId(primaryAccountId);

    const { data: existingCats } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', uid)
      .limit(1);

    if (!existingCats || existingCats.length === 0) {
      const seedRows = [
        ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ user_id: uid, name, kind: 'expense' as const })),
        ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ user_id: uid, name, kind: 'income' as const })),
      ];
      await supabase.from('categories').insert(seedRows);
    }
  }, [addToast]);

  useEffect(() => {
    const view = window.location.hash.slice(1);
    if (view === 'overview' || view === 'transactions' || view === 'planning' || view === 'insights') setActiveView(view);
  }, []);

  function navigate(view: 'overview' | 'transactions' | 'planning' | 'insights') {
    setActiveView(view);
    window.history.replaceState(null, '', `#${view}`);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const u = { id: data.user.id, email: data.user.email ?? '' };
        setUser(u);
        await ensureUserSetup(u.id);
        await loadData(u.id);
      }
      setLoading(false);
    });
  }, [ensureUserSetup, loadData]);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const u = { id: data.user.id, email: data.user.email ?? '' };
    setUser(u);
    await ensureUserSetup(u.id);
    await loadData(u.id);
    addToast('Welcome back!', 'success');
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    addToast('Check your email for a confirmation link.', 'info');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setTransactions([]);
    setCategories([]);
    setGoals([]);
    setLoans([]);
    setRecurring([]);
    setGoalsDisabledReason(null);
    setAccountId(null);
  }

  async function addTransaction(data: {
    amount: number;
    merchant: string;
    kind: 'expense' | 'income';
    category_id: string | null;
    occurred_at: string;
    note: string | null;
  }) {
    if (!user) return;
    if (!accountId) {
      addToast('Unable to add transaction. Account initialization failed — please refresh.', 'error');
      return;
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: accountId,
      amount: data.amount,
      kind: data.kind,
      merchant: data.merchant?.trim() || null,
      category_id: data.category_id || null,
      occurred_at: data.occurred_at,
      note: data.note?.trim() || null,
    });

    if (error) {
      console.error('Insert transaction error:', error);
      throw new Error(error.message || JSON.stringify(error));
    }

    await loadData(user.id);
  }

  async function addGoal(data: {
    title: string;
    amount: number;
    due_date: string;
    recurrence: 'none' | 'monthly' | 'yearly';
  }) {
    if (!user) return;
    if (!accountId) {
      addToast('Unable to add goal. Account initialization failed — please refresh.', 'error');
      return;
    }
    const { error } = await supabase.from('planned_expenses').insert({
      user_id: user.id,
      account_id: accountId,
      title: data.title.trim(),
      amount: data.amount,
      due_date: data.due_date,
      recurrence: data.recurrence,
      status: 'planned',
    });

    if (error) {
      if (isMissingPlannedExpensesTableError(error)) {
        setGoalsDisabledReason(MISSING_PLANNED_EXPENSES_REASON);
        throw new Error(MISSING_PLANNED_EXPENSES_REASON);
      }
      throw new Error(error.message || JSON.stringify(error));
    }

    await loadData(user.id);
  }

  async function addLoan(data: {
    name: string;
    lender: string | null;
    original_amount: number;
    remaining_balance: number;
    interest_rate: number;
    monthly_payment: number;
    next_due_date: string | null;
  }) {
    if (!user) return;
    const { error } = await supabase.from('loans').insert({ user_id: user.id, ...data });
    if (error) throw new Error(error.message);
    await loadData(user.id);
  }

  async function markLoanPaidOff(id: string) {
    if (!user) return;
    const { error } = await supabase
      .from('loans')
      .update({ status: 'paid_off', remaining_balance: 0 })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
    await loadData(user.id);
  }

  async function deleteLoan(id: string) {
    if (!user) return;
    const { error } = await supabase.from('loans').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    setLoans((prev) => prev.filter((l) => l.id !== id));
  }

  async function addRecurring(data: {
    name: string;
    amount: number;
    frequency: RecurringPayment['frequency'];
    next_due_date: string;
    category_id: string | null;
  }) {
    if (!user) return;
    const { error } = await supabase.from('recurring_payments').insert({ user_id: user.id, ...data });
    if (error) throw new Error(error.message);
    await loadData(user.id);
  }

  async function toggleRecurring(id: string, is_active: boolean) {
    if (!user) return;
    const { error } = await supabase
      .from('recurring_payments')
      .update({ is_active })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
    setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, is_active } : r)));
  }

  async function deleteRecurring(id: string) {
    if (!user) return;
    const { error } = await supabase.from('recurring_payments').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }

  async function deleteTransaction(id: string) {
    if (!user) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      addToast(error.message, 'error');
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    addToast('Transaction deleted.', 'info');
  }

  async function deleteTransactions(ids: string[]) {
    if (!user || ids.length === 0) return;
    const { error } = await supabase.from('transactions').delete().eq('user_id', user.id).in('id', ids);
    if (error) {
      addToast(error.message, 'error');
      return;
    }
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
    addToast(`${ids.length} transaction${ids.length !== 1 ? 's' : ''} deleted.`, 'info');
  }

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <p className="text-sm font-medium text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm onSignIn={signIn} onSignUp={signUp} />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <NavBar userEmail={user.email} activeView={activeView} onNavigate={navigate} onSignOut={signOut} />
      <ToastContainer toasts={toasts} />

      <main className="mx-auto max-w-6xl space-y-7 px-4 py-7 sm:py-9">
        {activeView === 'overview' && <>
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Financial snapshot</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Your money at a glance</h1><p className="mt-2 text-slate-500">Track today, then dive into the details when you need them.</p></div>
          <SummaryCards transactions={transactions} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><AddTransactionForm categories={categories} onAdd={addTransaction} addToast={addToast} /><div className="lg:col-span-2"><TransactionList transactions={transactions.slice(0, 10)} categories={categories} onDelete={deleteTransaction} onDeleteMany={deleteTransactions} /></div></div>
        </>}
        {activeView === 'transactions' && <><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Activity</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Transactions</h1><p className="mt-2 text-slate-500">Add, filter, and review every movement of money.</p></div><div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><AddTransactionForm categories={categories} onAdd={addTransaction} addToast={addToast} /><div className="lg:col-span-2"><TransactionList transactions={transactions} categories={categories} onDelete={deleteTransaction} onDeleteMany={deleteTransactions} /></div></div></>}
        {activeView === 'planning' && <><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Look ahead</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Planning</h1><p className="mt-2 text-slate-500">Keep upcoming goals, debt, and recurring costs in one place.</p></div><div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"><GoalsPanel goals={goals} onAddGoal={addGoal} addToast={addToast} disabledReason={goalsDisabledReason} /><LoansPanel loans={loans} onAddLoan={addLoan} onMarkPaidOff={markLoanPaidOff} onDeleteLoan={deleteLoan} addToast={addToast} /><RecurringPanel recurring={recurring} categories={categories} onAdd={addRecurring} onToggleActive={toggleRecurring} onDelete={deleteRecurring} addToast={addToast} /></div></>}
        {activeView === 'insights' && <><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Patterns</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Insights</h1><p className="mt-2 text-slate-500">Explore how your income and spending change over time.</p></div><Analytics transactions={transactions} categories={categories} /></>}
      </main>
    </div>
  );
}