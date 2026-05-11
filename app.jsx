/* global React, ReactDOM */

const {
  useState,
  useEffect
} = React;

const {
  AdminBadge,
  LoginModal,
  ManageModal,
  ResetModal,
  useAdminAuth
} = window;

function App() {

  /* -------------------------
     ADMIN AUTH
  ------------------------- */

  const auth = useAdminAuth();

  const [loginOpen, setLoginOpen] =
    useState(false);

  const [manageOpen, setManageOpen] =
    useState(false);

  const [resetOpen, setResetOpen] =
    useState(false);

  /* -------------------------
     FORCE DARK MODE
  ------------------------- */

  useEffect(() => {

    document.documentElement.setAttribute(
      "data-theme",
      "dark"
    );

    document.body.classList.add(
      "dark-mode"
    );

  }, []);

  /* -------------------------
     MAIN UI
  ------------------------- */

  return (

    <div className="app-shell">

      {/* -------------------------
          ADMIN BUTTON
      ------------------------- */}

      <AdminBadge
        auth={auth}
        onOpenLogin={() =>
          setLoginOpen(true)
        }
        onOpenManage={() =>
          setManageOpen(true)
        }
      />

      {/* -------------------------
          LOGIN MODAL
      ------------------------- */}

      <LoginModal
        open={loginOpen}
        onClose={() =>
          setLoginOpen(false)
        }
        auth={auth}
        onForgot={() => {
          setLoginOpen(false);
          setResetOpen(true);
        }}
      />

      {/* -------------------------
          MANAGE MODAL
      ------------------------- */}

      <ManageModal
        open={manageOpen}
        onClose={() =>
          setManageOpen(false)
        }
        auth={auth}
      />

      {/* -------------------------
          RESET MODAL
      ------------------------- */}

      <ResetModal
        open={resetOpen}
        onClose={() =>
          setResetOpen(false)
        }
        auth={auth}
      />

      {/* -------------------------
          HERO
      ------------------------- */}

      <header className="hero-section">

        <div className="hero-content">

          <h1 className="hero-title">
            Pokémon Hunters
          </h1>

          <p className="hero-subtitle">
            SSJ & NJ · Bird Life List
          </p>

        </div>

      </header>

      {/* -------------------------
          MAIN CONTENT
      ------------------------- */}

      <main className="main-content">

        <section className="glass-card">

          <h2>
            Dark Mode Enabled
          </h2>

          <p>
            The website now permanently
            stays in dark mode.
          </p>

          <ul className="feature-list">

            <li>
              GitHub Pages connected
            </li>

            <li>
              Custom domain active
            </li>

            <li>
              Supabase authentication active
            </li>

            <li>
              Admin login restored
            </li>

          </ul>

        </section>

      </main>

    </div>
  );
}

/* -------------------------
   RENDER
------------------------- */

ReactDOM
  .createRoot(
    document.getElementById("root")
  )
  .render(<App />);