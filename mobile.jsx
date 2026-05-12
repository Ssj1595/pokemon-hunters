/* global React */
// Pixel hero + mobile (Wattpad-style) list view
const { useState: _u, useEffect: _e } = React;

window.useViewport = function () {
  const [w, setW] = _u(typeof window !== "undefined" ? window.innerWidth : 1024);
  _e(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return { w, isMobile: w < 720 };
};

// ─── Pixel trainer SVGs (Pokémon Red/Blue style, ~16x24 grid scaled up) ───
const TRAINER_BOY =
<svg viewBox="0 0 16 24" width="80" height="120" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
    {/* Red cap */}
    <rect x="4" y="1" width="8" height="2" fill="#d63031" />
    <rect x="3" y="2" width="10" height="2" fill="#d63031" />
    <rect x="2" y="3" width="12" height="1" fill="#1a2f7a" />
    {/* Face */}
    <rect x="4" y="4" width="8" height="3" fill="#ffd9b3" />
    <rect x="5" y="5" width="1" height="1" fill="#1a2f7a" />
    <rect x="10" y="5" width="1" height="1" fill="#1a2f7a" />
    <rect x="7" y="6" width="2" height="1" fill="#c97f50" />
    {/* Neck/shirt */}
    <rect x="5" y="7" width="6" height="1" fill="#ffd9b3" />
    {/* Blue jacket */}
    <rect x="3" y="8" width="10" height="6" fill="#2563eb" />
    <rect x="4" y="9" width="8" height="1" fill="#1d4ed8" />
    <rect x="7" y="10" width="2" height="3" fill="#FFD86B" />
    {/* Arms */}
    <rect x="2" y="9" width="1" height="5" fill="#ffd9b3" />
    <rect x="13" y="9" width="1" height="5" fill="#ffd9b3" />
    {/* Hands holding camera (right) */}
    <rect x="11" y="11" width="3" height="2" fill="#1a2f7a" />
    <rect x="12" y="11" width="1" height="1" fill="#7df9ff" />
    {/* Shorts */}
    <rect x="4" y="14" width="8" height="4" fill="#1f2937" />
    {/* Legs */}
    <rect x="5" y="18" width="2" height="4" fill="#ffd9b3" />
    <rect x="9" y="18" width="2" height="4" fill="#ffd9b3" />
    {/* Shoes */}
    <rect x="4" y="22" width="3" height="2" fill="#d63031" />
    <rect x="9" y="22" width="3" height="2" fill="#d63031" />
  </svg>;


const TRAINER_GIRL =
<svg viewBox="0 0 16 24" width="80" height="120" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
    {/* Pink hat */}
    <rect x="4" y="1" width="8" height="2" fill="#ec4899" />
    <rect x="3" y="2" width="10" height="2" fill="#ec4899" />
    <rect x="2" y="3" width="12" height="1" fill="#9f1239" />
    <rect x="7" y="1" width="2" height="1" fill="#fff" />
    {/* Hair tufts */}
    <rect x="3" y="4" width="1" height="3" fill="#4a2e1a" />
    <rect x="12" y="4" width="1" height="3" fill="#4a2e1a" />
    {/* Face */}
    <rect x="4" y="4" width="8" height="3" fill="#ffd9b3" />
    <rect x="5" y="5" width="1" height="1" fill="#1a2f7a" />
    <rect x="10" y="5" width="1" height="1" fill="#1a2f7a" />
    <rect x="7" y="6" width="2" height="1" fill="#ec4899" />
    {/* Neck */}
    <rect x="5" y="7" width="6" height="1" fill="#ffd9b3" />
    {/* Pink dress */}
    <rect x="3" y="8" width="10" height="6" fill="#ec4899" />
    <rect x="4" y="9" width="8" height="1" fill="#db2777" />
    <rect x="7" y="10" width="2" height="3" fill="#fff" />
    {/* Arms */}
    <rect x="2" y="9" width="1" height="5" fill="#ffd9b3" />
    <rect x="13" y="9" width="1" height="5" fill="#ffd9b3" />
    {/* Binoculars (held up) */}
    <rect x="1" y="8" width="2" height="2" fill="#1a2f7a" />
    <rect x="13" y="8" width="2" height="2" fill="#1a2f7a" />
    <rect x="1" y="8" width="1" height="1" fill="#7df9ff" />
    <rect x="14" y="8" width="1" height="1" fill="#7df9ff" />
    {/* Skirt flare */}
    <rect x="2" y="14" width="12" height="3" fill="#ec4899" />
    <rect x="2" y="15" width="12" height="1" fill="#db2777" />
    {/* Legs */}
    <rect x="5" y="17" width="2" height="5" fill="#ffd9b3" />
    <rect x="9" y="17" width="2" height="5" fill="#ffd9b3" />
    {/* Shoes */}
    <rect x="4" y="22" width="3" height="2" fill="#d63031" />
    <rect x="9" y="22" width="3" height="2" fill="#d63031" />
  </svg>;


window.PixelHero = function PixelHero({ count, isAdmin, onAdd }) {
  // Stars: deterministic scattered field
  const stars = Array.from({ length: 90 }).map((_, i) => {
    const x = (i * 53 + 11) % 100;
    const y = (i * 37 + 7) % 70; // keep above mountains
    const s = 1 + i * 17 % 3; // 1-3px
    const tw = 1.4 + i * 11 % 26 / 10; // twinkle duration 1.4-4s
    const delay = i * 19 % 30 / 10;
    return { x, y, s, tw, delay, key: i };
  });
  return (
    <header className="pixel-hero night" data-screen-label="Hero">
      <div className="starfield" aria-hidden="true">
        {stars.map((st) =>
        <span
          key={st.key}
          className="star"
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: `${st.s}px`,
            height: `${st.s}px`,
            animationDuration: `${st.tw}s`,
            animationDelay: `${st.delay}s`
          }} />

        )}
        {/* a couple of bright "hero" stars with cross-flare */}
        <span className="star big" style={{ left: "14%", top: "22%" }}></span>
        <span className="star big" style={{ left: "78%", top: "12%" }}></span>
        <span className="star big" style={{ left: "62%", top: "38%" }}></span>
        {/* shooting star */}
        <span className="shooting" aria-hidden="true"></span>
      </div>

      {/* Crescent moon */}
      <svg className="moon" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff8d6" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#fff8d6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#fff8d6" stopOpacity="0" />
          </radialGradient>
          <mask id="crescentMask">
            <rect x="0" y="0" width="80" height="80" fill="#fff" />
            <circle cx="46" cy="36" r="22" fill="#000" />
          </mask>
        </defs>
        <circle cx="64" cy="40" r="36" fill="url(#moonGlow)" />
        <circle cx="40" cy="40" r="22" fill="#fff4c2" mask="url(#crescentMask)" />
        {/* tiny craters on the lit edge */}
        <circle cx="28" cy="34" r="1.6" fill="#d6c98a" mask="url(#crescentMask)" opacity=".7" />
        <circle cx="33" cy="48" r="1.2" fill="#d6c98a" mask="url(#crescentMask)" opacity=".6" />
        <circle cx="24" cy="44" r="0.9" fill="#d6c98a" mask="url(#crescentMask)" opacity=".5" />
      </svg>

      {/* Birds flying — silhouettes */}
      <div className="pixel-birds" aria-hidden="true">
        <span className="pb b1"></span>
        <span className="pb b2"></span>
        <span className="pb b3"></span>
        <span className="pb b4"></span>
        <span className="pb b5"></span>
        <span className="pb b6"></span>
      </div>

      <div className="pixel-title-wrap">
        <div className="pixel-sub">★ A WILD BIRD APPEARED ★</div>
        <h1 className="pixel-title">
          <span className="row1" style={{ textAlign: "left", fontSize: "50px" }}>POKÉMON</span>
          <span className="row2" style={{ fontSize: "50px" }}>HUNTERS</span>
        </h1>
      </div>

      <div className="trainers">
        <div className="trainer boy">
          {TRAINER_BOY}
          <div className="lbl">SSJ</div>
        </div>
        <div className="trainers-vs">&amp;</div>
        <div className="trainer girl">
          {TRAINER_GIRL}
          <div className="lbl">NJ</div>
        </div>
      </div>

      <div className="pixel-counter">
        <span><em>{count}</em> CAUGHT SO FAR</span>
        {isAdmin &&
        <button className="add-btn" onClick={onAdd}>＋ ADD</button>
        }
      </div>

      <svg className="terrain" viewBox="0 0 800 260" preserveAspectRatio="none" aria-hidden="true">
        {/* Distant moonlit ridges */}
        <polygon points="0,200 70,90 130,150 210,60 290,140 360,80 450,160 520,70 610,140 690,90 770,150 800,180 800,260 0,260" fill="#2a3458" />
        {/* Moonlit snow caps — subtle */}
        <polygon points="190,80 210,60 230,80 220,72" fill="#c9d8ff" opacity=".85" />
        <polygon points="500,90 520,70 540,90 530,82" fill="#c9d8ff" opacity=".85" />
        <polygon points="670,108 690,90 710,108 700,100" fill="#c9d8ff" opacity=".75" />
        {/* Mid mountains — deep forest in moonlight */}
        <polygon points="0,230 80,150 170,200 260,130 370,210 470,150 570,220 670,150 770,200 800,180 800,260 0,260" fill="#15301f" />
        <polygon points="0,245 60,200 160,235 250,190 360,240 460,200 560,245 660,205 760,235 800,225 800,260 0,260" fill="#0c1f15" />
      </svg>
      <svg className="forest" viewBox="0 0 800 90" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => {
          const x = i * 46 + (i % 2 ? 14 : 0);
          const h = 50 + i * 7 % 28;
          const top = 90 - h;
          const col = i % 3 === 0 ? "#081c12" : i % 3 === 1 ? "#0d2418" : "#04140b";
          return (
            <g key={i}>
              <rect x={x + 10} y={90 - 12} width="6" height="12" fill="#4a2e1a" />
              <polygon points={`${x},90 ${x + 26},${top} ${x + 26 * 2},90`} fill={col} />
              <polygon points={`${x + 4},${78} ${x + 26},${top + 8} ${x + 48},${78}`} fill={col} opacity=".75" />
            </g>);

        })}
      </svg>
      <div className="grass-strip" aria-hidden="true"></div>
    </header>);

};

// ─── Mobile mini-card (3 per row, mirrors desktop card) ───
window.MobileListRow = function MobileListRow({ bird, photos, onOpen }) {
  const stockUrl = window.BIRD_IMAGES?.[bird.num];
  const hab = window.HABITAT_META[bird.habitat] || {};
  const rar = window.RARITY_META[bird.rarity] || window.RARITY_META["Common"];
  const photo = photos && photos[0] || stockUrl;
  const style = {
    "--grad": hab.grad,
    "--accent": hab.accent,
    "--rb-bg": rar.bg,
    "--rb-col": rar.color,
    "--rb-glow": rar.glow
  };
  return (
    <div className="mcard" style={style} onClick={() => onOpen(bird)}>
      <div className="mcard-hdr">
        <span className="mcard-dex">#{String(bird.num).padStart(3, "0")}</span>
        <span className="mcard-rar">{rar.emoji} {bird.rarity}</span>
      </div>
      <div className="mcard-photo">
        {photo ? <img src={photo} alt={bird.name} loading="lazy" /> :
        <div className="mcard-ph">{hab.emoji || "🪶"}</div>}
        {photos && photos.length > 1 && <span className="mcard-count">{photos.length}📷</span>}
        {bird.custom && <span className="mcard-new">✨ NEW</span>}
      </div>
      <div className="mcard-name" title={bird.name}>{bird.name}</div>
      <div className="mcard-foot">
        <span className="mcard-hab" title={bird.habitat}>{hab.emoji}</span>
        <span className="mcard-loc" title={bird.loc}>📍 {bird.loc.split(",")[0]}</span>
      </div>
    </div>);

};

window.MobileSheet = function MobileSheet({ bird, onClose, children }) {
  _e(() => {
    if (!bird) return;
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {document.body.style.overflow = "";window.removeEventListener("keydown", onKey);};
  }, [bird, onClose]);
  if (!bird) return null;
  return (
    <div className="msheet-back" onClick={onClose}>
      <div className="msheet" onClick={(e) => e.stopPropagation()}>
        <div className="msheet-grab" />
        {children}
      </div>
    </div>);

};

window.MobileFilterBar = function MobileFilterBar({ filters, setFilters, search, setSearch, sort, setSort, count }) {
  const [open, setOpen] = _u(false);
  const total = (filters.habitat?.length || 0) + (filters.behavior?.length || 0) + (filters.region?.length || 0) + (filters.rarity?.length || 0);
  const toggle = (key, val) => {
    setFilters((f) => {
      const set = new Set(f[key]);
      set.has(val) ? set.delete(val) : set.add(val);
      return { ...f, [key]: [...set] };
    });
  };
  const clearAll = () => {setFilters({ habitat: [], behavior: [], region: [], rarity: [] });setSearch("");};
  const H = window.HABITAT_META,B = window.BEHAVIOR_META,R = window.REGION_META,RA = window.RARITY_META;
  return (
    <>
      <div className="mfilter-bar">
        <div className="search">
          <span>🔎</span>
          <input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className={`mfilter-toggle ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)}>
          ☰ Filters {total > 0 && <span className="badge-n">{total}</span>}
        </button>
        <span style={{ marginLeft: "auto", color: "var(--ink-faint)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>{count} found</span>
      </div>
      {open &&
      <div className="mfilter-panel">
          <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="photos">Photos first</option>
            <option value="newest">Newest spotted</option>
            <option value="oldest">Oldest spotted</option>
            <option value="alpha">A → Z</option>
            <option value="num">Dex number</option>
            <option value="rarity">Rarity</option>
          </select>
          <div className="row"><span className="label">Habitat</span>{Object.keys(H).map((k) => <button key={k} className={`chip ${filters.habitat.includes(k) ? "on" : ""}`} onClick={() => toggle("habitat", k)}>{H[k].emoji} {k}</button>)}</div>
          <div className="row"><span className="label">Behavior</span>{Object.keys(B).map((k) => <button key={k} className={`chip ${filters.behavior.includes(k) ? "on" : ""}`} onClick={() => toggle("behavior", k)}>{B[k].emoji} {k}</button>)}</div>
          <div className="row"><span className="label">Region</span>{Object.keys(R).map((k) => <button key={k} className={`chip ${filters.region.includes(k) ? "on" : ""}`} onClick={() => toggle("region", k)}>{R[k].emoji} {k}</button>)}</div>
          <div className="row"><span className="label">Rarity</span>{Object.keys(RA).map((k) => <button key={k} className={`chip ${filters.rarity?.includes(k) ? "on" : ""}`} onClick={() => toggle("rarity", k)}>{RA[k].emoji} {k}</button>)}</div>
          <button className="chip" onClick={clearAll} style={{ alignSelf: "flex-start" }}>✕ Clear all</button>
        </div>
      }
    </>);

};