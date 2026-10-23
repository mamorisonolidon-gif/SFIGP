import { useState, useEffect, useCallback } from "react";
import { Avatar } from "../components/Badge";
import { Icon } from "../components/Icons";

const BASE = "http://127.0.0.1:5000/api";
async function apiFetch(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
}
function pad(n) { return String(n).padStart(2,"0"); }

const STATUT_CFG = {
  present: { label:"Présent",      color:"var(--green)", bg:"var(--grn-lt)", border:"rgba(52,211,153,.2)",  icon:"checkCircle" },
  late:    { label:"Retard",        color:"var(--amber)", bg:"var(--amb-lt)", border:"rgba(251,191,36,.2)",  icon:"clockAlert"  },
  absent:  { label:"Absent",        color:"var(--red)",   bg:"var(--red-lt)", border:"rgba(248,113,113,.2)", icon:"xCircle"     },
  unset:   { label:"Non renseigné", color:"var(--ink3)",  bg:"var(--bg3)",    border:"var(--border)",        icon:"help"        },
};

function KpiCard({ iconName, label, value, color, bg, border, total }) {
  const pct = total > 0 ? Math.round(value / total * 100) : 0;
  return (
    <div style={{ background:"var(--card)", border:`1px solid ${border}`, borderRadius:"var(--radius-lg)", padding:"20px", boxShadow:"var(--shadow)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, right:0, width:80, height:80, background:`radial-gradient(circle at top right, ${bg.replace("var(--grn-lt)","rgba(52,211,153,.08)").replace("var(--amb-lt)","rgba(251,191,36,.08)").replace("var(--red-lt)","rgba(248,113,113,.08)").replace("var(--bg3)","rgba(255,255,255,.03)")} 0%, transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:bg, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon name={iconName} size={16} color={color} />
        </div>
        <span style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", color:"var(--ink3)", textTransform:"uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily:"var(--font-head)", fontSize:38, fontWeight:700, color, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, color:"var(--ink3)", marginBottom:10 }}>{pct}% de la classe</div>
      <div style={{ height:2, borderRadius:99, background:"var(--bg3)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width .6s ease" }} />
      </div>
    </div>
  );
}

function EleveRow({ e }) {
  const cfg = STATUT_CFG[e.statut] || STATUT_CFG.unset;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid var(--border)", transition:"background .1s" }}
      onMouseEnter={el => el.currentTarget.style.background="var(--bg2)"}
      onMouseLeave={el => el.currentTarget.style.background="transparent"}
    >
      <Avatar prenom={e.prenom} nom={e.nom} id={e.id} size={36} fontSize={12} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{e.prenom} {e.nom}</div>
        <div style={{ fontSize:10, color:"var(--ink3)", fontFamily:"var(--font-mono)", marginTop:1 }}>{e.id}</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:99, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, fontSize:11, fontWeight:600 }}>
          <Icon name={cfg.icon} size={12} color={cfg.color} />
          {cfg.label}
        </div>
        {e.heure && (
          <div style={{ fontSize:10, color:"var(--ink3)", fontFamily:"var(--font-mono)", marginTop:4, display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
            <Icon name="clock" size={10} color="var(--ink3)" />
            {e.heure}
            {e.confiance && <span style={{ opacity:.5 }}>· {e.confiance}%</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock]     = useState("");
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    try { const d = await apiFetch("/stats"); setStats(d); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, gap:10, color:"var(--ink3)" }}>
      <div style={{ width:18, height:18, border:"2px solid var(--border2)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"rotate360 .8s linear infinite" }} />
      Chargement...
    </div>
  );

  const cours   = stats?.cours_actuel;
  const prochain = stats?.prochain_cours;
  const total   = stats?.total_eleves || 1;
  const s       = cours?.stats || { present:0, late:0, absent:0, unset:total };
  const eleves  = (cours?.eleves || []).filter(e => filter === "all" || e.statut === filter);

  return (
    <div>
      {/* ── Bandeau cours ── */}
      {cours ? (
        <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 22px", background:`linear-gradient(135deg, ${cours.couleur}20, ${cours.couleur}08)`, border:`1px solid ${cours.couleur}40`, borderRadius:"var(--radius-lg)", marginBottom:24, boxShadow:`0 0 30px ${cours.couleur}10` }}>
          <div style={{ width:48, height:48, borderRadius:12, background:cours.couleur, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 16px ${cours.couleur}40` }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#fff", fontFamily:"var(--font-mono)" }}>{cours.code}</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:cours.couleur, animation:"blink 1.5s ease-in-out infinite" }} />
              <span style={{ fontFamily:"var(--font-head)", fontSize:17, fontWeight:700, color:"var(--ink)" }}>{cours.matiere_nom}</span>
              <span style={{ fontSize:10, fontWeight:700, background:cours.couleur, color:"#fff", padding:"2px 9px", borderRadius:99, letterSpacing:".05em" }}>EN COURS</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:14, fontSize:12, color:"var(--ink3)" }}>
              <span style={{ display:"flex", alignItems:"center", gap:4, fontFamily:"var(--font-mono)" }}>
                <Icon name="clock" size={12} color="var(--ink3)" />
                {cours.heure_debut} → {cours.heure_fin}
              </span>
              {cours.salle && (
                <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <Icon name="pin" size={12} color="var(--ink3)" />
                  {cours.salle}
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"var(--ink3)", marginBottom:2 }}>Heure actuelle</div>
            <div style={{ fontFamily:"var(--font-mono)", fontSize:22, fontWeight:700, color:"var(--ink)", letterSpacing:".04em" }}>{clock}</div>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 22px", background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", marginBottom:24 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"var(--bg3)", border:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Icon name="book" size={20} color="var(--ink3)" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--ink)", marginBottom:3 }}>Aucun cours en ce moment</div>
            {prochain && (
              <div style={{ fontSize:12, color:"var(--ink3)", display:"flex", alignItems:"center", gap:6 }}>
                <Icon name="clock" size={12} color="var(--amber)" />
                Prochain : <strong style={{ color:"var(--ink)" }}>{prochain.matiere_nom}</strong> à <strong style={{ color:"var(--amber)", fontFamily:"var(--font-mono)" }}>{prochain.heure_debut}</strong>
                {prochain.salle && <span>· {prochain.salle}</span>}
              </div>
            )}
          </div>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:20, fontWeight:700, color:"var(--ink3)", letterSpacing:".04em" }}>{clock}</div>
        </div>
      )}

      {/* ── KPI ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <KpiCard iconName="checkCircle" label="Présents"      value={s.present} color="var(--green)" bg="var(--grn-lt)" border="rgba(52,211,153,.2)"  total={total} />
        <KpiCard iconName="clockAlert"  label="Retards"        value={s.late}    color="var(--amber)" bg="var(--amb-lt)" border="rgba(251,191,36,.2)"  total={total} />
        <KpiCard iconName="xCircle"     label="Absents"         value={s.absent}  color="var(--red)"   bg="var(--red-lt)" border="rgba(248,113,113,.2)" total={total} />
        <KpiCard iconName="help"        label="Non renseignés"  value={s.unset}   color="var(--ink3)"  bg="var(--bg3)"    border="var(--border)"         total={total} />
      </div>

      {/* ── Note reset ── */}
      {prochain && cours && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:"var(--acc-lt)", border:"1px solid var(--border3)", borderRadius:"var(--radius)", marginBottom:20, fontSize:12, color:"var(--accent)" }}>
          <Icon name="refresh" size={14} color="var(--accent)" />
          Les présences seront remises à zéro au prochain cours : <strong>{prochain.matiere_nom}</strong> à <strong style={{ fontFamily:"var(--font-mono)" }}>{prochain.heure_debut}</strong>
        </div>
      )}

      {/* ── Graphiques : Pie + Bar ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        {/* Diagramme circulaire présences du cours */}
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"20px", boxShadow:"var(--shadow)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <Icon name="pieChart" size={16} color="var(--accent)" />
            <span style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700 }}>Répartition du cours actuel</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {/* SVG Pie */}
            <svg width="110" height="110" viewBox="0 0 36 36" style={{ flexShrink:0 }}>
              {(() => {
                const data = [
                  { val:s.present, color:"var(--green)" },
                  { val:s.late,    color:"var(--amber)" },
                  { val:s.absent,  color:"var(--red)"   },
                  { val:s.unset,   color:"var(--bg3)"   },
                ].filter(d => d.val > 0);
                const tot = data.reduce((a,d) => a + d.val, 0) || 1;
                let angle = -Math.PI / 2;
                const slices = data.map(d => {
                  const sweep = (d.val / tot) * 2 * Math.PI;
                  const x1 = 18 + 16 * Math.cos(angle);
                  const y1 = 18 + 16 * Math.sin(angle);
                  angle += sweep;
                  const x2 = 18 + 16 * Math.cos(angle);
                  const y2 = 18 + 16 * Math.sin(angle);
                  const large = sweep > Math.PI ? 1 : 0;
                  return `<path d="M18,18 L${x1.toFixed(2)},${y1.toFixed(2)} A16,16 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${d.color}" opacity="0.9"/>`;
                });
                const taux = Math.round((s.present + s.late) / tot * 100);
                return (
                  <>
                    <circle cx="18" cy="18" r="16" fill="var(--bg3)" />
                    {data.map((d, i) => {
                      const sweep2 = (d.val / tot) * 2 * Math.PI;
                      return null; // handled below
                    })}
                    <g dangerouslySetInnerHTML={{ __html: slices.join("") }} />
                    <circle cx="18" cy="18" r="9" fill="var(--card)" />
                    <text x="18" y="16.5" textAnchor="middle" fill="var(--ink)" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif">{taux}%</text>
                    <text x="18" y="21" textAnchor="middle" fill="var(--ink3)" fontSize="2.8" fontFamily="sans-serif">présence</text>
                  </>
                );
              })()}
            </svg>
            {/* Légende */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
              {[["present","Présents",s.present,"var(--green)"],["late","Retards",s.late,"var(--amber)"],["absent","Absents",s.absent,"var(--red)"],["unset","Non rens.",s.unset,"var(--ink3)"]].map(([k,l,n,c]) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:c, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:"var(--ink2)", flex:1 }}>{l}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"var(--ink)", fontFamily:"var(--font-mono)" }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graphique hebdo en barres */}
        {(stats?.weekly || []).length > 0 && (
          <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"20px", boxShadow:"var(--shadow)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <Icon name="barChart" size={16} color="var(--accent)" />
              <span style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700 }}>Taux — 7 derniers jours</span>
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:72 }}>
              {stats.weekly.map((d, i) => {
                const isLast = i === stats.weekly.length - 1;
                const h = Math.max(4, Math.round(d.taux / 100 * 72));
                const barColor = d.taux >= 75 ? "var(--green)" : d.taux >= 50 ? "var(--amber)" : "var(--red)";
                return (
                  <div key={d.date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:8, color:"var(--ink3)", fontFamily:"var(--font-mono)" }}>{d.taux}%</span>
                    <div style={{ width:"100%", height:h, borderRadius:"4px 4px 0 0", background: isLast ? `linear-gradient(180deg, ${barColor}, ${barColor}88)` : "var(--bg3)", border:`1px solid ${isLast ? barColor : "var(--border)"}`, transition:"height .4s ease" }} />
                    <span style={{ fontSize:8, color: isLast ? "var(--accent)" : "var(--ink3)", fontFamily:"var(--font-mono)", fontWeight: isLast ? 700 : 400 }}>{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Liste élèves ── */}
      {cours && (
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden", boxShadow:"var(--shadow)" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
              <Icon name="users" size={16} color="var(--accent)" />
              <span style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700 }}>Présences — {cours.matiere_nom}</span>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[["all","Tous",total],["present","Présents",s.present],["late","Retards",s.late],["absent","Absents",s.absent],["unset","Non renseignés",s.unset]].map(([k,l,n]) => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding:"4px 12px", borderRadius:99,
                  border: filter===k ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: filter===k ? "var(--acc-lt)" : "var(--bg2)",
                  color: filter===k ? "var(--accent)" : "var(--ink3)",
                  fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .15s",
                }}>
                  {l} <span style={{ opacity:.6 }}>({n})</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding:"8px 16px", background:"var(--bg2)", borderBottom:"1px solid var(--border)", fontSize:11, color:"var(--ink3)", display:"flex", alignItems:"center", gap:6 }}>
            <Icon name="info" size={12} color="var(--ink3)" />
            Statut défini automatiquement · Présent si arrivée dans les 15 premières minutes
          </div>
          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {eleves.length === 0
              ? <div style={{ padding:32, textAlign:"center", color:"var(--ink3)", fontSize:13 }}>Aucun élève dans cette catégorie</div>
              : eleves.map(e => <EleveRow key={e.id} e={e} />)
            }
          </div>
        </div>
      )}

      {!cours && (
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:60, textAlign:"center", boxShadow:"var(--shadow)" }}>
          <div style={{ width:60, height:60, borderRadius:"50%", background:"var(--bg3)", border:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Icon name="clock" size={28} color="var(--ink3)" />
          </div>
          <div style={{ fontFamily:"var(--font-head)", fontSize:17, fontWeight:700, marginBottom:8 }}>Pas de cours en ce moment</div>
          <div style={{ fontSize:13, color:"var(--ink3)" }}>
            Les présences s'affichent automatiquement dès qu'un cours commence.
            {prochain && <span> Prochain : <strong style={{ color:"var(--ink)" }}>{prochain.matiere_nom}</strong> à <strong style={{ color:"var(--amber)", fontFamily:"var(--font-mono)" }}>{prochain.heure_debut}</strong>.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
