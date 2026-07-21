import { Plus, ArrowRight, Sparkles, AlertTriangle, Check } from "lucide-react";
import { buildDirectorBrief, computeTrends } from "../utils/decisionEngine.js";
import {
  enrichAllSessions,
  formatDashboardSessionSummary,
  formatSessionHeure,
  formatSessionPlaces,
  getFreeSlotDaysThisWeek,
  getSessionsToday,
  getSessionsToPromote
} from "../utils/planningQueries.js";
import { getSessionDisplayName, isBlockedSlot, isEvenementSession, normalizeSessionStatut } from "../utils/planningHelpers.js";
import SessionBadge from "../components/SessionBadge.jsx";
import { formatDateShort, formatDayLabel, capitalize, isoDate } from "../utils/dateHelpers.js";

export default function Dashboard({ ateliers, catalogue = [], stock, onUpdate, navigate }) {
  const brief = buildDirectorBrief(ateliers, stock);
  const enriched = enrichAllSessions(ateliers, catalogue);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = isoDate(now);
  const weekAheadLimit = new Date(now);
  weekAheadLimit.setDate(now.getDate() + 7);
  const weekAheadIso = isoDate(weekAheadLimit);

  const todaySessions = getSessionsToday(enriched, todayStr);
  const lowStock = stock.filter((s) => Number(s.quantite) <= Number(s.seuilAlerte || 0));
  const freeSlotDays = getFreeSlotDaysThisWeek(enriched, now);
  const toPromote = getSessionsToPromote(enriched, { fromDate: todayStr, toDate: weekAheadIso });
  const { best, declining } = computeTrends(ateliers);

  const openSession = (session) => {
    navigate("planning", { focusSession: session.id });
  };

  const statusIcon = (status) =>
    status === "ok" ? <Check size={13} aria-hidden="true" /> : status === "warn" ? <AlertTriangle size={13} aria-hidden="true" /> : null;

  const nothingUrgent =
    todaySessions.length === 0 &&
    lowStock.length === 0 &&
    toPromote.length === 0 &&
    declining.length === 0;

  return (
    <div>
      <p className="page-title">Bonjour Agnès</p>
      <p className="page-sub">{capitalize(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</p>

      {ateliers.length === 0 ? (
        <div className="empty-card">
          <p className="empty-title">Prépare ta bibliothèque d'ateliers</p>
          <p className="empty-body">Commence par créer tes modèles réutilisables dans le Catalogue — photo, fiche, communication — avant de planifier des dates.</p>
          <button className="btn btn-primary" onClick={() => navigate("catalogue")}>
            <Plus size={15} aria-hidden="true" /> Ouvrir le Catalogue
          </button>
        </div>
      ) : (
        <>
          {nothingUrgent && (
            <div className="calm-card">
              <p className="empty-title">Rien d'urgent aujourd'hui</p>
              <p className="empty-body">Stock ok, rien à préparer, rien à promouvoir. Bon moment pour avancer sur la suite.</p>
            </div>
          )}

          {todaySessions.length > 0 && (
            <div className="today-card">
              <p className="today-title">À préparer aujourd'hui</p>
              {todaySessions.map((session) => {
                const places = formatSessionPlaces(session);
                const statut = normalizeSessionStatut(session.statut);
                const blocked = isBlockedSlot(session);

                return (
                  <button
                    key={session.id}
                    type="button"
                    className="dashboard-session-row today-row"
                    onClick={() => openSession(session)}
                  >
                    <span className="dashboard-session-main">
                      <span className="today-theme">
                        {getSessionDisplayName(session)}
                        <SessionBadge session={session} />
                      </span>
                      <span className="today-detail">
                        {[
                          formatSessionHeure(session),
                          places,
                          isEvenementSession(session) && session.intervenant?.trim()
                            ? session.intervenant.trim()
                            : null,
                          blocked ? "Créneau bloqué" : statut !== "Prévu" ? statut : null
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <ArrowRight size={14} aria-hidden="true" className="dashboard-session-arrow" />
                  </button>
                );
              })}
            </div>
          )}

          {lowStock.length > 0 && (
            <div className="alert-card">
              <p className="alert-title"><AlertTriangle size={14} aria-hidden="true" /> Matières à commander</p>
              <p className="alert-body">
                {lowStock.map((s) => `${s.nom} (manque ${Math.max(0, Math.round((Number(s.seuilAlerte) || 0) - (Number(s.quantite) || 0)))} ${s.unite || ""})`.trim()).join(" · ")}
              </p>
              <button className="btn btn-ghost btn-small" onClick={() => navigate("stocks")}>Voir les stocks</button>
            </div>
          )}

          {toPromote.length > 0 && (
            <div className="promote-card">
              <p className="promote-title">Publications à préparer</p>
              {toPromote.map((session) => (
                <div key={session.id} className="promote-row">
                  <button
                    type="button"
                    className="dashboard-session-link"
                    onClick={() => openSession(session)}
                  >
                    <span className="dashboard-promote-label">
                      {formatDashboardSessionSummary(session)} · {formatDateShort(session.date)}
                      <SessionBadge session={session} />
                    </span>
                  </button>
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => onUpdate({ ...session, communique: true })}
                  >
                    Marquer comme fait
                  </button>
                </div>
              ))}
            </div>
          )}

          {declining.length > 0 && (
            <div className="alert-card">
              <p className="alert-title"><AlertTriangle size={14} aria-hidden="true" /> Rentabilité en baisse</p>
              <p className="alert-body">
                {declining.map((d) => `${d.theme} (${Math.round(d.recentAvg)} €/h récemment, contre ${Math.round(d.prevAvg)} €/h avant)`).join(" · ")}
              </p>
              <button className="btn btn-ghost btn-small" onClick={() => navigate("rentabilite")}>Voir la rentabilité</button>
            </div>
          )}

          {best && (
            <div className="mini-list" style={{ marginBottom: "1rem" }}>
              <div className="mini-list-item">
                <div>
                  <p className="mini-list-theme">Ce qui rapporte le plus : {best.theme}</p>
                  <p className="mini-list-reason">{Math.round(best.avg)} €/h en moyenne</p>
                </div>
              </div>
            </div>
          )}

          {freeSlotDays.length > 0 && (
            <div className="mini-list" style={{ marginBottom: "1rem" }}>
              <div className="mini-list-item">
                <div>
                  <p className="mini-list-theme">
                    {freeSlotDays.length} créneau{freeSlotDays.length > 1 ? "x" : ""} encore libre{freeSlotDays.length > 1 ? "s" : ""} cette semaine
                  </p>
                  <p className="mini-list-reason">
                    {freeSlotDays.map((d) => formatDayLabel(d)).join(" · ")}
                    {" · "}sans activité planifiée
                  </p>
                </div>
                <button className="btn btn-ghost" onClick={() => navigate("planning")}>
                  Voir <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="suggestion-card">
        <p className="suggestion-eyebrow"><Sparkles size={13} aria-hidden="true" /> Décision du jour</p>
        <p className="suggestion-title">{brief.theme}</p>
        <p className="suggestion-reason">{brief.reasonSummary}</p>

        <div className="brief-stats">
          <div><span className="compute-label">Prix conseillé</span><span className="compute-value">{brief.prixConseille} €</span></div>
          <div><span className="compute-label">Places conseillées</span><span className="compute-value">{brief.placesConseillees}</span></div>
        </div>

        <div className="criteria-grid">
          {brief.criteria.map((c) => (
            <div key={c.label} className={`criteria-item criteria-${c.status}`}>
              <span className="criteria-label">{statusIcon(c.status)} {c.label}</span>
              <span className="criteria-text">{c.text}</span>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate("planning")}
        >
          Ouvrir le planning <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
