/* global React, ReactDOM, BIRD_DATA, HABITAT_META, BEHAVIOR_META, REGION_META, BIRD_IMAGES, RARITY_META, STAT_META */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroTitle": "Pokémon Hunters\n",
  "heroSubtitle": "SSJ & NJ SPOTTING 'EM ALL!!",
  "tagline": "\n",
  "holoIntensity": 0.55,
  "tiltStrength": 10,
  "showShimmer": true,
  "photosFirst": true
} /*EDITMODE-END*/;

const STORAGE_KEY = "ph_uploaded_images_v2"; // arrays now

// Migration: v1 (single dataurl) → v2 (array)
function migrateUploads() {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return JSON.parse(v2);
    const v1raw = localStorage.getItem("ph_uploaded_images_v1");
    if (v1raw) {
      const v1 = JSON.parse(v1raw);
      const out = {};
      Object.keys(v1).forEach((k) => {out[k] = [v1[k]];});
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
      return out;
    }
  } catch {}
  return {};
}

function useUploads() {
  const [uploads, setUploads] = useState(migrateUploads);
  const addPhoto = useCallback((num, dataUrl) => {
    setUploads((prev) => {
      const cur = prev[num] || [];
      if (cur.length >= 5) return prev;
      const next = { ...prev, [num]: [...cur, dataUrl] };
      try {localStorage.setItem(STORAGE_KEY, JSON.stringify(next));} catch {}
      return next;
    });
  }, []);
  const removePhoto = useCallback((num, idx) => {
    setUploads((prev) => {
      const cur = prev[num] || [];
      const arr = cur.filter((_, i) => i !== idx);
      const next = { ...prev };
      if (arr.length) next[num] = arr;else delete next[num];
      try {localStorage.setItem(STORAGE_KEY, JSON.stringify(next));} catch {}
      return next;
    });
  }, []);
  const clearAll = useCallback((num) => {
    setUploads((prev) => {
      const next = { ...prev };delete next[num];
      try {localStorage.setItem(STORAGE_KEY, JSON.stringify(next));} catch {}
      return next;
    });
  }, []);
  const setPhotos = useCallback((num, arr) => {
    setUploads((prev) => {
      const next = { ...prev };
      if (arr && arr.length) next[num] = arr.slice(0, 5);else delete next[num];
      try {localStorage.setItem(STORAGE_KEY, JSON.stringify(next));} catch {}
      return next;
    });
  }, []);
  return [uploads, addPhoto, removePhoto, clearAll, setPhotos];
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

function CarouselPhoto({ bird, photos, onAdd, onRemoveIdx, onZoom, canEdit }) {
  const [stockBroken, setStockBroken] = useState(false);
  const [idx, setIdx] = useState(0);
  const fileRef = useRef(null);
  const stockUrl = BIRD_IMAGES[bird.num];

  // photos array, fall back to stock
  const haveOwn = photos && photos.length > 0;
  const showUrl = haveOwn ? photos[idx] : stockUrl && !stockBroken ? stockUrl : null;

  useEffect(() => {if (idx >= (photos?.length || 0)) setIdx(0);}, [photos, idx]);

  const handlePick = (e) => {e.stopPropagation();fileRef.current?.click();};
  const handleFile = (e) => {
    const files = e.target.files;if (!files) return;
    Array.from(files).forEach((f) => {
      const r = new FileReader();
      r.onload = () => onAdd(String(r.result));
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  const prev = (e) => {e.stopPropagation();setIdx((i) => (i - 1 + photos.length) % photos.length);};
  const next = (e) => {e.stopPropagation();setIdx((i) => (i + 1) % photos.length);};

  return (
    <div className="photo">
      {showUrl ?
      <img
        src={showUrl}
        alt={bird.name}
        loading="lazy"
        onError={() => !haveOwn && setStockBroken(true)} /> :


      <div className="placeholder" aria-hidden="true">
          {HABITAT_META[bird.habitat]?.emoji || "🪶"}
          <small>{bird.name}</small>
        </div>
      }

      {/* Multi-photo carousel controls */}
      {haveOwn && photos.length > 1 &&
      <>
          <button className="carousel-arrow l" onClick={prev}>‹</button>
          <button className="carousel-arrow r" onClick={next}>›</button>
          <div className="carousel-dots">
            {photos.map((_, i) => <span key={i} className={`cd ${i === idx ? "on" : ""}`} />)}
          </div>
        </>
      }

      {/* + add photo (admin only, if room) */}
      {canEdit && (!photos || photos.length < 5) &&
      <button className="editbtn" title={haveOwn ? "Add another photo" : "Upload your photos"} onClick={handlePick}>＋</button>
      }

      {/* zoom button — only this opens the lightbox; clicking elsewhere on the card flips it */}
      {showUrl && onZoom &&
      <button
        className="zoombtn"
        title="Zoom in"
        aria-label="Zoom photo"
        onClick={(e) => {e.stopPropagation();onZoom(showUrl);}}>
          🔍
        </button>
      }

      {/* admin-only remove control for own photos (replaces the old imgtag click) */}
      {canEdit && haveOwn &&
      <button
        className="removephoto"
        title="Remove this photo"
        aria-label="Remove this photo"
        onClick={(e) => {e.stopPropagation();onRemoveIdx(idx);}}>
          ✕
        </button>
      }

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFile} />
    </div>);

}

function StatBars({ stats }) {
  return (
    <div className="stattable">
      {Object.keys(STAT_META).map((k) => {
        const m = STAT_META[k];
        const v = stats && stats[k] || 0;
        return (
          <div key={k} className="statcell" title={`${m.label}: ${v} / 100`}>
            <span className="se">{m.emoji}</span>
            <span className="sl" style={{ height: "5.5px", fontSize: "7px" }}>{m.label}</span>
            <span className="sv">{v}</span>
          </div>);

      })}
    </div>);

}
function _StatBarsLegacy({ stats }) {
  return (
    <div className="statbars">
      {Object.keys(STAT_META).map((k) => {
        const m = STAT_META[k];
        const v = stats && stats[k] || 0;
        return (
          <div key={k} className="statrow">
            <span className="se">{m.emoji}</span>
            <span className="sl">{m.label}</span>
            <span className="stattrack"><span className="statfill" style={{ width: `${v}%`, "--c": m.color }} /></span>
            <span className="sv">{v}</span>
          </div>);

      })}
    </div>);

}

function BirdCard({ bird, photos, onAddPhoto, onRemovePhoto, onDelete, onEdit, onZoom, tweaks, index, isAdmin }) {
  const [flipped, setFlipped] = useState(false);
  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const habMeta = HABITAT_META[bird.habitat] || {};
  const rarMeta = RARITY_META[bird.rarity] || RARITY_META["Common"];

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
    return () => {wrap.removeEventListener("mousemove", onMove);wrap.removeEventListener("mouseleave", onLeave);};
  }, [tweaks.tiltStrength]);

  const style = {
    "--grad": habMeta.grad,
    "--accent": habMeta.accent,
    "--rb-bg": rarMeta.bg,
    "--rb-col": rarMeta.color,
    "--rb-glow": rarMeta.glow,
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
              {bird.custom && <span className="collno custom">✨ NEW</span>}
            </div>

            <div className="badges">
              <Badge kind="habitat" value={bird.habitat} />
              <Badge kind="behavior" value={bird.behavior} />
              <Badge kind="region" value={bird.region} />
              <span className={`rarity-badge ${bird.rarity?.toLowerCase()}`}>
                <span className="re">{rarMeta.emoji}</span>
                <span className="rt">{bird.rarity}</span>
              </span>
            </div>

            <CarouselPhoto
              bird={bird}
              photos={photos}
              onAdd={(url) => onAddPhoto(bird.num, url)}
              onRemoveIdx={(i) => onRemovePhoto(bird.num, i)}
              onZoom={onZoom}
              canEdit={isAdmin} />
            

            <div className="cardfoot">
              <span className="where" title={bird.loc}>📍 {bird.loc.split(",")[0]}</span>
              <span>{bird.date}</span>
            </div>

            {isAdmin &&
            <button className="editcardbtn" title="Edit this sighting"
            onClick={(e) => {e.stopPropagation();onEdit(bird);}}>✎</button>
            }
            {isAdmin && onDelete &&
            <button className="delbtn" title="Remove sighting"
            onClick={(e) => {e.stopPropagation();if (confirm(`Remove ${bird.name}?`)) onDelete();}}>🗑</button>
            }

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
            <div className="rarity-strip" style={{ background: rarMeta.bg }}>
              <span className="rarity" style={{ color: rarMeta.color }}>
                <span className="dot" /> {rarMeta.emoji} {bird.rarity}
              </span>
              <span className="hp">HP<em>{bird.hp}</em></span>
            </div>

            <h3 className="name">{bird.name}</h3>
            <p className="sci">{bird.sci}</p>
            {bird.title && <div className="card-title-strip">{bird.title}</div>}

            <StatBars stats={bird.stats || {}} />

            {bird.move &&
            <div className="move-block">
                <div className="mn">⚡ {bird.move.name}</div>
                <div className="md">{bird.move.desc}</div>
              </div>
            }

            <div className="meta" style={{ marginTop: 8 }}>
              <span>FIRST SPOTTED · {bird.date}</span>
              <span className="pin">📍 {bird.loc}</span>
            </div>
            {tweaks.showShimmer && <div className="holo"></div>}
          </div>
        </div>
      </div>
    </div>);

}
/* placeholder so str_replace anchor stays unique */

function HowToReadFab() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {if (e.key === "Escape") setOpen(false);};
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {document.body.style.overflow = "";window.removeEventListener("keydown", onKey);};
  }, [open]);

  return (
    <>
      <button
        className="htr-fab"
        aria-label="How to read a card"
        title="How to read a card"
        onClick={() => setOpen(true)}>
        <span className="htr-fab-icon">⚡</span>
        <span className="htr-fab-lbl">HOW TO<br />READ</span>
      </button>
      {open &&
      <div className="htr-back" onClick={() => setOpen(false)}>
          <div className="htr-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="How to read a card">
            <div className="htr-grab" />
            <header className="htr-hdr">
              <h2>⚡ HOW TO READ A CARD</h2>
              <button className="htr-close" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
            </header>
            <p className="htr-sub">Every bird is rated 0–100 across six dimensions. Flip any card to see its stats, signature move, and rarity tier.</p>

            <div className="htr-stats">
              {Object.keys(STAT_META).map((k) => {
              const m = STAT_META[k];
              return (
                <div key={k} className="htr-stat" style={{ "--c": m.color }}>
                    <span className="ie">{m.emoji}</span>
                    <div>
                      <div className="it">{m.label}</div>
                      <div className="id">{m.desc}</div>
                    </div>
                  </div>);

            })}
            </div>

            <div className="htr-section">RARITY TIERS</div>
            <div className="htr-rarity">
              {Object.keys(RARITY_META).map((r) => {
              const m = RARITY_META[r];
              return (
                <span key={r} className="htr-rk" style={{ "--rb-bg": m.bg, "--rb-col": m.color, "--rb-glow": m.glow }}>
                    {m.emoji} {r}
                  </span>);

            })}
            </div>

            <div className="htr-section">HABITAT</div>
            <div className="htr-meta-grid">
              {Object.keys(HABITAT_META).map((h) =>
            <span key={h} className="htr-mk"><span className="e">{HABITAT_META[h].emoji}</span> {h}</span>
            )}
            </div>
            <div className="htr-section">BEHAVIOR</div>
            <div className="htr-meta-grid">
              {Object.keys(BEHAVIOR_META).map((b) =>
            <span key={b} className="htr-mk"><span className="e">{BEHAVIOR_META[b].emoji}</span> {b}</span>
            )}
            </div>
            <div className="htr-section">REGION</div>
            <div className="htr-meta-grid">
              {Object.keys(REGION_META).map((r) =>
            <span key={r} className="htr-mk"><span className="e">{REGION_META[r].emoji}</span> {r}</span>
            )}
            </div>
          </div>
        </div>
      }
    </>);

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
  const clearAll = () => {setFilters({ habitat: [], behavior: [], region: [], rarity: [] });setSearch("");};
  return (
    <div className="filterbar">
      <div className="row">
        <div className="search">
          <span>🔎</span>
          <input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="photos">Photos first</option>
          <option value="newest">Newest spotted</option>
          <option value="oldest">Oldest spotted</option>
          <option value="alpha">A → Z</option>
          <option value="num">Dex number</option>
          <option value="rarity">Rarity</option>
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
      <div className="row">
        <span className="label">Rarity</span>
        {Object.keys(RARITY_META).map((r) =>
        <FilterPill key={r} label={`${RARITY_META[r].emoji} ${r}`}
        active={filters.rarity?.includes(r)} onClick={() => toggle("rarity", r)} />
        )}
      </div>
    </div>);

}

function StatsLegend() {
  return (
    <section className="legend" data-screen-label="Stats legend">
      <h2>⚡ HOW TO READ A CARD</h2>
      <p className="sub2">Every bird is rated 0–100 across six dimensions. Flip any card to see its stats, signature move, and rarity tier.</p>
      <div className="legend-grid">
        {Object.keys(STAT_META).map((k) => {
          const m = STAT_META[k];
          return (
            <div key={k} className="legend-card" style={{ "--c": m.color }}>
              <span className="ie">{m.emoji}</span>
              <div>
                <div className="it">{m.label}</div>
                <div className="id">{m.desc}</div>
              </div>
            </div>);

        })}
      </div>
      <div className="rarity-row">
        {Object.keys(RARITY_META).map((r) => {
          const m = RARITY_META[r];
          return (
            <span key={r} className="rk" style={{ "--rb-bg": m.bg, "--rb-col": m.color, "--rb-glow": m.glow }}>
              <span className="rk-e">{m.emoji}</span> {r}
            </span>);

        })}
      </div>
    </section>);

}

function ZoomModal({ url, onClose }) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url, onClose]);
  if (!url) return null;
  return (
    <div className="zoom-back" onClick={onClose}>
      <button className="zoom-x" onClick={onClose}>✕</button>
      <img src={url} alt="" onClick={(e) => e.stopPropagation()} />
    </div>);

}

function parseDate(s) {return new Date(s + " 12:00:00").getTime() || 0;}

const RARITY_ORDER = ["Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"];

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  const [uploads, addPhoto, removePhoto, clearAllPhotos, setUploadPhotos] = useUploads();
  const [customBirds, addCustomBird, removeCustomBird, updateCustomBird] = window.useCustomBirds();
  const [edits, setEdit] = window.useBirdEdits();
  const [hiddenBuiltins, hideBuiltin, unhideBuiltin] = window.useHiddenBuiltins();
  const auth = window.useAdminAuth();

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ habitat: [], behavior: [], region: [], rarity: [] });
  const [sort, setSort] = useState("photos");
  const [zoomUrl, setZoomUrl] = useState(null);
  const [mobileSheet, setMobileSheet] = useState(null);
  const [forceMobile, setForceMobile] = useState(false);
  const vp = window.useViewport();
  const isMobile = forceMobile || vp.isMobile;

  // Drive mobile CSS via body classes so admin "Mobile" preview accurately
  // mirrors a real phone (412px-wide phone frame) without needing a real <720px viewport.
  useEffect(() => {
    document.body.classList.toggle("mobile-view", isMobile);
    document.body.classList.toggle("phone-preview", forceMobile && !vp.isMobile);
    return () => {
      document.body.classList.remove("mobile-view");
      document.body.classList.remove("phone-preview");
    };
  }, [isMobile, forceMobile, vp.isMobile]);

  // Built-in birds with overlay edits
  const builtIn = useMemo(() =>
  BIRD_DATA.
  filter((b) => !hiddenBuiltins.includes(b.num)).
  map((b) => edits[b.num] ? { ...b, ...edits[b.num] } : b),
  [edits, hiddenBuiltins]);
  const allBirds = useMemo(() => [...builtIn, ...customBirds], [builtIn, customBirds]);
  const nextNum = allBirds.length + 1;

  // Photos for each bird: combine uploads (built-in) or custom.photos (custom)
  const photosFor = useCallback((b) => {
    if (b.custom) return b.photos || (b.photo ? [b.photo] : []);
    return uploads[b.num] || [];
  }, [uploads]);

  const hasAnyPhoto = useCallback((b) => {
    return photosFor(b).length > 0 || !!BIRD_IMAGES[b.num];
  }, [photosFor]);

  const hasOwnPhoto = useCallback((b) => photosFor(b).length > 0, [photosFor]);

  const visible = useMemo(() => {
    let arr = allBirds.slice();
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((b) => b.name.toLowerCase().includes(q) || b.sci.toLowerCase().includes(q));
    if (filters.habitat.length) arr = arr.filter((b) => filters.habitat.includes(b.habitat));
    if (filters.behavior.length) arr = arr.filter((b) => filters.behavior.includes(b.behavior));
    if (filters.region.length) arr = arr.filter((b) => filters.region.includes(b.region));
    if (filters.rarity?.length) arr = arr.filter((b) => filters.rarity.includes(b.rarity));

    if (sort === "photos") {
      arr.sort((a, b) => {
        const ap = hasOwnPhoto(a) ? 2 : hasAnyPhoto(a) ? 1 : 0;
        const bp = hasOwnPhoto(b) ? 2 : hasAnyPhoto(b) ? 1 : 0;
        if (bp !== ap) return bp - ap;
        return parseDate(b.date) - parseDate(a.date) || a.num - b.num;
      });
    } else if (sort === "newest") arr.sort((a, b) => parseDate(b.date) - parseDate(a.date) || a.num - b.num);else
    if (sort === "oldest") arr.sort((a, b) => parseDate(a.date) - parseDate(b.date) || a.num - b.num);else
    if (sort === "alpha") arr.sort((a, b) => a.name.localeCompare(b.name));else
    if (sort === "rarity") arr.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || a.num - b.num);else
    arr.sort((a, b) => a.num - b.num);
    return arr;
  }, [allBirds, search, filters, sort, hasAnyPhoto, hasOwnPhoto]);

  const onSubmitBird = (bird) => {
    if (editTarget) {
      // Edit flow
      const { num, ...patch } = bird;
      if (editTarget.custom) {
        updateCustomBird(num, patch);
      } else {
        // Pull photos out of the patch — built-in birds store them in uploads,
        // not in the edits overlay. Keeps localStorage from blowing past quota
        // with duplicated base64 strings.
        const { photos: photoArr, ...rest } = patch;
        setEdit(num, rest);
        if (photoArr) setUploadPhotos(num, photoArr);
      }
      setEditTarget(null);
    } else {
      addCustomBird(bird);
    }
  };

  const handleEdit = (bird) => {
    // Pre-populate photos for built-in birds from uploads
    const photos = photosFor(bird);
    setEditTarget({ ...bird, photos });
    setShowAdd(true);
  };

  const {
    TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakText
  } = window;

  return (
    <>
      <div className="bg-stage">
        <div className="stars"></div>
        <div className="aurora"></div>
      </div>

      <window.PixelHero count={allBirds.length} isAdmin={auth.isAdmin}
      onAdd={() => {setEditTarget(null);setShowAdd(true);}} />

      {window.AdminBadge &&
      <window.AdminBadge auth={auth} onOpenLogin={() => setShowLogin(true)} onOpenManage={() => setShowManage(true)} />
      }
      {auth.isAdmin &&
      <div className="view-toggle" role="group" aria-label="Preview viewport (admin only)" title="Preview viewport (admin only)">
          <button className={!forceMobile ? "active" : ""} onClick={() => setForceMobile(false)} title="Desktop view">🖥 DESKTOP</button>
          <button className={forceMobile ? "active" : ""} onClick={() => setForceMobile(true)} title="Mobile preview">📱 MOBILE</button>
        </div>
      }
      {window.LoginModal &&
      <window.LoginModal open={showLogin} onClose={() => setShowLogin(false)} auth={auth}
      onForgot={() => {setShowLogin(false);setShowReset(true);}} />
      }
      {window.ManageModal &&
      <window.ManageModal open={showManage} onClose={() => setShowManage(false)} auth={auth} />
      }
      {window.ResetModal &&
      <window.ResetModal open={showReset} onClose={() => setShowReset(false)} auth={auth} />
      }
      {window.AddBirdModal &&
      <window.AddBirdModal
        open={showAdd && auth.isAdmin}
        onClose={() => {setShowAdd(false);setEditTarget(null);}}
        onSubmit={onSubmitBird}
        onDelete={(b) => {
          if (b.custom) removeCustomBird(b.num);else
          hideBuiltin(b.num);
          setMobileSheet(null);
        }}
        nextNum={nextNum}
        editBird={editTarget} />

      }

      {isMobile ?
      <window.MobileFilterBar filters={filters} setFilters={setFilters} search={search} setSearch={setSearch} sort={sort} setSort={setSort} count={visible.length} /> :

      <FilterBar filters={filters} setFilters={setFilters} search={search} setSearch={setSearch} sort={sort} setSort={setSort} count={visible.length} />
      }

      {isMobile ?
      <main className="grid grid--mobile" data-screen-label="Mobile list">
          {visible.length === 0 &&
        <div className="empty"><div style={{ fontSize: 48, marginBottom: 8 }}>🪺</div><div>No species match.</div></div>
        }
          {visible.map((b, i) =>
        <BirdCard
          key={b.num}
          bird={b}
          photos={photosFor(b)}
          onAddPhoto={addPhoto}
          onRemovePhoto={removePhoto}
          onDelete={b.custom ? () => removeCustomBird(b.num) : null}
          onEdit={handleEdit}
          onZoom={(url) => setZoomUrl(url)}
          tweaks={t}
          index={i}
          isAdmin={auth.isAdmin} />

        )}
        </main> :

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
          photos={photosFor(b)}
          onAddPhoto={(num, url) => b.custom ?
          updateCustomBird(num, { photos: [...(b.photos || []), url].slice(0, 5) }) :
          addPhoto(num, url)
          }
          onRemovePhoto={(num, idx) => b.custom ?
          updateCustomBird(num, { photos: (b.photos || []).filter((_, j) => j !== idx) }) :
          removePhoto(num, idx)
          }
          onDelete={b.custom ? () => removeCustomBird(b.num) : null}
          onEdit={handleEdit}
          onZoom={(url) => setZoomUrl(url)}
          tweaks={t}
          isAdmin={auth.isAdmin} />

        )}
      </main>
      }

      {window.MobileSheet &&
      <window.MobileSheet bird={mobileSheet} onClose={() => setMobileSheet(null)}>
          {mobileSheet &&
        <BirdCard
          bird={mobileSheet}
          index={0}
          photos={photosFor(mobileSheet)}
          onAddPhoto={(num, url) => mobileSheet.custom ?
          updateCustomBird(num, { photos: [...(mobileSheet.photos || []), url].slice(0, 5) }) :
          addPhoto(num, url)}
          onRemovePhoto={(num, idx) => mobileSheet.custom ?
          updateCustomBird(num, { photos: (mobileSheet.photos || []).filter((_, j) => j !== idx) }) :
          removePhoto(num, idx)}
          onDelete={mobileSheet.custom ? () => {removeCustomBird(mobileSheet.num);setMobileSheet(null);} : null}
          onEdit={handleEdit}
          onZoom={(url) => setZoomUrl(url)}
          tweaks={t}
          isAdmin={auth.isAdmin} />

        }
        </window.MobileSheet>
      }

      <HowToReadFab />

      <footer className="footer">
        <div className="heart">Made with 💚 by SSJ &amp; NJ</div>
        <div style={{ marginTop: 8 }}>Catching them with cameras, not Pokéballs.</div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-faint)" }}>
          Original collectible card design · Stock images via Wikimedia Commons (CC) — replace with your own
        </div>
      </footer>

      <ZoomModal url={zoomUrl} onClose={() => setZoomUrl(null)} />

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