// Essaie d'abord localhost, puis 127.0.0.1
const BASE = "http://127.0.0.1:5000/api";

async function req(path, options = {}) {
  try {
    const res = await fetch(BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let body;
    try { body = await res.json(); } catch { body = {}; }
    if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
    return body;
  } catch (e) {
    if (e.message.includes("Failed to fetch") || e.name === "TypeError") {
      throw new Error("Serveur inaccessible — vérifiez que backend/app.py tourne sur le port 5000");
    }
    throw e;
  }
}

export const api = {
  getEleves:          ()           => req("/eleves"),
  getEleve:           (id)         => req(`/eleves/${id}`),
  createEleve:        (data)       => req("/eleves",       { method:"POST",   body: JSON.stringify(data) }),
  updateEleve:        (id, data)   => req(`/eleves/${id}`, { method:"PUT",    body: JSON.stringify(data) }),
  deleteEleve:        (id)         => req(`/eleves/${id}`, { method:"DELETE" }),
  getPresences:       (date)       => req(`/presences?date=${date}`),
  updatePresence:     (id, data)   => req(`/presences/${id}`, { method:"PUT", body: JSON.stringify(data) }),
  bulkUpdate:         (items, d)   => req(`/presences/bulk?date=${d}`, { method:"PUT", body: JSON.stringify(items) }),
  getStats:           ()           => req("/stats"),
  recognizeWithFrame: (frame)      => req("/facial/recognize", { method:"POST", body: JSON.stringify({ frame }) }),
  facialStatus:       ()           => req("/facial/status"),
};
