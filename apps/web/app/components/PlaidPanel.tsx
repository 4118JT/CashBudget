'use client';

import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '../../lib/supabase';
import type { ToastType } from './Toast';

interface PlaidPanelProps {
  onSynced: () => Promise<void>;
  addToast: (msg: string, type?: ToastType) => void;
}

async function getAuthHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Please sign in again.');
  return {
    Authorization: 'Bearer ' + data.session.access_token,
    'Content-Type': 'application/json',
  };
}

export default function PlaidPanel({ onSynced, addToast }: PlaidPanelProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      try {
        const headers = await getAuthHeaders();
        const accountIds = metadata.accounts.map((a) => a.id).filter(Boolean);
        const res = await fetch('/api/plaid/exchange-public-token', {
          method: 'POST',
          headers,
          body: JSON.stringify({ public_token: publicToken, account_ids: accountIds }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to connect bank account');
        addToast(`Connected ${json.linked_accounts} account${json.linked_accounts === 1 ? '' : 's'}.`, 'success');
        await onSynced();
      } catch (err: unknown) {
        addToast(err instanceof Error ? err.message : 'Failed to connect account', 'error');
      } finally {
        setLinkToken(null);
      }
    },
    onExit: (error) => {
      if (error) addToast(error.display_message ?? error.error_message ?? 'Plaid flow canceled.', 'error');
      setLinkToken(null);
    },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  async function startLink() {
    setLoadingLink(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/plaid/link-token', { method: 'POST', headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to initialize Plaid Link');
      setLinkToken(json.link_token);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to initialize Plaid Link', 'error');
    } finally {
      setLoadingLink(false);
    }
  }

  async function runSync() {
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/plaid/sync', { method: 'POST', headers, body: '{}' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to sync transactions');
      const synced = json.synced ?? { added: 0, modified: 0, removed: 0 };
      addToast(`Sync complete: +${synced.added}, ~${synced.modified}, -${synced.removed}`, 'info');
      await onSynced();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to sync transactions', 'error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Bank Sync (Plaid)</h2>
      <p className="text-xs text-gray-500">Connect your bank to import balances and transactions.</p>
      <button
        onClick={startLink}
        disabled={loadingLink}
        className="w-full rounded-lg bg-emerald-600 text-white py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        {loadingLink ? 'Preparing...' : 'Connect Bank'}
      </button>
      <button
        onClick={runSync}
        disabled={syncing}
        className="w-full rounded-lg border border-gray-300 text-gray-700 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}
