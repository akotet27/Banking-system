import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import SendMoneyPage from "./pages/SendMoneyPage";
import PayMerchantPage from "./pages/PayMerchantPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import CashInPage from "./pages/CashInPage";
import CashOutPage from "./pages/CashOutPage";
import AgentDashboardPage from "./pages/AgentDashboardPage";
import AgentCommissionPage from "./pages/AgentCommissionPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminApprovalsPage from "./pages/AdminApprovalsPage";
import AdminFeeRulesPage from "./pages/AdminFeeRulesPage";
import AdminAuditLogPage from "./pages/AdminAuditLogPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import KycPage from "./pages/KycPage";
import LandingPage from "./pages/LandingPage";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NetworkErrorScreen() {
  const { retryConnection, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="font-bold text-slate-900 dark:text-white">Cannot reach server</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Make sure the backend is running, then retry.</p>
        <button onClick={retryConnection}
          className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-xl hover:bg-orange-600">
          Retry
        </button>
        <button onClick={signOut} className="w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700">
          Sign out
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, token, loading, networkError } = useAuth();
  if (loading) return <Spinner />;
  if (networkError && token) return <NetworkErrorScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "agent") return <Navigate to="/agent" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RoleHome() {
  const { user, loading, networkError, token } = useAuth();
  if (loading) return <Spinner />;
  if (networkError && token) return <NetworkErrorScreen />;
  if (!user) return <LandingPage />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "agent") return <Navigate to="/agent" replace />;
  return <Navigate to="/dashboard" replace />;
}

const customer = ["customer", "merchant"];
const agent    = ["agent"];
const admin    = ["admin"];

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/admin-login"     element={<AdminLoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Role redirect */}
            <Route path="/" element={<RoleHome />} />

            {/* Customer / Merchant */}
            <Route path="/dashboard" element={<ProtectedRoute roles={customer}><DashboardPage /></ProtectedRoute>} />
            <Route path="/send"      element={<ProtectedRoute roles={customer}><SendMoneyPage /></ProtectedRoute>} />
            <Route path="/pay"       element={<ProtectedRoute roles={customer}><PayMerchantPage /></ProtectedRoute>} />
            <Route path="/history"   element={<ProtectedRoute roles={customer}><HistoryPage /></ProtectedRoute>} />
            <Route path="/profile"   element={<ProtectedRoute roles={customer}><ProfilePage /></ProtectedRoute>} />
            <Route path="/kyc"       element={<ProtectedRoute roles={customer}><KycPage /></ProtectedRoute>} />

            {/* Agent */}
            <Route path="/agent"      element={<ProtectedRoute roles={agent}><AgentDashboardPage /></ProtectedRoute>} />
            <Route path="/cash-in"    element={<ProtectedRoute roles={agent}><CashInPage /></ProtectedRoute>} />
            <Route path="/cashout"    element={<ProtectedRoute roles={agent}><CashOutPage /></ProtectedRoute>} />
            <Route path="/commission" element={<ProtectedRoute roles={agent}><AgentCommissionPage /></ProtectedRoute>} />
            <Route path="/kyc-review" element={<ProtectedRoute roles={agent}><KycPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin"            element={<ProtectedRoute roles={admin}><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/approvals"  element={<ProtectedRoute roles={admin}><AdminApprovalsPage /></ProtectedRoute>} />
            <Route path="/admin/fee-rules"  element={<ProtectedRoute roles={admin}><AdminFeeRulesPage /></ProtectedRoute>} />
            <Route path="/admin/audit-log"  element={<ProtectedRoute roles={admin}><AdminAuditLogPage /></ProtectedRoute>} />
            <Route path="/admin/users"      element={<ProtectedRoute roles={admin}><AdminUsersPage /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
