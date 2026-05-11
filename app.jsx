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
  }, []);

  /* -------------------------
     MAIN UI
  ------------------------- */

  return (

    <div className="app-shell dark-mode">

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
          WEBSITE CONTENT
      ------------------------- */}

      <header className="hero">

        <h1 className="hero-title">
          Pokémon Hunters
        </h1>

        <p className="hero-subtitle">
          SSJ & NJ · Bird Life List
        </p>

      </header>

      <main className="main-content">

        <section className="glass-card">

          <h2>
            Welcome
          </h2>

          <p>
            Your Pokémon bird tracking
            system is now connected to:
          </p>

          <ul>
            <li>
              GitHub Pages
            </li>

            <li>
              Custom domain
            </li>

            <li>
              Supabase auth
            </li>

            <li>
              Permanent dark mode
            </li>
          </ul>

        </section>

      </main>

    </div>
  );
}

/* -------------------------
   RENDER APP
------------------------- */

ReactDOM
  .createRoot(
    document.getElementById("root")
  )
  .render(<App />);