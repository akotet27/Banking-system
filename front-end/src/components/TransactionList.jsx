import { formatCurrency, timeAgo } from "../utils/validation";

const TYPE_CONFIG = {
  cash_in: { label: "Cash In", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  cash_out: { label: "Cash Out", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  send_money: { label: "Send Money", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  pay_merchant: { label: "Pay Merchant", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
};

function TxIcon({ type }) {
  const cfg = TYPE_CONFIG[type] ?? { color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
    </div>
  );
}

export default function TransactionList({ transactions, currentUserId }) {
  if (!transactions?.length) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-slate-400 text-sm">No transactions yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-50">
      {transactions.map((t) => {
        const isDebit = t.initiator_id === currentUserId && t.type !== "cash_in";
        const cfg = TYPE_CONFIG[t.type] ?? { label: t.type, color: "", dot: "bg-slate-400" };

        return (
          <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <TxIcon type={t.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{cfg.label}</p>
              <p className="text-xs text-slate-400">{timeAgo(t.created_at)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${isDebit ? "text-red-600" : "text-emerald-600"}`}>
                {isDebit ? "−" : "+"}{formatCurrency(t.amount)}
              </p>
              {t.fee > 0 && (
                <p className="text-xs text-slate-400">fee {formatCurrency(t.fee)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
