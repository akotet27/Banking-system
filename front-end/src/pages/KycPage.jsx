import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { useAuth } from "../contexts/AuthContext";
import { ShieldCheckIcon, DocumentIcon, CheckCircleIcon, ClockIcon } from "../components/Icons";

import { API_BASE as BASE } from "../api/base.js";

async function apiPost(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

async function apiGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

const DOC_TYPES = [
  { value: "National ID",      label: "National ID (Indangamuntu)", placeholder: "e.g. 1 1998 8 0012345 6 78" },
  { value: "Passport",         label: "Passport",                   placeholder: "e.g. PC1234567" },
  { value: "Driving Licence",  label: "Driving Licence",            placeholder: "e.g. DL-RW-123456" },
];

/* ─── Agent: review pending KYC requests ──────────────────────────────────── */
function AgentKycReview() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    apiGet("/kyc/pending", token)
      .then(setRequests)
      .catch(() => setError("Failed to load pending requests."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  async function handleReview(id, status) {
    setActionLoading(id + status);
    setError(null);
    try {
      await apiPost("/kyc/review", token, { kyc_request_id: id, status });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err?.detail ?? "Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900 space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">KYC Review Queue</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">Pending identity verification requests</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center">
            <CheckCircleIcon className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 dark:text-white">All caught up!</p>
            <p className="text-slate-400 text-sm mt-1">No pending KYC requests right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                {/* Customer info */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400 font-bold text-sm">
                    {(r.customer_name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{r.customer_name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-400">{r.customer_phone}</p>
                    {r.customer_dob && (
                      <p className="text-xs text-slate-400">DOB: {r.customer_dob}</p>
                    )}
                    {r.customer_location && (
                      <p className="text-xs text-slate-400">Location: {r.customer_location}</p>
                    )}
                  </div>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold px-2 py-1 rounded-full shrink-0">
                    PENDING
                  </span>
                </div>

                {/* Document ref */}
                {r.id_document_ref && (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                    <DocumentIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{r.id_document_ref}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(r.id, "verified")}
                    disabled={!!actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === r.id + "verified" ? "Approving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReview(r.id, "rejected")}
                    disabled={!!actionLoading}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === r.id + "rejected" ? "Rejecting…" : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_MB = 5;

/* ─── Customer / Merchant: submit KYC ────────────────────────────────────── */
function CustomerKycSubmit() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyPending, setAlreadyPending] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    apiGet("/kyc/my-status", token)
      .then(d => { if (d.request_status === "pending") setAlreadyPending(true); })
      .catch(() => {});
  }, [token]);

  const selectedDoc = DOC_TYPES.find(d => d.value === docType);

  function pickFile(f) {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Only JPG, PNG, WEBP, or PDF files are allowed.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    setError(null);
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!docType)          { setError("Please select a document type."); return; }
    if (!docNumber.trim()) { setError("Please enter your document number."); return; }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("id_document_ref", `${docType}: ${docNumber.trim()}`);
      if (file) fd.append("document_file", file);

      const res = await fetch(`${BASE}/kyc/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw data;
      setSubmitted(true);
    } catch (err) {
      if (err?.detail?.includes("pending")) setAlreadyPending(true);
      else setError(err?.detail ?? "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (alreadyPending) {
    return (
      <SidebarLayout>
        <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <ClockIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Verification under review</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-6">
            Your identity documents have been submitted. An admin will verify them shortly.
          </p>
          <button onClick={() => navigate("/dashboard")}
            className="bg-orange-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600">
            Back to Dashboard
          </button>
        </div>
      </SidebarLayout>
    );
  }

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
            className="bg-orange-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600">
            Back to Dashboard
          </button>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="w-full min-h-full px-4 py-5 md:px-8 md:py-7 bg-slate-50 dark:bg-slate-900 space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">Identity Verification</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">Required by Rwandan financial regulations</p>
        </div>

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

          {/* Document type selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Document Type</label>
            <div className="space-y-2">
              {DOC_TYPES.map(d => (
                <label key={d.value}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    docType === d.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}>
                  <input type="radio" name="docType" value={d.value}
                    checked={docType === d.value}
                    onChange={() => { setDocType(d.value); setDocNumber(""); }}
                    className="accent-blue-600 shrink-0" />
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
              <input type="text" value={docNumber}
                onChange={e => setDocNumber(e.target.value)}
                placeholder={selectedDoc?.placeholder}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Enter the ID number exactly as it appears on your document.</p>
            </div>
          )}

          {/* File upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Upload Document <span className="font-normal text-slate-400">(optional — JPG, PNG, PDF, max 5 MB)</span>
            </label>

            {file ? (
              /* File selected — show preview / info */
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="w-14 h-14 rounded-lg object-cover shrink-0 border border-emerald-200 dark:border-emerald-700"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <DocumentIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              /* Drop zone */
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  dragOver
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Drop your document here
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    or <span className="text-blue-600 dark:text-blue-400 font-semibold">click to browse</span>
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={e => pickFile(e.target.files[0])}
            />
          </div>

          <button type="button" onClick={handleSubmit}
            disabled={loading || !docType}
            className="w-full bg-blue-700 dark:bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-800 disabled:opacity-40 transition-colors">
            {loading ? "Submitting…" : "Submit for Verification"}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}

/* ─── Router ──────────────────────────────────────────────────────────────── */
export default function KycPage() {
  const { user } = useAuth();
  if (user?.role === "agent" || user?.role === "admin") return <AgentKycReview />;
  return <CustomerKycSubmit />;
}
