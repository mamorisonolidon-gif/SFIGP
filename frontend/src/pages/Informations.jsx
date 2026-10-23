import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";
import { StatusBadge, Avatar } from "../components/Badge";
import { Icon } from "../components/Icons";

const EMPTY = {
  id:"", prenom:"", nom:"", classe:"IGGLIA 3B",
  adresse:"", telephone:"", email_parent:"", contact_parent:"",
  date_naissance:"", sexe:"M", photo_base64:"",
};

// ── Composant WebcamCapture ──────────────────────────────────
function WebcamCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setCamError] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);

  const start = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"user", width:{ ideal:640 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream;
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(e => {
            if (e.name === "AbortError") resolve();
          });
        };
        setTimeout(resolve, 3000);
      });
      setActive(true);
    } catch (e) {
      if (e.name === "NotAllowedError") setCamError("Permission caméra refusée");
      else if (e.name === "NotFoundError") setCamError("Aucune caméra détectée");
      else if (e.name === "AbortError") setActive(true);
      else setCamError("Erreur caméra : " + e.message);
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  };

  useEffect(() => () => stop(), []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    // Redimensionner à 320x320 max directement à la capture
    const maxSize = 320;
    const ratio = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    setCapturedPhotos(prev => [...prev, dataUrl].slice(0, 6));
  };

  const removePhoto = (i) => setCapturedPhotos(prev => prev.filter((_, idx) => idx !== i));

  const confirm = () => {
    if (capturedPhotos.length === 0) return alert("Capturez au moins 1 photo.");
    onCapture(capturedPhotos);
    stop();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(26,25,22,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(3px)" }}>
      <div style={{ background:"var(--card)", borderRadius:"var(--radius-lg)", padding:24, width:560, maxWidth:"95vw", boxShadow:"var(--shadow-lg)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:"var(--font-head)", fontSize:15, fontWeight:700 }}>Capture du visage</div>
            <div style={{ fontSize:12, color:"var(--ink3)", marginTop:2 }}>Capturez 3 à 6 photos sous différents angles</div>
          </div>
          <button onClick={() => { stop(); onClose(); }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ink3)", fontSize:20 }}>×</button>
        </div>

        {/* Vidéo */}
        <div style={{ background:"#0b0e14", borderRadius:"var(--radius)", aspectRatio:"4/3", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", marginBottom:14 }}>
          <video ref={videoRef} autoPlay playsInline muted style={{
            position:"absolute", inset:0, width:"100%", height:"100%",
            objectFit:"cover", transform:"scaleX(-1)",
            display: active ? "block" : "none",
          }} />
          <canvas ref={canvasRef} style={{ display:"none" }} />

          {!active && !error && (
            <div style={{ textAlign:"center", color:"#aaa" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display:"block", margin:"0 auto 10px" }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <div style={{ fontSize:12 }}>Cliquez sur "Activer caméra" pour commencer</div>
            </div>
          )}
          {error && (
            <div style={{ color:"#ff6b6b", fontSize:12, textAlign:"center", padding:20 }}><Icon name="alertTri" size={13} color="var(--red)" style={{marginRight:6}} /> {error}</div>
          )}

          {/* Cadre visage */}
          {active && (
            <>
              {[{top:30,left:30,borderTop:"2px solid rgba(59,130,246,.8)",borderLeft:"2px solid rgba(59,130,246,.8)"},
                {top:30,right:30,borderTop:"2px solid rgba(59,130,246,.8)",borderRight:"2px solid rgba(59,130,246,.8)"},
                {bottom:30,left:30,borderBottom:"2px solid rgba(59,130,246,.8)",borderLeft:"2px solid rgba(59,130,246,.8)"},
                {bottom:30,right:30,borderBottom:"2px solid rgba(59,130,246,.8)",borderRight:"2px solid rgba(59,130,246,.8)"}
              ].map((s,i) => (
                <div key={i} style={{ position:"absolute", width:24, height:24, ...s }} />
              ))}
              <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", background:"rgba(37,99,235,.8)", borderRadius:4, padding:"2px 10px", fontSize:10, color:"#fff", fontFamily:"var(--font-mono)" }}>
                Centrez votre visage
              </div>
            </>
          )}
        </div>

        {/* Boutons caméra */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {!active ? (
            <button onClick={start} style={{ flex:1, padding:"9px 0", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:"0 4px 14px var(--acc-glow)" }}>
              <Icon name="camera" size={14} color="white" /> Activer caméra
            </button>
          ) : (
            <>
              <button onClick={capture} disabled={capturedPhotos.length >= 6} style={{
                flex:2, padding:"9px 0", borderRadius:"var(--radius)",
                background: capturedPhotos.length >= 6
                  ? "var(--bg2)"
                  : "linear-gradient(135deg, var(--accent), var(--acc-dk))",
                color: capturedPhotos.length >= 6 ? "var(--ink3)" : "#fff",
                border:"none", fontSize:12, fontWeight:700,
                cursor: capturedPhotos.length >= 6 ? "not-allowed" : "pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                boxShadow: capturedPhotos.length >= 6 ? "none" : "0 4px 14px var(--acc-glow)",
              }}>
                <Icon name="camera" size={14} color={capturedPhotos.length >= 6 ? "var(--ink3)" : "white"} />
                Capturer ({capturedPhotos.length}/6)
              </button>
              <button onClick={stop} style={{ padding:"9px 14px", borderRadius:"var(--radius)", background:"var(--red-lt)", color:"var(--red)", border:"1px solid rgba(248,113,113,.2)", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                <Icon name="x" size={13} color="var(--red)" /> Arrêter
              </button>
            </>
          )}
        </div>

        {/* Aperçu photos */}
        {capturedPhotos.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:6, marginBottom:14 }}>
            {capturedPhotos.map((p, i) => (
              <div key={i} style={{ position:"relative", aspectRatio:"1" }}>
                <img src={p} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:6, border:"1px solid var(--border)" }} />
                <button onClick={() => removePhoto(i)} style={{
                  position:"absolute", top:2, right:2, width:16, height:16,
                  borderRadius:"50%", background:"var(--red)", color:"#fff",
                  border:"none", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                }}>×</button>
              </div>
            ))}
            {Array(6 - capturedPhotos.length).fill(0).map((_, i) => (
              <div key={`empty-${i}`} style={{ aspectRatio:"1", border:"1.5px dashed var(--border2)", borderRadius:6, background:"var(--bg)" }} />
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={confirm} disabled={capturedPhotos.length === 0} style={{
            flex:1, padding:"10px 0", borderRadius:"var(--radius)",
            background: capturedPhotos.length > 0
              ? "linear-gradient(135deg, var(--accent), var(--acc-dk))"
              : "var(--bg2)",
            color: capturedPhotos.length > 0 ? "#fff" : "var(--ink3)",
            border:"none", fontSize:13, fontWeight:700,
            cursor: capturedPhotos.length > 0 ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            boxShadow: capturedPhotos.length > 0 ? "0 4px 14px var(--acc-glow)" : "none",
          }}>
            <Icon name="check" size={13} color={capturedPhotos.length > 0 ? "white" : "var(--ink3)"} />
            Utiliser ces photos ({capturedPhotos.length})
          </button>
          <button onClick={() => { stop(); onClose(); }} style={{ padding:"10px 20px", borderRadius:"var(--radius)", background:"var(--bg2)", color:"var(--ink2)", border:"1px solid var(--border2)", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}


// ── InfoRow ─────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:".05em", color:"var(--ink3)", textTransform:"uppercase", minWidth:140, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, color:"var(--ink)" }}>{value}</span>
    </div>
  );
}

function HistoryBar({ historique = [] }) {
  const colors = { present:"var(--green)", absent:"var(--red)", late:"var(--amber)", unset:"var(--bg3)" };
  return (
    <div>
      <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
        {historique.map(h => (
          <div key={h.date} title={`${h.date} — ${h.statut}`} style={{ width:12, height:12, borderRadius:3, background:colors[h.statut]||"var(--bg3)" }} />
        ))}
        {historique.length === 0 && <div style={{ color:"var(--ink3)", fontSize:12 }}>Aucun historique.</div>}
      </div>
      {historique.length > 0 && (
        <div style={{ display:"flex", gap:14, marginTop:10 }}>
          {[["present","Présent","var(--green)"],["late","Retard","var(--amber)"],["absent","Absent","var(--red)"]].map(([k,l,c]) => (
            <div key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--ink3)" }}>
              <div style={{ width:8, height:8, borderRadius:2, background:c }} />
              {l} : <strong style={{ color:"var(--ink)" }}>{historique.filter(h=>h.statut===k).length}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Page principale ─────────────────────────────────────────
export default function Informations() {
  const [eleves, setEleves] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null); // null | "add" | "edit"
  const [formData, setFormData] = useState(EMPTY);
  const [facePhotos, setFacePhotos] = useState([]); // photos webcam pour l'encodage
  const [showWebcam, setShowWebcam] = useState(false);
  const [droidcamUrl, setDroidcamUrl]   = useState("");
  const [droidcamCapturing, setDroidcamCapturing] = useState(false);
  const [droidcamMsg, setDroidcamMsg]   = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    const data = await api.getEleves();
    setEleves(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectEleve = async (id) => {
    setSelected(id);
    const data = await api.getEleve(id);
    setDetail(data);
  };

  const openAdd = () => {
    setFormData(EMPTY);
    setFacePhotos([]);
    setError(null);
    setForm("add");
  };

  const openEdit = () => {
    if (!detail) return;
    setFormData({ ...detail });
    setFacePhotos([]);
    setError(null);
    setForm("edit");
  };

  // Import photo depuis fichier
  const handleFilePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setFormData(f => ({ ...f, photo_base64: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Import photos visage depuis fichier (plusieurs)
  const handleFaceFiles = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setFacePhotos(prev => [...prev, ev.target.result].slice(0, 6));
      };
      reader.readAsDataURL(file);
    });
  };

  // Compresser une image base64 avant envoi (max 320x320, qualité 70%)
  const compressImage = (dataUrl, maxSize=320) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.70));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

  const saveForm = async () => {
    const idVal = (formData.id || "").trim();
    const prenomVal = (formData.prenom || "").trim();
    const nomVal = (formData.nom || "").trim();
    if (!idVal || !prenomVal || !nomVal) {
      setError("ID, prénom et nom sont obligatoires.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // Compresser les photos visage avant envoi
      const compressedFacePhotos = await Promise.all(facePhotos.map(p => compressImage(p, 320)));
      // Compresser la photo profil
      const compressedPhoto = formData.photo_base64
        ? await compressImage(formData.photo_base64, 200)
        : null;

      const payload = {
        ...formData,
        id: idVal, prenom: prenomVal, nom: nomVal,
        photo_base64: compressedPhoto,
        face_photos: compressedFacePhotos,
      };
      if (form === "add") {
        await api.createEleve(payload);
      } else {
        await api.updateEleve(formData.id, payload);
      }
      setForm(null);
      setFacePhotos([]);
      setError(null);
      await load();
      await selectEleve(idVal);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!detail || !confirm(`Supprimer ${detail.prenom} ${detail.nom} définitivement ?`)) return;
    await api.deleteEleve(detail.id);
    setSelected(null);
    setDetail(null);
    load();
  };

  const filtered = eleves.filter(e => {
    const q = search.toLowerCase();
    return !q || (e.prenom+" "+e.nom).toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
  });

  return (
    <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20, alignItems:"start" }}>
      {/* Sidebar liste */}
      <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden", boxShadow:"var(--shadow)" }}>
        <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", display:"flex", gap:8, alignItems:"center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            style={{ flex:1, padding:"7px 10px", borderRadius:"var(--radius)", border:"1px solid var(--border2)", fontSize:12, fontFamily:"var(--font-body)", outline:"none", background:"var(--bg)", color:"var(--ink)" }} />
          <button onClick={openAdd} title="Ajouter un élève" style={{ width:34, height:34, borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", fontSize:18, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px var(--acc-glow)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px var(--acc-glow)", transition:"all .15s" }}>+</button>
        </div>
        <div style={{ padding:"6px 8px", borderBottom:"1px solid var(--border)", background:"var(--bg)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:10, fontWeight:700, color:"var(--ink3)", letterSpacing:".08em", textTransform:"uppercase" }}>{filtered.length} élève(s)</span>
        </div>
        <div style={{ maxHeight:"calc(100vh - 260px)", overflowY:"auto" }}>
          {loading ? <div style={{ padding:20, color:"var(--ink3)", fontSize:12 }}>Chargement...</div> :
            filtered.map(e => (
              <div key={e.id} onClick={() => selectEleve(e.id)} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                cursor:"pointer", background: selected===e.id ? "var(--bg)" : "transparent",
                borderBottom:"1px solid var(--border)", transition:"background .15s",
              }}
                onMouseEnter={ev => { if(selected!==e.id) ev.currentTarget.style.background="var(--bg)"; }}
                onMouseLeave={ev => { if(selected!==e.id) ev.currentTarget.style.background="transparent"; }}
              >
                <div style={{ position:"relative" }}>
                  {e.photo_base64
                    ? <img src={e.photo_base64} alt="" style={{ width:34, height:34, borderRadius:"50%", objectFit:"cover", border:"1px solid var(--border2)" }} />
                    : <Avatar prenom={e.prenom} nom={e.nom} id={e.id} size={34} fontSize={12} />
                  }
                  {e.has_face ? (
                    <div title="Profil facial enregistré" style={{ position:"absolute", bottom:-2, right:-2, width:12, height:12, background:"var(--green)", borderRadius:"50%", border:"2px solid var(--card)", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="check" size={8} color="white" /></div>
                  ) : null}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.prenom} {e.nom}</div>
                  <div style={{ fontSize:10, color:"var(--ink3)", fontFamily:"var(--font-mono)" }}>{e.id}</div>
                </div>
                <StatusBadge status={e.statut||"unset"} style={{ fontSize:9 }} />
              </div>
            ))
          }
        </div>
      </div>

      {/* Panneau détail */}
      {detail ? (
        <div>
          <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:24, boxShadow:"var(--shadow)", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:20 }}>
              {detail.photo_base64
                ? <img src={detail.photo_base64} alt="" style={{ width:76, height:76, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--border2)", flexShrink:0 }} />
                : <Avatar prenom={detail.prenom} nom={detail.nom} id={detail.id} size={76} fontSize={24} />
              }
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"var(--font-head)", fontSize:22, fontWeight:700 }}>{detail.prenom} {detail.nom}</div>
                <div style={{ fontSize:12, color:"var(--ink3)", fontFamily:"var(--font-mono)", marginTop:4 }}>{detail.id} — {detail.classe}</div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:8, flexWrap:"wrap" }}>
                  <StatusBadge status={detail.statut||"unset"} />
                  {detail.heure && <span style={{ fontSize:11, color:"var(--ink3)", fontFamily:"var(--font-mono)" }}>Arrivée : {detail.heure}</span>}
                  {detail.has_face ? (
                    <span style={{ fontSize:11, display:"flex", alignItems:"center", gap:4, background:"var(--grn-lt)", color:"var(--green)", padding:"2px 8px", borderRadius:99, fontWeight:700 }}> <Icon name="checkCircle" size={11} color="var(--green)" /> Profil facial</span>
                  ) : (
                    <span style={{ fontSize:11, background:"var(--amb-lt)", color:"var(--amber)", padding:"2px 8px", borderRadius:99, fontWeight:700 }}> <Icon name="alertTri" size={11} color="var(--amber)" /> Pas de profil facial</span>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={openEdit} style={{ padding:"7px 14px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}><Icon name="edit" size={12} color="white" /> Modifier</button>
                <button onClick={handleDelete} style={{ padding:"7px 14px", borderRadius:"var(--radius)", background:"var(--red-lt)", color:"var(--red)", border:"1px solid rgba(220,38,38,.2)", fontSize:12, fontWeight:700, cursor:"pointer" }}></button>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Informations personnelles</div>
                <InfoRow label="Date de naissance" value={detail.date_naissance} />
                <InfoRow label="Sexe" value={detail.sexe==="M"?"Masculin":detail.sexe==="F"?"Féminin":detail.sexe} />
                <InfoRow label="Classe" value={detail.classe} />
                <InfoRow label="Adresse" value={detail.adresse} />
                <InfoRow label="Téléphone" value={detail.telephone} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Contact parent / tuteur</div>
                <InfoRow label="Email parent" value={detail.email_parent} />
                <InfoRow label="Contact parent" value={detail.contact_parent} />
                {detail.confiance && <InfoRow label="Dernière conf. IA" value={`${detail.confiance}%`} />}
              </div>
            </div>
          </div>

          <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:24, boxShadow:"var(--shadow)" }}>
            <div style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700, marginBottom:16 }}>Historique — 30 derniers jours</div>
            <HistoryBar historique={detail.historique||[]} />
            {(detail.historique||[]).length > 0 && (
              <div style={{ marginTop:16, maxHeight:220, overflowY:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["Date","Statut","Heure","Confiance IA"].map(h => (
                      <th key={h} style={{ fontSize:10, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"var(--ink3)", padding:"8px 12px", background:"var(--bg)", borderBottom:"1px solid var(--border)", textAlign:"left" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {detail.historique.map(h => (
                      <tr key={h.date} style={{ borderBottom:"1px solid var(--border)" }}>
                        <td style={{ padding:"8px 12px", fontFamily:"var(--font-mono)", fontSize:12 }}>{h.date}</td>
                        <td style={{ padding:"8px 12px" }}><StatusBadge status={h.statut} /></td>
                        <td style={{ padding:"8px 12px", fontFamily:"var(--font-mono)", fontSize:12 }}>{h.heure||"—"}</td>
                        <td style={{ padding:"8px 12px", fontSize:12, color:"var(--ink3)" }}>{h.confiance?`${h.confiance}%`:"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:60, textAlign:"center", boxShadow:"var(--shadow)", color:"var(--ink3)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ display:"block", margin:"0 auto 12px", opacity:.4 }}>
            <circle cx="12" cy="8" r="4"/><path d="M3 20c0-4 4-7 9-7s9 3 9 7"/>
          </svg>
          <div style={{ fontSize:14 }}>Sélectionnez un élève pour voir ses informations</div>
          <div style={{ fontSize:12, marginTop:6 }}>ou cliquez sur <strong>+</strong> pour inscrire un nouvel élève</div>
          <button onClick={openAdd} style={{ marginTop:20, padding:"10px 24px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            + Inscrire un nouvel élève
          </button>
        </div>
      )}

      {/* ── MODAL FORMULAIRE ── */}
      {form && (
        <div onClick={e => { if(e.target===e.currentTarget) setForm(null); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(8px)" }}>
          <div style={{ background:"var(--card)", borderRadius:20, padding:28, width:620, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"var(--shadow-lg), 0 0 60px rgba(108,143,255,.1)", border:"1px solid var(--border2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontFamily:"var(--font-head)", fontSize:16, fontWeight:700 }}>
                  {form==="add" ? <><Icon name="userPlus" size={15} color="var(--ink)" style={{marginRight:6}} />Inscrire un nouvel élève</> : <><Icon name="edit" size={15} color="var(--ink)" style={{marginRight:6}} />Modifier les informations</>}
                </div>
                <div style={{ fontSize:12, color:"var(--ink3)", marginTop:2 }}>IGGLIA 3B</div>
              </div>
              <button onClick={() => setForm(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--ink3)", fontSize:20 }}>×</button>
            </div>

            {/* Champs info */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              {[
                ["id","Numéro étudiant ","text","Ex : 01"],
                ["prenom","Prénom ","text","Marie"],
                ["nom","Nom ","text","Nom"],
                ["classe","Classe","text","IGGLIA 3B"],
                ["date_naissance","Date de naissance","date",""],
                ["telephone","Téléphone","tel","034 xx xxx xx"],
              ].map(([key,label,type,ph]) => (
                <div key={key}>
                  <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>{label}</label>
                  <input type={type} placeholder={ph} value={formData[key]||""}
                    onChange={e => setFormData(f=>({...f,[key]:e.target.value}))}
                    disabled={form==="edit"&&key==="id"}
                    style={{ width:"100%", padding:"8px 11px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background: form==="edit"&&key==="id" ? "var(--bg2)" : "var(--bg)", outline:"none" }} />
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Sexe</label>
                <select value={formData.sexe||"M"} onChange={e=>setFormData(f=>({...f,sexe:e.target.value}))}
                  style={{ width:"100%", padding:"8px 11px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--bg)", outline:"none" }}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                 

                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Adresse</label>
                <input placeholder="Adresse complète" value={formData.adresse||""}
                  onChange={e=>setFormData(f=>({...f,adresse:e.target.value}))}
                  style={{ width:"100%", padding:"8px 11px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--bg)", outline:"none" }} />
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Email</label>
                <input type="email" placeholder="marino@email.com" value={formData.email_parent||""}
                  onChange={e=>setFormData(f=>({...f,email_parent:e.target.value}))}
                  style={{ width:"100%", padding:"8px 11px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--bg)", outline:"none" }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Contact</label>
                <input placeholder=" 034 xx xxx xx" value={formData.contact_parent||""}
                  onChange={e=>setFormData(f=>({...f,contact_parent:e.target.value}))}
                  style={{ width:"100%", padding:"8px 11px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--bg)", outline:"none" }} />
              </div>
            </div>
            
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Email parent</label>
                <input type="email" placeholder="parent@email.com" value={formData.email_parent||""}
                  onChange={e=>setFormData(f=>({...f,email_parent:e.target.value}))}
                  style={{ width:"100%", padding:"8px 11px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--bg)", outline:"none" }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:5 }}>Contact parent</label>
                <input placeholder=" 034 xx xxx xx" value={formData.contact_parent||""}
                  onChange={e=>setFormData(f=>({...f,contact_parent:e.target.value}))}
                  style={{ width:"100%", padding:"8px 11px", border:"1px solid var(--border2)", borderRadius:"var(--radius)", fontSize:13, fontFamily:"var(--font-body)", color:"var(--ink)", background:"var(--bg)", outline:"none" }} />
              </div>
            </div>

            {/* Photo profil */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", color:"var(--ink2)", textTransform:"uppercase", display:"block", marginBottom:8 }}>Photo de profil</label>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {formData.photo_base64
                  ? <img src={formData.photo_base64} alt="" style={{ width:52, height:52, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--border2)" }} />
                  : <div style={{ width:52, height:52, borderRadius:"50%", background:"var(--bg2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:"var(--ink3)" }}>pdp</div>
                }
                <div>
                  <button onClick={() => fileInputRef.current?.click()} style={{ padding:"6px 12px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", boxShadow:"0 3px 12px var(--acc-glow)", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    <Icon name="upload" size={13} color="var(--ink2)" style={{marginRight:6}} /> Importer une photo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePhoto} style={{ display:"none" }} />
                  {formData.photo_base64 && (
                    <button onClick={() => setFormData(f=>({...f,photo_base64:""}))} style={{ marginLeft:8, padding:"6px 10px", borderRadius:"var(--radius)", background:"var(--red-lt)", color:"var(--red)", border:"none", fontSize:11, cursor:"pointer" }}></button>
                  )}
                </div>
              </div>
            </div>

            {/* Profil facial */}
            <div style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:16, marginBottom:20 }}>
              <div style={{ fontFamily:"var(--font-head)", fontSize:13, fontWeight:700, marginBottom:6 }}>
                <Icon name="face" size={16} color="var(--accent)" style={{marginRight:8}} /> Profil facial pour la reconnaissance
              </div>
              <div style={{ fontSize:12, color:"var(--ink3)", marginBottom:12, lineHeight:1.5 }}>
                Capturez plusieurs photos du visage sous différents angles (face, légèrement de côté, etc.) pour améliorer la reconnaissance. Minimum 3 photos recommandées.
              </div>

              {/* Aperçu photos capturées */}
              {facePhotos.length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:6, marginBottom:12 }}>
                  {facePhotos.map((p,i) => (
                    <div key={i} style={{ position:"relative", aspectRatio:"1" }}>
                      <img src={p} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:6, border:"2px solid var(--green)" }} />
                      <button onClick={() => setFacePhotos(prev=>prev.filter((_,idx)=>idx!==i))} style={{
                        position:"absolute", top:2, right:2, width:16, height:16, borderRadius:"50%",
                        background:"var(--red)", color:"#fff", border:"none", fontSize:9, cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>×</button>
                    </div>
                  ))}
                  {Array(Math.max(0, 3 - facePhotos.length)).fill(0).map((_,i) => (
                    <div key={`ep-${i}`} style={{ aspectRatio:"1", border:"1.5px dashed var(--border2)", borderRadius:6 }} />
                  ))}
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {/* ── DroidCam ── */}
                <div style={{ background:"var(--bg2)", borderRadius:"var(--radius)", padding:"10px 12px", border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"var(--accent)", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                    <Icon name="wifi" size={12} color="var(--accent)" /> DroidCam (téléphone)
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <input
                      value={droidcamUrl}
                      onChange={e => { setDroidcamUrl(e.target.value); setDroidcamMsg(""); }}
                      placeholder="http://192.168.x.x:4747"
                      style={{ flex:1, padding:"7px 10px", fontSize:12, fontFamily:"var(--font-mono)", borderRadius:"var(--radius)" }}
                    />
                    <button
                      disabled={!droidcamUrl.trim() || droidcamCapturing || facePhotos.length >= 6}
                      onClick={async () => {
                        setDroidcamCapturing(true);
                        setDroidcamMsg("");
                        try {
                          const base = droidcamUrl.trim().replace(/\/(video|videofeed|mjpeg|shot\.jpg)(\?.*)?$/i,"");
                          const resp = await fetch("http://127.0.0.1:5000/api/droidcam/capture", {
                            method:"POST", headers:{"Content-Type":"application/json"},
                            body: JSON.stringify({ phone_url: base }),
                          });
                          const d = await resp.json();
                          if (d.ok && d.frame) {
                            setFacePhotos(prev => [...prev, d.frame].slice(0, 6));
                            setDroidcamMsg(`✓ Photo ${facePhotos.length + 1} capturée`);
                          } else {
                            setDroidcamMsg("Erreur : " + (d.message || "inconnu"));
                          }
                        } catch(e) {
                          setDroidcamMsg("Erreur serveur : " + e.message);
                        } finally {
                          setDroidcamCapturing(false);
                        }
                      }}
                      style={{
                        padding:"7px 12px", borderRadius:"var(--radius)", border:"none",
                        background: (!droidcamUrl.trim() || droidcamCapturing || facePhotos.length >= 6)
                          ? "var(--bg3)" : "linear-gradient(135deg, var(--accent), var(--acc-dk))",
                        color: (!droidcamUrl.trim() || droidcamCapturing || facePhotos.length >= 6)
                          ? "var(--ink3)" : "#fff",
                        fontSize:12, fontWeight:700, cursor: droidcamCapturing ? "wait" : "pointer",
                        display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap",
                        boxShadow: droidcamUrl.trim() ? "0 2px 8px var(--acc-glow)" : "none",
                      }}
                    >
                      {droidcamCapturing
                        ? <><div style={{width:12,height:12,border:"2px solid var(--ink3)",borderTopColor:"transparent",borderRadius:"50%",animation:"rotate360 .7s linear infinite"}}/> Capture...</>
                        : <><Icon name="camera" size={12} color={droidcamUrl.trim()?"white":"var(--ink3)"} /> Photo ({facePhotos.length}/6)</>
                      }
                    </button>
                  </div>
                  {droidcamMsg && (
                    <div style={{ fontSize:11, marginTop:6, color: droidcamMsg.startsWith("✓") ? "var(--green)" : "var(--red)", fontWeight:600 }}>
                      {droidcamMsg}
                    </div>
                  )}
                </div>

                {/* ── Autres options ── */}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setShowWebcam(true)} style={{
                    flex:1, padding:"8px 0", borderRadius:"var(--radius)",
                    background:"var(--bg3)", color:"var(--ink2)", border:"1px solid var(--border2)",
                    fontSize:12, fontWeight:700, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  }}>
                    <Icon name="camera" size={13} color="var(--ink2)" /> Webcam PC
                  </button>
                  <label style={{
                    flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                    padding:"8px 0", borderRadius:"var(--radius)",
                    background:"var(--bg3)", color:"var(--ink2)", border:"1px solid var(--border2)",
                    fontSize:12, fontWeight:700, cursor:"pointer",
                  }}>
                    <Icon name="upload" size={13} color="var(--ink2)" /> Importer
                    <input type="file" accept="image/*" multiple onChange={handleFaceFiles} style={{ display:"none" }} />
                  </label>
                  {facePhotos.length > 0 && (
                    <button onClick={() => setFacePhotos([])} style={{
                      padding:"8px 12px", borderRadius:"var(--radius)",
                      background:"var(--red-lt)", color:"var(--red)", border:"1px solid rgba(248,113,113,.2)",
                      fontSize:12, fontWeight:700, cursor:"pointer",
                    }}>
                      <Icon name="trash" size={13} color="var(--red)" />
                    </button>
                  )}
                </div>
              </div>

              {facePhotos.length > 0 && (
                <div style={{ marginTop:8, fontSize:12, color:"var(--green)", fontWeight:700 }}>
                  <><Icon name="checkCircle" size={13} color="var(--green)" style={{marginRight:6}} /> {facePhotos.length} photo(s) prête(s) pour l'encodage facial</>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background:"var(--red-lt)", border:"1px solid rgba(220,38,38,.2)", borderRadius:"var(--radius)", padding:"10px 14px", marginBottom:12, fontSize:12, color:"var(--red)", fontWeight:700 }}>
                <Icon name="alertTri" size={13} color="var(--red)" style={{marginRight:6}} /> {error}
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={saveForm} disabled={saving} style={{
                flex:1, padding:"11px 0", borderRadius:"var(--radius)",
                background: saving ? "var(--bg2)" : "linear-gradient(135deg, var(--accent), var(--acc-dk))",
                color: saving ? "var(--ink3)" : "#fff",
                border:"none", fontSize:13, fontWeight:700, cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? <><div style={{width:14,height:14,border:"2px solid var(--ink3)",borderTopColor:"transparent",borderRadius:"50%",animation:"rotate360 .8s linear infinite",marginRight:6}} />Enregistrement...</> : form==="add" ? <><Icon name="userPlus" size={14} color="white" style={{marginRight:6}} />Inscrire l'élève</> : <><Icon name="save" size={14} color="white" style={{marginRight:6}} />Enregistrer</>}
              </button>
              <button onClick={() => setForm(null)} style={{ padding:"11px 20px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", boxShadow:"0 3px 12px var(--acc-glow)", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal capture webcam */}
      {showWebcam && (
        <WebcamCapture
          onCapture={photos => {
            setFacePhotos(prev => [...prev, ...photos].slice(0, 6));
            setShowWebcam(false);
          }}
          onClose={() => setShowWebcam(false)}
        />
      )}
    </div>
  );
}
