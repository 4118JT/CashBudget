'use client';

interface NavBarProps {
  userEmail: string;
  onSignOut: () => void;
}

const links = [
  { label: 'Overview', href: '#overview' },
  { label: 'Activity', href: '#activity' },
  { label: 'Planning', href: '#planning' },
];

export default function NavBar({ userEmail, onSignOut }: NavBarProps) {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <a href="#overview" className="flex shrink-0 items-center gap-3" aria-label="Go to overview">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold shadow-lg shadow-indigo-500/30" aria-hidden="true">C</div>
            <div className="hidden sm:block"><span className="block text-sm font-semibold tracking-tight">CashBudget</span><span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Personal finance</span></div>
          </a>
          <div className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
            {links.map((link) => <a key={link.href} href={link.href} className="transition hover:text-white">{link.label}</a>)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="#add-transaction" className="hidden rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400 sm:block">Add transaction</a>
          <div className="hidden text-right lg:block"><p className="max-w-[200px] truncate text-xs font-medium text-slate-200">{userEmail}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">Personal workspace</p></div>
          <button onClick={onSignOut} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white">Sign out</button>
        </div>
      </div>
    </nav>
  );
}
