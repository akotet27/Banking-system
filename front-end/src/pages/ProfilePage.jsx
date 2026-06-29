import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../utils/validation";
import {
  CheckCircleIcon, ExclamationIcon, LockIcon, FingerprintIcon,
  ClockIcon, ShieldCheckIcon, EnvelopeIcon, XIcon,
} from "../components/Icons";
import { enrollBegin, enrollFinish, listCredentials, deleteCredential } from "../api/biometricApi";
import { prepareCreateOptions, attestationToJSON } from "../utils/webauthn";

const RW_DISTRICTS = [
  "Kigali - Gasabo","Kigali - Kicukiro","Kigali - Nyarugenge",
  "Eastern - Bugesera","Eastern - Kayonza","Eastern - Nyagatare","Eastern - Rwamagana",
  "Northern - Burera","Northern - Gicumbi","Northern - Musanze","Northern - Rulindo",
  "Southern - Huye","Southern - Muhanga","Southern - Nyanza","Southern - Ruhango",
  "Western - Karongi","Western - Ngororero","Western - Rubavu","Western - Rusizi",
];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{value ?? "—"}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, token, signIn } = useAuth();
  const navigate = useNavigate();
  const [autoExpire] = useState(true);
  const [credentials, setCredentials] = useState([]);
  const [enrollStatus, setEnrollStatus] = useState(null); // null | "enrolling" | "success" | "error"
  const [enrollError, setEnrollError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    listCredentials(token).then(setCredentials).catch(() => {});
  }, [token]);

  async function handleEnroll() {
    setEnrollStatus("enrolling");
    setEnrollError(null);
    try {
      const options = await enrollBegin(token, "customer_phone", navigator.userAgent.slice(0, 60));
      let credential;
      if (options._dev_mode) {
        // py-webauthn not installed — simulate enrollment
        credential = { id: "dev-" + Date.now(), rawId: "dev", type: "public-key", response: { attestationObject: "dev", clientDataJSON: "dev" } };
      } else {
        const raw = await navigator.credentials.create({ publicKey: prepareCreateOptions(options) });
        credential = attestationToJSON(raw);
      }
      await enrollFinish(token, "customer_phone", credential);
      const updated = await listCredentials(token);
      setCredentials(updated);
      setEnrollStatus("success");
    } catch (err) {
      setEnrollError(
        err?.detail ?? err?.message ?? "Enrollment failed. Make sure your browser supports WebAuthn."
      );
      setEnrollStatus("error");
    }
  }

  async function handleDeleteCredential(id) {
    try {
      await deleteCredential(token, id);
      setCredentials(c => c.filter(x => x.id !== id));
    } catch { /* ignore */ }
  }

  function startEdit() {
    setEditName(user?.full_name ?? "");
    setEditDob(user?.date_of_birth ?? "");
    setEditLocation(user?.location ?? "");
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!editName.trim()) { setSaveError("Full name is required."); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("http://localhost:8000/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: editName.trim(), date_of_birth: editDob, location: editLocation }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      // Update auth context with new user data
      signIn(token, data);
      setEditing(false);
    } catch (err) {
      setSaveError(err?.detail ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const initials = (() => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(" ");
      return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
    }
    return user?.phone_number?.slice(-2) ?? "??";
  })();

  const kycVerified = user?.kyc_status === "verified";

  const verificationSteps = [
    {
      done: user?.email_verified,
      label: "Email verified",
      sub: user?.email_verified ? "Confirmed" : "Not yet verified",
      Icon: EnvelopeIcon,
    },
    {
      done: credentials.length > 0,
      label: "Fingerprint registered",
      sub: credentials.length > 0 ? `${credentials.length} device registered` : "Set up from the Security section below",
      Icon: FingerprintIcon,
    },
    {
      done: kycVerified,
      label: "ID verification",
      sub: kycVerified ? "Verified" : "Submit your ID document to unlock higher limits.",
      Icon: ShieldCheckIcon,
      action: !kycVerified ? { label: "Submit KYC →", to: "/kyc" } : null,
    },
  ];

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900">

        <button onClick={() => navigate(-1)} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 mb-5">
          ← Back
        </button>

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Profile &amp; security</h1>
          <p className="text-slate-400 text-sm mt-0.5 hidden sm:block">Manage your details, verification status, and how your account is protected.</p>
        </div>

        {/* Profile header card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 md:p-5 flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-lg md:text-xl font-bold">{initials}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">{user?.full_name ?? "—"}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm truncate">{user?.phone_number} · {user?.email}</p>
            </div>
          </div>
          {kycVerified ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full shrink-0">
              <CheckCircleIcon className="w-3.5 h-3.5" /> Verified
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full shrink-0">
              <ExclamationIcon className="w-3.5 h-3.5" /> Pending
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">

          {/* Left: account details + security */}
          <div className="lg:col-span-3 space-y-4">

            {/* Account details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 dark:text-white">Account details</h3>
                {editing ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600 font-semibold px-2 py-1">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                      className="text-xs bg-orange-500 text-white font-bold px-3 py-1 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                ) : (
                  <button onClick={startEdit} className="text-xs text-orange-500 font-bold hover:underline">Edit</button>
                )}
              </div>

              {saveError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-xs rounded-xl px-3 py-2 mb-3">{saveError}</div>
              )}

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Full name</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Date of birth</label>
                    <input type="date" value={editDob} onChange={e => setEditDob(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">District</label>
                    <select value={editLocation} onChange={e => setEditLocation(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option value="">Select…</option>
                      {RW_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <InfoRow label="Phone number"   value={user?.phone_number} />
                  <InfoRow label="Email address"  value={user?.email} />
                  <InfoRow label="Account opened" value={user?.created_at ? formatDate(user.created_at) : "—"} />
                </div>
              ) : (
                <>
                  <InfoRow label="Full name"      value={user?.full_name} />
                  <InfoRow label="Phone number"   value={user?.phone_number} />
                  <InfoRow label="Email address"  value={user?.email} />
                  <InfoRow label="Date of birth"  value={user?.date_of_birth} />
                  <InfoRow label="Location"       value={user?.location} />
                  <InfoRow label="Account opened" value={user?.created_at ? formatDate(user.created_at) : "—"} />
                </>
              )}
            </div>

            {/* Security */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 md:p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Security</h3>
              <div className="space-y-4">

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${credentials.length > 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-slate-100 dark:bg-slate-700"}`}>
                      <FingerprintIcon className={`w-5 h-5 ${credentials.length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Fingerprint / Windows Hello</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {credentials.length > 0 ? `${credentials.length} device${credentials.length > 1 ? "s" : ""} registered` : "Not set up on this device"}
                      </p>
                    </div>
                    {credentials.length === 0 && (
                      <button onClick={handleEnroll} disabled={enrollStatus === "enrolling"}
                        className="text-xs bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50 shrink-0">
                        {enrollStatus === "enrolling" ? "Setting up..." : "Set up"}
                      </button>
                    )}
                    {credentials.length > 0 && (
                      <button onClick={handleEnroll} disabled={enrollStatus === "enrolling"}
                        className="text-xs text-orange-500 font-bold hover:underline shrink-0 disabled:opacity-50">
                        {enrollStatus === "enrolling" ? "Setting up..." : "Add device"}
                      </button>
                    )}
                  </div>

                  {enrollStatus === "success" && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl px-3 py-2">
                      Fingerprint registered successfully. You can now use it to approve cash-out requests.
                    </div>
                  )}
                  {enrollStatus === "error" && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-xs rounded-xl px-3 py-2">
                      {enrollError}
                    </div>
                  )}

                  {credentials.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {credentials.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.device_label ?? "Device"}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              Registered {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteCredential(c.id)}
                            className="text-slate-400 hover:text-red-500 p-1">
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                    <ClockIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Auto-expire agent sessions</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Sessions always close after 3 minutes max</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${autoExpire ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${autoExpire ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                    <LockIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Change password</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Keep your account secure</p>
                  </div>
                  <Link to="/forgot-password" className="text-xs text-orange-500 font-bold hover:underline shrink-0">Update</Link>
                </div>

              </div>
            </div>
          </div>

          {/* Right: identity verification */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 md:p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Identity verification</h3>
              <div className="space-y-4">
                {verificationSteps.map(({ done, label, sub, pending, action }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      done
                        ? "bg-emerald-500"
                        : pending
                          ? "bg-amber-100 dark:bg-amber-900/40"
                          : "bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700"
                    }`}>
                      {done
                        ? <CheckCircleIcon className="w-4 h-4 text-white" />
                        : <ExclamationIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${done ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>{label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
                      {action && (
                        <Link to={action.to} className="text-xs text-orange-500 font-bold hover:underline mt-1 block">
                          {action.label}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!kycVerified && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <Link to="/kyc"
                    className="block w-full text-center bg-orange-500 text-white font-bold py-2.5 rounded-xl hover:bg-orange-600 text-sm transition-colors">
                    Complete verification
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </SidebarLayout>
  );
}
