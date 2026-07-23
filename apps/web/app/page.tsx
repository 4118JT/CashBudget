'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import AddTransactionForm from './components/AddTransactionForm';
import Analytics from './components/Analytics';
import AuthForm from './components/AuthForm';
import GoalsPanel from './components/GoalsPanel';
import NavBar from './components/NavBar';
import SummaryCards from './components/SummaryCards';
import { ToastContainer, useToasts } from './components/Toast';
import TransactionList from './components/TransactionList';
import type { Category, Tx } from './components/types';

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
type GoalItem = {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: 'planned' | 'paid' | 'skipped';
};

export default function HomePage() {
  const { toasts, addToast } = useToasts();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(
    async (uid: string) => {
      const [txRes, catRes, goalRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, amount, kind, merchant, occurred_at, status, category_id, note, categories(name, kind)')
          .eq('user_id', uid)
          .order('occurred_at', { ascending: false })
          .limit(200),
        supabase.from('categories').select('id, name, kind').eq('user_id', uid).order('name'),
        supabase
          .from('planned_expenses')
          .select('id, title, amount, due_date, status')
          .eq('user_id', uid)
          .order('due_date', { ascending: true })
          .limit(100),
      ]);

      if (txRes.error) addToast(txRes.error.message, 'error');
      else setTransactions((txRes.data as unknown as Tx[]) ?? []);

      if (catRes.error) addToast(catRes.error.message, 'error');
      else setCategories((catRes.data as unknown as Category[]) ?? []);

      if (goalRes.error) addToast(goalRes.error.message, 'error');
      else setGoals((goalRes.data as unknown as GoalItem[]) ?? []);
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
    if (!user || !accountId) {
      addToast('No account found. Please sign out and sign back in.', 'error');
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

  async function addGoal(data: { title: string; amount: number; due_date: string }) {
    if (!user || !accountId) {
      addToast('No account found. Please sign out and sign back in.', 'error');
      return;
    }

    const { error } = await supabase.from('planned_expenses').insert({
      user_id: user.id,
      account_id: accountId,
      title: data.title.trim(),
      amount: data.amount,
      due_date: data.due_date,
      status: 'planned',
    });

    if (error) {
      console.error('Insert goal error:', error);
      throw new Error(error.message || JSON.stringify(error));
    }

    await loadData(user.id);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading…</p>
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
    <div className="min-h-screen bg-gray-50">
      <NavBar userEmail={user.email} onSignOut={signOut} />
      <ToastContainer toasts={toasts} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <SummaryCards transactions={transactions} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AddTransactionForm categories={categories} onAdd={addTransaction} addToast={addToast} />
            <div className="mt-6">
              <GoalsPanel goals={goals} onAddGoal={addGoal} addToast={addToast} />
            </div>
          </div>
          <div className="lg:col-span-2">
            <TransactionList transactions={transactions} categories={categories} onDelete={deleteTransaction} />
          </div>
        </div>

        <Analytics transactions={transactions} categories={categories} />
      </main>
    </div>
  );
}