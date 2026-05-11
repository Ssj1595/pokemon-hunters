/* global React */

const {
  useState: _useState,
  useEffect: _useEffect,
  useCallback: _useCallback
} = React;

const SESSION_KEY = "ph_admin_session_v2";
const RESET_KEY = "ph_admin_reset_v2";

/* -----------------------------
   SUPABASE
----------------------------- */

const SUPABASE_URL =
  "https://hordrkpxsfcnvfjbzzdb.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_v37mf5VzanKEEKB9RbxMMA_qvZQaUFZ";

const supabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

/* -----------------------------
   HASHING
----------------------------- */

async function sha256(str) {
  const buf = new TextEncoder().encode(str);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    buf
  );

  return Array.from(new Uint8Array(hash))
    .map((b) =>
      b.toString(16).padStart(2, "0")
    )
    .join("");
}

/* -----------------------------
   HELPERS
----------------------------- */

async function fetchAdmin(userId) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;

  return data;
}

async function fetchAllowedEmail(email) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("allowed_email", email)
    .single();

  if (error) return null;

  return data;
}

/* -----------------------------
   AUTH HOOK
----------------------------- */

window.useAdminAuth = function () {
  const [isAdmin, setIsAdmin] =
    _useState(false);

  const [ready, setReady] =
    _useState(false);

  _useEffect(() => {
    try {
      const session = JSON.parse(
        localStorage.getItem(
          SESSION_KEY
        ) || "null"
      );

      if (
        session &&
        session.loggedIn &&
        session.expires > Date.now()
      ) {
        setIsAdmin(true);
      }
    } catch {}

    setReady(true);
  }, []);

  /* LOGIN */

  const login = _useCallback(
    async (userId, password) => {
      const admin =
        await fetchAdmin(userId);

      if (!admin) {
        return {
          ok: false,
          error: "Invalid credentials"
        };
      }

      const hash =
        await sha256(password);

      if (hash !== admin.pass_hash) {
        return {
          ok: false,
          error: "Invalid credentials"
        };
      }

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          loggedIn: true,
          userId: admin.user_id,
          expires:
            Date.now() +
            1000 * 60 * 60 * 24 * 7
        })
      );

      setIsAdmin(true);

      return { ok: true };
    },
    []
  );

  /* LOGOUT */

  const logout = _useCallback(() => {
    localStorage.removeItem(
      SESSION_KEY
    );

    setIsAdmin(false);
  }, []);

  /* CHANGE PASSWORD */

  const changePassword =
    _useCallback(
      async (
        userId,
        current,
        next
      ) => {
        const admin =
          await fetchAdmin(userId);

        if (!admin) {
          return {
            ok: false,
            error: "Admin not found"
          };
        }

        const currentHash =
          await sha256(current);

        if (
          currentHash !==
          admin.pass_hash
        ) {
          return {
            ok: false,
            error:
              "Current password incorrect"
          };
        }

        const newHash =
          await sha256(next);

        const { error } =
          await supabase
            .from("admin_users")
            .update({
              pass_hash: newHash
            })
            .eq(
              "user_id",
              userId
            );

        if (error) {
          return {
            ok: false,
            error: error.message
          };
        }

        return { ok: true };
      },
      []
    );

  /* REQUEST RESET */

  const requestReset =
    _useCallback(async (email) => {
      const clean =
        email
          .trim()
          .toLowerCase();

      const allowed =
        await fetchAllowedEmail(
          clean
        );

      if (!allowed) {
        return {
          ok: false,
          error:
            "Email not authorised"
        };
      }

      const code = String(
        Math.floor(
          100000 +
            Math.random() *
              900000
        )
      );

      const codeHash =
        await sha256(code);

      localStorage.setItem(
        RESET_KEY,
        JSON.stringify({
          email: clean,
          codeHash,
          expires:
            Date.now() +
            1000 *
              60 *
              15
        })
      );

      return {
        ok: true,
        email: clean,
        code
      };
    }, []);

  /* COMPLETE RESET */

  const completeReset =
    _useCallback(
      async (
        email,
        code,
        newPass
      ) => {
        const ticket =
          JSON.parse(
            localStorage.getItem(
              RESET_KEY
            ) || "null"
          );

        if (!ticket) {
          return {
            ok: false,
            error:
              "No reset request"
          };
        }

        if (
          ticket.expires <
          Date.now()
        ) {
          return {
            ok: false,
            error:
              "Reset expired"
          };
        }

        const codeHash =
          await sha256(code);

        if (
          codeHash !==
          ticket.codeHash
        ) {
          return {
            ok: false,
            error:
              "Invalid code"
          };
        }

        const newHash =
          await sha256(
            newPass
          );

        const { error } =
          await supabase
            .from("admin_users")
            .update({
              pass_hash:
                newHash
            })
            .eq(
              "allowed_email",
              email
            );

        if (error) {
          return {
            ok: false,
            error:
              error.message
          };
        }

        localStorage.removeItem(
          RESET_KEY
        );

        return { ok: true };
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

/* -----------------------------
   UI HELPERS
----------------------------- */

function maskEmail(e) {
  const [u, d] = e.split("@");

  if (!u || !d) return e;

  return (
    u.slice(0, 2) +
    "••••@" +
    d
  );
}

/* -----------------------------
   ADMIN BADGE
----------------------------- */

window.AdminBadge =
  function ({
    auth,
    onOpenLogin,
    onOpenManage
  }) {
    if (!auth.ready)
      return null;

    if (!auth.isAdmin) {
      return (
        <button
          className="admin-badge"
          onClick={
            onOpenLogin
          }
        >
          🔐 ADMIN
        </button>
      );
    }

    return (
      <div
        className="admin-badge on"
        onClick={
          onOpenManage
        }
      >
        <span className="dot"></span>
        ADMIN
      </div>
    );
  };