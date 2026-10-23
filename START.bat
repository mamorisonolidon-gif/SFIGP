@echo off
chcp 65001 >nul
title FaceAttend — IGGLIA 3B

echo.
echo  Demarrage de FaceAttend IGGLIA 3B...

:: Aller dans le dossier du script
cd /d "%~dp0"

:: Demarrer Flask en arrière-plan (fenêtre cachée)
start /b "" python backend\app.py

:: Attendre que Flask soit pret (3 secondes)
timeout /t 3 /nobreak >nul

:: Lancer l'application Electron
npx electron . --no-sandbox

:: A la fermeture, stopper Flask
taskkill /f /im python.exe >nul 2>&1
