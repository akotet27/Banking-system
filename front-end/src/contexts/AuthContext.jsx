import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getMe } from "../api/authApi";

const INACTIVITY_MS = 3 * 60 * 1000; // 3 minutes

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("ib_token"));
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const inactivityRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setNetworkError(false);
    getMe(token)
      .then((u) => { setUser(u); setNetworkError(false); })
      .catch((err) => {
        if (err._status === 401 || err._status === 403) {
          // Token is invalid or expired — clear it
          localStorage.removeItem("ib_token");
          setToken(null);
        } else {
          // Network error or other transient issue — keep token, show retry
          setNetworkError(true);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Inactivity auto-logout
  useEffect(() => {
    if (!token) return;

    function resetTimer() {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = setTimeout(() => {
        localStorage.removeItem("ib_token");
        setToken(null);
        setUser(null);
        setNetworkError(false);
      }, INACTIVITY_MS);
    }

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(inactivityRef.current);
    };
  }, [token]);

  function signIn(newToken, userData) {
    localStorage.setItem("ib_token", newToken);
    setToken(newToken);
    setUser(userData);
    setNetworkError(false);
  }

  function signOut() {
    clearTimeout(inactivityRef.current);
    localStorage.removeItem("ib_token");
    setToken(null);
    setUser(null);
    setNetworkError(false);
  }

  function retryConnection() {
    setLoading(true);
    setNetworkError(false);
    getMe(token)
      .then((u) => { setUser(u); setNetworkError(false); })
      .catch((err) => {
        if (err._status === 401 || err._status === 403) {
          localStorage.removeItem("ib_token");
          setToken(null);
        } else {
          setNetworkError(true);
        }
      })
      .finally(() => setLoading(false));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, networkError, signIn, signOut, retryConnection }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
