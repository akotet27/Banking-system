import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  GridIcon, SendIcon, StoreIcon, ListIcon, UserIcon,
  InboxArrowDownIcon, BankNoteIcon, ClockIcon, CreditCardIcon,
  UsersIcon, FilterIcon, ShieldCheckIcon,
} from "./Icons";

const CUSTOMER_NAV = [
  { label: "Home",    to: "/dashboard", Icon: GridIcon },
  { label: "Send",    to: "/send",      Icon: SendIcon },
  { label: "Pay",     to: "/pay",       Icon: StoreIcon },
  { label: "History", to: "/history",   Icon: ListIcon },
  { label: "Profile", to: "/profile",   Icon: UserIcon },
];

const AGENT_NAV = [
  { label: "Home",     to: "/agent",      Icon: GridIcon },
  { label: "Cash In",  to: "/cash-in",    Icon: InboxArrowDownIcon },
  { label: "Cash Out", to: "/cashout",    Icon: BankNoteIcon },
  { label: "KYC",      to: "/kyc-review", Icon: ClockIcon },
  { label: "History",  to: "/history",    Icon: ListIcon },
];

const MERCHANT_NAV = [
  { label: "Home",    to: "/dashboard", Icon: GridIcon },
  { label: "History", to: "/history",   Icon: ListIcon },
  { label: "Profile", to: "/profile",   Icon: UserIcon },
];

const ADMIN_NAV = [
  { label: "Home",      to: "/admin",           Icon: GridIcon },
  { label: "Approvals", to: "/admin/approvals", Icon: ClockIcon },
  { label: "Users",     to: "/admin/users",     Icon: UsersIcon },
  { label: "Fees",      to: "/admin/fee-rules", Icon: FilterIcon },
  { label: "Audit",     to: "/admin/audit-log", Icon: ShieldCheckIcon },
];

export default function BottomNav() {
  const { user } = useAuth();

  const nav =
    user?.role === "admin"    ? ADMIN_NAV :
    user?.role === "agent"    ? AGENT_NAV :
    user?.role === "merchant" ? MERCHANT_NAV :
    CUSTOMER_NAV;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B1D3E] border-t border-white/10 safe-area-bottom">
      <div className="flex items-stretch h-16">
        {nav.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard" || to === "/agent" || to === "/admin"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                isActive ? "text-orange-400" : "text-slate-400 hover:text-slate-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? "text-orange-400" : ""}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
