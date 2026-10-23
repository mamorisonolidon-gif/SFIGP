import { useState, useEffect } from "react";
import Login from "./pages/Login.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Informations from "./pages/Informations.jsx";
import FacialPage from "./pages/FacialPage.jsx";
import Matieres from "./pages/Matieres.jsx";
import Historique from "./pages/Historique.jsx";
import ContactParents from "./pages/ContactParents.jsx";
import APropos from "./pages/APropos.jsx";

export default function App() {
  const [user, setUser]         = useState(null);
  const [page, setPage]         = useState("dashboard");
  const [selectedEleve, setSelectedEleve] = useState(null);
  const [theme, setTheme]       = useState("dark"); // "dark" | "light"

  // Appliquer le thème sur <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  if (!user) return <Login onLogin={setUser} theme={theme} />;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "260px 1fr",
      gridTemplateRows: "64px 1fr",
      minHeight: "100vh",
      background: "var(--bg)",
      transition: "background .3s",
    }}>
      <Header user={user} onLogout={() => setUser(null)} theme={theme} onToggleTheme={toggleTheme} />
      <Sidebar page={page} setPage={setPage} />
      <main style={{ padding:"28px 32px", overflowY:"auto", background:"var(--bg)", transition:"background .3s" }}>
        {page === "dashboard"    && <Dashboard />}
        {page === "historique"   && <Historique />}
        {page === "matieres"     && <Matieres />}
        {page === "informations" && <Informations selectedEleve={selectedEleve} setSelectedEleve={setSelectedEleve} />}
        {page === "facial"       && <FacialPage />}
        {page === "contact"      && <ContactParents />}
        {page === "apropos"      && <APropos />}
      </main>
    </div>
  );
}
