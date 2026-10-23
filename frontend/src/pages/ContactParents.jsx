import { useState, useEffect } from "react";
import { StatusBadge, Avatar } from "../components/Badge";

const API = "http://127.0.0.1:5000/api";

export default function ContactParents() {
  const [eleves,      setEleves]      = useState([]);
  const [selected,    setSelected]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [filtre,      setFiltre]      = useState("all");
  const [msgPerso,    setMsgPerso]    = useState("");
  const [preview,     setPreview]     = useState(null);

  useEffect(() => {
    fetch(`${API}/eleves`).then(r=>r.json()).then(d=>{setEleves(d);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  const filtered = eleves.filter(e => filtre==="all" || e.statut===filtre);
  const canContact = e => e.email_parent || e.contact_parent;

  const toggle = id => setSelected(prev =>
    prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]
  );

  const selectAll = () => {
    const ids = filtered.filter(canContact).map(e=>e.id);
    setSelected(ids.length===selected.length ? [] : ids);
  };

  const genMessage = (eleve) => {
    const statut = eleve.statut==="present" ? "présent(e)" : eleve.statut==="late" ? "en retard" : "absent(e)";
    const heure  = eleve.heure ? ` à ${eleve.heure}` : "";
    const today  = new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
    return `Bonjour,\n\nNous vous informons que votre enfant ${eleve.prenom} ${eleve.nom} a été enregistré(e) ${statut}${heure} ce ${today} à l'ISPM — IGGLIA 3B.\n\n${eleve.statut==="absent" ? "Merci de justifier cette absence auprès de l'administration." : eleve.statut==="late" ? "Merci de veiller à la ponctualité." : "Bonne journée !"}\n\n${msgPerso ? `\nMessage de l'administration :\n${msgPerso}\n` : ""}Cordialement,\nL'administration ISPM`;
  };

  const handleEnvoyer = async () => {
    if (selected.length===0) return;
    setSending(true); setResult(null);
    const elevesSelected = eleves.filter(e=>selected.includes(e.id));
    try {
      const resp = await fetch(`${API}/contact/envoyer`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ eleves: elevesSelected.map(e=>({
          id:e.id, prenom:e.prenom, nom:e.nom,
          email_parent:e.email_parent, contact_parent:e.contact_parent,
          statut:e.statut, heure:e.heure,
          message: genMessage(e),
        }))})
      });
      const data = await resp.json();
      setResult(data);
    } catch(err) {
      setResult({ok:false, message:"Erreur de connexion au serveur."});
    } finally {
      setSending(false);
      setSelected([]);
    }
  };

  const FILTRES = [
    {k:"all",    l:"Tous"},
    {k:"absent", l:"Absents"},
    {k:"late",   l:"Retards"},
    {k:"present",l:"Présents"},
  ];

  const card = {background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16};

  return (
    <div>
      <div style={{marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:700,color:"var(--ink)"}}>Contact Parents</h1>
        <p style={{fontSize:13,color:"var(--ink2)",marginTop:2}}>Envoyez un message aux parents concernant la présence de leur enfant.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start"}}>
        {/* ─── Liste élèves ─── */}
        <div style={card}>
          {/* Filtres */}
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            {FILTRES.map(f=>(
              <button key={f.k} onClick={()=>setFiltre(f.k)} style={{
                padding:"4px 12px",borderRadius:4,
                background:filtre===f.k?"var(--accent)":"var(--bg2)",
                color:filtre===f.k?"#fff":"var(--ink2)",
                border:filtre===f.k?"none":"1px solid var(--border2)",
                fontSize:12,fontWeight:500,cursor:"pointer",
              }}>{f.l}</button>
            ))}
            <button onClick={selectAll} style={{marginLeft:"auto",padding:"4px 12px",borderRadius:4,background:"var(--bg2)",color:"var(--ink2)",border:"1px solid var(--border2)",fontSize:12,cursor:"pointer"}}>
              {selected.length===filtered.filter(canContact).length&&selected.length>0?"Tout désélectionner":"Tout sélectionner"}
            </button>
          </div>

          {loading ? (
            <div style={{textAlign:"center",padding:32,color:"var(--ink3)"}}>Chargement...</div>
          ) : filtered.length===0 ? (
            <div style={{textAlign:"center",padding:32,color:"var(--ink3)"}}>Aucun élève</div>
          ) : filtered.map(e=>(
            <div key={e.id} onClick={()=>canContact(e)&&toggle(e.id)} style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"10px 8px",borderRadius:4,marginBottom:2,
              background:selected.includes(e.id)?"var(--green-lt)":"transparent",
              border:selected.includes(e.id)?"1px solid var(--green-mid)":"1px solid transparent",
              cursor:canContact(e)?"pointer":"default",
              opacity:canContact(e)?1:.55,
              transition:"background .1s",
            }}>
              <input type="checkbox" checked={selected.includes(e.id)} readOnly
                style={{accentColor:"var(--accent)",width:14,height:14,flexShrink:0}} />
              <Avatar prenom={e.prenom} nom={e.nom} id={e.id} size={32} fontSize={11} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,color:"var(--ink)"}}>{e.prenom} {e.nom}</div>
                <div style={{fontSize:11,color:"var(--ink3)"}}>
                  {e.email_parent ? e.email_parent : e.contact_parent ? `📞 ${e.contact_parent}` : "Aucun contact"}
                </div>
              </div>
              <StatusBadge status={e.statut||"unset"} />
              {!canContact(e)&&<span style={{fontSize:10,color:"var(--ink3)"}}>Pas de contact</span>}
            </div>
          ))}
        </div>

        {/* ─── Panneau d'envoi ─── */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Résumé sélection */}
          <div style={{...card}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>Sélection</div>
            <div style={{fontSize:24,fontWeight:700,color:"var(--accent)",marginBottom:2}}>{selected.length}</div>
            <div style={{fontSize:12,color:"var(--ink3)",marginBottom:12}}>parent(s) à contacter</div>

            {/* Message personnalisé */}
            <label style={{fontSize:12,fontWeight:500,color:"var(--ink2)",display:"block",marginBottom:6}}>
              Message additionnel (optionnel)
            </label>
            <textarea value={msgPerso} onChange={e=>setMsgPerso(e.target.value)}
              placeholder="Ex: Réunion de parents le vendredi 20h..."
              rows={3}
              style={{width:"100%",resize:"vertical",fontSize:12,padding:"7px 10px",borderRadius:4,border:"1px solid var(--border2)",background:"var(--bg2)",color:"var(--ink)",marginBottom:12}}
            />

            {/* Prévisualiser */}
            {selected.length>0&&(
              <button onClick={()=>{
                const e=eleves.find(x=>x.id===selected[0]);
                setPreview(e?genMessage(e):null);
              }} style={{width:"100%",padding:"8px",borderRadius:4,background:"var(--bg2)",color:"var(--ink2)",border:"1px solid var(--border2)",fontSize:13,cursor:"pointer",marginBottom:8}}>
                Prévisualiser le message
              </button>
            )}

            <button onClick={handleEnvoyer} disabled={selected.length===0||sending}
              style={{
                width:"100%",padding:"10px",borderRadius:4,border:"none",
                background:selected.length===0||sending?"var(--bg3)":"var(--accent)",
                color:selected.length===0||sending?"var(--ink3)":"#fff",
                fontSize:13,fontWeight:600,cursor:selected.length===0||sending?"not-allowed":"pointer",
              }}>
              {sending ? "Envoi en cours..." : `Envoyer à ${selected.length} parent(s)`}
            </button>
          </div>

          {/* Résultat */}
          {result&&(
            <div style={{...card, border:`1px solid ${result.ok?"var(--green-mid)":"#fca5a5"}`}}>
              <div style={{fontSize:13,fontWeight:600,color:result.ok?"var(--accent)":"#dc2626",marginBottom:6}}>
                {result.ok?"✓ Messages envoyés":"✗ Erreur d'envoi"}
              </div>
              <div style={{fontSize:12,color:"var(--ink2)"}}>{result.message||""}</div>
              {result.details&&result.details.map((d,i)=>(
                <div key={i} style={{fontSize:11,color:d.ok?"var(--accent)":"#dc2626",marginTop:4}}>
                  {d.ok?"✓":"✗"} {d.nom} — {d.ok?"Envoyé":d.err}
                </div>
              ))}
            </div>
          )}

          {/* Prévisualisation message */}
          {preview&&(
            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>Aperçu du message</span>
                <button onClick={()=>setPreview(null)} style={{padding:"2px 8px",fontSize:11,borderRadius:3,background:"var(--bg2)",color:"var(--ink3)",border:"1px solid var(--border)",cursor:"pointer"}}>Fermer</button>
              </div>
              <pre style={{fontSize:11,color:"var(--ink2)",fontFamily:"var(--font-mono)",whiteSpace:"pre-wrap",background:"var(--bg2)",padding:10,borderRadius:4,border:"1px solid var(--border)"}}>{preview}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
