/* global React, HABITAT_META, BEHAVIOR_META, REGION_META */
// Add-Bird modal + custom-bird storage
const { useState: _useState, useEffect: _useEffect, useCallback: _useCallback } = React;

const CUSTOM_KEY = "ph_custom_birds_v1";

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
  return [birds, add, remove];
};

window.AddBirdModal = function AddBirdModal({ open, onClose, onAdd, nextNum }) {
  const [name, setName] = _useState("");
  const [sci, setSci] = _useState("");
  const [date, setDate] = _useState("");
  const [loc, setLoc] = _useState("");
  const [habitat, setHabitat] = _useState("Forest");
  const [behavior, setBehavior] = _useState("Songbird");
  const [region, setRegion] = _useState("Pan-Indian");
  const [facts, setFacts] = _useState(["", "", ""]);
  const [photo, setPhoto] = _useState("");

  _useEffect(() => {
    if (!open) {
      setName(""); setSci(""); setDate(""); setLoc("");
      setHabitat("Forest"); setBehavior("Songbird"); setRegion("Pan-Indian");
      setFacts(["", "", ""]); setPhoto("");
    }
  }, [open]);

  if (!open) return null;

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(f);
  };

  const formatDate = (iso) => {
    if (!iso) return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const d = new Date(iso); if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !loc.trim()) return;
    const bird = {
      num: nextNum,
      name: name.trim(),
      sci: sci.trim() || "—",
      date: formatDate(date),
      loc: loc.trim(),
      habitat, behavior, region,
      facts: facts.filter(f => f.trim()),
      custom: true,
      photo: photo || null
    };
    onAdd(bird);
    onClose();
  };

  return (
    <div className="ab-back" onClick={onClose}>
      <form className="ab-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="ab-hdr">
          <h2>+ NEW SIGHTING</h2>
          <button type="button" className="ab-x" onClick={onClose}>✕</button>
        </div>
        <div className="ab-body">
          <div className="ab-dex">DEX #{String(nextNum).padStart(3, "0")}</div>

          <label className="ab-row">
            <span>Common name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Indian Roller" required />
          </label>

          <label className="ab-row">
            <span>Scientific name</span>
            <input value={sci} onChange={(e) => setSci(e.target.value)} placeholder="e.g. Coracias benghalensis" />
          </label>

          <div className="ab-grid2">
            <label className="ab-row">
              <span>Date spotted</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="ab-row">
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
            <span>Fun facts</span>
            {facts.map((f, i) => (
              <input key={i} className="ab-fact" value={f} placeholder={`Fact ${i + 1}`}
                     onChange={(e) => setFacts(p => p.map((x, j) => j === i ? e.target.value : x))} />
            ))}
          </div>

          <div className="ab-row">
            <span>Photo</span>
            <label className="ab-photo">
              {photo ? <img src={photo} alt="" /> :
                <span className="ab-ph-empty">📷 Click to add a photo</span>}
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            </label>
          </div>
        </div>
        <div className="ab-foot">
          <button type="button" className="ab-btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ab-btn primary">✦ Catch it!</button>
        </div>
      </form>
    </div>
  );
};
