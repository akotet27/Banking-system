import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { BankIcon } from "./Icons";

const ROLE_BADGE = {
  admin: "bg-red-50 text-red-700 border border-red-200",
  agent: "bg-amber-50 text-amber-700 border border-amber-200",
  merchant: "bg-purple-50 text-purple-700 border border-purple-200",
  customer: "bg-blue-50 text-blue-700 border border-blue-200",
};

export default function AppLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <BankIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 hidden sm:block">Ishimwe Bank</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${ROLE_BADGE[user?.role] ?? "bg-slate-100 text-slate-600"}`}>
              {user?.role}
            </span>
            <span className="text-sm text-slate-500 hidden sm:block max-w-[160px] truncate">
              {user?.phone_number}
            </span>
            <button
              onClick={() => { signOut(); navigate("/login"); }}
              className="text-sm text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
