'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ToastType } from './Toast';

declare global {
  interface Window { Plaid?: { create: (config: { token: string; onSuccess: (publicToken: string, metadata: { institution?: { name?: string; institution_id?: string } }) => void; onExit: () => void }) => { open: () => void } } }
}

interface PlaidConnectProps { addToast: (message: string, type?: ToastType) => void; onSynced: () => Promise<void>; }

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sign in again to connect an account.');
  return { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' };
}

function loadPlaidScript() {
  if (window.Plaid) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Plaid Link.'));
    document.head.appendChild(script);
  });
}

export default function PlaidConnect({ addToast, onSynced }: PlaidConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function connect() {
    setConnecting(true);
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/plaid/link-token', { method: 'POST', headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Unable to start Plaid Link.');
      await loadPlaidScript();
      const plaid = window.Plaid;
      if (!plaid) throw new Error('Plaid Link did not load.');
      plaid.create({
        token: payload.link_token,
        onExit: () => setConnecting(false),
        onSuccess: async (publicToken, metadata) => {
          try {
            const exchange = await fetch('/api/plaid/exchange', { method: 'POST', headers, body: JSON.stringify({ public_token: publicToken, institution: metadata.institution }) });
            const result = await exchange.json();
            if (!exchange.ok) throw new Error(result.error ?? 'Unable to save linked account.');
            await sync();
            addToast('Account linked and transaction history imported.', 'success');
          } catch (error) {
            addToast(error instanceof Error ? error.message : 'Unable to connect account.', 'error');
          } finally { setConnecting(false); }
        },
      }).open();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to start Plaid Link.', 'error');
      setConnecting(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const response = await fetch('/api/plaid/sync', { method: 'POST', headers: await authHeaders() });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to sync transactions.');
      await onSynced();
      if (!connecting) addToast(`${result.imported} transaction${result.imported === 1 ? '' : 's'} imported.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to sync transactions.', 'error');
    } finally { setSyncing(false); }
  }

  return <div className="surface-card p-5 sm:p-6"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">Connected accounts</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Bring in your card history</h2><p className="mt-2 text-sm leading-6 text-slate-500">Use Plaid Link to securely connect a supported card or bank account. CashBudget never receives your login credentials.</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={connect} disabled={connecting} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60">{connecting ? 'Opening Plaid…' : 'Link an account'}</button><button onClick={sync} disabled={syncing || connecting} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">{syncing ? 'Syncing…' : 'Sync transactions'}</button></div><p className="mt-4 text-xs leading-5 text-slate-400">Plaid access tokens are encrypted before storage. Use Sandbox first while you configure the integration.</p></div>;
}
