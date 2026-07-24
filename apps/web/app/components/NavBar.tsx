'use client';

type WorkspacePage = 'overview' | 'activity' | 'planning' | 'analytics';

interface NavBarProps {
  userEmail: string;
  page: WorkspacePage;
  onNavigate: (page: WorkspacePage) => void;
  onSignOut: () => void;
}

const links: { label: string; page: WorkspacePage }[] = [
  { label: 'Overview', page: 'overview' },
  { label: 'Activity', page: 'activity' },
  { label: 'Planning', page: 'planning' },
  { label: 'Analytics', page: 'analytics' },
];

export default function NavBar({ userEmail, page, onNavigate, onSignOut }: NavBarProps) {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <button type="button" onClick={() => onNavigate('overview')} className="flex shrink-0 items-center gap-3" aria-label="Go to overview">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold shadow-lg shadow-indigo-500/30" aria-hidden="true">C</div>
            <div className="hidden text-left sm:block"><span className="block text-sm font-semibold tracking-tight">CashBudget</span><span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Personal finance</span></div>
          </button>
          <div className="hidden items-center gap-1 text-sm md:flex">
            {links.map((link) => <button type="button" key={link.page} onClick={() => onNavigate(link.page)} className={`rounded-lg px-3 py-1.5 transition ${page === link.page ? 'bg-slate-800 font-semibold text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>{link.label}</button>)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onNavigate('activity')} className="hidden rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400 sm:block">Add transaction</button>
          <div className="hidden text-right lg:block"><p className="max-w-[200px] truncate text-xs font-medium text-slate-200">{userEmail}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">Personal workspace</p></div>
          <button onClick={onSignOut} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white">Sign out</button>
        </div>
      </div>
    </nav>
  );
}
