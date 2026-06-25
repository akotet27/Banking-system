import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheckIcon, DocumentIcon, CheckCircleIcon, ClockIcon } from "../components/Icons";

const BASE = "http://localhost:8000";

async function submitKyc(token, id_document_ref) {
  const res = await fetch(`${BASE}/kyc/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id_document_ref }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

const DOC_TYPES = [
  { value: "National ID", label: "National ID (Indangamuntu)", placeholder: "e.g. 1 1998 8 0012345 6 78" },
  { value: "Passport",    label: "Passport",                   placeholder: "e.g. PC1234567" },
  { value: "Driving Licence", label: "Driving Licence",        placeholder: "e.g. DL-RW-123456" },
];

export default function KycPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyPending, setAlreadyPending] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/kyc/my-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.request_status === "pending") setAlreadyPending(true); })
      .catch(() => {});
  }, [token]);

  const selectedDoc = DOC_TYPES.find((d) => d.value === docType);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!docType)          { setError("Please select a document type."); return; }
    if (!docNumber.trim()) { setError("Please enter your document number."); return; }
    setError(null);
    setLoading(true);
    try {
      await submitKyc(token, `${docType}: ${docNumber.trim()}`);
      setSubmitted(true);
    } catch (err) {
      if (err?.detail?.includes("pending")) {
        setAlreadyPending(true);
      } else {
        setError(err?.detail ?? "Submission failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  /* Already pending */
  if (alreadyPending) {
    return (
      <SidebarLayout>
        <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <ClockIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Verification under review</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-6">
            Your identity documents have been submitted. An admin will verify them shortly — you'll be notified when it's done.
          </p>
          <button onClick={() => navigate("/dashboard")}
            className="bg-orange-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </SidebarLayout>
    );
  }

  /* Success */
  if (submitted) {
    return (
      <SidebarLayout>
        <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submitted successfully</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-6">
            Your KYC request is under review. An admin will verify your identity shortly.
          </p>
          <button onClick={() => navigate("/dashboard")}
            className="bg-orange-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </SidebarLayout>
    );
  }

  /* Form */
  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900 space-y-4">

        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Identity Verification</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">Required by Rwandan financial regulations</p>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex gap-3">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Why we need this</p>
            <p>Rwanda law requires mobile money accounts to be linked to a verified national ID. Your information is handled securely and only reviewed by verified admins.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Document type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Document Type</label>
            <div className="space-y-2">
              {DOC_TYPES.map((d) => (
                <label
                  key={d.value}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    docType === d.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio" name="docType" value={d.value}
                    checked={docType === d.value}
                    onChange={() => { setDocType(d.value); setDocNumber(""); }}
                    className="accent-blue-600 shrink-0"
                  />
                  <DocumentIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Document number */}
          {docType && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {docType} Number
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder={selectedDoc?.placeholder}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Enter the ID number exactly as it appears on your document.</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !docType}
            className="w-full bg-blue-700 dark:bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-800 dark:hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "Submitting…" : "Submit for Verification"}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}
