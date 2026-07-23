'use client';

interface NavBarProps {
  userEmail: string;
  onSignOut: () => void;
}

export default function NavBar({ userEmail, onSignOut }: NavBarProps) {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg shadow-lg shadow-indigo-200">
            <span aria-hidden="true">$</span>
          </div>
          <div>
            <span className="block text-lg font-bold tracking-tight text-slate-950">CashBudget</span>
            <span className="hidden text-xs font-medium text-slate-400 sm:block">A clearer view of your money</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[200px] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 sm:block">
            {userEmail}
          </span>
          <button
            onClick={onSignOut}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
