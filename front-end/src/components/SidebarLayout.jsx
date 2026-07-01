import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { LogoMark } from "./Logo";
import BottomNav from "./BottomNav";
import {
  GridIcon, SendIcon, ArrowDownIcon, StoreIcon, ListIcon, UserIcon,
  InboxArrowDownIcon, BankNoteIcon, ClockIcon, CreditCardIcon, LogOutIcon,
  MoonIcon, SunIcon, MenuIcon, XIcon, UsersIcon, FilterIcon, DocumentIcon,
} from "./Icons";

function getInitials(name, phone) {
  if (name) {
    const parts = name.trim().split(" ");
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return phone?.slice(-2) ?? "??";
}

const CUSTOMER_NAV = [
  { label: "Dashboard",    to: "/dashboard", Icon: GridIcon },
  { label: "Send money",   to: "/send",      Icon: SendIcon },
  { label: "Pay merchant", to: "/pay",       Icon: StoreIcon },
  { label: "History",      to: "/history",   Icon: ListIcon },
  { label: "Profile",      to: "/profile",   Icon: UserIcon },
  { label: "Become agent / merchant", to: "/apply", Icon: ArrowDownIcon },
];

const AGENT_NAV = [
  { label: "Dashboard",        to: "/agent",      Icon: GridIcon },
  { label: "Process cash in",  to: "/cash-in",    Icon: InboxArrowDownIcon },
  { label: "Process cash out", to: "/cashout",    Icon: BankNoteIcon },
  { label: "KYC review",       to: "/kyc-review", Icon: ClockIcon },
  { label: "Commission",       to: "/commission", Icon: CreditCardIcon },
  { label: "History",          to: "/history",    Icon: ListIcon },
];

const ADMIN_NAV = [
  { label: "Dashboard",    to: "/admin",           Icon: GridIcon },
  { label: "Approvals",    to: "/admin/approvals", Icon: ClockIcon,    badgeKey: "pending" },
  { label: "Transactions", to: "/history",         Icon: ListIcon },
  { label: "Fee rules",    to: "/admin/fee-rules", Icon: FilterIcon },
  { label: "Audit log",    to: "/admin/audit-log", Icon: DocumentIcon },
  { label: "All users",    to: "/admin/users",     Icon: UsersIcon },
];

function NavItems({ nav, pendingCount, onClose }) {
  return (
    <nav className="flex-1 px-3 pt-2 pb-4 space-y-0.5 overflow-y-auto">
      {nav.map(({ label, to, Icon, badgeKey }) => (
        <NavLink
          key={label}
          to={to}
          end={to === "/admin" || to === "/dashboard" || to === "/agent"}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`
          }
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="flex-1">{label}</span>
          {badgeKey === "pending" && pendingCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function SidebarLayout({ children, pendingCount = 0 }) {
  const { user, signOut } = useAuth();
  const { dark, toggleDark } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAgent = user?.role === "agent";
  const isAdmin = user?.role === "admin";
  const nav = isAdmin ? ADMIN_NAV : isAgent ? AGENT_NAV : CUSTOMER_NAV;
  const initials = getInitials(user?.full_name, user?.phone_number);
  const displayName = user?.full_name?.split(" ")[0] ?? user?.phone_number ?? "User";

  const roleLabel = isAdmin ? "ADMIN CONSOLE" : isAgent ? "AGENT PORTAL" : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto md:flex md:shrink-0 transition-transform duration-200 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <aside className="w-60 bg-[#0B1D3E] flex flex-col h-screen">
          {/* Logo row */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LogoMark size={28} variant="dark" />
                <span className="text-white font-bold text-lg tracking-tight">Ishimwe</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            {roleLabel && (
              <div className="mt-2.5">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 border border-slate-600 rounded px-2 py-0.5">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>

          <NavItems nav={nav} pendingCount={pendingCount} onClose={() => setMobileOpen(false)} />

          {/* Dark mode + sign out */}
          <div className="px-3 pb-3 space-y-0.5">
            <button
              onClick={toggleDark}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {dark
                ? <SunIcon className="w-4 h-4 shrink-0" />
                : <MoonIcon className="w-4 h-4 shrink-0" />}
              {dark ? "Light mode" : "Dark mode"}
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOutIcon className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>

          {/* User footer */}
          <div className="px-5 py-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{displayName}</p>
                <p className="text-slate-400 text-xs truncate">{user?.phone_number ?? user?.email}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0B1D3E] shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-white p-1">
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <LogoMark size={22} variant="dark" />
            <span className="text-white font-bold text-base">Ishimwe</span>
          </div>
          <div className="ml-auto">
            <button onClick={toggleDark} className="text-slate-400 hover:text-white p-1">
              {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
