import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "../api/authApi";
import { RwandaFlagIcon, LockIcon, EyeIcon, EyeOffIcon, ShieldCheckIcon, ArrowRightIcon, ClockIcon } from "../components/Icons";
import { LogoMark } from "../components/Logo";

const FEATURES = [
  { Icon: ShieldCheckIcon, label: "Your account stays secure", sub: "Reset codes expire in 10 minutes and are single-use." },
  { Icon: ClockIcon,       label: "Quick recovery process",    sub: "Receive a verification code to your registered email." },
  { Icon: ArrowRightIcon,  label: "Back to banking fast",      sub: "Once verified, set a new password and sign in." },
];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("phone");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const fullPhone = phoneLocal.startsWith("+")
    ? phoneLocal
    : "+250" + phoneLocal.replace(/\D/g, "");

  async function handleSendCode(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await forgotPassword(fullPhone);
      setInfo(res.message ?? "Reset code sent to your registered email.");
      setStep("reset");
    } catch (err) {
      setError(err?.detail ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await resetPassword(fullPhone, code, newPassword);
      navigate("/login", { state: { message: "Password reset! Please sign in with your new password." } });
    } catch (err) {
      setError(err?.detail ?? "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[46%] bg-[#0B1D3E] flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} variant="dark" />
          <span className="text-white font-bold text-xl tracking-tight">Ishimwe Bank</span>
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-orange-400 text-sm font-semibold tracking-widest uppercase mb-3">Account recovery</p>
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Back to your<br />account in minutes.
            </h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">
              We&apos;ll send a one-time code to the email linked to your Ishimwe Bank account.
            </p>
          </div>
          <div className="space-y-5">
            {FEATURES.map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-500 text-xs">
          © 2026 Ishimwe Bank — Rwanda&apos;s trusted mobile money platform
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <LogoMark size={28} />
            <span className="text-slate-900 dark:text-white font-bold text-lg">Ishimwe Bank</span>
          </div>

          <div className="mb-8">
            <p className="text-orange-500 text-xs font-bold tracking-widest uppercase mb-2">
              {step === "phone" ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {step === "phone" ? "Forgot your password?" : "Enter your reset code"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              {step === "phone"
                ? "Enter your registered phone number to receive a reset code."
                : info ?? "Enter the 6-digit code sent to your email."}
            </p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone number</label>
                <div className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-transparent">
                  <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 shrink-0">
                    <RwandaFlagIcon className="w-5 h-3.5" />
                    <span className="text-slate-700 dark:text-slate-300 font-bold text-sm">+250</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="7XX XXX XXX"
                    required
                    className="flex-1 px-3 py-3 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !phoneLocal}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Sending…" : "Send reset code →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">6-digit reset code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-center tracking-[0.5em] text-xl font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New password</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <LockIcon className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || code.length < 6 || !newPassword}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
              >
                {loading ? "Resetting…" : "Reset password →"}
              </button>
              <button type="button" onClick={() => { setStep("phone"); setError(null); setCode(""); }}
                className="w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                ← Use a different phone number
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-orange-500 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
