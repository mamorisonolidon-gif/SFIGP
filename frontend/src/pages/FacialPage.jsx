import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import { StatusBadge, Avatar } from "../components/Badge";
import { Icon } from "../components/Icons";


// iVCam s'installe comme pilote de webcam virtuelle ("e2eSoft iVCam").
// Une fois l'app iVCam ouverte sur le téléphone + le client iVCam lancé sur le PC
// (même réseau WiFi), la caméra apparaît directement dans la liste des périphériques
// vidéo du navigateur — comme une webcam normale. Pas besoin de proxy HTTP ni d'URL/IP.
const isIvcamLabel = (label) => /ivcam/i.test(label || "");


export default function FacialPage() {
 
  const videoRef        = useRef(null);
  const canvasRef       = useRef(null);
  const streamRef       = useRef(null);
  const autoRef         = useRef(null);

  
  const [source,      setSource]      = useState("webcam"); // "webcam" | "ivcam"

  const [cameras,     setCameras]     = useState([]);
  const [selectedCam, setSelectedCam] = useState("");

  
  const [camActive,  setCamActive]  = useState(false);
  const [camError,   setCamError]   = useState(null);

  
  const [scanning,   setScanning]   = useState(false);
  const [autoMode,   setAutoMode]   = useState(false);
  const [scanMsg,    setScanMsg]    = useState(""); 
  const [flash,      setFlash]      = useState(false);

 
  const [detections, setDetections] = useState([]);
  const [last,       setLast]       = useState(null);
  const [faceStatus, setFaceStatus] = useState(null);
  const [clock,      setClock]      = useState("");

  const isActive = camActive;

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const p   = n => String(n).padStart(2, "0");
      setClock(`${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  
  //useEffect(() => {
    //fetch("http://127.0.0.1:5000/api/facial/status")
      //.then(r => r.json()).then(setFaceStatus).catch(() => {});
  //}, []);

 
  const loadCameras = useCallback(async () => {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      tmp.getTracks().forEach(t => t.stop());
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs
        .filter(d => d.kind === "videoinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Caméra ${i + 1}` }));
      setCameras(cams);
      return cams;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => { loadCameras().then(cams => {
    const first = cams.filter(c => !isIvcamLabel(c.label))[0];
    if (first && !selectedCam) setSelectedCam(first.deviceId);
  }); }, []);

  // Caméras filtrées selon l'onglet choisi (Webcam PC vs iVCam WiFi)
  const visibleCams = cameras.filter(c => isIvcamLabel(c.label) === (source === "ivcam"));

  // ── Webcam PC ─────────────────────────────────────────────────
  const startWebcam = async (deviceIdOverride) => {
    setCamError(null);
    try {
      const camToUse = deviceIdOverride || selectedCam;
      const constraints = camToUse
        ? { deviceId: { exact: camToUse }, width: { ideal: 640 }, height: { ideal: 480 } }
        : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" };

      const stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream;
      await new Promise(resolve => {
        video.onloadedmetadata = () =>
          video.play().then(resolve).catch(e => { if (e.name === "AbortError") resolve(); });
        setTimeout(resolve, 3000);
      });
      setCamActive(true);
      loadCameras();
    } catch(e) {
      if      (e.name === "NotAllowedError") setCamError("Permission refusée — autorisez la caméra dans le navigateur");
      else if (e.name === "NotFoundError")   setCamError("Aucune caméra détectée");
      else if (e.name === "AbortError")      setCamActive(true);
      else                                   setCamError("Erreur : " + e.message);
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamActive(false);
    setAutoMode(false);
    setLast(null);
  };

  
  // Recherche le périphérique "e2eSoft iVCam" puis démarre le flux comme une webcam classique
  const connectIvcam = async () => {
    setCamError(null);
    const cams = await loadCameras();
    const ivcam = cams.find(c => isIvcamLabel(c.label));
    if (!ivcam) {
      setCamError("iVCam introuvable — ouvrez l'app iVCam sur le téléphone et le client iVCam sur le PC (même réseau WiFi), puis réessayez.");
      return;
    }
    setSelectedCam(ivcam.deviceId);
    await startWebcam(ivcam.deviceId);
  };

  const switchSource = (s) => {
    stopWebcam();
    setSource(s);
    setScanMsg("");
    setCamError(null);
  };

  useEffect(() => () => { stopWebcam(); }, []);

  
  const captureWebcam = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.88);
  }, []);

  // ── Scan reconnaissance ───────────────────────────────────────
  const doScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setFlash(true);
    setScanMsg("Analyse en cours...");
    setTimeout(() => setFlash(false), 250);

    try {
      const frame = captureWebcam();
      if (!frame) {
        setScanMsg("Impossible de capturer l'image");
        setScanning(false);
        return;
      }
      const result = await api.recognizeWithFrame(frame);

      if (result.recognized) {
        setScanMsg("");
        setLast(result);
        setDetections(prev => {
          const idx = prev.findIndex(d => d.eleve_id === result.eleve_id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = result;
            return updated;
          }
          return [result, ...prev].slice(0, 50);
        });
      } else {
        setScanMsg(result.message || "Visage non reconnu");
        setLast({ recognized: false, message: result.message });
      }
    } catch(e) {
      setScanMsg("Erreur serveur");
      setLast({ recognized: false, message: "Erreur : " + e.message });
    } finally {
      setScanning(false);
    }
  }, [scanning, captureWebcam]);

  // ── Mode auto 
  useEffect(() => {
    if (autoMode && isActive) {
      autoRef.current = setInterval(() => { if (!scanning) doScan(); }, 3000);
    } else {
      clearInterval(autoRef.current);
    }
    return () => clearInterval(autoRef.current);
  }, [autoMode, isActive, doScan, scanning]);

  
  const statusColor = { present: "var(--green)", late: "var(--amb-text)", absent: "var(--red-text)" };
  const camLabel    = cameras.find(c => c.deviceId === selectedCam)?.label || "Webcam";

 
  return (
    <div>

     
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:"var(--font-head)", fontSize:20, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>
            Reconnaissance faciale
          </h1>
          <div style={{ fontSize:12, color:"var(--ink3)", display:"flex", alignItems:"center", gap:8 }}>
            <span>
              {isActive ? camLabel : (source === "ivcam" ? "iVCam — WiFi" : "Webcam PC")}
            </span>
            {isActive && (
              <>
                <span style={{ color:"var(--ink4)" }}>·</span>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:"var(--green)", fontWeight:600 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", animation:"blink 1.5s ease-in-out infinite" }} />
                  En direct — {clock}
                </span>
              </>
            )}
          </div>
        </div>

       
        {faceStatus && (
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div style={{
              display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
              borderRadius:"var(--radius)",
              background: faceStatus.face_recognition_available ? "var(--grn-lt)" : "rgba(249,115,22,.1)",
              border: `1px solid ${faceStatus.face_recognition_available ? "rgba(52,211,153,.25)" : "rgba(251,191,36,.25)"}`,
              fontSize:12,
            }}>
              <Icon
                name={faceStatus.face_recognition_available ? "checkCircle" : "alertTri"}
                size={14}
                color={faceStatus.face_recognition_available ? "var(--green)" : "var(--amb-text)"}
              />
              <span style={{ color: faceStatus.face_recognition_available ? "var(--green)" : "var(--amb-text)", fontWeight:700 }}>
                {faceStatus.face_recognition_available
                  ? `InsightFace actif — ${faceStatus.nb_eleves_avec_face} profil(s)`
                  : "Mode simulation"}
              </span>
            </div>
            
            {faceStatus.face_recognition_available && (
              <button onClick={async () => {
                await fetch("http://127.0.0.1:5000/api/facial/reload-cache", { method:"POST" });
                const r = await fetch("http://127.0.0.1:5000/api/facial/status");
                setFaceStatus(await r.json());
              }} style={{ padding:"7px 12px", borderRadius:"var(--radius)", border:"none", background:"var(--acc-lt)", color:"var(--accent)", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5, border:"1px solid var(--border3)" }}>
                <Icon name="refresh" size={12} color="var(--accent)" /> Recharger cache
              </button>
            )}
          
            {faceStatus.cache_detail && faceStatus.cache_detail.length > 0 && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {faceStatus.cache_detail.map(d => (
                  <span key={d.id} style={{ fontSize:10, padding:"3px 8px", borderRadius:99, background:"var(--bg3)", color:"var(--ink2)", border:"1px solid var(--border)", fontWeight:600 }}>
                    {d.nom} ({d.nb_embeddings} photo{d.nb_embeddings > 1 ? "s" : ""})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      
      <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:20, alignItems:"start" }}>

        
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

         
          <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:16, boxShadow:"var(--shadow)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--ink3)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:12 }}>
              Source caméra
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom: source !== "webcam" ? 14 : 0 }}>
              {[
                { id:"webcam", label:"Webcam PC", sub:"Intégrée", icon:"camera" },
                { id:"ivcam",  label:"iVCam",      sub:"WiFi",     icon:"wifi"   },
              ].map(s => (
                <button key={s.id} onClick={() => switchSource(s.id)} style={{
                  padding:"10px 6px", borderRadius:"var(--radius)",
                  border: source===s.id ? "2px solid var(--accent)" : "1px solid var(--border2)",
                  background: source===s.id ? "var(--acc-lt)" : "var(--bg2)",
                  color: source===s.id ? "var(--accent)" : "var(--ink3)",
                  fontSize:11, fontWeight:700, cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                  transition:"all .15s",
                }}>
                  <Icon name={s.icon} size={17} color={source===s.id ? "var(--accent)" : "var(--ink3)"} />
                  <span>{s.label}</span>
                  <span style={{ fontSize:9, fontWeight:400, opacity:.6 }}>{s.sub}</span>
                </button>
              ))}
            </div>

          
            {source === "webcam" && visibleCams.length > 0 && (
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <select value={selectedCam}
                  onChange={e => { setSelectedCam(e.target.value); if (camActive) { stopWebcam(); setTimeout(() => startWebcam(e.target.value), 200); } }}
                  style={{ flex:1, padding:"8px 12px", borderRadius:"var(--radius)", fontSize:12, cursor:"pointer" }}>
                  {visibleCams.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
                </select>
                <button onClick={loadCameras} title="Rafraîchir" style={{ padding:"8px 10px", borderRadius:"var(--radius)", background:"var(--acc-lt)", border:"1px solid var(--border3)", color:"var(--accent)", cursor:"pointer", display:"flex", alignItems:"center" }}>
                  <Icon name="refresh" size={14} color="var(--accent)" />
                </button>
              </div>
            )}
            {source === "webcam" && visibleCams.length === 0 && (
              <div style={{ marginTop:12 }}>
                <button onClick={loadCameras} style={{ width:"100%", padding:"9px", borderRadius:"var(--radius)", background:"linear-gradient(135deg, var(--accent), var(--acc-dk))", color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:"none" }}>
                  <Icon name="refresh" size={13} color="white" /> Détecter les caméras
                </button>
              </div>
            )}

            {/* iVCam — WiFi : pas d'URL à saisir, c'est un pilote de webcam virtuelle */}
            {source === "ivcam" && (
              <div>
                <div style={{ padding:"12px 14px", background:"rgba(108,143,255,.06)", borderRadius:"var(--radius)", border:"1px solid var(--border3)", marginBottom: camActive ? 12 : 0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <Icon name="wifi" size={13} color="var(--accent)" />
                    <span style={{ fontSize:12, fontWeight:700, color:"var(--ink)" }}>Connexion automatique</span>
                  </div>
                  <div style={{ fontSize:11, color:"var(--ink3)", lineHeight:1.6 }}>
                    1. Ouvrir l'app <strong style={{ color:"var(--ink)" }}>iVCam</strong> sur le téléphone<br/>
                    2. Lancer le client <strong style={{ color:"var(--ink)" }}>iVCam</strong> sur le PC<br/>
                    3. PC et téléphone sur le <strong style={{ color:"var(--ink)" }}>même réseau WiFi</strong> — la connexion se fait automatiquement
                  </div>
                </div>
                {camActive && visibleCams.length > 0 && (
                  <select value={selectedCam}
                    onChange={e => { setSelectedCam(e.target.value); stopWebcam(); setTimeout(() => startWebcam(e.target.value), 200); }}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:"var(--radius)", fontSize:12, cursor:"pointer" }}>
                    {visibleCams.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>

          
          <div style={{
            background:"#060810", borderRadius:"var(--radius-lg)",
            aspectRatio:"4/3", position:"relative", overflow:"hidden",
            border: isActive ? "2px solid var(--accent)" : "1px solid var(--border)",
            boxShadow: isActive ? "0 0 30px rgba(108,143,255,.15)" : "var(--shadow)",
            transition:"border-color .3s, box-shadow .3s",
          }}>
            {/* Flash capture */}
            {flash && (
              <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,.5)", zIndex:20, pointerEvents:"none", borderRadius:"inherit" }} />
            )}

            
            <video ref={videoRef} autoPlay playsInline muted
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display: camActive ? "block" : "none", transform: source === "webcam" ? "scaleX(-1)" : "none" }} />

           
            <canvas ref={canvasRef} style={{ display:"none" }} />

           
            {!isActive && !camError && (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.3)" }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth=".8" style={{ marginBottom:16 }}>
                  {source === "webcam"
                    ? <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>
                    : <><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1"/><line x1="9" y1="6" x2="15" y2="6"/></>
                  }
                </svg>
                <div style={{ fontSize:14, marginBottom:6 }}>
                  {source === "webcam" ? "Caméra inactive" : "iVCam non connecté"}
                </div>
                <div style={{ fontSize:11, opacity:.6 }}>
                  {source === "ivcam" ? "Ouvrez iVCam sur le téléphone et le PC" : "Cliquez Démarrer"}
                </div>
              </div>
            )}

          
            {isActive && (
              <>
                
                <div style={{
                  position:"absolute", left:0, right:0, height:2,
                  background:"linear-gradient(90deg, transparent, var(--accent), transparent)",
                  boxShadow:"none",
                  animation: scanning ? "camScan .6s ease-in-out infinite alternate" : "camScan 3s ease-in-out infinite alternate",
                  zIndex:5,
                }} />

              
                {[
                  { top:20, left:20, borderTop:"2px solid var(--accent)", borderLeft:"2px solid var(--accent)" },
                  { top:20, right:20, borderTop:"2px solid var(--accent)", borderRight:"2px solid var(--accent)" },
                  { bottom:20, left:20, borderBottom:"2px solid var(--accent)", borderLeft:"2px solid var(--accent)" },
                  { bottom:20, right:20, borderBottom:"2px solid var(--accent)", borderRight:"2px solid var(--accent)" },
                ].map((s, i) => (
                  <div key={i} style={{ position:"absolute", width:24, height:24, ...s, zIndex:6,
                     }} />
                ))}

              
                <div style={{ position:"absolute", top:12, left:12, zIndex:8, background:"rgba(0,0,0,.75)", backdropFilter:"blur(8px)", borderRadius:8, padding:"4px 10px", display:"flex", alignItems:"center", gap:6, fontSize:10, color:"#fff", fontFamily:"var(--font-mono)", border:"1px solid rgba(255,255,255,.1)" }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background: scanning ? "var(--amb-text)" : "var(--green)", animation:"blink 1.2s ease-in-out infinite" }} />
                  {source === "ivcam" ? "iVCam · WiFi" : camLabel.slice(0,18)}
                </div>

               
                <div style={{ position:"absolute", top:12, right:12, zIndex:8, background:"rgba(0,0,0,.75)", backdropFilter:"blur(8px)", borderRadius:8, padding:"4px 10px", fontSize:10, color:"#fff", fontFamily:"var(--font-mono)", border:"1px solid rgba(255,255,255,.1)" }}>
                  {clock}
                </div>

               
                <div style={{
                  position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)", zIndex:8,
                  background: scanning ? "rgba(108,143,255,.95)" : "rgba(0,0,0,.75)",
                  backdropFilter:"blur(8px)", borderRadius:20, padding:"5px 16px",
                  fontSize:11, color:"#fff", fontFamily:"var(--font-mono)",
                  border:`1px solid ${scanning ? "rgba(108,143,255,.4)" : "rgba(255,255,255,.1)"}`,
                  display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap",
                  transition:"background .3s",
                  boxShadow: scanning ? "0 0 20px rgba(108,143,255,.4)" : "none",
                }}>
                  {scanning
                    ? <><div style={{ width:10, height:10, border:"2px solid rgba(255,255,255,.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"rotate360 .7s linear infinite" }} /> Analyse en cours...</>
                    : autoMode
                      ? "Mode automatique actif — scan toutes les 3s"
                      : "Positionnez le visage dans le cadre"
                  }
                </div>
              </>
            )}

            
            {camError && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.85)", padding:24, zIndex:15 }}>
                <div style={{ textAlign:"center" }}>
                  <Icon name="alertTri" size={36} color="#f87171" style={{ display:"block", margin:"0 auto 14px" }} />
                  <div style={{ fontSize:13, color:"#f87171", lineHeight:1.6, marginBottom:8 }}>{camError}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>Vérifiez la connexion et réessayez</div>
                </div>
              </div>
            )}
          </div>

          
          <div style={{ display:"flex", gap:8 }}>
            
            {!isActive && (
              <button
                onClick={source === "webcam" ? () => startWebcam() : connectIvcam}
                style={{
                  flex:1, padding:"13px", borderRadius:"var(--radius)",
                  border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg, var(--accent), var(--acc-dk))",
                  color:"#fff",
                  fontSize:14, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  boxShadow:"0 4px 18px transparent",
                  transition:"all .2s",
                }}
              >
                <Icon name={source === "webcam" ? "camera" : "wifi"} size={16} color="white" />
                {source === "webcam" ? "Démarrer la caméra" : "Connecter iVCam"}
              </button>
            )}

           
            {isActive && (
              <>
                {/* Scanner */}
                <button onClick={doScan} disabled={scanning} style={{
                  flex:2, padding:"13px", borderRadius:"var(--radius)", border:"none",
                  background: scanning
                    ? "var(--bg3)"
                    : "linear-gradient(135deg, var(--accent), var(--acc-dk))",
                  color: scanning ? "var(--ink3)" : "#fff",
                  fontSize:14, fontWeight:700,
                  cursor: scanning ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  boxShadow: scanning ? "none" : "0 4px 18px transparent",
                  transition:"all .2s",
                }}>
                  {scanning
                    ? <><div style={{ width:16, height:16, border:"2.5px solid var(--ink3)", borderTopColor:"transparent", borderRadius:"50%", animation:"rotate360 .7s linear infinite" }} /> Analyse...</>
                    : <>Scanner maintenant</>
                  }
                </button>

                {/* Mode Auto */}
                <button onClick={() => setAutoMode(m => !m)} style={{
                  flex:1, padding:"13px", borderRadius:"var(--radius)",
                  background: autoMode
                    ? "linear-gradient(135deg, rgba(52,211,153,.2), rgba(52,211,153,.1))"
                    : "var(--bg2)",
                  color: autoMode ? "var(--green)" : "var(--ink2)",
                  border: autoMode ? "2px solid rgba(52,211,153,.4)" : "1px solid var(--border2)",
                  fontSize:12, fontWeight:700, cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                  transition:"all .2s",
                  boxShadow: autoMode ? "0 0 16px rgba(52,211,153,.15)" : "none",
                }}>
                  <Icon name={autoMode ? "pause" : "play"} size={16} color={autoMode ? "var(--green)" : "var(--ink2)"} />
                  <span style={{ fontSize:10 }}>{autoMode ? "Auto ON" : "Auto"}</span>
                </button>

               
                <button onClick={stopWebcam} style={{
                  padding:"13px 16px", borderRadius:"var(--radius)",
                  background:"rgba(253,164,175,.08)", color:"var(--red-text)",
                  border:"1px solid rgba(248,113,113,.25)", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all .15s",
                }}>
                  </button>
              </>
            )}
          </div>

          
          <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:18, boxShadow:"var(--shadow)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <Icon name="face" size={15} color="var(--accent)" />
              <span style={{ fontFamily:"var(--font-head)", fontSize:14, fontWeight:700 }}>Dernière détection</span>
            </div>

            {last?.recognized ? (
              <div style={{ animation:"fadeUp .25s ease" }}>
               
                <div style={{
                  padding:"12px 16px", borderRadius:"var(--radius)", marginBottom:14,
                  background: last.statut === "late" ? "rgba(249,115,22,.1)" : "var(--grn-lt)",
                  border: `1px solid ${last.statut === "late" ? "rgba(251,191,36,.3)" : "rgba(52,211,153,.3)"}`,
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700, fontSize:13,
                    color: last.statut === "late" ? "var(--amb-text)" : "var(--green)" }}>
                    <Icon name={last.statut === "late" ? "clockAlert" : "checkCircle"} size={15}
                      color={last.statut === "late" ? "var(--amb-text)" : "var(--green)"} />
                    {last.statut === "late" ? "RETARD" : "PRÉSENT"}
                    {last.matiere && ` — ${last.matiere.nom}`}
                  </div>
                  <div style={{ fontSize:11, color:"var(--ink2)", marginTop:5 }}>
                    Arrivée enregistrée à <strong style={{ fontFamily:"var(--font-mono)" }}>{last.heure}</strong>
                    {last.statut === "late" && last.matiere && ` · cours depuis ${last.matiere.heure_debut}`}
                  </div>
                </div>

               
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                 
                  {last.photo_base64
                    ? <img src={last.photo_base64} alt={last.prenom} style={{ width:54, height:54, borderRadius:"50%", objectFit:"cover", border:"3px solid var(--border2)", flexShrink:0 }} />
                    : <Avatar prenom={last.prenom} nom={last.nom} id={last.eleve_id} size={54} fontSize={18} />
                  }
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:16, color:"var(--ink)" }}>{last.prenom} {last.nom}</div>
                    <div style={{ fontSize:11, color:"var(--ink3)", marginTop:3 }}>
                      Reconnu à <span style={{ fontFamily:"var(--font-mono)" }}>{last.heure}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
                      {last.mode === "simulation" && (
                        <span style={{ fontSize:10, color:"var(--amb-text)", display:"flex", alignItems:"center", gap:4, background:"rgba(249,115,22,.1)", padding:"2px 8px", borderRadius:99, border:"1px solid rgba(251,191,36,.2)" }}>
                          <Icon name="alertTri" size={10} color="var(--amb-text)" /> Simulation
                        </span>
                      )}
                      {last.mode === "real" && (
                        <span style={{ fontSize:10, color:"var(--green)", display:"flex", alignItems:"center", gap:4, background:"var(--grn-lt)", padding:"2px 8px", borderRadius:99, border:"1px solid rgba(52,211,153,.2)" }}>
                          <Icon name="checkCircle" size={10} color="var(--green)" /> Reconnaissance réelle
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontFamily:"var(--font-head)", fontSize:26, fontWeight:800,
                      color: last.statut === "late" ? "var(--amb-text)" : "var(--green)" }}>
                      {last.confiance}%
                    </div>
                    <div style={{ fontSize:10, color:"var(--ink3)", marginTop:2 }}>confiance</div>
                  </div>
                </div>
              </div>
            ) : last ? (
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px", background:"var(--bg2)", borderRadius:"var(--radius)", border:"1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize:13, color:"var(--ink2)", fontWeight:500 }}>{last.message}</div>
                  <div style={{ fontSize:11, color:"var(--ink3)", marginTop:3 }}>Repositionnez le visage et réessayez</div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"24px 0", color:"var(--ink3)" }}>
                <Icon name="scan" size={32} color="var(--ink3)" style={{ display:"block", margin:"0 auto 12px", opacity:.3 }} />
                <div style={{ fontSize:13 }}>Aucune détection pour l'instant</div>
                <div style={{ fontSize:11, marginTop:4, opacity:.6 }}>Démarrez la caméra et scannez un visage</div>
              </div>
            )}
          </div>
        </div>

      
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden", boxShadow:"var(--shadow)", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 180px)" }}>

        
          <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div>
              <div style={{ fontFamily:"var(--font-head)", fontSize:15, fontWeight:700 }}>Présences du jour</div>
              <div style={{ fontSize:11, color:"var(--ink3)", marginTop:3 }}>
                {detections.length > 0
                  ? `${detections.filter(d => d.statut === "present").length} présent(s) · ${detections.filter(d => d.statut === "late").length} retard(s)`
                  : "Aucune détection encore"}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {autoMode && (
                <div style={{ fontSize:10, color:"var(--green)", background:"var(--grn-lt)", padding:"3px 8px", borderRadius:99, border:"1px solid rgba(52,211,153,.2)", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"var(--green)", animation:"blink 1.2s ease-in-out infinite" }} />
                  Auto 3s
                </div>
              )}
              {detections.length > 0 && (
                <button onClick={() => setDetections([])} style={{ fontSize:11, color:"var(--ink3)", background:"var(--bg2)", border:"1px solid var(--border)", padding:"4px 10px", borderRadius:"var(--radius)", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  <Icon name="trash" size={11} color="var(--ink3)" /> Effacer
                </button>
              )}
            </div>
          </div>

          
          {detections.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0, borderBottom:"1px solid var(--border)", flexShrink:0 }}>
              {[
                { label:"Présents", count: detections.filter(d=>d.statut==="present").length, color:"var(--green)", bg:"var(--grn-lt)" },
                { label:"Retards",  count: detections.filter(d=>d.statut==="late").length,    color:"var(--amb-text)", bg:"rgba(249,115,22,.1)" },
                { label:"Total",    count: detections.length,                                  color:"var(--accent)",bg:"var(--acc-lt)" },
              ].map(s => (
                <div key={s.label} style={{ padding:"10px 0", textAlign:"center", background:s.bg, borderRight:"1px solid var(--border)" }}>
                  <div style={{ fontFamily:"var(--font-head)", fontSize:22, fontWeight:800, color:s.color }}>{s.count}</div>
                  <div style={{ fontSize:10, color:s.color, fontWeight:600, opacity:.8, textTransform:"uppercase", letterSpacing:".05em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Liste */}
          <div style={{ overflowY:"auto", flex:1 }}>
            {detections.length === 0 ? (
              <div style={{ padding:60, textAlign:"center", color:"#111111" }}>
                <Icon name="face" size={44} color="var(--ink3)" style={{ display:"block", margin:"0 auto 16px", opacity:.2 }} />
                <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Aucune présence enregistrée</div>
                <div style={{ fontSize:12, opacity:.6 }}>Les élèves reconnus apparaîtront ici</div>
              </div>
            ) : detections.map((d, i) => (
              <div key={d.eleve_id || i}
                style={{ display:"flex", gap:12, padding:"12px 20px", borderBottom:"1px solid var(--border)", alignItems:"center", transition:"background .1s", cursor:"default" }}
                onMouseEnter={e => e.currentTarget.style.background="var(--bg2)"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}
              >
                
                <div style={{ fontSize:11, color:"var(--ink4)", fontFamily:"var(--font-mono)", width:22, flexShrink:0, textAlign:"center" }}>
                  {detections.length - i}
                </div>

               
                <div style={{ width:9, height:9, borderRadius:"50%", flexShrink:0, background: statusColor[d.statut] || "var(--ink3)", boxShadow:`0 0 6px ${statusColor[d.statut] || "var(--ink3)"}60` }} />

               
                {d.photo_base64
                  ? <img src={d.photo_base64} alt={d.prenom} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--border2)", flexShrink:0 }} />
                  : <Avatar prenom={d.prenom} nom={d.nom} id={d.eleve_id} size={36} fontSize={12} />
                }

                
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {d.prenom} {d.nom}
                  </div>
                  <div style={{ fontSize:10, color:"var(--ink3)", marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
                    <Icon name="clock" size={10} color="var(--ink3)" />
                    <span style={{ fontFamily:"var(--font-mono)" }}>{d.heure}</span>
                    <span style={{ color:"var(--ink4)" }}>·</span>
                    <span>{d.confiance}% conf.</span>
                    {d.mode === "simulation" && <span style={{ color:"var(--amb-text)" }}>· sim</span>}
                  </div>
                </div>

               
                <StatusBadge status={d.statut || "present"} style={{ fontSize:10, flexShrink:0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
