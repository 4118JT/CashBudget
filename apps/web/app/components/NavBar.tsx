'use client';

interface NavBarProps {
  userEmail: string;
  onSignOut: () => void;
}

export default function NavBar({ userEmail, onSignOut }: NavBarProps) {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold shadow-lg shadow-indigo-500/30" aria-hidden="true">C</div>
            <div>
              <span className="block text-sm font-semibold tracking-tight">CashBudget</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Personal finance</span>
            </div>
          </div>
          <div className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
            <span className="font-medium text-white">Overview</span>
            <span>Activity</span>
            <span>Planning</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="max-w-[200px] truncate text-xs font-medium text-slate-200">{userEmail}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Personal workspace</p>
          </div>
          <div className="hidden h-8 w-px bg-slate-800 sm:block" />
          <button onClick={onSignOut} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
