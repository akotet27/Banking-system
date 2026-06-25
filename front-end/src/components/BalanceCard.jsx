import { useState } from "react";
import { formatCurrency } from "../utils/validation";
import { EyeIcon, EyeOffIcon } from "./Icons";

export default function BalanceCard({ balance, floatBalance, currency = "RWF", role }) {
  const [hidden, setHidden] = useState(false);

  const primaryLabel = role === "agent" ? "Float Balance" : "Available Balance";
  const primaryAmount = role === "agent" ? (floatBalance ?? 0) : (balance ?? 0);

  function mask(val) {
    return hidden ? "••••••" : formatCurrency(val, currency);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
      style={{ background: "linear-gradient(135deg, #0B1D3E 0%, #1B4FD8 100%)" }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white opacity-5 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white opacity-5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">{primaryLabel}</p>
          <button
            onClick={() => setHidden((v) => !v)}
            className="text-blue-300 hover:text-white transition-colors"
            aria-label={hidden ? "Show balance" : "Hide balance"}
          >
            {hidden ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-4xl font-bold tracking-tight leading-none mt-2 mb-4">
          {mask(primaryAmount)}
        </p>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
          <span className="text-blue-300 text-xs">Ishimwe Bank</span>
          {role === "agent" && balance != null && (
            <span className="text-blue-300 text-xs">
              Wallet: {mask(balance)}
            </span>
          )}
          {role !== "agent" && (
            <span className="text-blue-300 text-xs uppercase tracking-wider">
              {currency} Account
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
