/* global React */
// Admin auth: login, change password, reset flow
// Note: this is a client-side prototype. Real password storage and email
// reset would require a backend. Passwords are hashed (SHA-256) and stored
// in localStorage; reset codes are generated locally and would be emailed
// from a server in production.
const {
  useState: _useState,
  useEffect: _useEffect,
  useCallback: _useCallback
} = React;

const SESSION_KEY = "ph_admin_session_v2";
const RESET_KEY = "ph_admin_reset_v2";

// ----------------------------
// SUPABASE
// ----------------------------

const SUPABASE_URL = "https://hordrkpxsfcnvfjbzzdb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_v37mf5VzanKEEKB9RbxMMA_qvZQaUFZ";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ----------------------------
// HASHING
// ----------------------------

async function sha256(str) {
  const buf = new TextEncoder().encode(str);

  const hash = await crypto.subtle.digest("SHA-256", buf);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ----------------------------
// SUPABASE HELPERS
// ----------------------------

async function fetchAdmin(userId) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

async function fetchAllowedEmail(email) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, allowed_email")
    .eq("allowed_email", email)
    .single();

  if (error) return null;

  return data;
}

async function updatePasswordByUserId(userId, newPassword) {
  const newHash = await sha256(newPassword);

  const { error } = await supabase
    .from("admin_users")
    .update({
      pass_hash: newHash
    })
    .eq("user_id", userId);

  if (error) {
    console.error(error);
    return {
      ok: false,
      error: error.message
    };
  }

  return { ok: true };
}

async function updatePasswordByEmail(email, newPassword) {
  const newHash = await sha256(newPassword);

  const { error } = await supabase
    .from("admin_users")
    .update({
      pass_hash: newHash
    })
    .eq("allowed_email", email);

  if (error) {
    console.error(error);

    return {
      ok: false,
      error: error.message
    };
  }

  return { ok: true };
}

// ----------------------------
// AUTH HOOK
// ----------------------------

window.useAdminAuth = function () {
  const [isAdmin, setIsAdmin] = _useState(false);
  const [ready, setReady] = _useState(false);

  _useEffect(() => {
    try {
      const session = JSON.parse(
        localStorage.getItem(SESSION_KEY) || "null"
      );

      if (
        session &&
        session.loggedIn &&
        (!session.expires || session.expires > Date.now())
      ) {
        setIsAdmin(true);
      }
    } catch {}

    setReady(true);
  }, []);

  // ----------------------------
  // LOGIN
  // ----------------------------

  const login = _useCallback(async (userId, password) => {
    const admin = await fetchAdmin(userId);

    if (!admin) {
      return {
        ok: false,
        error: "Invalid credentials"
      };
    }

    const hash = await sha256(password);

    if (hash !== admin.pass_hash) {
      return {
        ok: false,
        error: "Invalid credentials"
      };
    }

    const session = {
      loggedIn: true,
      userId: admin.user_id,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7
    };

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(session)
    );

    setIsAdmin(true);

    return { ok: true };
  }, []);

  // ----------------------------
  // LOGOUT
  // ----------------------------

  const logout = _useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  }, []);

  // ----------------------------
  // CHANGE PASSWORD
  // ----------------------------

  const changePassword = _useCallback(
    async (userId, current, next) => {
      const admin = await fetchAdmin(userId);

      if (!admin) {
        return {
          ok: false,
          error: "Admin not found"
        };
      }

      const currentHash = await sha256(current);

      if (currentHash !== admin.pass_hash) {
        return {
          ok: false,
          error: "Current password incorrect"
        };
      }

      if (!next || next.length < 4) {
        return {
          ok: false,
          error: "Password must be at least 4 characters"
        };
      }

      return await updatePasswordByUserId(userId, next);
    },
    []
  );

  // ----------------------------
  // REQUEST RESET
  // ----------------------------

  const requestReset = _useCallback(async (email) => {
    const cleanEmail = (email || "")
      .trim()
      .toLowerCase();

    const allowed = await fetchAllowedEmail(cleanEmail);

    if (!allowed) {
      return {
        ok: false,
        error: "Email not authorised"
      };
    }

    const code = String(
      Math.floor(100000 + Math.random() * 900000)
    );

    const codeHash = await sha256(code);

    const ticket = {
      email: cleanEmail,
      codeHash,
      expires: Date.now() + 1000 * 60 * 15
    };

    localStorage.setItem(
      RESET_KEY,
      JSON.stringify(ticket)
    );

    return {
      ok: true,
      email: cleanEmail,
      code
    };
  }, []);

  // ----------------------------
  // COMPLETE RESET
  // ----------------------------

  const completeReset = _useCallback(
    async (email, code, newPass) => {
      let ticket = null;

      try {
        ticket = JSON.parse(
          localStorage.getItem(RESET_KEY) || "null"
        );
      } catch {}

      if (!ticket) {
        return {
          ok: false,
          error: "No reset request found"
        };
      }

      if (ticket.expires < Date.now()) {
        return {
          ok: false,
          error: "Reset code expired"
        };
      }

      if (
        ticket.email !==
        (email || "").trim().toLowerCase()
      ) {
        return {
          ok: false,
          error: "Email mismatch"
        };
      }

      const codeHash = await sha256(code);

      if (codeHash !== ticket.codeHash) {
        return {
          ok: false,
          error: "Invalid reset code"
        };
      }

      if (!newPass || newPass.length < 4) {
        return {
          ok: false,
          error: "Password must be at least 4 characters"
        };
      }

      const result = await updatePasswordByEmail(
        email,
        newPass
      );

      if (!result.ok) {
        return result;
      }

      localStorage.removeItem(RESET_KEY);

      return {
        ok: true
      };
    },
    []
  );

  return {
    isAdmin,
    ready,
    login,
    logout,
    changePassword,
    requestReset,
    completeReset
  };
};