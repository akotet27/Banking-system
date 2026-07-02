import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, verifyEmail, resendOtp } from "../api/authApi";
import { validateEmail, validatePassword } from "../utils/validation";
import { CheckCircleIcon, ShieldCheckIcon, EnvelopeIcon, UserIcon, RwandaFlagIcon, EyeIcon, EyeOffIcon } from "../components/Icons";
import { LogoMark } from "../components/Logo";
import { useTheme } from "../contexts/ThemeContext";

function ThemeToggle() {
  const { dark, toggleDark } = useTheme();
  return (
    <button
      onClick={toggleDark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="absolute top-5 right-5 z-10 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      {dark ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

const STEPS = [
  { n: 1, label: "Your details",      sub: "Name, phone number, and a secure password." },
  { n: 2, label: "Verify your email", sub: "A 6-digit code confirms it's really you." },
  { n: 3, label: "Set up your fingerprint", sub: "Secures every send and cash out from here on." },
];


const RW_DISTRICTS = {
  "Kigali":   ["Gasabo", "Kicukiro", "Nyarugenge"],
  "Eastern":  ["Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana"],
  "Northern": ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
  "Southern": ["Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango"],
  "Western":  ["Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rusizi", "Rutsiro"],
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [location, setLocation] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const fullPhone = phoneLocal.startsWith("+") ? phoneLocal : "+250" + phoneLocal.replace(/\D/g, "");
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  function validateStep1() {
    const errs = {};
    const namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ '-]+$/;
    if (firstName.trim().length < 2) errs.firstName = "Enter your first name";
    else if (!namePattern.test(firstName.trim())) errs.firstName = "Name must contain only letters";
    if (lastName.trim().length < 2)  errs.lastName  = "Enter your last name";
    else if (!namePattern.test(lastName.trim()))  errs.lastName  = "Name must contain only letters";
    const digits = phoneLocal.replace(/\D/g, "");
    if (digits.length < 9)           errs.phone    = "Enter a valid Rwandan phone number";
    const ee = validateEmail(email);
    if (ee) errs.email = ee;
    const pw = validatePassword(password);
    if (pw) errs.password = pw;
    if (!dob) errs.dob = "Date of birth required";
    else {
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      if (age < 18) errs.dob = "You must be at least 18 years old";
    }
    if (!location) errs.location = "Select your district";
    if (!agreed)   errs.agreed   = "You must agree to the terms";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleStep1(e) {
    e.preventDefault();
    if (!validateStep1()) return;
    setError(null);
    setLoading(true);
    try {
      await register({
        phone_number: fullPhone,
        email,
        password,
        role: "customer",
        full_name: fullName,
        date_of_birth: dob,
        location,
      });
      setStep(2);
    } catch (err) {
      setError(err?.detail ?? "Registration failed. Please try again.");
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
      setStep(3);
    } catch (err) {
      setError(err?.detail ?? "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function FErr({ k }) {
    return fieldErrors[k] ? <p className="text-red-500 text-xs mt-1">{fieldErrors[k]}</p> : null;
  }

  const strengthScore = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strengthScore];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"][strengthScore];

  /* ── Step 3: fingerprint (web stub) ── */
  if (step === 3) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <ThemeToggle />
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Account created!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Your email is verified. Fingerprint setup requires the Ishimwe Bank mobile app — for now, all features are available via password.
          </p>
          <button
            onClick={() => navigate("/login", { state: { message: "Account created! Sign in to get started." } })}
            className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600"
          >
            Continue to sign in
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 2: OTP verification ── */
  if (step === 2) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <ThemeToggle />
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <EnvelopeIcon className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Check your email</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">We sent a 6-digit verification code to</p>
          <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">{email}</p>
          <button
            type="button"
            onClick={() => { setStep(1); setOtp(["","","","","",""]); setError(null); }}
            className="text-xs text-orange-500 hover:underline mb-5 inline-block"
          >
            Wrong email? Go back and fix it
          </button>

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
                  className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-colors bg-white dark:bg-slate-700 ${
                    digit ? "border-orange-400 text-slate-900 dark:text-white" : "border-slate-200 dark:border-slate-600 text-slate-400"
                  } focus:border-orange-500`}
                />
              ))}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify and continue →"}
            </button>
          </form>

          <p className="text-slate-500 dark:text-slate-400 text-sm mt-5">
            Didn&apos;t get a code?{" "}
            <button
              onClick={async () => {
                setOtp(["","","","","",""]);
                setError(null);
                try { await resendOtp(fullPhone, "signup"); } catch { /* ignore */ }
              }}
              className="text-orange-500 font-bold hover:underline"
            >
              Resend it
            </button>
          </p>
        </div>
      </div>
    );
  }

  /* ── Step 1: Details ── */
  return (
    <div className="min-h-screen flex">
      {/* Left dark panel */}

      <div className="hidden lg:flex lg:w-[46%] bg-[#0B1D3E] flex-col">
        <div className="px-10 py-8">
          <div className="flex items-center gap-2.5">
            <LogoMark size={34} variant="dark" />
            <span className="text-white font-bold text-xl tracking-tight">Ishimwe Bank</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center px-10">
          <h1 className="text-[2.4rem] font-extrabold text-white leading-tight mb-6">
            Opening your<br />account takes<br />three quick<br />steps.
          </h1>
          <div className="space-y-6">
            {STEPS.map(({ n, label, sub }) => (
              <div key={n} className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${step > n ? "bg-orange-500 text-white" : step === n ? "bg-orange-500 text-white" : "bg-white/10 text-slate-400"}`}>
                  {step > n ? "✓" : n}
                </div>
                <div className="pt-1">
                  <p className={`font-semibold text-sm ${step >= n ? "text-white" : "text-slate-500"}`}>{label}</p>
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
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 relative">
        {/* Back to landing */}
        <Link to="/" className="absolute top-5 left-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors group z-10">

          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <ThemeToggle />
        <div className="min-h-full flex items-start justify-center p-8 pt-10">
          <div className="w-full max-w-md">
            <div className="inline-flex items-center px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-500 dark:text-slate-400 font-semibold mb-5 tracking-wide">
              Step 1 of 3
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Create your account</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">It only takes a couple of minutes to get started.</p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-3 py-2.5 mb-4">{error}</div>
            )}

            <form onSubmit={handleStep1} className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Mugisha"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <FErr k="firstName" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Jean Pierre"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <FErr k="lastName" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                <div className="flex rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 transition-all">
                  <div className="flex items-center gap-1.5 px-3 bg-slate-50 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shrink-0">
                    <RwandaFlagIcon className="w-5 h-3.5" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">+250</span>
                  </div>
                  <input type="tel" value={phoneLocal} onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="788 123 456"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
                </div>
                <FErr k="phone" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <FErr k="email" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 pr-10 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= strengthScore ? strengthColor : "bg-slate-200 dark:bg-slate-700"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{strengthLabel} — includes letters, numbers, and symbols</p>
                  </div>
                )}
                <FErr k="password" />
              </div>

              {/* DOB + District */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date of Birth</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <FErr k="dob" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">District</label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">Select…</option>
                    {Object.entries(RW_DISTRICTS).map(([province, districts]) => (
                      <optgroup key={province} label={province === "Kigali" ? "Kigali City" : `${province} Province`}>
                        {districts.map(d => <option key={d} value={`${province} - ${d}`}>{d}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <FErr k="location" />
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-orange-500 shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  I agree to Ishimwe Bank&apos;s{" "}
                  <span className="text-orange-500 font-semibold">Terms of Service</span> and{" "}
                  <span className="text-orange-500 font-semibold">Privacy Policy</span>, including how fingerprint sessions protect my account.
                </span>
              </label>
              <FErr k="agreed" />

              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {loading ? "Creating account…" : "Continue →"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
              Already have an account?{" "}
              <Link to="/login" className="text-orange-500 font-bold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
