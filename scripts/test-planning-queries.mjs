/**
 * Scénarios de test pour planningQueries.js
 * Exécution : node scripts/test-planning-queries.mjs
 */
import {
  enrichAllSessions,
  formatDashboardSessionSummary,
  formatSessionHeure,
  formatSessionPlaces,
  getActivityFilterOptions,
  getFinancialSessions,
  getFreeSlotDaysThisWeek,
  getSessionsToday,
  getSessionsToPromote,
  getSessionActivityName,
  getTypeFilterOptions,
  isActivitySession,
  isCatalogueSession,
  isEvenementSession,
  isFinancialSession
} from "../src/utils/planningQueries.js";
import { isoDate, mondayOf } from "../src/utils/dateHelpers.js";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

const catalogue = [{
  id: "cat-1",
  nom: "Tufting Découverte",
  typeActivite: "Atelier guidé",
  placesMax: 8
}];

const ateliers = [
  {
    id: "s1",
    kind: "catalogue",
    catalogueId: "cat-1",
    nom: "Tufting Découverte",
    date: "2026-07-21",
    heure: "14:00",
    participants: 6,
    placesMax: 8,
    statut: "Réservations ouvertes",
    communique: false
  },
  {
    id: "s2",
    kind: "catalogue",
    catalogueId: "cat-1",
    nom: "Tufting Découverte",
    date: "2026-07-21",
    heure: "10:00",
    participants: 8,
    placesMax: 8,
    statut: "Complet",
    communique: true
  },
  {
    id: "s3",
    kind: "bloque",
    nom: "Créneau bloqué",
    libelle: "Privatisation",
    date: "2026-07-22",
    heure: "09:00",
    heureFin: "12:00",
    statut: "Prévu"
  },
  {
    id: "s4",
    kind: "catalogue",
    nom: "Atelier à promouvoir",
    date: "2026-07-24",
    heure: "11:00",
    participants: 4,
    placesMax: 8,
    statut: "Prévu",
    communique: false
  },
  {
    id: "s5",
    kind: "catalogue",
    nom: "Annulé",
    date: "2026-07-25",
    heure: "15:00",
    statut: "Annulé",
    communique: false
  },
  {
    id: "s6",
    kind: "evenement",
    nom: "Pop-up créatif",
    typeActivite: "Pause créative",
    date: "2026-07-23",
    heure: "15:00",
    participants: 5,
    placesMax: 10,
    statut: "Prévu",
    communique: false
  }
];

const enriched = enrichAllSessions(ateliers, catalogue);

console.log("=== Scénario 1 — Sessions aujourd'hui ===");
const today = getSessionsToday(enriched, "2026-07-21");
assert(today.length === 2, "2 sessions aujourd'hui");
assert(today[0].heure === "10:00", "Tri par heure (10h avant 14h)");
assert(today[1].id === "s1", "2e session = 14h");

console.log("\n=== Scénario 2 — Affichage heure / places ===");
assert(formatSessionHeure(today[1]) === "14:00", "Heure catalogue");
assert(formatSessionPlaces(today[1]) === "6/8", "Places 6/8");
assert(formatSessionHeure(enriched.find((s) => s.id === "s3")) === "09:00 – 12:00", "Plage créneau bloqué");
assert(formatSessionPlaces(enriched.find((s) => s.id === "s3")) === null, "Pas de places pour bloqué");

console.log("\n=== Scénario 3 — Publications à préparer ===");
const promote = getSessionsToPromote(enriched, { fromDate: "2026-07-21", toDate: "2026-07-28" });
assert(promote.length === 3, "3 sessions à promouvoir (catalogue + événement)");
assert(promote.every((s) => !s.communique), "Non communiquées");
assert(promote.some((s) => s.id === "s6"), "Événement ponctuel inclus");
assert(!promote.some((s) => s.id === "s5"), "Annulée exclue");
assert(!promote.some((s) => s.id === "s3"), "Créneau bloqué exclu");

console.log("\n=== Scénario 4 — Créneaux libres ===");
const refTuesday = new Date("2026-07-21T12:00:00");
const freeDays = getFreeSlotDaysThisWeek(enriched, refTuesday);
const freeIsos = freeDays.map((d) => isoDate(d));
assert(!freeIsos.includes("2026-07-23"), "Mercredi occupé par événement ponctuel");
assert(freeIsos.includes("2026-07-22"), "Mardi libre malgré créneau bloqué seul");
assert(!freeIsos.includes("2026-07-21"), "Mardi 21 occupé par catalogue");
assert(!freeIsos.includes("2026-07-24"), "Jeudi 24 occupé par catalogue");

console.log("\n=== Scénario 5 — Résumé Dashboard ===");
const summary = formatDashboardSessionSummary(today[0]);
assert(summary.includes("10:00"), "Résumé contient l'heure");
assert(summary.includes("Tufting"), "Résumé contient le nom");
assert(summary.includes("8/8"), "Résumé contient les places");
assert(summary.includes("Complet"), "Résumé contient le statut");

console.log("\n=== Scénario 6 — Analyse U-2 / E-A ===");
assert(getSessionActivityName(enriched.find((s) => s.id === "s1")) === "Tufting Découverte", "Nom activité snapshot");
assert(isFinancialSession(enriched.find((s) => s.id === "s1")), "Session catalogue financière");
assert(isFinancialSession(enriched.find((s) => s.id === "s6")), "Événement ponctuel financier");
assert(isEvenementSession(enriched.find((s) => s.id === "s6")), "Discrimination evenement");
assert(!isCatalogueSession(enriched.find((s) => s.id === "s6")), "Événement ≠ catalogue");
assert(isActivitySession(enriched.find((s) => s.id === "s6")), "Événement = activité");
assert(!isFinancialSession(enriched.find((s) => s.id === "s3")), "Créneau bloqué non financier");
const activityOpts = getActivityFilterOptions(enriched);
assert(activityOpts.includes("Tufting Découverte"), "Option filtre activité");
assert(activityOpts.includes("Pop-up créatif"), "Option filtre événement");
assert(getTypeFilterOptions(enriched).includes("Pause créative"), "Option filtre type événement");
assert(getFinancialSessions(enriched).length === 5, "5 sessions financières sur 6");

console.log(`\n=== Résultat : ${passed} ok, ${failed} échec(s) ===`);
process.exit(failed > 0 ? 1 : 0);
