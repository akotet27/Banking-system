import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/authApi";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheckIcon, PlusIcon, DocumentIcon, LockIcon, EyeIcon, EyeOffIcon } from "../components/Icons";
import { LogoMark } from "../components/Logo";

const FEATURES = [
  { Icon: ShieldCheckIcon, label: "Approve agents & merchants", sub: "Every new agent and merchant is reviewed before going live." },
  { Icon: PlusIcon,        label: "Configure fee rules",        sub: "Adjust cash out, transfer, and merchant fees system-wide." },
  { Icon: DocumentIcon,    label: "Full audit trail",           sub: "Every session event, logged and reviewable — never editable." },
];

export default function AdminLoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fullPhone = phone.startsWith("+") ? phone : "+250" + phone.replace(/\D/g, "");
      const data = await login(fullPhone, password);
      if (data.user.role !== "admin") {
        setError("This portal is restricted to admin accounts only.");
        setLoading(false);
        return;
      }
      signIn(data.access_token, data.user);
      navigate("/admin");
    } catch (err) {
      setError(err?.detail ?? "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[46%] bg-[#1a1040] flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} variant="dark" />
          <span className="text-white font-bold text-xl tracking-tight">Ishimwe Bank</span>
        </div>

        <div className="space-y-8">
          <div>
            <span className="inline-block text-[10px] font-bold tracking-widest text-violet-400 border border-violet-500/40 rounded px-2 py-0.5 mb-4">
              ADMIN CONSOLE
            </span>
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Oversight,<br />not override.
            </h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">
              You set the rules, approve the agents, and watch the audit trail — but the same privacy protections apply to every account, including from here.
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
          © 2026 Ishimwe Bank — A learning project modeled on real mobile money systems
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <LogoMark size={28} />
            <span className="text-slate-900 dark:text-white font-bold text-lg">Ishimwe Admin</span>
          </div>

          <div className="mb-8">
            <span className="inline-block text-violet-600 text-xs font-bold tracking-widest uppercase mb-3">Admin sign in</span>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Administrator access</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              This portal is restricted to authorised Ishimwe Bank staff.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-1.5">Phone Number</label>
              <div className="flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shrink-0">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">+250</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="788 000 000"
                  required
                  autoComplete="username"
                  className="flex-1 px-3 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl pl-10 pr-10 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 2FA notice */}
            <div className="flex items-start gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40 rounded-xl px-4 py-3">
              <ShieldCheckIcon className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                Two-factor authentication is mandatory for all admin accounts. This sign-in attempt is logged with your IP and device.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone || !password}
              className="w-full bg-violet-600 text-white font-bold py-3.5 rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Signing in…" : "Sign in to admin console →"}
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Need admin access? Contact your system administrator — accounts here are never self-registered.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
