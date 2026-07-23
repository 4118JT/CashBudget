'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Category, Tx } from './types';

interface AnalyticsProps {
  transactions: Tx[];
  categories: Category[];
}

type Period = '3' | '6' | '12';
type KindFilter = 'all' | 'expense' | 'income';

const PALETTE = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6',
  '#a855f7', '#ec4899', '#0ea5e9', '#84cc16', '#f97316',
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const tooltipFormatter = (v: unknown) => fmtFull(Number(v));

function SectionToggle({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full text-left"
    >
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
    </button>
  );
}

export default function Analytics({ transactions, categories }: AnalyticsProps) {
  const [period, setPeriod] = useState<Period>('6');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [filterCategoryId, setFilterCategoryId] = useState('');

  // section visibility toggles
  const [showMonthly, setShowMonthly] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [showPie, setShowPie] = useState(true);
  const [showMerchants, setShowMerchants] = useState(true);
  const [showRunningBalance, setShowRunningBalance] = useState(true);
  const [showDayOfWeek, setShowDayOfWeek] = useState(true);

  const numMonths = Number(period) as number;

  // Filtered transactions (by kind and category)
  const filtered = useMemo(() => {
    let list = transactions;
    if (kindFilter !== 'all') list = list.filter((t) => t.kind === kindFilter);
    if (filterCategoryId) list = list.filter((t) => t.category_id === filterCategoryId);
    return list;
  }, [transactions, kindFilter, filterCategoryId]);

  // Monthly breakdown over the selected period
  const monthly = useMemo(() => {
    const months: { label: string; income: number; expense: number; net: number }[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const txs = filtered.filter((t) => {
        const td = new Date(t.occurred_at);
        return td.getFullYear() === year && td.getMonth() === month;
      });

      const income = txs.filter((t) => t.kind === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter((t) => t.kind === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      months.push({ label, income, expense, net: income - expense });
    }
    return months;
  }, [filtered, numMonths]);

  // Category breakdown (expenses only, within selected period)
  const categoryBreakdown = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - numMonths);
    const map = new Map<string, { name: string; total: number }>();

    for (const t of filtered) {
      if (t.kind !== 'expense') continue;
      if (new Date(t.occurred_at) < cutoff) continue;
      const catId = t.category_id ?? '__none__';
      const catName = t.categories?.name ?? 'Uncategorized';
      const existing = map.get(catId) ?? { name: catName, total: 0 };
      map.set(catId, { name: catName, total: existing.total + Number(t.amount) });
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered, numMonths]);

  // Top merchants (within selected period)
  const topMerchants = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - numMonths);
    const map = new Map<string, number>();

    for (const t of filtered) {
      if (t.kind !== 'expense') continue;
      if (new Date(t.occurred_at) < cutoff) continue;
      const name = t.merchant?.trim() || 'Unknown';
      map.set(name, (map.get(name) ?? 0) + Number(t.amount));
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, total]) => ({ name, total }));
  }, [filtered, numMonths]);

  // Pie data
  const pieData = useMemo(() => categoryBreakdown.slice(0, 8), [categoryBreakdown]);
  const maxCategory = Math.max(...categoryBreakdown.map((c) => c.total), 1);
  const maxMerchant = Math.max(...topMerchants.map((m) => m.total), 1);

  // Running balance over time (within selected period)
  const runningBalance = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - numMonths);
    cutoff.setHours(0, 0, 0, 0);

    const inPeriod = filtered
      .filter((t) => new Date(t.occurred_at) >= cutoff)
      .slice()
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

    let running = 0;
    const points: { date: string; balance: number }[] = [];
    for (const t of inPeriod) {
      running += t.kind === 'income' ? Number(t.amount) : -Number(t.amount);
      const label = new Date(t.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      points.push({ date: label, balance: running });
    }
    return points;
  }, [filtered, numMonths]);

  // Spending by day of week (expenses only, within selected period)
  const dayOfWeekSpend = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - numMonths);
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals = [0, 0, 0, 0, 0, 0, 0];

    for (const t of filtered) {
      if (t.kind !== 'expense') continue;
      if (new Date(t.occurred_at) < cutoff) continue;
      totals[new Date(t.occurred_at).getDay()] += Number(t.amount);
    }

    // Start week on Monday
    return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: DAY_NAMES[d], total: totals[d] }));
  }, [filtered, numMonths]);

  if (transactions.length === 0) return null;

  const selectCls =
    'rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-semibold text-gray-700">Analytics</span>

        {/* Period */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['3', '6', '12'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                period === p ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}mo
            </button>
          ))}
        </div>

        {/* Kind filter */}
        <select className={selectCls} value={kindFilter} onChange={(e) => setKindFilter(e.target.value as KindFilter)}>
          <option value="all">All types</option>
          <option value="expense">Expenses only</option>
          <option value="income">Income only</option>
        </select>

        {/* Category filter */}
        <select className={selectCls} value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Reset */}
        {(kindFilter !== 'all' || filterCategoryId) && (
          <button
            className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
            onClick={() => { setKindFilter('all'); setFilterCategoryId(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid row 1: Monthly Overview + Net Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionToggle title="Monthly Overview" open={showMonthly} onToggle={() => setShowMonthly((v) => !v)} />
          {showMonthly && (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill="#4ade80" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Net Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionToggle title="Net Trend" open={showTrend} onToggle={() => setShowTrend((v) => !v)} />
          {showTrend && (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366f1' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Grid row 2: Category bars + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending by Category (bars) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionToggle title="Spending by Category" open={showCategory} onToggle={() => setShowCategory((v) => !v)} />
          {showCategory && (
            categoryBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 mt-4">No expense data for this period.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {categoryBreakdown.map((c, i) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{c.name}</span>
                      <span className="text-gray-500">{fmtFull(c.total)}</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((c.total / maxCategory) * 100)}%`,
                          backgroundColor: PALETTE[i % PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Category Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionToggle title="Category Share" open={showPie} onToggle={() => setShowPie((v) => !v)} />
          {showPie && (
            pieData.length === 0 ? (
              <p className="text-sm text-gray-400 mt-4">No expense data for this period.</p>
            ) : (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={44}
                      paddingAngle={2}
                      label={({ percent }) => {
                        const p = percent ?? 0;
                        return p > 0.05 ? `${(p * 100).toFixed(0)}%` : '';
                      }}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={tooltipFormatter} />
                    <Legend
                      formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </div>
      </div>

      {/* Top Merchants */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <SectionToggle title="Top Merchants" open={showMerchants} onToggle={() => setShowMerchants((v) => !v)} />
        {showMerchants && (
          topMerchants.length === 0 ? (
            <p className="text-sm text-gray-400 mt-4">No merchant data for this period.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {topMerchants.map((m, i) => (
                <div key={m.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium truncate max-w-[160px]">{m.name}</span>
                    <span className="text-gray-500 ml-2 whitespace-nowrap">{fmtFull(m.total)}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((m.total / maxMerchant) * 100)}%`,
                        backgroundColor: PALETTE[i % PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Grid row 3: Running Balance + Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Running Balance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionToggle title="Running Balance" open={showRunningBalance} onToggle={() => setShowRunningBalance((v) => !v)} />
          {showRunningBalance && (
            runningBalance.length === 0 ? (
              <p className="text-sm text-gray-400 mt-4">No transactions in this period.</p>
            ) : (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={runningBalance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      name="Balance"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#balanceGradient)"
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </div>

        {/* Spending by Day of Week */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <SectionToggle title="Spending by Day of Week" open={showDayOfWeek} onToggle={() => setShowDayOfWeek((v) => !v)} />
          {showDayOfWeek && (
            dayOfWeekSpend.every((d) => d.total === 0) ? (
              <p className="text-sm text-gray-400 mt-4">No expense data for this period.</p>
            ) : (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekSpend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Bar dataKey="total" name="Spent" radius={[3, 3, 0, 0]}>
                      {dayOfWeekSpend.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
