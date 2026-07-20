import {
  Home, Palette, CalendarDays, Megaphone, Package, Gift, Lightbulb, Plus, TrendingUp, Coffee, LogOut, BookOpen
} from "lucide-react";

export const NAV_BIBLIOTHEQUE = [
  { key: "catalogue", label: "Catalogue", icon: BookOpen }
];

export const NAV_ACTIVE = [
  { key: "dashboard", label: "Tableau de bord", icon: Home },
  { key: "fiche", label: "Planifier une session", icon: Plus },
  { key: "historique", label: "Historique", icon: Palette },
  { key: "rentabilite", label: "Rentabilité", icon: TrendingUp },
  { key: "stocks", label: "Stocks", icon: Package },
  { key: "planning", label: "Planning", icon: CalendarDays }
];

export const NAV_FUTURE = [
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "evenements", label: "Événements privés", icon: Gift },
  { key: "idees", label: "Idées", icon: Lightbulb }
];

export default function Sidebar({ screen, navigate, onLogout }) {
  return (
    <div className="sidebar">
      <div className="brand">
        <Coffee size={18} aria-hidden="true" />
        <span>Suzanne</span>
      </div>
      <div className="nav-group">
        <p className="nav-section-label">Bibliothèque</p>
        {NAV_BIBLIOTHEQUE.map((item) => {
          const Icon = item.icon;
          const active = screen === item.key || screen === "catalogue-fiche";
          return (
            <button
              key={item.key}
              className={`nav-item${active ? " active" : ""}`}
              onClick={() => navigate(item.key)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <p className="nav-section-label">Pilotage</p>
      <div className="nav-group">
        {NAV_ACTIVE.map((item) => {
          const Icon = item.icon;
          const active = screen === item.key;
          return (
            <button
              key={item.key}
              className={`nav-item${active ? " active" : ""}`}
              onClick={() => navigate(item.key)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <p className="nav-section-label">À venir</p>
      <div className="nav-group">
        {NAV_FUTURE.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="nav-item disabled">
              <Icon size={16} aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
      <div className="sidebar-footer">
        <button className="nav-item" onClick={onLogout}>
          <LogOut size={16} aria-hidden="true" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
}
