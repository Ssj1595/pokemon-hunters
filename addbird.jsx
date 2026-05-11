/* global React, HABITAT_META, BEHAVIOR_META, REGION_META, RARITY_META, STAT_META */
// Add-Bird modal + custom-bird storage (supports edit mode + up to 5 photos
// + stats + signature move + photo reordering + delete-from-edit)
const { useState: _useState, useEffect: _useEffect, useCallback: _useCallback } = React;

const CUSTOM_KEY = "ph_custom_birds_v1";
const EDITS_KEY  = "ph_bird_edits_v1";
const HIDDEN_KEY = "ph_hidden_builtins_v1";

window.useCustomBirds = function() {
  const [birds, setBirds] = _useState(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); }
    catch { return []; }
  });
  const add = _useCallback((bird) => {
    setBirds((prev) => {
      const next = [...prev, bird];
      try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const remove = _useCallback((num) => {
    setBirds((prev) => {
      const next = prev.filter(b => b.num !== num);
      try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const update = _useCallback((num, patch) => {
    setBirds((prev) => {
      const next = prev.map(b => b.num === num ? { ...b, ...patch } : b);
      try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return [birds, add, remove, update];
};

// Edits to built-in birds (admin can rename/edit any bird)
window.useBirdEdits = function() {
  const [edits, setEdits] = _useState(() => {
    try { return JSON.parse(localStorage.getItem(EDITS_KEY) || "{}"); }
    catch { return {}; }
  });
  const setEdit = _useCallback((num, patch) => {
    setEdits((prev) => {
      const next = { ...prev, [num]: { ...(prev[num] || {}), ...patch } };
      try { localStorage.setItem(EDITS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const clearEdit = _useCallback((num) => {
    setEdits((prev) => {
      const next = { ...prev }; delete next[num];
      try { localStorage.setItem(EDITS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return [edits, setEdit, clearEdit];
};

// Hidden built-in birds (admin deletes a built-in -> goes here)
window.useHiddenBuiltins = function() {
  const [hidden, setHidden] = _useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"); }
    catch { return []; }
  });
  const hide = _useCallback((num) => {
    setHidden((prev) => {
      if (prev.includes(num)) return prev;
      const next = [...prev, num];
      try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const unhide = _useCallback((num) => {
    setHidden((prev) => {
      const next = prev.filter(n => n !== num);
      try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return [hidden, hide, unhide];
};

function readImg(file, cb) {
  const r = new FileReader();
  r.onload = () => cb(String(r.result));
  r.readAsDataURL(file);
}

const DEFAULT_STATS = { speed: 60, stamina: 60, stealth: 50, intelligence: 60, charm: 60, vocal: 60 };

window.AddBirdModal = function AddBirdModal({ open, onClose, onSubmit, onDelete, nextNum, editBird }) {
  const isEdit = !!editBird;
  const [name, setName] = _useState("");
  const [sci, setSci] = _useState("");
  const [date, setDate] = _useState("");
  const [loc, setLoc] = _useState("");
  const [habitat, setHabitat] = _useState("Forest");
  const [behavior, setBehavior] = _useState("Songbird");
  const [region, setRegion] = _useState("Pan-Indian");
  const [rarity, setRarity] = _useState("Common");
  const [hp, setHp] = _useState(60);
  const [title, setTitle] = _useState("");
  const [facts, setFacts] = _useState(["", "", ""]);
  const [photos, setPhotos] = _useState([]); // up to 5
  const [stats, setStats] = _useState(DEFAULT_STATS);
  const [moveName, setMoveName] = _useState("");
  const [moveDesc, setMoveDesc] = _useState("");

  _useEffect(() => {
    if (!open) return;
    if (editBird) {
      setName(editBird.name || "");
      setSci(editBird.sci || "");
      setDate("");
      setLoc(editBird.loc || "");
      setHabitat(editBird.habitat || "Forest");
      setBehavior(editBird.behavior || "Songbird");
      setRegion(editBird.region || "Pan-Indian");
      setRarity(editBird.rarity || "Common");
      setHp(editBird.hp || 60);
      setTitle(editBird.title || "");
      const f = editBird.facts || [];
      setFacts([f[0] || "", f[1] || "", f[2] || ""]);
      setPhotos(editBird.photos || (editBird.photo ? [editBird.photo] : []));
      setStats({ ...DEFAULT_STATS, ...(editBird.stats || {}) });
      setMoveName(editBird.move?.name || "");
      setMoveDesc(editBird.move?.desc || "");
    } else {
      setName(""); setSci(""); setDate(""); setLoc("");
      setHabitat("Forest"); setBehavior("Songbird"); setRegion("Pan-Indian");
      setRarity("Rare"); setHp(60); setTitle("The New Discovery");
      setFacts(["", "", ""]); setPhotos([]);
      setStats(DEFAULT_STATS);
      setMoveName("Fresh Find"); setMoveDesc("A brand-new sighting in the dex.");
    }
  }, [open, editBird]);

  if (!open) return null;

  const addPhoto = (e) => {
    const fs = e.target.files; if (!fs || !fs.length) return;
    let remaining = Math.max(0, 5 - photos.length);
    const picked = Array.from(fs).slice(0, remaining);
    let loaded = 0; const out = [];
    picked.forEach((f, i) => {
      readImg(f, (url) => {
        out[i] = url; loaded++;
        if (loaded === picked.length) setPhotos(p => [...p, ...out]);
      });
    });
    e.target.value = "";
  };

  const removePhoto = (i) => setPhotos(p => p.filter((_, j) => j !== i));
  const movePhoto = (i, dir) => setPhotos(p => {
    const j = i + dir;
    if (j < 0 || j >= p.length) return p;
    const out = p.slice(); [out[i], out[j]] = [out[j], out[i]]; return out;
  });

  const setStat = (k, v) => setStats(s => ({ ...s, [k]: Math.max(0, Math.min(100, +v || 0)) }));

  const formatDate = (iso) => {
    if (!iso) return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const d = new Date(iso); if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !loc.trim()) return;
    const out = {
      name: name.trim(),
      sci: sci.trim() || "—",
      loc: loc.trim(),
      habitat, behavior, region,
      rarity, hp: +hp || 60,
      title: title.trim() || (isEdit ? (editBird.title || "") : "The New Discovery"),
      facts: facts.filter(f => f.trim()),
      photos: photos,
      stats: { ...stats },
      move: { name: moveName.trim() || "Signature Move", desc: moveDesc.trim() || "—" },
    };
    if (isEdit) {
      onSubmit({ ...out, num: editBird.num });
    } else {
      onSubmit({ ...out, num: nextNum, date: formatDate(date), custom: true });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete || !editBird) return;
    if (confirm(`Delete "${editBird.name}" from the dex? This cannot be undone from this screen (the total count will update).`)) {
      onDelete(editBird);
      onClose();
    }
  };

  return (
    <div className="ab-back" onClick={onClose}>
      <form className="ab-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="ab-hdr">
          <h2>{isEdit ? "✎ EDIT SIGHTING" : "+ NEW SIGHTING"}</h2>
          <button type="button" className="ab-x" onClick={onClose}>✕</button>
        </div>
        <div className="ab-body">
          <div className="ab-dex">DEX #{String(isEdit ? editBird.num : nextNum).padStart(3, "0")}</div>

          <label className="ab-row">
            <span>Common name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Indian Roller" required />
          </label>

          <label className="ab-row">
            <span>Scientific name</span>
            <input value={sci} onChange={(e) => setSci(e.target.value)} placeholder="e.g. Coracias benghalensis" />
          </label>

          <div className="ab-grid2">
            {!isEdit && (
              <label className="ab-row">
                <span>Date spotted</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            )}
            <label className="ab-row" style={isEdit ? { gridColumn: "1/-1" } : null}>
              <span>Location *</span>
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Cubbon Park, Bengaluru" required />
            </label>
          </div>

          <div className="ab-row">
            <span>Habitat</span>
            <div className="ab-pills">
              {Object.keys(HABITAT_META).map(h => (
                <button key={h} type="button" className={`ab-pill ${habitat === h ? "on" : ""}`}
                        onClick={() => setHabitat(h)}>
                  <span>{HABITAT_META[h].emoji}</span> {h}
                </button>
              ))}
            </div>
          </div>

          <div className="ab-row">
            <span>Behavior</span>
            <div className="ab-pills">
              {Object.keys(BEHAVIOR_META).map(b => (
                <button key={b} type="button" className={`ab-pill ${behavior === b ? "on" : ""}`}
                        onClick={() => setBehavior(b)}>
                  <span>{BEHAVIOR_META[b].emoji}</span> {b}
                </button>
              ))}
            </div>
          </div>

          <div className="ab-row">
            <span>Region</span>
            <div className="ab-pills">
              {Object.keys(REGION_META).map(r => (
                <button key={r} type="button" className={`ab-pill ${region === r ? "on" : ""}`}
                        onClick={() => setRegion(r)}>
                  <span>{REGION_META[r].emoji}</span> {r}
                </button>
              ))}
            </div>
          </div>

          <div className="ab-row">
            <span>Rarity</span>
            <div className="ab-pills">
              {Object.keys(RARITY_META || {}).map(r => (
                <button key={r} type="button" className={`ab-pill rar-${r.toLowerCase()} ${rarity === r ? "on" : ""}`}
                        onClick={() => setRarity(r)}>
                  <span>{RARITY_META[r].emoji}</span> {r}
                </button>
              ))}
            </div>
          </div>

          <div className="ab-grid2">
            <label className="ab-row">
              <span>HP (max health)</span>
              <input type="number" min="10" max="999" value={hp} onChange={(e) => setHp(e.target.value)} />
            </label>
            <label className="ab-row">
              <span>Card title (subtitle)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Forest Whisperer" />
            </label>
          </div>

          {/* ─── STATS ─── */}
          <div className="ab-row ab-stats-row">
            <span>Stats (0–100)</span>
            <div className="ab-stats-grid">
              {Object.keys(STAT_META || {}).map(k => {
                const m = STAT_META[k];
                const v = stats[k] ?? 0;
                return (
                  <div key={k} className="ab-stat">
                    <div className="ab-stat-hd">
                      <span className="ab-stat-e">{m.emoji}</span>
                      <span className="ab-stat-l">{m.label}</span>
                      <input type="number" min="0" max="100" value={v}
                        onChange={(e) => setStat(k, e.target.value)} className="ab-stat-v" />
                    </div>
                    <input type="range" min="0" max="100" value={v}
                      onChange={(e) => setStat(k, e.target.value)}
                      style={{ "--p": `${v}%` }}
                      className="ab-stat-slider" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── SIGNATURE MOVE ─── */}
          <div className="ab-row">
            <span>Signature move</span>
            <div className="ab-move">
              <input className="ab-move-name" value={moveName}
                onChange={(e) => setMoveName(e.target.value)} placeholder="Move name (e.g. Sky Dive)" />
              <input className="ab-move-desc" value={moveDesc}
                onChange={(e) => setMoveDesc(e.target.value)} placeholder="Short description" />
            </div>
          </div>

          <div className="ab-row">
            <span>Fun facts</span>
            {facts.map((f, i) => (
              <input key={i} className="ab-fact" value={f} placeholder={`Fact ${i + 1}`}
                     onChange={(e) => setFacts(p => p.map((x, j) => j === i ? e.target.value : x))} />
            ))}
          </div>

          <div className="ab-row">
            <span>Photos (up to 5) <em className="ab-hint">— use ◀ ▶ to reorder</em></span>
            <div className="ab-photos-grid">
              {photos.map((p, i) => (
                <div key={i} className="ab-photo-slot has">
                  <img src={p} alt="" />
                  <span className="ab-photo-idx">{i + 1}</span>
                  <div className="ab-photo-reorder">
                    <button type="button" disabled={i === 0}
                      onClick={() => movePhoto(i, -1)} title="Move earlier">◀</button>
                    <button type="button" disabled={i === photos.length - 1}
                      onClick={() => movePhoto(i, +1)} title="Move later">▶</button>
                  </div>
                  <button type="button" className="ab-photo-x" onClick={() => removePhoto(i)}>✕</button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="ab-photo-slot">
                  +
                  <input type="file" accept="image/*" multiple onChange={addPhoto} style={{ display: "none" }} />
                </label>
              )}
            </div>
          </div>
        </div>
        <div className="ab-foot">
          {isEdit && onDelete && (
            <button type="button" className="ab-btn danger" onClick={handleDelete}>🗑 Delete card</button>
          )}
          <div className="ab-foot-spacer" />
          <button type="button" className="ab-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ab-btn primary">{isEdit ? "💾 Save changes" : "✦ Catch it!"}</button>
        </div>
      </form>
    </div>
  );
};
