'use client';

import { useState } from 'react';

interface AuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export default function AuthForm({ onSignIn, onSignUp }: AuthFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') await onSignIn(email, password);
      else await onSignUp(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 sm:flex sm:items-center sm:justify-center">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl font-bold">C</div><span className="text-lg font-semibold">CashBudget</span></div>
          <div><p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200">Clarity, every day</p><h1 className="max-w-sm text-4xl font-semibold leading-tight">A calmer way to manage your money.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-indigo-100">Track your cash flow, stay ahead of recurring spending, and make every next step visible.</p></div>
          <p className="text-xs text-indigo-200">Private by design. Built for your daily decisions.</p>
        </section>
        <section className="p-7 sm:p-10 lg:p-12">
          <div className="mb-8 lg:hidden"><div className="mb-6 flex items-center gap-3 text-slate-950"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">C</div><span className="text-lg font-semibold">CashBudget</span></div></div>
          <p className="text-sm font-semibold text-indigo-600">YOUR WORKSPACE</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-2 text-sm text-slate-500">{mode === 'signin' ? 'Sign in to see your financial overview.' : 'Start building a clearer financial picture.'}</p>
          <div className="mt-7 flex rounded-xl bg-slate-100 p-1">
            {(['signin', 'signup'] as const).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(''); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{item === 'signin' ? 'Sign in' : 'Create account'}</button>)}
          </div>
          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-slate-700">Email<input type="email" autoComplete="email" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block text-sm font-medium text-slate-700">Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Please wait…' : mode === 'signin' ? 'Sign in to CashBudget' : 'Create account'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}
