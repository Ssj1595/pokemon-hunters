/* global React */

const { useState: _useState, useEffect: _useEffect, useCallback: _useCallback } = React;

const SUPABASE_URL = "https://hordrkpxsfcnvfjbzzdb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_v37mf5VzanKEEKB9RbxMMA_qvZQaUFZ";

const SESSION_KEY = "ph_admin_session_v2";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function dbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Database request failed");
  }

  if (res.status === 204) return null;

  return res.json();
}

// --------------------------------------------------
// Auth Hook
// --------------------------------------------------

window.useAdminAuth = function () {
  const [isAdmin, setIsAdmin] = _useState(false);
  const [ready, setReady] = _useState(false);

  _useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

      if (s && s.loggedIn && (!s.expires || s.expires > Date.now())) {
        setIsAdmin(true);
      }
    } catch {}

    setReady(true);
  }, []);

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const login = _useCallback(async (userId, password) => {
    try {
      const rows = await dbFetch(
        `admin_users?user_id=eq.${encodeURIComponent(userId)}&select=*`
      );

      if (!rows || !rows.length) {
        return {
          ok: false,
          error: "User not found",
        };
      }

      const user = rows[0];

      const hash = await sha256(password);

      if (hash !== user.password_hash) {
        return {
          ok: false,
          error: "Invalid password",
        };
      }

      const session = {
        loggedIn: true,
        userId,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setIsAdmin(true);

      return { ok: true };
    } catch (err) {
      console.error(err);

      return {
        ok: false,
        error: "Login failed",
      };
    }
  }, []);

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const logout = _useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  }, []);

  // --------------------------------------------------
  // CHANGE PASSWORD
  // --------------------------------------------------

  const changePassword = _useCallback(async (current, next) => {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

      if (!session?.userId) {
        return {
          ok: false,
          error: "No active session",
        };
      }

      const rows = await dbFetch(
        `admin_users?user_id=eq.${encodeURIComponent(session.userId)}&select=*`
      );

      if (!rows || !rows.length) {
        return {
          ok: false,
          error: "User not found",
        };
      }

      const user = rows[0];

      const curHash = await sha256(current);

      if (curHash !== user.password_hash) {
        return {
          ok: false,
          error: "Current password incorrect",
        };
      }

      const newHash = await sha256(next);

      await dbFetch(`admin_users?id=eq.${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          password_hash: newHash,
        }),
      });

      return { ok: true };
    } catch (err) {
      console.error(err);

      return {
        ok: false,
        error: "Password update failed",
      };
    }
  }, []);

  // --------------------------------------------------
  // PASSWORD RESET
  // --------------------------------------------------

  const requestReset = _useCallback(async (email) => {
    try {
      const rows = await dbFetch(
        `admin_users?email=eq.${encodeURIComponent(email)}&select=*`
      );

      if (!rows || !rows.length) {
        return {
          ok: false,
          error: "Email not found",
        };
      }

      return {
        ok: true,
      };
    } catch (err) {
      console.error(err);

      return {
        ok: false,
        error: "Reset request failed",
      };
    }
  }, []);

  const completeReset = _useCallback(async (email, code, newPass) => {
    return {
      ok: false,
      error: "Implement email reset flow using Supabase Auth later",
    };
  }, []);

  return {
    isAdmin,
    ready,
    login,
    logout,
    changePassword,
    requestReset,
    completeReset,
  };
};

// --------------------------------------------------
// UI COMPONENTS
// --------------------------------------------------

window.AdminAuthModal = function AdminAuthModal({
  open,
  onClose,
  auth,
}) {
  const [userId, setUserId] = _useState("");
  const [password, setPassword] = _useState("");
  const [error, setError] = _useState("");
  const [loading, setLoading] = _useState(false);

  if (!open) return null;

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const res = await auth.login(userId, password);

    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Login failed");
      return;
    }

    onClose();
  }

  return (
    <div className="ab-back">
      <div className="ab-modal auth-modal">
        <div className="ab-hdr">
          <h2>ADMIN LOGIN</h2>

          <button className="ab-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="ab-body" onSubmit={handleLogin}>
          <div className="ab-row">
            <span>User ID</span>

            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className="ab-row">
            <span>Password</span>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="auth-err">{error}</div>}

          <button className="savebtn" type="submit" disabled={loading}>
            {loading ? "Loading..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};
