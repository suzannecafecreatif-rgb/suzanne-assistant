import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { mondayOf, addDays, isoDate, formatDate, formatDayLabel, formatMonthLabel } from "../utils/dateHelpers.js";
import AtelierPill from "../components/AtelierPill.jsx";

export default function Planning({ ateliers, onMove, navigate }) {
  const [view, setView] = useState("semaine");
  const [refDate, setRefDate] = useState(new Date());
  const [dragOverDay, setDragOverDay] = useState(null);
  const todayIso = isoDate(new Date());

  const ateliersByDate = {};
  ateliers.forEach((a) => {
    (ateliersByDate[a.date] = ateliersByDate[a.date] || []).push(a);
  });

  const dragProps = (dayIso) => ({
    onDragOver: (e) => e.preventDefault(),
    onDragEnter: () => setDragOverDay(dayIso),
    onDragLeave: () => setDragOverDay((d) => (d === dayIso ? null : d)),
    onDrop: (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (id) onMove(id, dayIso);
      setDragOverDay(null);
    }
  });

  const goPrev = () => setRefDate((d) => (view === "semaine" ? addDays(d, -7) : new Date(d.getFullYear(), d.getMonth() - 1, 1)));
  const goNext = () => setRefDate((d) => (view === "semaine" ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1)));
  const goToday = () => setRefDate(new Date());

  let content;
  if (view === "semaine") {
    const weekStart = mondayOf(refDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    content = (
      <div className="week-grid">
        {days.map((d) => {
          const iso = isoDate(d);
          const items = ateliersByDate[iso] || [];
          const isPast = iso < todayIso;
          return (
            <div key={iso} className={`week-day${dragOverDay === iso ? " drag-over" : ""}${iso === todayIso ? " is-today" : ""}`} {...dragProps(iso)}>
              <p className="week-day-label">{formatDayLabel(d)}</p>
              {items.map((a) => (
                <AtelierPill
                  key={a.id}
                  atelier={a}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                  onClick={() => navigate("fiche", { editing: true, record: a })}
                />
              ))}
              {items.length === 0 && !isPast && (
                <button className="day-add" onClick={() => navigate("fiche", { date: iso })} aria-label="Ajouter un atelier">
                  <Plus size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  } else {
    const gridStart = mondayOf(new Date(refDate.getFullYear(), refDate.getMonth(), 1));
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    content = (
      <div className="month-grid">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="month-dow">{d}</div>
        ))}
        {days.map((d) => {
          const iso = isoDate(d);
          const items = ateliersByDate[iso] || [];
          const inMonth = d.getMonth() === refDate.getMonth();
          const isPast = iso < todayIso;
          return (
            <div
              key={iso}
              className={`month-day${!inMonth ? " out-month" : ""}${dragOverDay === iso ? " drag-over" : ""}${iso === todayIso ? " is-today" : ""}`}
              {...dragProps(iso)}
            >
              <div className="month-day-header">
                <span className="month-day-num">{d.getDate()}</span>
                {items.length === 0 && !isPast && inMonth && (
                  <button className="day-add-small" onClick={() => navigate("fiche", { date: iso })} aria-label="Ajouter un atelier">
                    <Plus size={11} aria-hidden="true" />
                  </button>
                )}
              </div>
              {items.slice(0, 2).map((a) => (
                <AtelierPill
                  key={a.id}
                  atelier={a}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                  onClick={() => navigate("fiche", { editing: true, record: a })}
                />
              ))}
              {items.length > 2 && <p className="month-more">+{items.length - 2}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <p className="page-title">Planning</p>
      <p className="page-sub">Glisse un atelier vers une autre date pour le reprogrammer.</p>

      <div className="planning-toolbar">
        <div className="view-toggle">
          <button className={view === "semaine" ? "active" : ""} onClick={() => setView("semaine")}>Semaine</button>
          <button className={view === "mois" ? "active" : ""} onClick={() => setView("mois")}>Mois</button>
        </div>
        <div className="nav-toggle">
          <button className="btn-icon" aria-label="Précédent" onClick={goPrev}><ArrowLeft size={15} aria-hidden="true" /></button>
          <span className="nav-label">{view === "semaine" ? `Semaine du ${formatDate(mondayOf(refDate))}` : formatMonthLabel(refDate)}</span>
          <button className="btn-icon" aria-label="Suivant" onClick={goNext}><ArrowRight size={15} aria-hidden="true" /></button>
          <button className="btn btn-ghost btn-small" onClick={goToday}>Aujourd'hui</button>
        </div>
      </div>

      {content}
    </div>
  );
}
