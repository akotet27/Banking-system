import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, resendOtp, verifyEmail } from "../api/authApi";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheckIcon, ClockIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, RwandaFlagIcon, EnvelopeIcon } from "../components/Icons";
import { LogoMark } from "../components/Logo";

const FEATURES = [
  { Icon: ShieldCheckIcon, label: "Fingerprint-verified sessions", sub: "Agents confirm, never see, your balance." },
  { Icon: ClockIcon,       label: "3-minute access windows",       sub: "Every agent session closes itself, automatically." },
  { Icon: ArrowRightIcon,  label: "Verified agents across Rwanda", sub: "Cash in or out at a trusted location near you." },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phoneLocal, setPhoneLocal] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Verification flow
  const [verifyMode, setVerifyMode] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (location.state?.message) {
      setInfo(location.state.message);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const fullPhone = phoneLocal.startsWith("+") ? phoneLocal : "+250" + phoneLocal.replace(/\D/g, "");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(fullPhone, password);
      signIn(data.access_token, data.user);
      const role = data.user.role;
      if (role === "admin") navigate("/admin");
      else if (role === "agent") navigate("/agent");
      else navigate("/dashboard");
    } catch (err) {
      if (err?.detail === "Email not verified") {
        // Send OTP and switch to verification screen
        try { await resendOtp(fullPhone, "signup"); } catch { /* ignore */ }
        setVerifyMode(true);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(err?.detail ?? "Incorrect phone number or password.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(idx, val) {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKey(idx, e) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
    setError(null);
    setLoading(true);
    try {
      await verifyEmail(fullPhone, code);
      // Email verified — now log in automatically
      const data = await login(fullPhone, password);
      signIn(data.access_token, data.user);
      const role = data.user.role;
      if (role === "admin") navigate("/admin");
      else if (role === "agent") navigate("/agent");
      else navigate("/dashboard");
    } catch (err) {
      setError(err?.detail ?? "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError(null);
    setOtp(["", "", "", "", "", ""]);
    try { await resendOtp(fullPhone, "signup"); } catch { /* ignore */ }
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }

  /* ── Verification screen ── */
  if (verifyMode) {
    return (
      <div className="min-h-screen w-full flex">
        <div className="hidden lg:flex lg:w-[46%] bg-[#0B1D3E] flex-col">
          <div className="px-10 py-8">
            <div className="flex items-center gap-2.5">
              <LogoMark size={34} variant="dark" />
              <span className="text-white font-bold text-xl tracking-tight">Ishimwe Bank</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center px-10">
            <h1 className="text-[2.5rem] font-extrabold text-white leading-tight mb-5">
              One last step<br />to secure<br />your account.
            </h1>
            <p className="text-slate-400 text-sm">Check your email for the 6-digit verification code we just sent.</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-slate-900">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <EnvelopeIcon className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Verify your email</h2>
            <p className="text-slate-500 text-sm mb-6">
              We sent a 6-digit code to the email address linked to <span className="font-semibold text-slate-700 dark:text-slate-300">{fullPhone}</span>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5 mb-4 text-left">{error}</div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-colors ${
                      digit ? "border-orange-400 text-slate-900" : "border-slate-200 text-slate-400"
                    } focus:border-orange-500`}
                  />
                ))}
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify and sign in →"}
              </button>
            </form>

            <p className="text-slate-500 text-sm mt-5">
              Didn&apos;t receive the code?{" "}
              <button onClick={handleResendOtp} className="text-orange-500 font-bold hover:underline">
                Resend
              </button>
            </p>
            <p className="text-slate-400 text-xs mt-3">
              Check your terminal / server console for the code if email delivery is slow.
            </p>
            <button
              onClick={() => { setVerifyMode(false); setError(null); setOtp(["","","","","",""]); }}
              className="mt-4 text-xs text-slate-400 hover:text-slate-600"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Normal login screen ── */
  return (
    <div className="min-h-screen w-full flex">
      {/* Left dark panel */}
      <div className="hidden lg:flex lg:w-[46%] bg-[#0B1D3E] flex-col">
        <div className="px-10 py-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-base">I</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Ishimwe Bank</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center px-10">
          <h1 className="text-[2.5rem] font-extrabold text-white leading-tight mb-5">
            Your number is<br />your account.<br />Your fingerprint<br />is your key.
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-10">
            Send money, cash out, and pay merchants — with privacy built into every transaction, not bolted on.
          </p>
          <div className="space-y-6">
            {FEATURES.map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-10 pb-8">
          <p className="text-slate-600 text-xs">© 2026 Ishimwe Bank — A learning project modeled on real mobile money systems</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-slate-900 relative">
        {/* Back to landing */}
        <Link to="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back
        </Link>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <LogoMark size={28} />
            <span className="text-slate-900 dark:text-white font-bold text-lg">Ishimwe Bank</span>
          </div>

          <div className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500 font-semibold mb-6 tracking-wide">
            Customer sign in
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="text-slate-500 text-sm mt-1 mb-7">Sign in with your phone number to access your wallet.</p>

          {info && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-3 py-2.5 mb-4">{info}</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Phone Number
              </label>
              <div className="flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-orange-400 transition-all">
                <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 shrink-0">
                  <RwandaFlagIcon className="w-5 h-3.5" />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">+250</span>
                </div>
                <input
                  type="tel"
                  value={phoneLocal}
                  onChange={(e) => setPhoneLocal(e.target.value)}
                  placeholder="788 123 456"
                  required
                  className="flex-1 px-3 py-3 text-sm outline-none bg-white dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full border border-slate-300 rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-orange-500"
                />
                Remember this device
              </label>
              <Link to="/forgot-password" className="text-sm text-blue-600 font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in…" : "Sign in securely →"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-orange-500 font-bold hover:underline">
              Open one in 2 minutes
            </Link>
          </p>
          <p className="text-center mt-3">
            <Link to="/admin-login" className="text-xs text-slate-400 hover:text-slate-500">
              Admin console →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
