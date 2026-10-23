@echo off
chcp 65001 >nul
title FaceAttend — IGGLIA 3B — Installation
color 0A

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║     FaceAttend — IGGLIA 3B                  ║
echo  ║     Installation du logiciel                ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ── Vérifier Python ──────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Python n'est pas installe.
    echo  Telechargez Python 3.10+ sur https://python.org
    echo  IMPORTANT : Cochez "Add Python to PATH" lors de l'installation
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo  [OK] %%v detecte

:: ── Vérifier Node.js ─────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Node.js n'est pas installe.
    echo  Telechargez Node.js LTS sur https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo  [OK] Node.js %%v detecte

echo.
echo  [1/4] Installation des dependances Python...
cd /d "%~dp0backend"
pip install flask flask-cors "numpy<2.0" Pillow --quiet --disable-pip-version-check
if errorlevel 1 (
    echo  [ATTENTION] Certains paquets Python n'ont pas pu etre installes.
) else (
    echo  [OK] Backend Python installe
)

echo.
echo  [1b/4] Installation de la reconnaissance faciale (InsightFace / ArcFace)...
pip install insightface onnxruntime opencv-python-headless --quiet --disable-pip-version-check
if errorlevel 1 (
    echo  [ATTENTION] InsightFace n'a pas pu etre installe - mode simulation actif.
) else (
    echo  [OK] InsightFace ^(ArcFace^) installe
)

echo.
echo  [2/4] Installation des dependances frontend...
cd /d "%~dp0frontend"
call npm install --silent
if errorlevel 1 (
    echo  [ERREUR] Impossible d'installer le frontend.
    pause & exit /b 1
)
echo  [OK] Frontend installe

echo.
echo  [3/4] Installation d'Electron...
cd /d "%~dp0"
call npm install --silent
if errorlevel 1 (
    echo  [ERREUR] Impossible d'installer Electron.
    pause & exit /b 1
)
echo  [OK] Electron installe

echo.
echo  [4/4] Construction du frontend...
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 (
    echo  [ERREUR] Echec de la construction du frontend.
    pause & exit /b 1
)
echo  [OK] Frontend compile

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   Installation terminee avec succes !       ║
echo  ║   Lancez START.bat pour demarrer            ║
echo  ║   le logiciel FaceAttend.                   ║
echo  ╚══════════════════════════════════════════════╝
echo.
pause
