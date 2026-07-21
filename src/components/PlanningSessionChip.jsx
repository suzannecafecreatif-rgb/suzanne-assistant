import {
  enrichSession,
  getSessionDisplayName,
  getSessionFillRate,
  getSessionTypeColor,
  isBlockedSlot
} from "../utils/planningHelpers.js";

function formatHeure(heure) {
  const value = (heure || "").trim();
  return value || "—";
}

function formatHeureRange(session) {
  const start = formatHeure(session.heure);
  if (isBlockedSlot(session) && session.heureFin) {
    return `${start} – ${formatHeure(session.heureFin)}`;
  }
  return start;
}

export default function PlanningSessionChip({ session, onClick }) {
  const color = getSessionTypeColor(session);
  const fillRate = getSessionFillRate(session);
  const fillPercent = fillRate != null ? Math.round(fillRate * 100) : null;

  return (
    <button
      type="button"
      className="planning-session-chip"
      style={{ "--session-color": color }}
      onClick={() => onClick?.(session)}
      aria-label={`${getSessionDisplayName(session)}, ${formatHeureRange(session)}`}
    >
      <span className="planning-session-chip-time">{formatHeureRange(session)}</span>
      <span className="planning-session-chip-name">{getSessionDisplayName(session)}</span>
      {fillPercent != null && (
        <span className="planning-session-chip-fill" aria-label={`Remplissage ${fillPercent} %`}>
          <span className="planning-session-chip-fill-bar" style={{ width: `${fillPercent}%` }} />
        </span>
      )}
    </button>
  );
}

export function sortSessionsByHeure(sessions) {
  return [...sessions].sort((a, b) => {
    const ha = (a.heure || "").trim();
    const hb = (b.heure || "").trim();
    if (!ha && !hb) return 0;
    if (!ha) return 1;
    if (!hb) return -1;
    return ha.localeCompare(hb, "fr");
  });
}

export function enrichSessions(sessions, catalogue) {
  return sessions.map((s) => enrichSession(s, catalogue));
}
