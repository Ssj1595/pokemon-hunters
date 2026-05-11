/* global React */

const {
  useState: _useState,
  useEffect: _useEffect,
  useCallback: _useCallback,
} = React;

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

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
// AUTH HOOK
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
    } catch (err) {
      console.error(err);
    }

    setReady(true);
  }, []);

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

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          loggedIn: true,
          userId,
          expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        })
      );

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

  const logout = _useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  }, []);

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

  return {
    isAdmin,
    ready,
    login,
    logout,
    changePassword,
  };
};

// --------------------------------------------------
// ADMIN BUTTON
// --------------------------------------------------

window.AdminBadge = function AdminBadge({
  auth,
  onOpenLogin,
  onOpenManage,
}) {
  if (!auth?.ready) return null;

  return (
    <button
      className={`admin-badge ${auth.isAdmin ? "on" : ""}`}
      onClick={() => {
        if (auth.isAdmin) {
          onOpenManage();
        } else {
          onOpenLogin();
        }
      }}
      title={auth.isAdmin ? "Admin Panel" : "Admin Login"}
    >
      {auth.isAdmin && <span className="dot"></span>}

      {auth.isAdmin ? "ADMIN ACTIVE" : "ADMIN"}
    </button>
  );
};

// --------------------------------------------------
// LOGIN MODAL
// --------------------------------------------------

window.LoginModal = function LoginModal({
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

// --------------------------------------------------
// MANAGE MODAL
// --------------------------------------------------

window.ManageModal = function ManageModal({
  open,
  onClose,
  auth,
}) {
  const [current, setCurrent] = _useState("");
  const [next, setNext] = _useState("");
  const [msg, setMsg] = _useState("");
  const [err, setErr] = _useState("");

  if (!open || !auth?.isAdmin) return null;

  async function handlePassword(e) {
    e.preventDefault();

    setErr("");
    setMsg("");

    const res = await auth.changePassword(current, next);

    if (!res.ok) {
      setErr(res.error || "Failed");
      return;
    }

    setMsg("Password updated successfully");

    setCurrent("");
    setNext("");
  }

  return (
    <div className="ab-back">
      <div className="ab-modal auth-modal">
        <div className="ab-hdr">
          <h2>ADMIN PANEL</h2>

          <button className="ab-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ab-body">
          <button
            className="savebtn"
            onClick={() => {
              auth.logout();
              onClose();
            }}
          >
            Logout
          </button>

          <form onSubmit={handlePassword} className="ab-row">
            <span>Current Password</span>

            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />

            <span>New Password</span>

            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />

            {msg && <div className="auth-note">{msg}</div>}

            {err && <div className="auth-err">{err}</div>}

            <button className="savebtn" type="submit">
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------
// RESET MODAL PLACEHOLDER
// --------------------------------------------------

window.ResetModal = function ResetModal({
  open,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="ab-back">
      <div className="ab-modal auth-modal">
        <div className="ab-hdr">
          <h2>PASSWORD RESET</h2>

          <button className="ab-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ab-body">
          <div className="auth-note">
            Password reset flow is not implemented yet.
          </div>
        </div>
      </div>
    </div>
  );
};
