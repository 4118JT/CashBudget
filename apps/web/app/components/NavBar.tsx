'use client';

type View = 'overview' | 'transactions' | 'planning' | 'insights';

interface NavBarProps {
  userEmail: string;
  activeView: View;
  onNavigate: (view: View) => void;
  onSignOut: () => void;
}

const links: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'planning', label: 'Planning' },
  { id: 'insights', label: 'Insights' },
];

export default function NavBar({ userEmail, activeView, onNavigate, onSignOut }: NavBarProps) {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => onNavigate('overview')} className="flex items-center gap-3 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-black text-white shadow-lg shadow-indigo-200">$</span>
            <span><span className="block text-lg font-bold tracking-tight text-slate-950">CashBudget</span><span className="hidden text-xs font-medium text-slate-400 sm:block">A clearer view of your money</span></span>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[200px] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 md:block">{userEmail}</span>
            <button onClick={onSignOut} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">Sign out</button>
          </div>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {links.map((link) => <button key={link.id} onClick={() => onNavigate(link.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${activeView === link.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{link.label}</button>)}
        </div>
      </div>
    </nav>
  );
}
