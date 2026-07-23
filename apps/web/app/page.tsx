"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type Tx = {
  id: string;
  amount: number;
  kind: 'expense' | 'income';
  merchant: string | null;
  occurred_at: string;
  status: 'draft' | 'confirmed';
};

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');

  const monthTotal = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.kind === 'expense') return acc - Number(t.amount);
      return acc + Number(t.amount);
    }, 0);
  }, [transactions]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        loadTransactions(data.user.id);
      }
    });
  }, []);

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    alert('Check your email for confirmation link.');
  }

  async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    setUserId(data.user.id);
    await ensureDefaultAccount(data.user.id);
    await loadTransactions(data.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserId(null);
    setTransactions([]);
  }

  async function ensureDefaultAccount(uid: string) {
    const { data: accounts } = await supabase.from('accounts').select('id').eq('user_id', uid).limit(1);
    if (!accounts || accounts.length === 0) {
      await supabase.from('accounts').insert({ user_id: uid, name: 'Apple Cash', type: 'wallet', starting_balance: 0 });
    }
  }

  async function loadTransactions(uid: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, kind, merchant, occurred_at, status')
      .eq('user_id', uid)
      .order('occurred_at', { ascending: false })
      .limit(50);

    if (error) return alert(error.message);
    setTransactions((data as Tx[]) || []);
  }

  async function addTransaction() {
    if (!userId) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return alert('Enter a valid amount');

    const { data: accounts } = await supabase.from('accounts').select('id').eq('user_id', userId).limit(1);
    const accountId = accounts?.[0]?.id;
    if (!accountId) return alert('No account found');

    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      account_id: accountId,
      amount: amt,
      kind,
      merchant: merchant || null,
      status: 'confirmed',
      source: 'manual'
    });

    if (error) return alert(error.message);
    setAmount('');
    setMerchant('');
    await loadTransactions(userId);
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>CashBudget</h1>
      <p>Track Apple Cash spending + future spending.</p>

      {!userId ? (
        <section style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
          <h2>Login / Signup</h2>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ display: 'block', marginBottom: 8, width: '100%' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', marginBottom: 8, width: '100%' }} />
          <button onClick={signIn} style={{ marginRight: 8 }}>Sign In</button>
          <button onClick={signUp}>Sign Up</button>
        </section>
      ) : (
        <>
          <button onClick={signOut} style={{ marginBottom: 12 }}>Sign Out</button>

          <section style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
            <h2>Dashboard</h2>
            <p><strong>Net total (recent):</strong> ${monthTotal.toFixed(2)}</p>
          </section>

          <section style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
            <h2>Add Transaction</h2>
            <input
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ display: 'block', marginBottom: 8, width: '100%' }}
            />
            <input
              placeholder="Merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              style={{ display: 'block', marginBottom: 8, width: '100%' }}
            />
            <select value={kind} onChange={(e) => setKind(e.target.value as 'expense' | 'income')} style={{ marginBottom: 8 }}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <br />
            <button onClick={addTransaction}>Save</button>
          </section>

          <section style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
            <h2>Recent Transactions</h2>
            {transactions.length === 0 ? <p>No transactions yet.</p> : (
              <ul>
                {transactions.map((t) => (
                  <li key={t.id}>
                    {new Date(t.occurred_at).toLocaleDateString()} — {t.kind} — ${Number(t.amount).toFixed(2)} {t.merchant ? `at ${t.merchant}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
