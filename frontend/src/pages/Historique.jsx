import { useState, useEffect, useCallback } from "react";
import { Avatar } from "../components/Badge";
import { Icon } from "../components/Icons";

const BASE = "http://127.0.0.1:5000/api";
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(BASE + path, { headers:{"Content-Type":"application/json"}, ...options });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
    return body;
  } catch(e) {
    if (e.message.includes("Failed to fetch") || e.name === "TypeError") throw new Error("Serveur inaccessible");
    throw e;
  }
}

const STATUT = {
  present: { label:"Présent",  color:"var(--green)", bg:"var(--grn-lt)", border:"rgba(52,211,153,.2)",  icon:"checkCircle" },
  late:    { label:"Retard",   color:"var(--amber)", bg:"var(--amb-lt)", border:"rgba(251,191,36,.2)",  icon:"clockAlert"  },
  absent:  { label:"Absent",   color:"var(--red)",   bg:"var(--red-lt)", border:"rgba(248,113,113,.2)", icon:"xCircle"     },
  unset:   { label:"—",        color:"var(--ink3)",  bg:"var(--bg3)",    border:"var(--border)",        icon:"help"        },
};

function StatPill({ iconName, count, color, bg, border }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:99, background:bg, border:`1px solid ${border}`, fontSize:12, fontWeight:700, color }}>
      <Icon name={iconName} size={11} color={color} />
      {count}
    </div>
  );
}

function EleveHistRow({ e }) {
  const cfg = STATUT[e.statut] || STATUT.absent;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", borderBottom:"1px solid var(--border)", transition:"background .1s" }}
      onMouseEnter={el => el.currentTarget.style.background="var(--bg2)"}
      onMouseLeave={el => el.currentTarget.style.background="transparent"}
    >
      <Avatar prenom={e.prenom} nom={e.nom} id={e.id} size={32} fontSize={11} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{e.prenom} {e.nom}</div>
        <div style={{ fontSize:10, color:"var(--ink3)", fontFamily:"var(--font-mono)", marginTop:1 }}>{e.id}</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {e.heure && (
          <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"var(--ink3)", fontFamily:"var(--font-mono)" }}>
            <Icon name="clock" size={11} color="var(--ink3)" /> {e.heure}
          </span>
        )}
        {e.confiance && <span style={{ fontSize:10, color:"var(--ink3)" }}>{e.confiance}%</span>}
        <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:99, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, fontSize:11, fontWeight:600 }}>
          <Icon name={cfg.icon} size={11} color={cfg.color} />
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

function CoursCard({ item, expanded, onToggle, onCloturer }) {
  const presents = item.eleves.filter(e => e.statut === "present");
  const retards  = item.eleves.filter(e => e.statut === "late");
  const absents  = item.eleves.filter(e => e.statut === "absent");
  const nonRens  = item.eleves.filter(e => e.statut === "unset");
  const taux = item.total > 0 ? Math.round((item.stats.present + item.stats.late) / item.total * 100) : 0;

  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden", boxShadow:"var(--shadow)", marginBottom:12 }}>
      <div onClick={onToggle} style={{ padding:"16px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:14, borderBottom: expanded ? "1px solid var(--border)" : "none", transition:"background .1s" }}
        onMouseEnter={el => el.currentTarget.style.background="var(--bg2)"}
        onMouseLeave={el => el.currentTarget.style.background="transparent"}
      >
        <div style={{ width:44, height:44, borderRadius:12, background:item.couleur, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 12px ${item.couleur}40` }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#fff", fontFamily:"var(--font-mono)" }}>{item.code}</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
            <span style={{ fontFamily:"var(--font-head)", fontSize:15, fontWeight:700, color:"var(--ink)" }}>{item.matiere_nom}</span>
            <span style={{ fontSize:11, color:"var(--ink3)", fontFamily:"var(--font-mono)", display:"flex", alignItems:"center", gap:4 }}>
              <Icon name="calendar" size={11} color="var(--ink3)" />
              {item.jour} {item.date}
            </span>
            <span style={{ fontSize:11, color:"var(--ink3)", fontFamily:"var(--font-mono)", display:"flex", alignItems:"center", gap:4 }}>
              <Icon name="clock" size={11} color="var(--ink3)" />
              {item.heure_debut} → {item.heure_fin}
            </span>
            {item.salle && (
              <span style={{ fontSize:11, color:"var(--ink3)", display:"flex", alignItems:"center", gap:4 }}>
                <Icon name="pin" size={11} color="var(--ink3)" />
                {item.salle}
              </span>
            )}
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <StatPill iconName="checkCircle" count={item.stats.present} color="var(--green)" bg="var(--grn-lt)" border="rgba(52,211,153,.2)" />
            <StatPill iconName="clockAlert"  count={item.stats.late}    color="var(--amber)" bg="var(--amb-lt)" border="rgba(251,191,36,.2)" />
            <StatPill iconName="xCircle"     count={item.stats.absent}  color="var(--red)"   bg="var(--red-lt)" border="rgba(248,113,113,.2)" />
            {(item.stats.unset||0) > 0 && <StatPill iconName="help" count={item.stats.unset} color="var(--ink3)" bg="var(--bg3)" border="var(--border)" />}
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-head)", fontSize:24, fontWeight:700, color: taux>=75?"var(--green)":taux>=50?"var(--amber)":"var(--red)" }}>{taux}%</div>
          <div style={{ fontSize:10, color:"var(--ink3)" }}>présence</div>
        </div>
        <div style={{ transition:"transform .2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
          <Icon name="chevronDown" size={16} color="var(--ink3)" />
        </div>
      </div>

      {!expanded && (
        <div style={{ height:2, background:"var(--bg3)", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${taux}%`, background: taux>=75?"var(--green)":taux>=50?"var(--amber)":"var(--red)", transition:"width .4s" }} />
        </div>
      )}

      {expanded && (
        <div>
          {presents.length > 0 && (
            <>
              <div style={{ padding:"10px 20px 8px", background:"rgba(52,211,153,.06)", borderBottom:"1px solid rgba(52,211,153,.1)", display:"flex", alignItems:"center", gap:8 }}>
                <Icon name="checkCircle" size={14} color="var(--green)" />
                <span style={{ fontSize:11, fontWeight:700, color:"var(--green)", textTransform:"uppercase", letterSpacing:".08em" }}>Présents ({presents.length})</span>
              </div>
              {presents.map(e => <EleveHistRow key={e.id} e={e} />)}
            </>
          )}
          {retards.length > 0 && (
            <>
              <div style={{ padding:"10px 20px 8px", background:"rgba(251,191,36,.06)", borderBottom:"1px solid rgba(251,191,36,.1)", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                <Icon name="clockAlert" size={14} color="var(--amber)" />
                <span style={{ fontSize:11, fontWeight:700, color:"var(--amber)", textTransform:"uppercase", letterSpacing:".08em" }}>Retards ({retards.length})</span>
              </div>
              {retards.map(e => <EleveHistRow key={e.id} e={e} />)}
            </>
          )}
          {absents.length > 0 && (
            <>
              <div style={{ padding:"10px 20px 8px", background:"rgba(248,113,113,.06)", borderBottom:"1px solid rgba(248,113,113,.1)", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                <Icon name="xCircle" size={14} color="var(--red)" />
                <span style={{ fontSize:11, fontWeight:700, color:"var(--red)", textTransform:"uppercase", letterSpacing:".08em" }}>Absents ({absents.length})</span>
              </div>
              {absents.map(e => <EleveHistRow key={e.id} e={e} />)}
            </>
          )}
          {nonRens.length > 0 && (
            <>
              <div style={{ padding:"10px 20px 8px", background:"var(--bg2)", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                <Icon name="help" size={14} color="var(--ink3)" />
                <span style={{ fontSize:11, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:".08em" }}>Non renseignés ({nonRens.length})</span>
              </div>
              {nonRens.map(e => <EleveHistRow key={e.id} e={e} />)}
              <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
                <Icon name="alertTri" size={14} color="var(--amber)" />
                <div style={{ fontSize:12, color:"var(--ink3)", flex:1 }}>{nonRens.length} élève(s) non scannés — marquez-les absents.</div>
                <button onClick={() => onCloturer(item.cours_id)} style={{ padding:"7px 16px", borderRadius:"var(--radius)", background:"var(--amber)", color:"var(--bg)", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                  <Icon name="check" size={12} color="var(--bg)" />
                  Clôturer
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Historique() {
  const [historique, setHistorique] = useState([]);
  const [expanded, setExpanded]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState("");
  const [filterDate, setFilterDate] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch("/historique");
      setHistorique(Array.isArray(data) ? data : []);
      if (data.length > 0 && expanded === null) setExpanded(`${data[0].cours_id}_${data[0].date}`);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cloturer = async (cours_id) => {
    try { await apiFetch(`/cours/${cours_id}/cloturer`, { method:"POST", body:"{}" }); await load(); }
    catch(e) { alert("Erreur : " + e.message); }
  };

  const toggle = (cours_id, date) => {
    const k = `${cours_id}_${date}`;
    setExpanded(p => p === k ? null : k);
  };

  const filtered = historique.filter(item => {
    const matchS = !search || item.matiere_nom.toLowerCase().includes(search.toLowerCase()) || item.date.includes(search);
    const matchD = !filterDate || item.date === filterDate;
    return matchS && matchD;
  });

  const groupes = filtered.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});
  const dates = Object.keys(groupes).sort((a,b) => b.localeCompare(a));

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <Icon name="history" size={20} color="var(--accent)" />
            <h1 style={{ fontFamily:"var(--font-head)", fontSize:20, fontWeight:700 }}>Historique des présences</h1>
          </div>
          <div style={{ fontSize:12, color:"var(--ink3)" }}>Groupé par cours · présents → retards → absents</div>
        </div>
        <button onClick={load} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", border:"none", fontSize:12, fontWeight:600, color:"#fff", cursor:"pointer", boxShadow:"0 3px 10px var(--acc-glow)" }}>
          <Icon name="refresh" size={13} color="var(--ink2)" />
          Actualiser
        </button>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200, position:"relative" }}>
          <Icon name="search" size={14} color="var(--ink3)" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une matière..."
            style={{ width:"100%", padding:"9px 14px 9px 36px", borderRadius:99, fontSize:12 }} />
        </div>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          style={{ padding:"9px 14px", borderRadius:99, fontSize:12, fontFamily:"var(--font-mono)" }} />
        {(search || filterDate) && (
          <button onClick={() => { setSearch(""); setFilterDate(""); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", borderRadius:99, background:"var(--red-lt)", color:"var(--red)", border:"1px solid rgba(248,113,113,.2)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <Icon name="x" size={12} color="var(--red)" /> Effacer
          </button>
        )}
      </div>

      {error && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"var(--red-lt)", borderRadius:"var(--radius)", marginBottom:16, fontSize:12, color:"var(--red)", fontWeight:600 }}>
          <Icon name="alertTri" size={14} color="var(--red)" />
          {error}
          <button onClick={load} style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:6, background:"var(--red)", color:"#fff", border:"none", fontSize:11, cursor:"pointer" }}>Réessayer</button>
        </div>
      )}

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60, gap:10, color:"var(--ink3)" }}>
          <div style={{ width:18, height:18, border:"2px solid var(--border2)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"rotate360 .8s linear infinite" }} />
          Chargement...
        </div>
      )}

      {!loading && dates.length === 0 && (
        <div style={{ padding:60, textAlign:"center", background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)" }}>
          <div style={{ width:60, height:60, borderRadius:"50%", background:"var(--bg3)", border:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Icon name="clipboard" size={28} color="var(--ink3)" />
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:"var(--ink)", marginBottom:8 }}>Aucun historique</div>
          <div style={{ fontSize:13, color:"var(--ink3)" }}>Les présences par cours apparaîtront ici après la reconnaissance faciale.</div>
        </div>
      )}

      {dates.map(d => (
        <div key={d}>
          <div style={{ display:"flex", alignItems:"center", gap:12, margin:"24px 0 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Icon name="calendar" size={14} color="var(--accent)" />
              <span style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700, color:"var(--ink)" }}>
                {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
              </span>
            </div>
            <div style={{ flex:1, height:1, background:"var(--border)" }} />
            <span style={{ fontSize:11, color:"var(--ink3)", background:"var(--bg2)", padding:"2px 8px", borderRadius:99, border:"1px solid var(--border)" }}>{groupes[d].length} cours</span>
          </div>
          {groupes[d].map(item => (
            <CoursCard key={`${item.cours_id}_${item.date}`} item={item}
              expanded={expanded === `${item.cours_id}_${item.date}`}
              onToggle={() => toggle(item.cours_id, item.date)}
              onCloturer={cloturer}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
