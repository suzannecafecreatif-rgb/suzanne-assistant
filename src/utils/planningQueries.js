// Requêtes Dashboard — sessions planifiées (Planning V1).

import { addDays, isoDate, mondayOf } from "./dateHelpers.js";
import {
  enrichSession,
  getSessionDisplayName,
  isActivitySession,
  isBlockedSlot,
  isCatalogueSession,
  isEvenementSession,
  isFinancialSession,
  isPromotableSession,
  normalizeSessionStatut
} from "./planningHelpers.js";

function sortByHeure(sessions) {
  return [...sessions].sort((a, b) => {
    const ha = (a.heure || "").trim();
    const hb = (b.heure || "").trim();
    if (!ha && !hb) return 0;
    if (!ha) return 1;
    if (!hb) return -1;
    return ha.localeCompare(hb, "fr");
  });
}

export function enrichAllSessions(ateliers, catalogue = []) {
  return (ateliers || []).map((session) => enrichSession(session, catalogue));
}

/** Heure ou plage horaire affichable. */
export function formatSessionHeure(session) {
  const start = (session?.heure || "").trim();
  if (!start) return "—";
  if (isBlockedSlot(session) && session.heureFin?.trim()) {
    return `${start} – ${session.heureFin.trim()}`;
  }
  return start;
}

/** Places prévues / capacité (sessions catalogue uniquement). */
export function formatSessionPlaces(session) {
  if (isBlockedSlot(session)) return null;

  const booked = Number(session.participants);
  const capacity = Number(session.placesMax);
  const hasBooked = Number.isFinite(booked) && booked > 0;
  const hasCapacity = Number.isFinite(capacity) && capacity > 0;

  if (hasCapacity && hasBooked) return `${booked}/${capacity}`;
  if (hasCapacity) return `0/${capacity}`;
  if (hasBooked) return `${booked} place${booked > 1 ? "s" : ""}`;
  return null;
}

/** Sessions du jour, triées par heure. */
export function getSessionsToday(sessions, todayIso) {
  return sortByHeure(
    sessions.filter((s) => s.date === todayIso && normalizeSessionStatut(s.statut) !== "Annulé")
  );
}

/**
 * Sessions catalogue à promouvoir : futures, non communiquées, dans la fenêtre.
 * Exclut créneaux bloqués et sessions annulées.
 */
export function getSessionsToPromote(sessions, { fromDate, toDate } = {}) {
  const from = fromDate || isoDate(new Date());
  const to = toDate || from;

  return sortByHeure(
    sessions.filter((s) => {
      if (!isPromotableSession(s)) return false;
      if (s.communique) return false;
      if (normalizeSessionStatut(s.statut) === "Annulé") return false;
      if (!s.date || s.date < from || s.date > to) return false;
      return true;
    })
  );
}

/**
 * Jours encore libres cette semaine pour une activité catalogue :
 * - à partir d'aujourd'hui, jusqu'à dimanche ;
 * - un jour est libre s'il n'a aucune session catalogue ni événement ponctuel.
 */
export function getFreeSlotDaysThisWeek(sessions, refDate = new Date()) {
  const now = new Date(refDate);
  now.setHours(0, 0, 0, 0);

  const monday = mondayOf(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const occupiedDates = new Set(
    sessions
      .filter((s) => isActivitySession(s) && normalizeSessionStatut(s.statut) !== "Annulé")
      .map((s) => s.date)
      .filter(Boolean)
  );

  return weekDays.filter((d) => {
    if (d < now) return false;
    return !occupiedDates.has(isoDate(d));
  });
}

/** Résumé d'une ligne Dashboard (aujourd'hui / publication). */
export function formatDashboardSessionSummary(session) {
  const parts = [formatSessionHeure(session), getSessionDisplayName(session)];
  const places = formatSessionPlaces(session);
  const statut = normalizeSessionStatut(session.statut);
  if (places) parts.push(places);
  if (statut && statut !== "Prévu") parts.push(statut);
  return parts.join(" · ");
}

/** Nom d'activité affichable (snapshot Planning V1). */
export function getSessionActivityName(session) {
  return getSessionDisplayName(session);
}

export { isFinancialSession, isActivitySession, isEvenementSession, isCatalogueSession, isBlockedSlot };

/** Options de filtre par activité (noms uniques, triés). */
export function getActivityFilterOptions(sessions) {
  const names = new Set(
    sessions.map((s) => getSessionActivityName(s)).filter(Boolean)
  );
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
}

/** Options de filtre par type d'activité (sessions catalogue). */
export function getTypeFilterOptions(sessions) {
  const types = new Set(
    sessions
      .filter((s) => isActivitySession(s) && s.typeActivite?.trim())
      .map((s) => s.typeActivite.trim())
  );
  return [...types].sort((a, b) => a.localeCompare(b, "fr"));
}

/** Sessions avec indicateurs financiers calculables pour Historique / Rentabilité. */
export function getFinancialSessions(sessions) {
  return sessions.filter(isFinancialSession);
}
