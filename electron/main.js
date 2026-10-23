const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs   = require("fs");
const http = require("http");

let mainWindow = null;
let flaskProc  = null;
let splashWin  = null;

const isDev      = process.env.NODE_ENV === "development" || !app.isPackaged;
const FLASK_PORT = 5000;

// ── Démarrer Flask ────────────────────────────────────────────
function startFlask() {
  const pythonExe  = process.platform === "win32" ? "python" : "python3";
  const backendDir = isDev
    ? path.join(__dirname, "..", "backend")
    : path.join(process.resourcesPath, "backend");
  const appScript  = path.join(backendDir, "app.py");

  if (!fs.existsSync(appScript)) {
    console.error("Backend introuvable :", appScript);
    return;
  }

  flaskProc = spawn(pythonExe, [appScript], {
    cwd: backendDir,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    windowsHide: true,
  });

  flaskProc.stdout.on("data", d => console.log("[Flask]", d.toString().trim()));
  flaskProc.stderr.on("data", d => {
    const msg = d.toString().trim();
    if (!msg.includes("WARNING") && !msg.includes("Debugger")) {
      console.error("[Flask]", msg);
    }
  });
  flaskProc.on("close", code => console.log("[Flask] arrêté, code:", code));
  console.log("[Flask] démarré PID:", flaskProc.pid);
}

// ── Attendre que Flask soit prêt ──────────────────────────────
function waitForFlask(retries = 40, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http.get(`http://127.0.0.1:${FLASK_PORT}/api/stats`, res => {
        if (res.statusCode < 500) { resolve(); }
        else if (n > 0) setTimeout(() => attempt(n - 1), delay);
        else reject(new Error("Flask ne répond pas"));
      }).on("error", () => {
        if (n > 0) setTimeout(() => attempt(n - 1), delay);
        else reject(new Error("Flask inaccessible"));
      });
    };
    attempt(retries);
  });
}

// ── Splash screen ─────────────────────────────────────────────
function createSplash() {
  splashWin = new BrowserWindow({
    width: 480, height: 300,
    frame: false, transparent: true,
    alwaysOnTop: true, resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false },
  });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{
      font-family:'Segoe UI',sans-serif;
      background:linear-gradient(135deg,#0d0f14 0%,#161923 100%);
      border:1px solid rgba(108,143,255,.3);
      border-radius:20px; overflow:hidden;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      height:100vh; color:#fff;
      -webkit-app-region:drag;
    }
    .logo{
      width:72px;height:72px;border-radius:18px;
      background:linear-gradient(135deg,#6c8fff,#4a6eff);
      display:flex;align-items:center;justify-content:center;
      margin-bottom:18px;
      box-shadow:0 0 50px rgba(108,143,255,.6);
      animation:float 2s ease-in-out infinite;
    }
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px;}
    .sub{font-size:12px;color:#6c8fff;font-weight:700;letter-spacing:.14em;
         text-transform:uppercase;margin-bottom:28px;}
    .bar-wrap{width:220px;height:3px;background:rgba(255,255,255,.08);
              border-radius:99px;overflow:hidden;}
    .bar{height:100%;border-radius:99px;
         background:linear-gradient(90deg,#6c8fff,#34d399);
         animation:load 3s ease-in-out forwards;}
    @keyframes load{0%{width:0%}60%{width:80%}100%{width:100%}}
    .status{font-size:11px;color:rgba(255,255,255,.3);margin-top:14px;
            letter-spacing:.05em;transition:opacity .3s;}
  </style></head><body>
    <div class="logo">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
        <path d="M2 8V6a2 2 0 0 1 2-2h2"/><path d="M2 16v2a2 2 0 0 0 2 2h2"/>
        <path d="M22 8V6a2 2 0 0 0-2-2h-2"/><path d="M22 16v2a2 2 0 0 1-2 2h-2"/>
        <path d="M9 10h.01"/><path d="M15 10h.01"/>
        <path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
      </svg>
    </div>
    <h1>FaceAttend</h1>
    <div class="sub">IGGLIA 3B</div>
    <div class="bar-wrap"><div class="bar"></div></div>
    <div class="status" id="st">Démarrage du système...</div>
    <script>
      const msgs = [
        "Initialisation de la base de données...",
        "Chargement du moteur de reconnaissance...",
        "Démarrage du serveur local...",
        "Connexion aux modules...",
        "Prêt !"
      ];
      let i = 0;
      const st = document.getElementById("st");
      const iv = setInterval(() => {
        if (i < msgs.length) { st.textContent = msgs[i++]; }
        else clearInterval(iv);
      }, 550);
    </script>
  </body></html>`;

  splashWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
}

// ── Fenêtre principale ────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920,
    minWidth: 1024, minHeight: 680,
    frame: false,
    backgroundColor: "#0d0f14",
    show: false,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,  // pour charger les ressources locales
    },
  });

  const appURL = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "..", "frontend", "dist", "index.html")}`;

  mainWindow.loadURL(appURL);

  mainWindow.once("ready-to-show", () => {
    setTimeout(() => {
      if (splashWin && !splashWin.isDestroyed()) splashWin.close();
      mainWindow.show();
      mainWindow.focus();
    }, 800);
  });

  mainWindow.on("closed", () => { mainWindow = null; });
  buildMenu();
}

// ── Menu ──────────────────────────────────────────────────────
function buildMenu() {
  const tpl = [
    {
      label: "FaceAttend",
      submenu: [
        { label: "À propos de FaceAttend", click: showAbout },
        { type: "separator" },
        {
          label: "Ouvrir le dossier de données",
          click: () => {
            const dbDir = isDev
              ? path.join(__dirname, "..", "backend")
              : path.join(process.resourcesPath, "backend");
            shell.openPath(dbDir);
          }
        },
        { type: "separator" },
        { label: "Quitter",  accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { label: "Recharger",     accelerator: "CmdOrCtrl+R",    click: () => mainWindow?.reload() },
        { label: "Zoom avant",    accelerator: "CmdOrCtrl+Plus", click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: "Zoom arrière",  accelerator: "CmdOrCtrl+-",    click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: "Taille normale",accelerator: "CmdOrCtrl+0",    click: () => mainWindow?.webContents.setZoomLevel(0) },
        { type: "separator" },
        { label: "Plein écran",   accelerator: "F11",  click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
        { label: "Outils de dev", accelerator: "F12",  click: () => mainWindow?.webContents.toggleDevTools() },
      ],
    },
    {
      label: "Aide",
      submenu: [
        { label: "À propos", click: showAbout },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "FaceAttend",
    message: "FaceAttend — IGGLIA 3B",
    detail: [
      `Version : ${app.getVersion()}`,
      "Système de gestion de présences",
      "par reconnaissance faciale",
      "",
      `© ${new Date().getFullYear()} IGGLIA — Tous droits réservés`,
    ].join("\n"),
    buttons: ["Fermer"],
    icon: path.join(__dirname, "assets", "icon.png"),
  });
}

// ── IPC : contrôles fenêtre depuis React ─────────────────────
ipcMain.handle("window:minimize",    () => mainWindow?.minimize());
ipcMain.handle("window:maximize",    () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle("window:close",       () => mainWindow?.close());
ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() ?? false);
ipcMain.handle("app:version",        () => app.getVersion());

// ── Démarrage ─────────────────────────────────────────────────
app.whenReady().then(async () => {
  createSplash();
  startFlask();

  try {
    await waitForFlask();
    console.log("[Electron] ✓ Flask prêt");
  } catch (e) {
    console.warn("[Electron] Flask pas disponible, on continue :", e.message);
  }

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (flaskProc) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(flaskProc.pid), "/f", "/t"], { windowsHide: true });
    } else {
      flaskProc.kill("SIGTERM");
    }
    flaskProc = null;
  }
});
