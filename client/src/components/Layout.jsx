import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileType,
  Inbox,
  Archive,
  ScrollText,
  Settings,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import clsx from 'clsx';

const linkClass = ({ isActive }) =>
  clsx(
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-brand-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  );

export function Layout() {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const role = profile?.role;

  const nav = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/beneficiaries', label: 'Beneficiaries', icon: Users, show: role === 'administrator' || role === 'administrative_agent' },
    { to: '/attestation-types', label: 'Attestation types', icon: FileType, show: role === 'administrator' || role === 'administrative_agent' },
    { to: '/requests', label: 'Requests', icon: Inbox, show: true },
    { to: '/archive', label: 'Archive', icon: Archive, show: ['administrator', 'administrative_agent', 'external_verifier'].includes(role) },
    { to: '/audit', label: 'Audit logs', icon: ScrollText, show: role === 'administrator' || role === 'administrative_agent' },
    { to: '/settings', label: 'Settings', icon: Settings, show: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex max-w-[1400px] gap-6 p-4 lg:p-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-8 space-y-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold">VerQR</p>
                <p className="text-xs text-slate-500">Attestations</p>
              </div>
            </div>
            <nav className="space-y-1">
              {nav
                .filter((n) => n.show)
                .map((n) => (
                  <NavLink key={n.to} to={n.to} className={linkClass}>
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </NavLink>
                ))}
            </nav>
            <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={toggle}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 space-y-3 lg:hidden">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold">VerQR</div>
              <button
                type="button"
                onClick={toggle}
                className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1 text-xs">
              {nav
                .filter((n) => n.show)
                .map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      clsx(
                        'shrink-0 rounded-full px-3 py-1.5 font-medium',
                        isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      )
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
            </nav>
          </header>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
