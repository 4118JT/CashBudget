'use client';

import { useMemo, useState } from 'react';
import type { Category, Tx } from './types';

interface TransactionListProps {
  transactions: Tx[];
  categories: Category[];
  onDelete?: (id: string) => Promise<void>;
}

type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low';

export default function TransactionList({ transactions, categories, onDelete }: TransactionListProps) {
  const [filterKind, setFilterKind] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...transactions];

    if (filterKind !== 'all') list = list.filter((t) => t.kind === filterKind);
    if (filterCategory) list = list.filter((t) => t.category_id === filterCategory);
    if (filterFrom) list = list.filter((t) => t.occurred_at >= new Date(filterFrom).toISOString());
    if (filterTo) {
      const toEnd = new Date(filterTo);
      toEnd.setDate(toEnd.getDate() + 1);
      list = list.filter((t) => t.occurred_at < toEnd.toISOString());
    }

    switch (sort) {
      case 'newest':
        list.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
        break;
      case 'oldest':
        list.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
        break;
      case 'amount-high':
        list.sort((a, b) => Number(b.amount) - Number(a.amount));
        break;
      case 'amount-low':
        list.sort((a, b) => Number(a.amount) - Number(b.amount));
        break;
    }

    return list;
  }, [transactions, filterKind, filterCategory, filterFrom, filterTo, sort]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  async function handleDelete(id: string) {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  const selectCls = 'rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400';
  const inputCls = 'rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-gray-900 mr-1">Transactions</span>

        <select className={selectCls} value={filterKind} onChange={(e) => setFilterKind(e.target.value as typeof filterKind)}>
          <option value="all">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>

        <select className={selectCls} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input type="date" className={inputCls} value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} title="From date" />
        <input type="date" className={inputCls} value={filterTo} onChange={(e) => setFilterTo(e.target.value)} title="To date" />

        <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount-high">Amount ↓</option>
          <option value="amount-low">Amount ↑</option>
        </select>

        {(filterKind !== 'all' || filterCategory || filterFrom || filterTo) && (
          <button
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
            onClick={() => { setFilterKind('all'); setFilterCategory(''); setFilterFrom(''); setFilterTo(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">🗒️</p>
          <p className="text-gray-500 text-sm font-medium">No transactions found</p>
          <p className="text-gray-400 text-xs mt-1">
            {transactions.length === 0 ? 'Add your first transaction above.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-5 py-2.5 font-medium">Date</th>
                <th className="text-left px-3 py-2.5 font-medium">Description</th>
                <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Category</th>
                <th className="text-right px-5 py-2.5 font-medium">Amount</th>
                {onDelete && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(t.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-gray-900 font-medium truncate max-w-[180px]">
                      {t.merchant || <span className="text-gray-400 italic">No description</span>}
                    </p>
                    {t.note && <p className="text-xs text-gray-400 truncate max-w-[180px]">{t.note}</p>}
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    {t.categories ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {t.categories.name}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <span className={`font-semibold ${t.kind === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.kind === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
                    </span>
                  </td>
                  {onDelete && (
                    <td className="px-3 py-3 text-right">
                      <button
                        disabled={deletingId === t.id}
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-xs disabled:opacity-40"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-5 py-2">
            Showing {filtered.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
