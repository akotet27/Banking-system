import { useEffect, useState } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { SearchIcon, CheckCircleIcon, ExclamationIcon } from "../components/Icons";

const BASE = "http://localhost:8000";
function authed(token) { return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }
async function api(path, token, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: authed(token), ...opts });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

function getInitials(name, phone) {
  if (name) { const p = name.trim().split(" "); return (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase(); }
  return phone?.slice(-2) ?? "??";
}

const ROLE_STYLE = {
  customer: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  agent:    "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  merchant: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  admin:    "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
};
const AVATAR_COLORS = ["bg-blue-500","bg-emerald-500","bg-orange-500","bg-purple-500","bg-rose-500","bg-amber-500"];

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    api("/admin/users?limit=100", token)
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  async function toggleFreeze(user) {
    setActionLoading(user.id);
    setError(null);
    try {
      const action = user.is_frozen ? "unfreeze" : "freeze";
      await api(`/admin/accounts/${user.id}/${action}`, token, { method: "POST" });
      load();
    } catch (e) {
      setError(e?.detail ?? "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  const displayed = users.filter(u => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone_number?.includes(search) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const roleCounts = { all: users.length };
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  const TABS = [
    { key: "all",      label: "All" },
    { key: "customer", label: "Customers" },
    { key: "agent",    label: "Agents" },
    { key: "merchant", label: "Merchants" },
    { key: "admin",    label: "Admins" },
  ];

  return (
    <SidebarLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">All users</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} registered accounts on this platform.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-5">
          {/* Role tabs — horizontal scroll, no visible scrollbar */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setRoleFilter(t.key)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  roleFilter === t.key
                    ? "bg-[#0B1D3E] dark:bg-white text-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}>
                {t.label}
                <span className="text-xs opacity-60">{roleCounts[t.key] ?? 0}</span>
              </button>
            ))}
          </div>
          {/* Search — full width, icon properly centered */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, email…"
              className="pl-9 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {["User", "Phone", "Role", "KYC", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {loading ? (
                  [0,1,2,3,4].map(i => (
                    <tr key={i}>
                      {[0,1,2,3,4,5,6].map(j => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">No users found.</td>
                  </tr>
                ) : (
                  displayed.map((u, i) => {
                    const initials = getInitials(u.full_name, u.phone_number);
                    const avatarBg = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${avatarBg} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">{u.full_name ?? "—"}</p>
                              <p className="text-xs text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">{u.phone_number}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_STYLE[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {u.kyc_status === "verified" ? (
                            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                          ) : u.kyc_status === "pending" ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Pending</span>
                          ) : (
                            <ExclamationIcon className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.is_frozen ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"}`}>
                            {u.is_frozen ? "Frozen" : "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("en-RW") : "—"}
                        </td>
                        <td className="px-5 py-4">
                          {u.role !== "admin" && (
                            <button
                              onClick={() => toggleFreeze(u)}
                              disabled={actionLoading === u.id}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                                u.is_frozen
                                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                                  : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100"
                              } disabled:opacity-40`}
                            >
                              {actionLoading === u.id ? "…" : u.is_frozen ? "Unfreeze" : "Freeze"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
