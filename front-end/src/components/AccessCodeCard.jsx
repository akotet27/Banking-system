import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { LogoMark } from "./Logo";

export default function AccessCodeCard({ user }) {
  const [showQr, setShowQr] = useState(false);
  const code = user?.access_code;

  if (!code) return null;

  const qrValue = JSON.stringify({
    app: "IshimweBank",
    phone: user.phone_number,
    name: user.full_name,
    role: user.role,
    code,
  });

  const digits = code.split("");

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
          Your {user.role === "agent" ? "Agent" : "Merchant"} Code
        </h3>
        <button
          onClick={() => setShowQr(v => !v)}
          className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
        >
          {showQr ? "Hide QR" : "Show QR"}
        </button>
      </div>

      {/* 6-digit code display */}
      <div className="flex gap-2 justify-center mb-4">
        {digits.map((d, i) => (
          <div
            key={i}
            className="w-10 h-12 bg-slate-50 dark:bg-slate-700 border-2 border-orange-400 rounded-xl flex items-center justify-center"
          >
            <span className="text-xl font-black text-orange-500 dark:text-orange-400">{d}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500 mb-4">
        Share this code or QR so customers can find you quickly
      </p>

      {/* QR code */}
      {showQr && (
        <div className="flex flex-col items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm">
            <QRCodeSVG
              value={qrValue}
              size={160}
              level="M"
              includeMargin={false}
              imageSettings={{
                src: "",
                height: 0,
                width: 0,
                excavate: false,
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{user.full_name}</p>
            <p className="text-[10px] text-slate-400">{user.phone_number}</p>
          </div>
        </div>
      )}
    </div>
  );
}
