# FaceAttend — Gestion de présence avec reconnaissance faciale
## Terminale B

Application complète de gestion de présence avec backend Python (Flask + SQLite) et frontend React.

---

## 📁 Structure du projet

```
faceattend/
├── backend/
│   ├── app.py              ← API Flask + SQLite
│   ├── requirements.txt
│   └── faceattend.db       ← Base de données (créée automatiquement)
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx        ← Point d'entrée + CSS global
        ├── App.jsx         ← Layout + routage
        ├── api/
        │   └── client.js   ← Client API REST
        ├── components/
        │   ├── Header.jsx
        │   ├── Sidebar.jsx
        │   └── Badge.jsx   ← Avatar, StatusBadge, couleurs
        └── pages/
            ├── Dashboard.jsx     ← Tableau de bord (grille + liste + stats)
            ├── Informations.jsx  ← Fiches élèves complètes
            └── FacialPage.jsx    ← Reconnaissance faciale
```

---

## 🚀 Démarrage

### 1. Backend Python

```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate       # Linux/Mac
# venv\Scripts\activate        # Windows

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur (port 5000)
python app.py
```

La base de données SQLite (`faceattend.db`) est créée automatiquement avec 20 élèves pré-renseignés.

### 2. Frontend React

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement (port 5173)
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173)

---

## 📊 Base de données SQLite

### Table `eleves`
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT PK | Ex: TLB-001 |
| prenom, nom | TEXT | Identité |
| classe | TEXT | Terminale B |
| adresse | TEXT | Adresse complète |
| telephone | TEXT | Numéro de téléphone |
| email_parent | TEXT | Email du parent |
| contact_parent | TEXT | Nom + téléphone parent |
| date_naissance | TEXT | Format YYYY-MM-DD |
| sexe | TEXT | M ou F |
| photo_base64 | TEXT | Photo encodée base64 |

### Table `presences`
| Colonne | Type | Description |
|---------|------|-------------|
| eleve_id | TEXT FK | Référence élève |
| date | TEXT | Format YYYY-MM-DD |
| statut | TEXT | present/absent/late/unset |
| heure | TEXT | Ex: 08:14 |
| confiance | INTEGER | % confiance IA (0-100) |
| motif | TEXT | Motif absence (optionnel) |

---

## 🔌 API REST

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/eleves | Liste tous les élèves + statut du jour |
| GET | /api/eleves/:id | Détail + historique 30 jours |
| POST | /api/eleves | Créer un élève |
| PUT | /api/eleves/:id | Modifier un élève |
| DELETE | /api/eleves/:id | Supprimer un élève |
| GET | /api/presences?date= | Présences d'une date |
| PUT | /api/presences/:id | Modifier une présence |
| PUT | /api/presences/bulk | Modifier plusieurs présences |
| GET | /api/stats | Stats du jour + hebdo + absences |
| POST | /api/facial/recognize | Simulation reconnaissance faciale |

---

## 🎭 Pages de l'application

### 1. Tableau de bord
- KPI : présents / absents / retards / non renseignés
- Graphique hebdomadaire des taux de présence
- Vue grille (cartes élèves) et vue liste (tableau)
- Filtres par statut + recherche par nom/ID
- Boutons P/R/A sur chaque élève
- Modal de modification avec motif + heure
- Export CSV

### 2. Informations élèves
- Liste des élèves avec recherche
- Fiche complète : photo, nom, prénom, classe, adresse, téléphone, contact parent
- Historique des 30 derniers jours avec calendrier visuel
- Ajouter / modifier / supprimer un élève
- Import de photo

### 3. Reconnaissance faciale
- Simulation de caméra en direct avec animation
- Bouton "Scanner maintenant" → appel API backend
- Mode automatique (scan toutes les 3 secondes)
- Flux des détections du jour
- Paramètres : seuil de confiance, zone, anti-spoofing

---

## 🤖 Reconnaissance faciale réelle (InsightFace / ArcFace)

Le backend utilise **InsightFace** (modèle `buffalo_l`, ArcFace) pour la
détection et la reconnaissance faciale. Installez dans le backend :

```bash
pip install insightface onnxruntime opencv-python-headless
```

Le modèle `buffalo_l` (~280 Mo) est téléchargé automatiquement au premier
lancement du serveur et mis en cache dans `~/.insightface/models`.

Fonctionnement (déjà implémenté dans `app.py`) :
1. Le frontend envoie une frame webcam en base64 à `/api/facial/recognize`
2. Le backend décode l'image et la passe à `FaceAnalysis.get()` (InsightFace)
   qui détecte le visage et calcule un embedding ArcFace 512-d
3. L'embedding est comparé (distance cosinus) aux embeddings des élèves
   enregistrés (colonne `face_encodings`, calculés à l'inscription)
4. Si la distance est sous le seuil (0.40 par défaut), l'élève est identifié
   et sa présence est enregistrée

Si `insightface` n'est pas installé, le backend bascule automatiquement en
**mode simulation** (choix aléatoire d'un élève non encore marqué), ce qui
permet de tester l'interface sans caméra ni modèle.

---

## 🛠 Technologies

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite |
| Styles | CSS variables (pas de framework) |
| Backend | Python Flask 3 |
| Base de données | SQLite (via sqlite3 natif) |
| CORS | flask-cors |
| Fonts | Syne + Lato + JetBrains Mono |
