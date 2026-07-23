'use client';

interface NavBarProps {
  userEmail: string;
  onSignOut: () => void;
}

export default function NavBar({ userEmail, onSignOut }: NavBarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="text-xl font-bold text-gray-900">CashBudget</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block truncate max-w-[200px]">
            {userEmail}
          </span>
          <button
            onClick={onSignOut}
            className="text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
