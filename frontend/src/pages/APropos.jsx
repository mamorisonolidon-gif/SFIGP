import { Icon } from "../components/Icons";

const MEMBRES = [
  { nom:"RANDRIAMAMORISON", prenom:"Nantenaina Olidon",         role:"Développeur",            couleur:"#6c8fff" },
  { nom:"RAKOTONDRAIBE",    prenom:"Tojosoa Jhony",             role:"Développeur ",           couleur:"#6c8fff" },
  { nom:"NOELIARILALA",     prenom:"Tolotra Niavo Erica Marino",role:"Mpanao Boky ",           couleur:"#6c8fff" },
  { nom:"MAMINOMENA",       prenom:"Halinirina Sergio",         role:"Développeur",            couleur:"#6c8fff" },
  { nom:"FANAMBINANTSOA",   prenom:"Orlando",                   role:"Base de données",        couleur:"#6c8fff" },
  { nom:"RAMAROMANGANDIMBY",prenom:"Ange Ricaéle",              role:"Développeur",            couleur:"#6c8fff" },
  { nom:"ANDRIAMPARANY",    prenom:"Manohatra Lazasoa",         role:"Développeur",            couleur:"#6c8fff" },
];

function getInitiales(prenom, nom) {
  return ((prenom[0] || "") + (nom[0] || "")).toUpperCase();
}

function MemberCard({ membre, index }) {
  const initiales = getInitiales(membre.prenom, membre.nom);

  return (
    <div style={{
      background:"var(--card)",
      border:`1px solid ${membre.couleur}30`,
      borderRadius:"var(--radius-lg)",
      padding:"24px 16px",
      textAlign:"center",
      boxShadow:`var(--shadow), 0 0 20px ${membre.couleur}10`,
      transition:"all .2s",
      animation:`fadeUp .4s ease ${index * 0.08}s both`,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`var(--shadow-lg), 0 0 30px ${membre.couleur}20`; e.currentTarget.style.borderColor=`${membre.couleur}60`; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=`var(--shadow), 0 0 20px ${membre.couleur}10`; e.currentTarget.style.borderColor=`${membre.couleur}30`; }}
    >
      {/* Photo placeholder avec initiales */}
      <div style={{
        width:90, height:90, borderRadius:"50%",
        background:`linear-gradient(135deg, ${membre.couleur}30, ${membre.couleur}60)`,
        border:`3px solid ${membre.couleur}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        margin:"0 auto 16px",
        boxShadow:`0 0 24px ${membre.couleur}40`,
        position:"relative",
      }}>
        {/* Cercle décoratif */}
        <div style={{ position:"absolute", inset:-6, borderRadius:"50%", border:`1px dashed ${membre.couleur}40`, animation:"rotate360 12s linear infinite" }} />
        <span style={{ fontFamily:"var(--font-head)", fontSize:28, fontWeight:800, color:membre.couleur }}>
          {initiales}
        </span>
      </div>

      {/* Numéro */}
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:".12em", color:membre.couleur, textTransform:"uppercase", marginBottom:8 }}>
        Membre #{String(index+1).padStart(2,"0")}
      </div>

      {/* Prénom */}
      <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", lineHeight:1.3, marginBottom:3 }}>
        {membre.prenom}
      </div>

      {/* Nom */}
      <div style={{ fontSize:14, fontWeight:800, color:"var(--ink)", fontFamily:"var(--font-head)", letterSpacing:".02em", marginBottom:10 }}>
        {membre.nom}
      </div>

      {/* Rôle */}
      <div style={{
        display:"inline-flex", alignItems:"center", gap:5,
        padding:"4px 12px", borderRadius:99,
        background:`${membre.couleur}15`,
        border:`1px solid ${membre.couleur}30`,
        fontSize:11, fontWeight:600, color:membre.couleur,
      }}>
        {membre.role}
      </div>
    </div>
  );
}

export default function APropos() {
  return (
    <div>
      {/* En-tête */}
      <div style={{ textAlign:"center", marginBottom:40 }}>
        {/* Logo SFIGP grand */}
        <div style={{
          width:80, height:80, borderRadius:20,
          background:"linear-gradient(135deg, #1a3a6e, #0d5c3a)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 20px",
          boxShadow:"0 0 40px rgba(52,211,153,.3)",
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="rgba(255,255,255,.15)" strokeWidth="1.5"/>
            <path d="M22 5 C12 5 5 12 5 22 C5 32 12 39 22 39" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 5 C32 5 39 12 39 22 C39 32 32 39 22 39" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"/>
            <path d="M11 22 L22 11 L33 22 L22 33 Z" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5"/>
            <circle cx="22" cy="22" r="5" fill="#34d399"/>
            <path d="M22 5 L22 39 M5 22 L39 22" stroke="rgba(255,255,255,.15)" strokeWidth="1"/>
          </svg>
        </div>

        <h1 style={{ fontFamily:"var(--font-head)", fontSize:32, fontWeight:900, color:"var(--ink)", marginBottom:8 }}>
          SFIGP
        </h1>
        <div style={{ fontSize:13, color:"var(--accent)", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginBottom:12 }}>
          Système Facial Intelligent de Gestion de Présence
        </div>
        <p style={{ fontSize:14, color:"var(--ink2)", maxWidth:560, margin:"0 auto", lineHeight:1.7 }}>
          Logiciel développé par les étudiants de la classe <strong style={{ color:"var(--ink)" }}>IGGLIA 3B</strong> — 
          Institut Supérieur Polytechnique de Madagascar (ISPM).
        </p>

        {/* Badges */}
        <div style={{ display:"flex", justifyContent:"center", gap:10, marginTop:20, flexWrap:"wrap" }}>
          {["IGGLIA 3B","ISPM","Version 1.0","React + Python","InsightFace AI"].map(tag => (
            <span key={tag} style={{ padding:"4px 12px", borderRadius:99, background:"var(--acc-lt)", border:"1px solid var(--border3)", fontSize:11, fontWeight:600, color:"var(--accent)" }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Titre équipe */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <div style={{ flex:1, height:1, background:"var(--border)" }} />
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Icon name="users" size={16} color="var(--accent)" />
          <span style={{ fontFamily:"var(--font-head)", fontSize:16, fontWeight:700, color:"var(--ink)" }}>
            Équipe de développement
          </span>
        </div>
        <div style={{ flex:1, height:1, background:"var(--border)" }} />
      </div>

      {/* Grille membres */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",
        gap:20,
        marginBottom:40,
      }}>
        {MEMBRES.map((m, i) => (
          <MemberCard key={m.nom} membre={m} index={i} />
        ))}
      </div>

      {/* Footer info */}
      <div style={{
        background:"var(--card)", border:"1px solid var(--border)",
        borderRadius:"var(--radius-lg)", padding:"24px 28px",
        display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20,
        boxShadow:"var(--shadow)",
      }}>
        {[
          { icon:"calendar", label:"Année académique", value:"2025 — 2026" },
          { icon:"book",     label:"Établissement",   value:"ISPM — Madagascar" },
          { icon:"face",     label:"Technologie IA",  value:"InsightFace / ArcFace" },
        ].map(item => (
          <div key={item.label} style={{ textAlign:"center" }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"var(--acc-lt)", border:"1px solid var(--border3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
              <Icon name={item.icon} size={18} color="var(--accent)" />
            </div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>{item.label}</div>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)" }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
