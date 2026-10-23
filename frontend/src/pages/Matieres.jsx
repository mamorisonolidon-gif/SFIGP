import { useState, useEffect, useCallback } from "react";
import { Icon } from "../components/Icons";

const BASE = "http://127.0.0.1:5000/api";
const JOURS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const COULEURS = ["#2563eb","#059669","#dc2626","#d97706","#7c3aed","#0891b2","#db2777","#65a30d","#ea580c","#0f766e"];
const EMPTY_MAT  = { nom:"", code:"", couleur:"#2563eb", enseignant:"", cours:[] };
const EMPTY_COURS = { jour:"Lundi", heure_debut:"08:00", heure_fin:"09:00", salle:"" };

// ── Client API robuste ────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let body;
    try { body = await res.json(); } catch { body = {}; }
    if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
    return body;
  } catch (e) {
    if (e.message.includes("Failed to fetch") || e.name === "TypeError") {
      throw new Error("Serveur inaccessible — vérifiez que backend/app.py tourne sur le port 5000");
    }
    throw e;
  }
}

// ── Utilitaires horaires ──────────────────────────────────────
function heureToMin(h = "00:00") {
  const parts = (h || "00:00").split(":");
  return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
}

function pad(n) { return String(n).padStart(2, "0"); }

// ── Barre timeline ────────────────────────────────────────────
function TimelineBar({ cours = [], heureActuelle, jourActuel }) {
  const START = 6 * 60, END = 19 * 60, TOTAL = END - START;
  const nowMin = heureToMin(heureActuelle);
  const coursAuj = cours.filter(c => c.jour === jourActuel);

  return (
    <div style={{ position:"relative", height:28, background:"var(--bg2)", borderRadius:6, overflow:"hidden", marginTop:6 }}>
      {coursAuj.map((c, i) => {
        const left  = Math.max(0, (heureToMin(c.heure_debut) - START) / TOTAL * 100);
        const width = Math.max(1, Math.min(100 - left, (heureToMin(c.heure_fin) - heureToMin(c.heure_debut)) / TOTAL * 100));
        const actif = nowMin >= heureToMin(c.heure_debut) && nowMin < heureToMin(c.heure_fin);
        return (
          <div key={i} title={`${c.heure_debut}–${c.heure_fin}${c.salle ? " · " + c.salle : ""}`} style={{
            position:"absolute", top:2, bottom:2,
            left:`${left}%`, width:`${width}%`,
            background: actif ? "var(--green)" : "var(--accent)",
            opacity: actif ? 1 : 0.65,
            borderRadius:4,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:8, color:"#fff", fontWeight:700, overflow:"hidden", whiteSpace:"nowrap",
          }}>
            {width > 8 ? c.heure_debut : ""}
          </div>
        );
      })}
      {/* Curseur heure actuelle */}
      {nowMin >= START && nowMin <= END && (
        <div style={{ position:"absolute", top:0, bottom:0, width:2, background:"var(--red)", left:`${(nowMin - START) / TOTAL * 100}%`, zIndex:5 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--red)", marginLeft:-2, marginTop:-1 }} />
        </div>
      )}
    </div>
  );
}

// ── Bandeau cours actuel / prochain ──────────────────────────
function CoursStatus({ coursNow }) {
  if (!coursNow) return null;
  const { cours_actuel: actuel, prochain_cours: prochain, heure } = coursNow;

  if (actuel) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"var(--grn-lt)", border:"1px solid rgba(5,150,105,.25)", borderRadius:"var(--radius)", marginBottom:20 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--green)", animation:"blink 1.5s ease-in-out infinite", flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--green)" }}>
            <Icon name="activity" size={12} color="var(--green)" style={{marginRight:6}} /> Cours en cours : <span style={{ color:"var(--ink)" }}>{actuel.matiere_nom}</span>
          </div>
          <div style={{ fontSize:11, color:"var(--ink3)", marginTop:2, fontFamily:"var(--font-mono)" }}>
            {actuel.heure_debut} → {actuel.heure_fin}{actuel.salle ? " · " + actuel.salle : ""}
          </div>
        </div>
        <span style={{ background:"var(--green)", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:99 }}>ACTIF</span>
      </div>
    );
  }
  if (prochain) {
    const diff = heureToMin(prochain.heure_debut) - heureToMin(heure);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"var(--amb-lt)", border:"1px solid rgba(217,119,6,.25)", borderRadius:"var(--radius)", marginBottom:20 }}>
        <div style={{ width:32,height:32,borderRadius:8,background:"var(--amb-lt)",border:"1px solid rgba(251,191,36,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Icon name="clock" size={16} color="var(--amber)" /></div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--amber)" }}>
            Prochain cours : <span style={{ color:"var(--ink)" }}>{prochain.matiere_nom}</span>
          </div>
          <div style={{ fontSize:11, color:"var(--ink3)", marginTop:2, fontFamily:"var(--font-mono)" }}>
            {prochain.heure_debut} → {prochain.heure_fin}{prochain.salle ? " · " + prochain.salle : ""}
          </div>
        </div>
        {diff > 0 && <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--amber)", fontWeight:700 }}>dans {diff} min</span>}
      </div>
    );
  }
  return (
    <div style={{ padding:"10px 16px", background:"var(--bg2)", borderRadius:"var(--radius)", marginBottom:20, fontSize:12, color:"var(--ink3)" }}>
      <Icon name="book" size={14} color="var(--ink3)" style={{marginRight:6}} /> Aucun cours programmé en ce moment
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function Matieres() {
  const [matieres, setMatieres]     = useState([]);
  const [coursNow, setCoursNow]     = useState(null);
  const [heureActuelle, setHeure]   = useState("00:00");
  const [jourActuel, setJour]       = useState("Lundi");
  const [form, setForm]             = useState(null);
  const [formData, setFormData]     = useState(EMPTY_MAT);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [loadError, setLoadError]   = useState(null);

  const JOURS_FR = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

  // Horloge
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setHeure(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
      setJour(JOURS_FR[now.getDay()]);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Charger données
  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const mats = await apiFetch("/matieres");
      setMatieres(Array.isArray(mats) ? mats : []);
    } catch (e) {
      setLoadError(e.message);
    }
    try {
      const now = await apiFetch("/cours/maintenant");
      setCoursNow(now);
    } catch (e) {
      // Pas bloquant
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Rafraîchir cours toutes les minutes
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const now = await apiFetch("/cours/maintenant");
        setCoursNow(now);
      } catch {}
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // ── Formulaire ──
  const openAdd = () => {
    setFormData({ ...EMPTY_MAT, cours: [] });
    setError(null);
    setForm("add");
  };

  const openEdit = (mat) => {
    setFormData({
      id: mat.id, nom: mat.nom, code: mat.code,
      couleur: mat.couleur || "#2563eb",
      enseignant: mat.enseignant || "",
      cours: (mat.cours || []).map(c => ({ ...c })),
    });
    setError(null);
    setForm("edit");
  };

  const addCours = () => setFormData(f => ({ ...f, cours: [...f.cours, { ...EMPTY_COURS }] }));

  const updateCours = (i, field, val) => setFormData(f => {
    const cours = [...f.cours];
    cours[i] = { ...cours[i], [field]: val };
    return { ...f, cours };
  });

  const removeCours = (i) => setFormData(f => ({ ...f, cours: f.cours.filter((_, idx) => idx !== i) }));

  const save = async () => {
    const nom  = (formData.nom  || "").trim();
    const code = (formData.code || "").trim().toUpperCase();
    if (!nom)  { setError("Le nom de la matière est obligatoire."); return; }
    if (!code) { setError("Le code est obligatoire (ex: MATH)."); return; }

    // Valider les cours
    for (let i = 0; i < formData.cours.length; i++) {
      const c = formData.cours[i];
      if (!c.jour || !c.heure_debut || !c.heure_fin) {
        setError(`Séance ${i+1} : jour, heure début et heure fin sont requis.`); return;
      }
      if (heureToMin(c.heure_fin) <= heureToMin(c.heure_debut)) {
        setError(`Séance ${i+1} (${c.jour}) : l'heure de fin doit être après l'heure de début.`); return;
      }
    }

    setError(null);
    setSaving(true);
    try {
      const payload = { nom, code, couleur: formData.couleur, enseignant: formData.enseignant || "", cours: formData.cours };
      if (form === "add") {
        await apiFetch("/matieres", { method:"POST", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/matieres/${formData.id}`, { method:"PUT", body: JSON.stringify(payload) });
      }
      setForm(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteMat = async (mat) => {
    if (!confirm(`Supprimer "${mat.nom}" et tous ses cours ?`)) return;
    try {
      await apiFetch(`/matieres/${mat.id}`, { method:"DELETE" });
      await load();
    } catch (e) {
      alert("Erreur : " + e.message);
    }
  };

  // ── Rendu ──
  return (
    <div>
      {/* En-tête */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"var(--font-head)", fontSize:18, fontWeight:700 }}>Matières & Horaires</div>
          <div style={{ fontSize:12, color:"var(--ink3)", marginTop:2 }}>
            {jourActuel} — <span style={{ fontFamily:"var(--font-mono)", fontWeight:700 }}>{heureActuelle}</span>
          </div>
        </div>
        <button onClick={openAdd} style={{ padding:"9px 18px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer" }}>
           Ajouter une matière
        </button>
      </div>

      {/* Erreur de chargement */}
      {loadError && (
        <div style={{ padding:"12px 16px", background:"var(--red-lt)", border:"1px solid rgba(220,38,38,.2)", borderRadius:"var(--radius)", marginBottom:20, fontSize:12, color:"var(--red)", fontWeight:700 }}>
          <Icon name="alertTri" size={14} color="var(--red)" style={{marginRight:6}} /> {loadError}
          <button onClick={load} style={{ marginLeft:12, padding:"3px 10px", borderRadius:6, background:"var(--red)", color:"#fff", border:"none", fontSize:11, cursor:"pointer" }}>Réessayer</button>
        </div>
      )}

      {/* Cours actuel */}
      <CoursStatus coursNow={coursNow} />

      {/* Grille matières */}
      {matieres.length === 0 && !loadError ? (
        <div style={{ padding:40, textAlign:"center", background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", color:"var(--ink3)" }}>
          <div style={{ width:60,height:60,borderRadius:"50%",background:"var(--bg3)",border:"1px solid var(--border2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}><Icon name="book" size={28} color="var(--ink3)" /></div>
          <div style={{ fontSize:14, fontWeight:700 }}>Aucune matière</div>
          <div style={{ fontSize:12, marginTop:6 }}>Cliquez sur "+ Ajouter une matière" pour commencer</div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16, marginBottom:24 }}>
          {matieres.map(mat => {
            const coursAuj   = (mat.cours || []).filter(c => c.jour === jourActuel);
            const enCours    = coursNow?.cours_actuel?.matiere_nom === mat.nom;
            return (
              <div key={mat.id} style={{
                background:"var(--card)",
                border:`2px solid ${enCours ? mat.couleur : "var(--border)"}`,
                borderRadius:"var(--radius-lg)", padding:18,
                boxShadow: enCours ? `0 0 0 3px ${mat.couleur}22` : "var(--shadow)",
                transition:"all .18s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="var(--shadow-lg)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow = enCours ? `0 0 0 3px ${mat.couleur}22` : "var(--shadow)"; }}
              >
                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:mat.couleur, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#fff", fontFamily:"var(--font-mono)" }}>{mat.code}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700 }}>{mat.nom}</div>
                    {mat.enseignant && <div style={{ fontSize:11, color:"var(--ink3)", marginTop:1 }}>👤 {mat.enseignant}</div>}
                  </div>
                  {enCours && <span style={{ background:mat.couleur, color:"#fff", fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:99 }}>EN COURS</span>}
                </div>

                {/* Timeline */}
                <div style={{ fontSize:10, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:".06em" }}>
                  {jourActuel} — {coursAuj.length > 0 ? `${coursAuj.length} séance(s)` : "Pas de cours"}
                </div>
                <TimelineBar cours={mat.cours||[]} heureActuelle={heureActuelle} jourActuel={jourActuel} />

                {/* Séances du jour */}
                {coursAuj.length > 0 && (
                  <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:3 }}>
                    {coursAuj.map((c, i) => {
                      const actif = heureToMin(heureActuelle) >= heureToMin(c.heure_debut) && heureToMin(heureActuelle) < heureToMin(c.heure_fin);
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px", borderRadius:6, background: actif ? mat.couleur+"18" : "var(--bg)", border: actif ? `1px solid ${mat.couleur}50` : "1px solid transparent" }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background: actif ? mat.couleur : "var(--bg3)", flexShrink:0 }} />
                          <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink2)", fontWeight: actif ? 700 : 400 }}>
                            {c.heure_debut} → {c.heure_fin}
                          </span>
                          {c.salle && <span style={{ fontSize:10, color:"var(--ink3)", marginLeft:"auto" }}> {c.salle}</span>}
                          {actif && <span style={{ fontSize:9, fontWeight:700, color:mat.couleur }}>● ACTIF</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Indicateurs semaine */}
                <div style={{ marginTop:12, display:"flex", gap:3 }}>
                  {JOURS.map(j => {
                    const nb = (mat.cours||[]).filter(c => c.jour === j).length;
                    return <div key={j} title={`${j}: ${nb} cours`} style={{ flex:1, height:3, borderRadius:2, background: nb > 0 ? mat.couleur : "var(--bg2)" }} />;
                  })}
                </div>
                <div style={{ display:"flex", gap:3, marginTop:3 }}>
                  {JOURS.map(j => (
                    <div key={j} style={{ flex:1, textAlign:"center", fontSize:8, color: j===jourActuel ? "var(--ink)" : "var(--ink3)", fontWeight: j===jourActuel ? 700 : 400 }}>{j.slice(0,2)}</div>
                  ))}
                </div>

                {/* Boutons */}
                <div style={{ display:"flex", gap:6, marginTop:14 }}>
                  <button onClick={() => openEdit(mat)} style={{ flex:1, padding:"6px 0", borderRadius:6, border:"1px solid var(--border2)", background:"var(--acc-lt)", fontSize:11, fontWeight:700, color:"var(--accent)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><Icon name="edit" size={11} color="var(--ink2)" /> Modifier</button>
                  <button onClick={() => deleteMat(mat)} style={{ padding:"6px 12px", borderRadius:6, border:"1px solid rgba(220,38,38,.2)", background:"var(--red-lt)", fontSize:11, fontWeight:700, color:"var(--red)", cursor:"pointer" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Emploi du temps hebdomadaire */}
      {matieres.length > 0 && (
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden", boxShadow:"var(--shadow)" }}>
          <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700 }}> Emploi du temps — semaine</div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:580 }}>
              <thead>
                <tr>
                  <th style={{ width:70, padding:"10px 12px", borderBottom:"1px solid var(--border)", borderRight:"1px solid var(--border)", background:"var(--bg)", fontSize:10, fontWeight:700, color:"var(--ink3)", textAlign:"center" }}>Heure</th>
                  {JOURS.map(j => (
                    <th key={j} style={{
                      padding:"10px 12px", borderBottom:"1px solid var(--border)", borderRight:"1px solid var(--border)",
                      background: j===jourActuel ? "#dbeafe" : "var(--bg)",
                      fontSize:11, fontWeight:700, color: j===jourActuel ? "var(--accent)" : "var(--ink3)",
                      textAlign:"center",
                    }}>
                      {j}
                      {j===jourActuel && <div style={{ fontSize:8, marginTop:1, color:"var(--accent)", fontWeight:400 }}>aujourd'hui</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => `${pad(i + 7)}:00`).map(heure => (
                  <tr key={heure}>
                    <td style={{ padding:"6px 12px", borderBottom:"1px solid var(--border)", borderRight:"1px solid var(--border)", fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink3)", background:"var(--bg)", textAlign:"center", whiteSpace:"nowrap" }}>
                      {heure}
                      {heure.slice(0,2) === heureActuelle.slice(0,2) && (
                        <span style={{ marginLeft:4, color:"var(--red)", fontSize:10 }}>◀</span>
                      )}
                    </td>
                    {JOURS.map(jour => {
                      const cellCours = matieres.flatMap(m =>
                        (m.cours||[]).filter(c =>
                          c.jour === jour &&
                          heureToMin(c.heure_debut) <= heureToMin(heure) &&
                          heureToMin(c.heure_fin) > heureToMin(heure)
                        ).map(c => ({ ...c, matiere_nom: m.nom, couleur: m.couleur }))
                      );
                      return (
                        <td key={jour} style={{
                          padding:"4px 8px", borderBottom:"1px solid var(--border)", borderRight:"1px solid var(--border)",
                          background: jour===jourActuel && heure.slice(0,2)===heureActuelle.slice(0,2) ? "#eff6ff" : "transparent",
                          minWidth:100, verticalAlign:"top",
                        }}>
                          {cellCours.map((c, i) => (
                            <div key={i} style={{ background:c.couleur, color:"#fff", borderRadius:4, padding:"3px 7px", marginBottom:2, fontSize:10, fontWeight:700 }}>
                              <div>{c.matiere_nom}</div>
                              <div style={{ opacity:.85, fontSize:9, fontFamily:"var(--font-mono)" }}>{c.heure_debut}–{c.heure_fin}{c.salle ? " · "+c.salle : ""}</div>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL FORMULAIRE ── */}
      {form && (
        <div onClick={e => { if (e.target === e.currentTarget) setForm(null); }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(8px)" }}>
          <div style={{ background:"var(--card)", borderRadius:20, padding:28, width:640, maxWidth:"96vw", maxHeight:"92vh", overflowY:"auto", boxShadow:"var(--shadow-lg), 0 0 60px rgba(108,143,255,.1)", border:"1px solid var(--border2)" }}>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontFamily:"var(--font-head)", fontSize:16, fontWeight:700 }}>
                {form === "add" ? <><Icon name="plus" size={15} color="var(--ink)" style={{marginRight:6}} /> Nouvelle matière</> : <><Icon name="edit" size={15} color="var(--ink)" style={{marginRight:6}} /> {`Modifier — ${formData.nom}`}</>}
              </div>
              <button onClick={() => setForm(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ink3)", fontSize:22 }}>×</button>
            </div>

            {/* Infos matière */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Nom de la matière *</label>
                <input value={formData.nom} onChange={e => setFormData(f => ({...f, nom:e.target.value}))} placeholder="Ex : Mathématiques"
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--bg)", outline:"none" }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Code * (ex: MATH)</label>
                <input value={formData.code} onChange={e => setFormData(f => ({...f, code:e.target.value.toUpperCase().slice(0,6)}))} placeholder="MATH"
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-mono)", color:"var(--ink)", background:"var(--bg)", outline:"none" }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Enseignant</label>
                <input value={formData.enseignant||""} onChange={e => setFormData(f => ({...f, enseignant:e.target.value}))} placeholder="Ex : Mr Marino"
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--bg)", outline:"none" }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:8 }}>Couleur</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {COULEURS.map(c => (
                    <button key={c} onClick={() => setFormData(f => ({...f, couleur:c}))} style={{
                      width:28, height:28, borderRadius:7, background:c, border:"none", cursor:"pointer",
                      outline: formData.couleur === c ? "3px solid var(--ink)" : "2px solid transparent",
                      outlineOffset:2, transition:"outline .1s",
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Aperçu couleur */}
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:`${formData.couleur}18`, border:`1px solid ${formData.couleur}50`, borderRadius:"var(--radius)", marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:8, background:formData.couleur, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#fff", fontFamily:"var(--font-mono)" }}>{formData.code||"???"}</span>
              </div>
              <div>
                <div style={{ fontFamily:"var(--font-head)", fontSize:13, fontWeight:700 }}>{formData.nom||"Nom de la matière"}</div>
                {formData.enseignant && <div style={{ fontSize:11, color:"var(--ink3)" }}> {formData.enseignant}</div>}
              </div>
            </div>

            {/* Séances */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700 }}> Séances ({formData.cours.length})</div>
              <button onClick={addCours} style={{ padding:"6px 14px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                + Ajouter séance
              </button>
            </div>

            {formData.cours.length === 0 ? (
              <div style={{ padding:20, textAlign:"center", background:"var(--bg)", borderRadius:"var(--radius)", color:"var(--ink3)", fontSize:12, marginBottom:16, border:"1.5px dashed var(--border2)" }}>
                Aucune séance programmée. Cliquez sur "+ Ajouter séance".
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16, maxHeight:280, overflowY:"auto" }}>
                {formData.cours.map((c, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"130px 100px 100px 100px 36px", gap:8, alignItems:"end", padding:"12px", background:"var(--bg)", borderRadius:"var(--radius)", border:"1px solid var(--border)" }}>
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", display:"block", marginBottom:4 }}>Jour</label>
                      <select value={c.jour} onChange={e => updateCours(i,"jour",e.target.value)}
                        style={{ width:"100%", padding:"7px 8px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:12, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--card)", outline:"none" }}>
                        {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", display:"block", marginBottom:4 }}>Début</label>
                      <input type="time" value={c.heure_debut} onChange={e => updateCours(i,"heure_debut",e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:12, fontFamily:"var(--font-mono)", color:"var(--ink)", background:"var(--card)", outline:"none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", display:"block", marginBottom:4 }}>Fin</label>
                      <input type="time" value={c.heure_fin} onChange={e => updateCours(i,"heure_fin",e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:12, fontFamily:"var(--font-mono)", color:"var(--ink)", background:"var(--card)", outline:"none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", display:"block", marginBottom:4 }}>Salle</label>
                      <input placeholder="A1" value={c.salle||""} onChange={e => updateCours(i,"salle",e.target.value)}
                        style={{ width:"100%", padding:"7px 6px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:12, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--card)", outline:"none" }} />
                    </div>
                    <button onClick={() => removeCours(i)} style={{ padding:"7px 0", borderRadius:6, background:"var(--red-lt)", color:"var(--red)", border:"none", fontSize:14, fontWeight:700, cursor:"pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Aperçu semaine mini */}
            {formData.cours.length > 0 && (
              <div style={{ padding:"10px 14px", background:"var(--bg)", borderRadius:"var(--radius)", marginBottom:16, border:"1px solid var(--border)" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Aperçu semaine</div>
                <div style={{ display:"flex", gap:4 }}>
                  {JOURS.map(j => {
                    const nb = formData.cours.filter(c => c.jour === j).length;
                    return (
                      <div key={j} style={{ flex:1, textAlign:"center" }}>
                        <div style={{ height:5, borderRadius:3, background: nb > 0 ? formData.couleur : "var(--bg2)", marginBottom:3 }} />
                        <div style={{ fontSize:8, color:"var(--ink3)" }}>{j.slice(0,2)}</div>
                        {nb > 0 && <div style={{ fontSize:9, fontWeight:700, color:formData.couleur }}>{nb}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div style={{ background:"var(--red-lt)", border:"1px solid rgba(220,38,38,.2)", borderRadius:"var(--radius)", padding:"10px 14px", marginBottom:14, fontSize:12, color:"var(--red)", fontWeight:700 }}>
                <Icon name="alertTri" size={13} color="var(--red)" style={{marginRight:6}} /> {error}
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={save} disabled={saving} style={{
                flex:1, padding:"11px 0", borderRadius:"var(--radius)",
                background: saving ? "var(--bg2)" : "linear-gradient(135deg, var(--accent), var(--acc-dk))",
                color: saving ? "var(--ink3)" : "#fff",
                border:"none", fontSize:13, fontWeight:700,
                cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? <><div style={{width:14,height:14,border:"2px solid var(--ink3)",borderTopColor:"transparent",borderRadius:"50%",animation:"rotate360 .8s linear infinite",marginRight:6}} />Enregistrement...</> : form === "add" ? <><Icon name="check" size={14} color="white" style={{marginRight:6}} />Créer la matière</> : <><Icon name="save" size={14} color="white" style={{marginRight:6}} />Enregistrer</>}
              </button>
              <button onClick={() => setForm(null)} style={{ padding:"11px 20px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", boxShadow:"0 3px 12px var(--acc-glow)", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
