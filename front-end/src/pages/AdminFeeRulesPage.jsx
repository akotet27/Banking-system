import { useEffect, useState } from "react";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { SendIcon, ArrowDownIcon, InboxArrowDownIcon, StoreIcon, CheckCircleIcon } from "../components/Icons";

const BASE = "http://localhost:8000";
function authed(token) { return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }
async function api(path, token, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: authed(token), ...opts });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

const DEFAULT_RULES = [
  { transaction_type: "cash_in",     fee_percentage: "0.0",  min_fee: "0",  max_fee: "0",   agent_commission: "0" },
  { transaction_type: "cash_out",    fee_percentage: "1.0",  min_fee: "5",  max_fee: "200", agent_commission: "50" },
  { transaction_type: "send_money",  fee_percentage: "0.5",  min_fee: "1",  max_fee: "50",  agent_commission: "" },
  { transaction_type: "pay_merchant",fee_percentage: "0.3",  min_fee: "0",  max_fee: "100", agent_commission: "" },
];

const TYPE_CONFIG = {
  cash_in:      { label: "Cash in",      sub: "Customer deposits cash with an agent",   Icon: InboxArrowDownIcon, iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600", feePaid: "Always free",  status: "Active" },
  cash_out:     { label: "Cash out",     sub: "Customer withdraws cash via an agent",   Icon: ArrowDownIcon,      iconBg: "bg-blue-100 dark:bg-blue-900/30",       iconColor: "text-blue-600",    feePaid: "customer",     status: "Active" },
  send_money:   { label: "Send money",   sub: "Customer-to-customer transfer",          Icon: SendIcon,           iconBg: "bg-orange-100 dark:bg-orange-900/30",   iconColor: "text-orange-600",  feePaid: "sender",       status: "Active" },
  pay_merchant: { label: "Pay merchant", sub: "Customer pays a registered merchant",    Icon: StoreIcon,          iconBg: "bg-purple-100 dark:bg-purple-900/30",   iconColor: "text-purple-600",  feePaid: "merchant",     status: "Active" },
};

export default function AdminFeeRulesPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState(DEFAULT_RULES.map(r => ({ ...r })));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api("/admin/fee-rules", token)
      .then(data => {
        if (data.length > 0) {
          setRules(DEFAULT_RULES.map(def => {
            const live = data.find(r => r.transaction_type === def.transaction_type);
            return live ? {
              ...def,
              fee_percentage: String(live.fee_percentage),
              min_fee: String(live.min_fee),
              max_fee: live.max_fee != null ? String(live.max_fee) : def.max_fee,
            } : def;
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  function updateRule(type, field, value) {
    setRules(prev => prev.map(r => r.transaction_type === type ? { ...r, [field]: value } : r));
    setSaved(false);
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        rules.map(r =>
          api("/admin/fee-rules", token, {
            method: "POST",
            body: JSON.stringify({
              transaction_type: r.transaction_type,
              fee_percentage: parseFloat(r.fee_percentage) || 0,
              min_fee: parseFloat(r.min_fee) || 0,
              max_fee: r.max_fee ? parseFloat(r.max_fee) : null,
            }),
          })
        )
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e?.detail ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SidebarLayout>
      <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Fee rules</h1>
            <p className="text-slate-400 text-sm mt-0.5">Changes apply system-wide and take effect immediately.</p>
          </div>
          <button
            onClick={saveAll}
            disabled={saving}
            className="self-start sm:self-auto shrink-0 bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {saved
              ? <><CheckCircleIcon className="w-4 h-4" /> Saved</>
              : saving ? "Saving…" : "Save all changes"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">{[0,1,2,3].map(i => <div key={i} className="h-40 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-4">
            {rules.map(rule => {
              const cfg = TYPE_CONFIG[rule.transaction_type] ?? { label: rule.transaction_type, Icon: SendIcon, iconBg: "bg-slate-100", iconColor: "text-slate-600", feePaid: "-", status: "Active" };
              const isFree = rule.transaction_type === "cash_in";
              return (
                <div key={rule.transaction_type} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 md:p-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 ${cfg.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                        <cfg.Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white">{cfg.label}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{cfg.sub}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full shrink-0">{cfg.status}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Fee %</label>
                      {isFree ? (
                        <div className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-900">
                          <span className="text-sm text-slate-400 dark:text-slate-500">Always free</span>
                        </div>
                      ) : (
                        <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                          <input
                            type="number" min="0" max="100" step="0.1"
                            value={rule.fee_percentage}
                            onChange={e => updateRule(rule.transaction_type, "fee_percentage", e.target.value)}
                            className="flex-1 px-3 py-2.5 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none w-0 min-w-0"
                          />
                          <span className="px-3 text-slate-400 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 text-sm py-2.5">%</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Min fee</label>
                      <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                        <input
                          type="number" min="0" step="0.5"
                          value={rule.min_fee}
                          onChange={e => updateRule(rule.transaction_type, "min_fee", e.target.value)}
                          className="flex-1 px-3 py-2.5 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none w-0 min-w-0"
                        />
                        <span className="px-2 text-slate-400 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 text-xs py-2.5">RWF</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Max fee</label>
                      <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                        <input
                          type="number" min="0" step="1"
                          value={rule.max_fee}
                          onChange={e => updateRule(rule.transaction_type, "max_fee", e.target.value)}
                          className="flex-1 px-3 py-2.5 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none w-0 min-w-0"
                        />
                        <span className="px-2 text-slate-400 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 text-xs py-2.5">RWF</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Agent split</label>
                      {rule.agent_commission ? (
                        <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                          <input
                            type="number" min="0" max="100" step="1"
                            value={rule.agent_commission}
                            onChange={e => updateRule(rule.transaction_type, "agent_commission", e.target.value)}
                            className="flex-1 px-3 py-2.5 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none w-0 min-w-0"
                          />
                          <span className="px-3 text-slate-400 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 text-sm py-2.5">%</span>
                        </div>
                      ) : (
                        <div className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-900">
                          <span className="text-sm text-slate-400">n/a</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                    {isFree ? "Cash in is always free for customers." : `Fee paid by ${cfg.feePaid}.`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
