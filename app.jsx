/* global React, ReactDOM, BIRD_DATA, HABITAT_META, BEHAVIOR_META, REGION_META, BIRD_IMAGES */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroTitle": "Pokémon Hunters\n",
  "heroSubtitle": "SSJ & NJ SPOTTING 'EM ALL!!",
  "tagline": "\n",
  "holoIntensity": 0.55,
  "tiltStrength": 10,
  "showShimmer": true
} /*EDITMODE-END*/;

const STORAGE_KEY = "ph_uploaded_images_v1";
const THEME_KEY = "ph_theme_v1";

function useUploads() {
  const [uploads, setUploads] = useState(() => {
    try {return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");}
    catch {return {};}
  });
  const set = useCallback((num, dataUrl) => {
    setUploads((prev) => {
      const next = { ...prev, [num]: dataUrl };
      try {localStorage.setItem(STORAGE_KEY, JSON.stringify(next));} catch {}
      return next;
    });
  }, []);
  const remove = useCallback((num) => {
    setUploads((prev) => {
      const next = { ...prev };delete next[num];
      try {localStorage.setItem(STORAGE_KEY, JSON.stringify(next));} catch {}
      return next;
    });
  }, []);
  return [uploads, set, remove];
}

function Badge({ kind, value }) {
  let emoji = "";
  if (kind === "habitat") emoji = HABITAT_META[value]?.emoji;else
  if (kind === "behavior") emoji = BEHAVIOR_META[value]?.emoji;else
  if (kind === "region") emoji = REGION_META[value]?.emoji;
  return (
    <span className="badge">
      <span className="e">{emoji}</span>
      <span>{value}</span>
    </span>);

}

function CardPhoto({ bird, uploaded, onUpload, onClear }) {
  const [stockBroken, setStockBroken] = useState(false);
  const fileRef = useRef(null);
  const handlePick = (e) => {
    e.stopPropagation();
    fileRef.current?.click();
  };
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(String(reader.result));
    reader.readAsDataURL(f);
    e.target.value = "";
  };
  const stockUrl = BIRD_IMAGES[bird.num];
  const showImage = uploaded || stockUrl && !stockBroken;
  return (
    <div className="photo">
      {showImage ?
      <img
        src={uploaded || stockUrl}
        alt={bird.name}
        loading="lazy"
        onError={() => !uploaded && setStockBroken(true)} /> :


      <div className="placeholder" aria-hidden="true">
          {HABITAT_META[bird.habitat]?.emoji || "🪶"}
          <small>{bird.name}</small>
        </div>
      }

      {/* Edit button (only when uploaded) */}
      {uploaded &&
      <button className="editbtn" title="Re-upload" onClick={handlePick}>✎</button>
      }

      {/* Bottom-right indicator */}
      {uploaded ?
      <button
        className="imgtag original"
        title="Original photo by SSJ"
        onClick={(e) => {e.stopPropagation();onClear();}}>
        ✨ Original by SSJ</button> :

      <button
        className="imgtag"
        title="Upload your own"
        onClick={handlePick}>
        📷 Stock — upload</button>
      }

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile} />
      
    </div>);

}

function BirdCard({ bird, uploaded, onUpload, onClear, onDelete, tweaks, index }) {
  const [flipped, setFlipped] = useState(false);
  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const habMeta = HABITAT_META[bird.habitat] || {};

  // 3D parallax tilt
  useEffect(() => {
    const wrap = wrapRef.current;const card = cardRef.current;
    if (!wrap || !card) return;
    const strength = tweaks.tiltStrength || 0;
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--rx", `${(-y * strength).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(x * strength).toFixed(2)}deg`);
    };
    const onLeave = () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    };
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [tweaks.tiltStrength]);

  const style = {
    "--grad": habMeta.grad,
    "--accent": habMeta.accent,
    animationDelay: `${Math.min(index, 20) * 30}ms`
  };
  const numStr = String(bird.num).padStart(3, "0");
  return (
    <div className="card-wrap" ref={wrapRef} style={style}>
      <div
        ref={cardRef}
        className={`card ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}>
        
        {/* FRONT */}
        <div className="face front">
          <div className="inner">
            <div className="cardhdr">
              <h3 className="cardname">{bird.name}</h3>
              <span className={`collno ${bird.custom ? "custom" : ""}`}>#{numStr}{bird.custom ? " ✦NEW" : "/071"}</span>
              {onDelete && (
                <button className="delbtn" title="Remove sighting"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${bird.name}?`)) onDelete(); }}>🗑</button>
              )}
            </div>
            <div className="badges">
              <Badge kind="habitat" value={bird.habitat} />
              <Badge kind="behavior" value={bird.behavior} />
              <Badge kind="region" value={bird.region} />
            </div>
            <CardPhoto
              bird={bird}
              uploaded={uploaded}
              onUpload={(url) => onUpload(bird.num, url)}
              onClear={() => onClear(bird.num)} />
            
            <div className="cardfoot">
              <span className="where" title={bird.loc}>📍 {bird.loc.split(",")[0]}</span>
              <span>{bird.date}</span>
            </div>
            {tweaks.showShimmer &&
            <>
                <div className="holo" style={{ opacity: 0 }}></div>
                <div className="shine"></div>
              </>
            }
          </div>
        </div>

        {/* BACK */}
        <div className="face back">
          <div className="inner">
            <h3 className="name">{bird.name}</h3>
            <p className="sci">{bird.sci}</p>
            <ul className="factlist">
              {bird.facts.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <div className="meta">
              <span>FIRST SPOTTED · {bird.date}</span>
              <span className="pin">📍 {bird.loc}</span>
            </div>
            {tweaks.showShimmer && <div className="holo"></div>}
          </div>
        </div>
      </div>
    </div>);

}

function FilterPill({ label, active, onClick, emoji }) {
  return (
    <button className={`chip ${active ? "on" : ""}`} onClick={onClick}>
      {emoji && <span style={{ marginRight: 4 }}>{emoji}</span>}{label}
    </button>);

}

function FilterBar({ filters, setFilters, search, setSearch, sort, setSort, count }) {
  const toggle = (key, val) => {
    setFilters((f) => {
      const set = new Set(f[key]);
      set.has(val) ? set.delete(val) : set.add(val);
      return { ...f, [key]: [...set] };
    });
  };
  const clearAll = () => {setFilters({ habitat: [], behavior: [], region: [] });setSearch("");};
  return (
    <div className="filterbar">
      <div className="row">
        <div className="search">
          <span>🔎</span>
          <input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)} />
          
        </div>
        <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Sort · Newest spotted</option>
          <option value="oldest">Sort · Oldest spotted</option>
          <option value="alpha">Sort · A → Z</option>
          <option value="num">Sort · Dex number</option>
        </select>
        <button className="chip" onClick={clearAll}>✕ Clear</button>
        <span style={{ marginLeft: "auto", color: "var(--ink-faint)", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
          {count} visible
        </span>
      </div>
      <div className="row">
        <span className="label">Habitat</span>
        {Object.keys(HABITAT_META).map((h) =>
        <FilterPill key={h} label={h} emoji={HABITAT_META[h].emoji}
        active={filters.habitat.includes(h)} onClick={() => toggle("habitat", h)} />
        )}
      </div>
      <div className="row">
        <span className="label">Behavior</span>
        {Object.keys(BEHAVIOR_META).map((b) =>
        <FilterPill key={b} label={b} emoji={BEHAVIOR_META[b].emoji}
        active={filters.behavior.includes(b)} onClick={() => toggle("behavior", b)} />
        )}
      </div>
      <div className="row">
        <span className="label">Region</span>
        {Object.keys(REGION_META).map((r) =>
        <FilterPill key={r} label={r} emoji={REGION_META[r].emoji}
        active={filters.region.includes(r)} onClick={() => toggle("region", r)} />
        )}
      </div>
    </div>);

}

function parseDate(s) {
  // "06 Nov 2025"
  return new Date(s + " 12:00:00").getTime() || 0;
}

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {localStorage.setItem(THEME_KEY, theme);} catch {}
  }, [theme]);

  const [uploads, setUpload, clearUpload] = useUploads();
  const [customBirds, addCustomBird, removeCustomBird] = window.useCustomBirds();
  const auth = window.useAdminAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ habitat: [], behavior: [], region: [] });
  const [sort, setSort] = useState("newest");

  // Combine built-in + custom; custom birds bring their own photo via b.photo
  const allBirds = useMemo(() => [...BIRD_DATA, ...customBirds], [customBirds]);
  const total = allBirds.length;
  const nextNum = total + 1;

  const visible = useMemo(() => {
    let arr = allBirds.slice();
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((b) => b.name.toLowerCase().includes(q) || b.sci.toLowerCase().includes(q));
    if (filters.habitat.length) arr = arr.filter((b) => filters.habitat.includes(b.habitat));
    if (filters.behavior.length) arr = arr.filter((b) => filters.behavior.includes(b.behavior));
    if (filters.region.length) arr = arr.filter((b) => filters.region.includes(b.region));
    if (sort === "newest") arr.sort((a, b) => parseDate(b.date) - parseDate(a.date) || a.num - b.num);else
    if (sort === "oldest") arr.sort((a, b) => parseDate(a.date) - parseDate(b.date) || a.num - b.num);else
    if (sort === "alpha") arr.sort((a, b) => a.name.localeCompare(b.name));else
    arr.sort((a, b) => a.num - b.num);
    return arr;
  }, [allBirds, search, filters, sort]);

  const uploadedCount = Object.keys(uploads).length + customBirds.filter(b => b.photo).length;

  const {
    TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakText
  } = window;

  return (
    <>
      <div className="bg-stage">
        <div className="stars"></div>
        <div className="aurora"></div>
      </div>

      <button
        className="themetoggle"
        title="Toggle theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? "☀️" : "🌙"}</button>

      <header className="hero" data-screen-label="Hero">
        <div className="fly-layer" aria-hidden="true">
          <span className="flybird b1">🦅</span>
          <span className="flybird b2">🕊️</span>
          <span className="flybird b3">🦜</span>
          <span className="flybird b4">🐦</span>
          <span className="flybird b5">🦢</span>
          <span className="feather f1" style={{ "--r": "-22deg" }}>🪶</span>
          <span className="feather f2" style={{ "--r": "18deg" }}>🪶</span>
          <span className="feather f3" style={{ "--r": "-8deg" }}>🪶</span>
          <span className="feather f4" style={{ "--r": "28deg" }}>🪶</span>
        </div>
        <div className="sub">{t.heroSubtitle}</div>
        <span className="titlewrap">
          <span className="sparkle s1">✦</span>
          <span className="sparkle s2">✧</span>
          <span className="sparkle s3">✦</span>
          <span className="sparkle s4">✧</span>
          <h1 style={{ fontSize: "124px" }}>{(t.heroTitle || "").replace(/\s+$/, "")}</h1>
        </span>
        <p className="tag" style={{ fontFamily: "\"Titan One\"", fontSize: "50px", color: "rgb(255, 216, 107)", margin: "0px 168.4px 18px" }}>{t.tagline}</p>
        <div className="counter">
          <span className="num"><em>{total}</em> species logged so far</span>
          <span className="bar"><i style={{ width: "100%" }}></i></span>
          {auth.isAdmin && (
            <button className="add-btn" onClick={() => setShowAdd(true)}>＋ Add sighting</button>
          )}
        </div>
      </header>
      {window.AdminBadge && (
        <window.AdminBadge
          auth={auth}
          onOpenLogin={() => setShowLogin(true)}
          onOpenManage={() => setShowManage(true)}
        />
      )}
      {window.LoginModal && (
        <window.LoginModal
          open={showLogin}
          onClose={() => setShowLogin(false)}
          auth={auth}
          onForgot={() => { setShowLogin(false); setShowReset(true); }}
        />
      )}
      {window.ManageModal && (
        <window.ManageModal
          open={showManage}
          onClose={() => setShowManage(false)}
          auth={auth}
        />
      )}
      {window.ResetModal && (
        <window.ResetModal
          open={showReset}
          onClose={() => setShowReset(false)}
          auth={auth}
        />
      )}
      {window.AddBirdModal && (
        <window.AddBirdModal
          open={showAdd && auth.isAdmin}
          onClose={() => setShowAdd(false)}
          onAdd={addCustomBird}
          nextNum={nextNum}
        />
      )}

      <FilterBar
        filters={filters} setFilters={setFilters}
        search={search} setSearch={setSearch}
        sort={sort} setSort={setSort}
        count={visible.length} />
      

      <main className="grid" data-screen-label="Card grid">
        {visible.length === 0 &&
        <div className="empty">
            <div style={{ fontSize: 48, marginBottom: 8 }}>🪺</div>
            <div>No species match those filters yet.</div>
          </div>
        }
        {visible.map((b, i) =>
        <BirdCard
          key={b.num}
          bird={b}
          index={i}
          uploaded={b.custom ? b.photo : uploads[b.num]}
          onUpload={(num, url) => b.custom ? null : setUpload(num, url)}
          onClear={() => b.custom ? null : clearUpload(b.num)}
          onDelete={b.custom ? () => removeCustomBird(b.num) : null}
          tweaks={t} />

        )}
      </main>

      <footer className="footer">
        <div className="heart">Made with 💚 by SSJ &amp; NJ</div>
        <div style={{ marginTop: 8 }}>Catching them with cameras, not Pokéballs.</div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-faint)" }}>
          Original collectible card design · Stock images via Wikimedia Commons (CC) — replace with your own
        </div>
      </footer>

      {TweaksPanel &&
      <TweaksPanel>
          <TweakSection label="Hero copy" />
          <TweakText label="Title" value={t.heroTitle} onChange={(v) => setTweak("heroTitle", v)} />
          <TweakText label="Subtitle" value={t.heroSubtitle} onChange={(v) => setTweak("heroSubtitle", v)} />
          <TweakText label="Tagline" value={t.tagline} onChange={(v) => setTweak("tagline", v)} />
          <TweakSection label="Card effects" />
          <TweakToggle label="Holo shimmer" value={t.showShimmer} onChange={(v) => setTweak("showShimmer", v)} />
          <TweakSlider label="Holo intensity" value={t.holoIntensity} min={0} max={1} step={0.05}
        onChange={(v) => setTweak("holoIntensity", v)} />
          <TweakSlider label="3D tilt" value={t.tiltStrength} min={0} max={20} step={1} unit="°"
        onChange={(v) => setTweak("tiltStrength", v)} />
        </TweaksPanel>
      }
    </>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);