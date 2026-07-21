import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Ban, BookOpen, Plus, X } from "lucide-react";
import { mondayOf, addDays, isoDate, formatMonthLabel } from "../utils/dateHelpers.js";
import PlanningSessionChip, { enrichSessions, sortSessionsByHeure } from "../components/PlanningSessionChip.jsx";
import { SESSION_KIND } from "../utils/planningHelpers.js";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function PlanningDayAddMenu({ dateIso, onSelect, onClose }) {
  return (
    <div className="planning-add-menu" role="menu">
      <p className="planning-add-menu-title">
        Ajouter le {new Date(`${dateIso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
      </p>
      <button
        type="button"
        className="planning-add-menu-item"
        onClick={() => onSelect(SESSION_KIND.CATALOGUE)}
      >
        <BookOpen size={15} aria-hidden="true" />
        Activité du catalogue
      </button>
      <button
        type="button"
        className="planning-add-menu-item"
        onClick={() => onSelect(SESSION_KIND.BLOQUE)}
      >
        <Ban size={15} aria-hidden="true" />
        Créneau bloqué
      </button>
      <button type="button" className="planning-add-menu-close btn btn-ghost btn-small" onClick={onClose}>
        <X size={13} aria-hidden="true" /> Fermer
      </button>
    </div>
  );
}

export default function Planning({ ateliers, catalogue = [], prefill, navigate }) {
  const [refDate, setRefDate] = useState(new Date());
  const [addMenuDate, setAddMenuDate] = useState(null);
  const [notice, setNotice] = useState("");
  const todayIso = isoDate(new Date());

  useEffect(() => {
    if (prefill?.date) {
      setRefDate(new Date(`${prefill.date}T12:00:00`));
    }
  }, [prefill?.date]);

  useEffect(() => {
    if (!prefill?.openAdd || !prefill?.date) return;
    setAddMenuDate(prefill.date);
  }, [prefill?.openAdd, prefill?.date]);

  const sessionsByDate = useMemo(() => {
    const enriched = enrichSessions(ateliers, catalogue);
    const map = {};
    enriched.forEach((session) => {
      if (!session.date) return;
      (map[session.date] = map[session.date] || []).push(session);
    });
    Object.keys(map).forEach((key) => {
      map[key] = sortSessionsByHeure(map[key]);
    });
    return map;
  }, [ateliers, catalogue]);

  const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const gridStart = mondayOf(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const goPrev = () => setRefDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setRefDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setRefDate(new Date());

  const handleAddSelect = () => {
    setAddMenuDate(null);
    setNotice("Formulaire d'ajout — prochaine étape (P-C).");
    setTimeout(() => setNotice(""), 3500);
  };

  const toggleAddMenu = (iso) => {
    setAddMenuDate((current) => (current === iso ? null : iso));
  };

  return (
    <div className="planning-page">
      <p className="page-title">Planning</p>
      <p className="page-sub">Agenda mensuel — planifie et organise toutes tes activités ici.</p>

      {notice && (
        <div className="flash-notice" role="status">{notice}</div>
      )}

      <div className="planning-toolbar">
        <div className="nav-toggle">
          <button type="button" className="btn-icon" aria-label="Mois précédent" onClick={goPrev}>
            <ArrowLeft size={15} aria-hidden="true" />
          </button>
          <span className="nav-label">{formatMonthLabel(refDate)}</span>
          <button type="button" className="btn-icon" aria-label="Mois suivant" onClick={goNext}>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={goToday}>Aujourd'hui</button>
        </div>
      </div>

      <div className="planning-agenda">
        <div className="planning-agenda-head">
          {WEEKDAYS.map((d) => (
            <div key={d} className="planning-agenda-dow">{d}</div>
          ))}
        </div>

        <div className="planning-agenda-grid">
          {days.map((d) => {
            const iso = isoDate(d);
            const items = sessionsByDate[iso] || [];
            const inMonth = d.getMonth() === refDate.getMonth();
            const isToday = iso === todayIso;
            const hasSessions = items.length > 0;

            return (
              <article
                key={iso}
                className={[
                  "planning-day",
                  !inMonth ? "is-out-month" : "",
                  isToday ? "is-today" : "",
                  hasSessions ? "has-sessions" : ""
                ].filter(Boolean).join(" ")}
              >
                <header className="planning-day-header">
                  <span className="planning-day-num">{d.getDate()}</span>
                  {hasSessions && (
                    <span className="planning-day-count">{items.length}</span>
                  )}
                </header>

                <div className="planning-day-sessions">
                  {items.map((session) => (
                    <PlanningSessionChip key={session.id} session={session} />
                  ))}
                </div>

                {inMonth && (
                  <div className="planning-day-add">
                    {addMenuDate === iso ? (
                      <PlanningDayAddMenu
                        dateIso={iso}
                        onSelect={handleAddSelect}
                        onClose={() => setAddMenuDate(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-small planning-day-add-btn"
                        onClick={() => toggleAddMenu(iso)}
                        aria-label={`Ajouter une activité le ${d.getDate()}`}
                      >
                        <Plus size={14} aria-hidden="true" />
                        Ajouter
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
