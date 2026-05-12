/* global React */
// Admin auth: login, change password, reset flow
// Note: this is a client-side prototype. Real password storage and email
// reset would require a backend. Passwords are hashed (SHA-256) and stored
// in localStorage; reset codes are generated locally and would be emailed
// from a server in production.
const { useState: _useState, useEffect: _useEffect, useCallback: _useCallback } = React;

const CREDS_KEY   = "ph_admin_creds_v2";
const SESSION_KEY = "ph_admin_session_v1";
const RESET_KEY   = "ph_admin_reset_v1";

const ALLOWED_EMAILS = Object.freeze([
  "ssjshantan@gmail.com",
  "nandiniananthabotla@gmail.com",
]);
const DEFAULT_USERID  = "SSJNJ";
const DEFAULT_PASS    = "973827";

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

function loadCreds() {
  try { return JSON.parse(localStorage.getItem(CREDS_KEY) || "null"); }
  catch { return null; }
}
async function ensureCreds() {
  let c = loadCreds();
  if (!c) {
    c = { userId: DEFAULT_USERID, passHash: await sha256(DEFAULT_PASS) };
    try { localStorage.setItem(CREDS_KEY, JSON.stringify(c)); } catch {}
  }
  return c;
}

window.ALLOWED_EMAILS = ALLOWED_EMAILS;

window.useAdminAuth = function() {
  const [isAdmin, setIsAdmin] = _useState(false);
  const [ready, setReady] = _useState(false);

  _useEffect(() => {
    (async () => {
      await ensureCreds();
      try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (s && s.loggedIn && (!s.expires || s.expires > Date.now())) {
          setIsAdmin(true);
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const login = _useCallback(async (userId, password) => {
    const c = await ensureCreds();
    const hash = await sha256(password);
    if (userId === c.userId && hash === c.passHash) {
      const session = { loggedIn: true, expires: Date.now() + 1000 * 60 * 60 * 24 * 7 };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
      setIsAdmin(true);
      return { ok: true };
    }
    return { ok: false, error: "Invalid credentials" };
  }, []);

  const logout = _useCallback(() => {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    setIsAdmin(false);
  }, []);

  const changePassword = _useCallback(async (current, next) => {
    const c = await ensureCreds();
    const curHash = await sha256(current);
    if (curHash !== c.passHash) return { ok: false, error: "Current password is incorrect" };
    if (!next || next.length < 4) return { ok: false, error: "New password must be at least 4 characters" };
    const newHash = await sha256(next);
    const updated = { ...c, passHash: newHash };
    try { localStorage.setItem(CREDS_KEY, JSON.stringify(updated)); } catch {}
    return { ok: true };
  }, []);

  const requestReset = _useCallback(async (email) => {
    const e = (email || "").trim().toLowerCase();
    if (!ALLOWED_EMAILS.includes(e)) {
      return { ok: false, error: "This email is not authorised for password resets." };
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code);
    const ticket = {
      email: e,
      codeHash,
      expires: Date.now() + 1000 * 60 * 15, // 15 min
    };
    try { localStorage.setItem(RESET_KEY, JSON.stringify(ticket)); } catch {}
    return { ok: true, email: e, code };
  }, []);

  const completeReset = _useCallback(async (email, code, newPass) => {
    let t = null;
    try { t = JSON.parse(localStorage.getItem(RESET_KEY) || "null"); } catch {}
    if (!t) return { ok: false, error: "No reset request found. Start again." };
    if (t.expires < Date.now()) return { ok: false, error: "Reset code expired. Start again." };
    if (t.email !== (email || "").trim().toLowerCase()) return { ok: false, error: "Email does not match request." };
    const codeHash = await sha256(code);
    if (codeHash !== t.codeHash) return { ok: false, error: "Incorrect reset code." };
    if (!newPass || newPass.length < 4) return { ok: false, error: "New password must be at least 4 characters." };
    const c = await ensureCreds();
    const newHash = await sha256(newPass);
    const updated = { ...c, passHash: newHash };
    try {
      localStorage.setItem(CREDS_KEY, JSON.stringify(updated));
      localStorage.removeItem(RESET_KEY);
    } catch {}
    return { ok: true };
  }, []);

  return { isAdmin, ready, login, logout, changePassword, requestReset, completeReset };
};

// ---------- UI ----------

function maskEmail(e) {
  const [u, d] = e.split("@");
  if (!u || !d) return e;
  const head = u.slice(0, 2);
  return head + "•".repeat(Math.max(2, u.length - 2)) + "@" + d;
}

window.AdminBadge = function AdminBadge({ auth, onOpenLogin, onOpenManage }) {
  if (!auth.ready) return null;
  if (!auth.isAdmin) {
    return (
      <button className="admin-badge" onClick={onOpenLogin} title="Admin login">
        🔐 ADMIN
      </button>
    );
  }
  return (
    <div className="admin-badge on" onClick={onOpenManage}>
      <span className="dot"></span> ADMIN
    </div>
  );
};

window.LoginModal = function LoginModal({ open, onClose, auth, onForgot }) {
  const [userId, setUserId] = _useState("");
  const [pass, setPass] = _useState("");
  const [err, setErr] = _useState("");
  const [busy, setBusy] = _useState(false);

  _useEffect(() => { if (!open) { setUserId(""); setPass(""); setErr(""); } }, [open]);
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await auth.login(userId.trim(), pass);
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else onClose();
  };

  return (
    <div className="ab-back" onClick={onClose}>
      <form className="ab-modal auth-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="ab-hdr">
          <h2>🔐 ADMIN LOGIN</h2>
          <button type="button" className="ab-x" onClick={onClose}>✕</button>
        </div>
        <div className="ab-body">
          <div className="auth-note">Restricted to SSJ &amp; NJ. Sighting-add controls unlock when signed in.</div>
          <label className="ab-row">
            <span>User ID</span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} autoFocus required />
          </label>
          <label className="ab-row">
            <span>Password</span>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
          </label>
          {err && <div className="auth-err">⚠ {err}</div>}
          <button type="button" className="auth-link" onClick={onForgot}>Forgot password?</button>
        </div>
        <div className="ab-foot">
          <button type="button" className="ab-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ab-btn primary" disabled={busy}>
            {busy ? "Checking…" : "✦ Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
};

window.ManageModal = function ManageModal({ open, onClose, auth }) {
  const [tab, setTab] = _useState("change");
  const [cur, setCur] = _useState("");
  const [next1, setNext1] = _useState("");
  const [next2, setNext2] = _useState("");
  const [msg, setMsg] = _useState("");
  const [err, setErr] = _useState("");

  _useEffect(() => { if (!open) { setCur(""); setNext1(""); setNext2(""); setMsg(""); setErr(""); setTab("change"); } }, [open]);
  if (!open) return null;

  const submitChange = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (next1 !== next2) { setErr("New passwords don't match"); return; }
    const r = await auth.changePassword(cur, next1);
    if (!r.ok) setErr(r.error);
    else { setMsg("✓ Password updated."); setCur(""); setNext1(""); setNext2(""); }
  };

  return (
    <div className="ab-back" onClick={onClose}>
      <div className="ab-modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ab-hdr">
          <h2>⚙ ADMIN PANEL</h2>
          <button type="button" className="ab-x" onClick={onClose}>✕</button>
        </div>
        <div className="auth-tabs">
          <button className={tab === "change" ? "on" : ""} onClick={() => setTab("change")}>Change password</button>
          <button className={tab === "info" ? "on" : ""} onClick={() => setTab("info")}>Account info</button>
        </div>
        {tab === "change" && (
          <form className="ab-body" onSubmit={submitChange}>
            <label className="ab-row">
              <span>Current password</span>
              <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required />
            </label>
            <label className="ab-row">
              <span>New password</span>
              <input type="password" value={next1} onChange={(e) => setNext1(e.target.value)} required minLength={4} />
            </label>
            <label className="ab-row">
              <span>Confirm new password</span>
              <input type="password" value={next2} onChange={(e) => setNext2(e.target.value)} required minLength={4} />
            </label>
            {err && <div className="auth-err">⚠ {err}</div>}
            {msg && <div className="auth-ok">{msg}</div>}
            <div className="ab-foot inline">
              <button type="button" className="ab-btn ghost" onClick={() => auth.logout() || onClose()}>Sign out</button>
              <button type="submit" className="ab-btn primary">Update password</button>
            </div>
          </form>
        )}
        {tab === "info" && (
          <div className="ab-body">
            <div className="ab-row">
              <span>User ID</span>
              <div className="auth-static">SSJNJ</div>
            </div>
            <div className="ab-row">
              <span>Authorised emails</span>
              {ALLOWED_EMAILS.map(e => (
                <div key={e} className="auth-static small">📧 {e}</div>
              ))}
            </div>
            <div className="auth-note small">
              Password resets only deliver to these two addresses. To change the address list,
              edit <code>ALLOWED_EMAILS</code> in <code>auth.jsx</code>.
            </div>
            <div className="ab-foot inline" style={{ paddingInline: 0 }}>
              <button type="button" className="ab-btn ghost" onClick={() => { auth.logout(); onClose(); }}>Sign out</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.ResetModal = function ResetModal({ open, onClose, auth }) {
  const [step, setStep] = _useState(1); // 1: email, 2: code+new pass
  const [email, setEmail] = _useState("");
  const [code, setCode] = _useState("");
  const [newPass, setNewPass] = _useState("");
  const [newPass2, setNewPass2] = _useState("");
  const [err, setErr] = _useState("");
  const [msg, setMsg] = _useState("");
  const [demoCode, setDemoCode] = _useState("");
  const [busy, setBusy] = _useState(false);

  _useEffect(() => {
    if (!open) {
      setStep(1); setEmail(""); setCode(""); setNewPass(""); setNewPass2("");
      setErr(""); setMsg(""); setDemoCode(""); setBusy(false);
    }
  }, [open]);
  if (!open) return null;

  const submitEmail = async (e) => {
    e.preventDefault();
    setErr(""); setMsg(""); setBusy(true);
    const r = await auth.requestReset(email);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setDemoCode(r.code);
    setMsg(`A 6-digit reset code would be emailed to ${maskEmail(r.email)}.`);
    setStep(2);
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (newPass !== newPass2) { setErr("New passwords don't match"); return; }
    setBusy(true);
    const r = await auth.completeReset(email, code, newPass);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setMsg("✓ Password reset. You can now sign in.");
    setTimeout(onClose, 1400);
  };

  return (
    <div className="ab-back" onClick={onClose}>
      <div className="ab-modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ab-hdr">
          <h2>🔑 RESET PASSWORD</h2>
          <button type="button" className="ab-x" onClick={onClose}>✕</button>
        </div>
        {step === 1 && (
          <form className="ab-body" onSubmit={submitEmail}>
            <div className="auth-note">
              Enter the admin email. Resets are only sent to authorised addresses
              ({ALLOWED_EMAILS.map(maskEmail).join(" / ")}).
            </div>
            <label className="ab-row">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </label>
            {err && <div className="auth-err">⚠ {err}</div>}
            <div className="ab-foot inline">
              <button type="button" className="ab-btn ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="ab-btn primary" disabled={busy}>
                {busy ? "Sending…" : "Send reset code"}
              </button>
            </div>
          </form>
        )}
        {step === 2 && (
          <form className="ab-body" onSubmit={submitReset}>
            {msg && <div className="auth-ok">{msg}</div>}
            <div className="auth-demo">
              <span className="auth-demo-tag">PROTOTYPE</span>
              This static page can't actually send email. In production a server would email{" "}
              <strong>{maskEmail(email)}</strong>. For testing, your code is:
              <div className="auth-code">{demoCode}</div>
            </div>
            <label className="ab-row">
              <span>Reset code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} />
            </label>
            <label className="ab-row">
              <span>New password</span>
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required minLength={4} />
            </label>
            <label className="ab-row">
              <span>Confirm new password</span>
              <input type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} required minLength={4} />
            </label>
            {err && <div className="auth-err">⚠ {err}</div>}
            <div className="ab-foot inline">
              <button type="button" className="ab-btn ghost" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="ab-btn primary" disabled={busy}>Set new password</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
