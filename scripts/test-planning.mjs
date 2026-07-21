/**
 * Scénarios de test pour planningHelpers.js
 * Exécution : node scripts/test-planning.mjs
 */
import {
  ACTIVITY_TYPE_COLORS,
  BLOCKED_SLOT_COLOR,
  computeRevenuSuzanne,
  createBlockedSlot,
  createEvenementSession,
  createSessionFromCatalogue,
  duplicateSession,
  enrichSession,
  getSessionDisplayName,
  getSessionFillRate,
  getSessionTypeColor,
  isActivitySession,
  isBlockedSlot,
  isCatalogueSession,
  isEvenementSession,
  isFinancialSession,
  normalizeRemunerationMode,
  normalizeSessionKind,
  normalizeSessionStatut,
  patchBlockedSlot,
  patchCatalogueSession,
  patchEvenementSession,
  REMUNERATION_MODE,
  SESSION_KIND,
  SESSION_STATUTS
} from "../src/utils/planningHelpers.js";
import { computeMetrics } from "../src/utils/metrics.js";

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

const modeleTufting = {
  id: "cat-1",
  nom: "Tufting Découverte",
  typeActivite: "Atelier guidé",
  categorie: "Tufting",
  photoPath: "user/cat-1/cover.jpg",
  description: "Initiation au tufting",
  dureeMin: 120,
  prixParticipant: 45,
  placesMax: 8,
  prepMin: 30
};

console.log("=== Scénario 1 — Session depuis le Catalogue (snapshots) ===");
const session = createSessionFromCatalogue(modeleTufting, {
  date: "2026-09-15",
  heure: "10:00",
  places: 8
});
assert(session.kind === SESSION_KIND.CATALOGUE, "Kind = catalogue");
assert(session.catalogueId === "cat-1", "Lien catalogue");
assert(session.nom === "Tufting Découverte", "Snapshot nom");
assert(session.typeActivite === "Atelier guidé", "Snapshot type");
assert(session.categorie === "Tufting", "Snapshot catégorie");
assert(session.photoPath === "user/cat-1/cover.jpg", "Snapshot photo");
assert(session.description === "Initiation au tufting", "Snapshot description");
assert(session.dureeMin === 120, "Snapshot durée");
assert(session.prixParticipant === 45, "Snapshot prix");
assert(session.placesMax === 8, "Snapshot places max");
assert(session.participants === 8, "Places session");
assert(session.statut === "Prévu", "Statut par défaut");

console.log("\n=== Scénario 2 — Créneau bloqué ===");
const bloque = createBlockedSlot({
  date: "2026-09-16",
  heure: "14:00",
  heureFin: "17:00",
  libelle: "Privatisation possible",
  notes: "En attente de confirmation"
});
assert(isBlockedSlot(bloque), "Kind bloque");
assert(bloque.catalogueId == null, "Sans lien catalogue");
assert(bloque.heureFin === "17:00", "Heure de fin");
assert(bloque.libelle === "Privatisation possible", "Libellé");
assert(bloque.notes === "En attente de confirmation", "Notes");
assert(getSessionDisplayName(bloque) === "Privatisation possible", "Nom affiché");

console.log("\n=== Scénario 3 — Couleurs par type ===");
assert(getSessionTypeColor(session) === ACTIVITY_TYPE_COLORS["Atelier guidé"], "Orange atelier guidé");
assert(getSessionTypeColor(bloque) === BLOCKED_SLOT_COLOR, "Gris créneau bloqué");

console.log("\n=== Scénario 4 — Remplissage ===");
assert(getSessionFillRate(session) === 1, "Complet si 8/8");
const partial = createSessionFromCatalogue(modeleTufting, { date: "2026-09-17", heure: "10:00", places: 4 });
assert(getSessionFillRate(partial) === 0.5, "50 % remplissage");

console.log("\n=== Scénario 5 — enrichSession legacy ===");
const legacy = { id: "old-1", catalogueId: "cat-1", theme: "Tufting", date: "2026-09-01", statut: "ouvert" };
const enriched = enrichSession(legacy, [modeleTufting]);
assert(enriched.nom === "Tufting Découverte", "Nom enrichi depuis catalogue");
assert(enriched.statut === "Prévu", "Statut legacy migré");

console.log("\n=== Scénario 6 — Patches modification ===");
const patched = patchCatalogueSession(session, { heure: "11:00", statut: "Complet", notes: "Groupe confirmé" });
assert(patched.heure === "11:00", "Heure modifiée");
assert(patched.statut === "Complet", "Statut modifié");
assert(patched.notes === "Groupe confirmé", "Notes modifiées");
assert(patched.nom === session.nom, "Snapshot nom inchangé");
const patchedBloque = patchBlockedSlot(bloque, { libelle: "Réservé", heureFin: "18:00" });
assert(patchedBloque.libelle === "Réservé", "Libellé modifié");
assert(patchedBloque.heureFin === "18:00", "Fin modifiée");

console.log("\n=== Scénario 7 — Statuts V1 ===");
assert(SESSION_STATUTS.length === 5, "5 statuts");
assert(normalizeSessionStatut("ouvert") === "Prévu", "ouvert → Prévu");
assert(normalizeSessionStatut("BROUILLON") === "Prévu", "BROUILLON → Prévu");
assert(normalizeSessionStatut("Planifié") === "Prévu", "Planifié → Prévu");
assert(normalizeSessionStatut("reservations ouvertes") === "Réservations ouvertes", "reservations ouvertes → V1");
assert(normalizeSessionStatut("COMPLET") === "Complet", "COMPLET → Complet");
assert(normalizeSessionStatut("prive") === "Privé", "prive → Privé");
assert(normalizeSessionStatut("annule") === "Annulé", "annule → Annulé");
assert(normalizeSessionStatut("terminé") === "Complet", "terminé → Complet");
assert(normalizeSessionStatut("inconnu") === "Prévu", "valeur inconnue → Prévu");

console.log("\n=== Scénario 8 — Duplication ===");
const dupCatalogue = duplicateSession(session, { date: "2026-10-01", heure: "15:00" });
assert(dupCatalogue.id !== session.id, "Nouvel id catalogue");
assert(dupCatalogue.date === "2026-10-01", "Nouvelle date catalogue");
assert(dupCatalogue.heure === "15:00", "Nouvelle heure catalogue");
assert(dupCatalogue.nom === session.nom, "Snapshot nom conservé");
assert(dupCatalogue.catalogueId === session.catalogueId, "Lien catalogue conservé");
const dupBloque = duplicateSession(bloque, { date: "2026-10-02", heure: "09:00", heureFin: "12:00" });
assert(dupBloque.id !== bloque.id, "Nouvel id bloqué");
assert(dupBloque.heureFin === "12:00", "Nouvelle fin bloquée");
assert(dupBloque.libelle === bloque.libelle, "Libellé conservé");

console.log("\n=== Scénario 9 — Événement ponctuel (E-A) ===");
const evenement = createEvenementSession({
  nom: "Conférence linogravure",
  intervenant: "Marie Dupont",
  typeActivite: "Atelier intervenant",
  date: "2026-11-05",
  heure: "18:30",
  prixParticipant: 35,
  placesMax: 20,
  inscrits: 12,
  dureeMin: 90,
  notes: "Partenaire mairie"
});
assert(evenement.kind === SESSION_KIND.EVENEMENT, "Kind = evenement");
assert(isEvenementSession(evenement), "isEvenementSession");
assert(!isCatalogueSession(evenement), "Pas catalogue");
assert(isActivitySession(evenement), "isActivitySession");
assert(isFinancialSession(evenement), "isFinancialSession");
assert(evenement.catalogueId == null, "Sans catalogue_id");
assert(evenement.intervenant === "Marie Dupont", "Intervenant");
assert(evenement.modeRemuneration === REMUNERATION_MODE.ENCAISSEMENT, "Mode par défaut encaissement");
assert(evenement.participants === 12, "Nombre d'inscrits");
assert(evenement.typeActivite === "Atelier intervenant", "Type activité");
assert(getSessionTypeColor(evenement) === ACTIVITY_TYPE_COLORS["Atelier intervenant"], "Couleur type");
const evtSansIntervenant = createEvenementSession({ nom: "Pop-up", date: "2026-11-06", heure: "10:00" });
assert(evtSansIntervenant.intervenant === "", "Intervenant facultatif");
const patchedEvt = patchEvenementSession(evenement, { nom: "Conférence mise à jour", inscrits: 15, statut: "Complet" });
assert(patchedEvt.nom === "Conférence mise à jour", "Nom modifiable");
assert(patchedEvt.participants === 15, "Inscrits modifiables");
assert(patchedEvt.statut === "Complet", "Statut modifiable");
assert(patchedEvt.nom === patchedEvt.theme, "theme synchronisé");
const enrichedEvt = enrichSession(evenement, [modeleTufting]);
assert(enrichedEvt.nom === "Conférence linogravure", "enrichSession ne tire pas du catalogue");
assert(normalizeSessionKind(undefined) === SESSION_KIND.CATALOGUE, "Legacy kind → catalogue");
assert(normalizeSessionKind("evenement") === SESSION_KIND.EVENEMENT, "normalizeSessionKind evenement");
const dupEvt = duplicateSession(evenement, { date: "2026-12-01", heure: "19:00" });
assert(dupEvt.intervenant === evenement.intervenant, "Duplication conserve intervenant");
assert(dupEvt.modeRemuneration === evenement.modeRemuneration, "Duplication conserve mode");

console.log("\n=== Scénario 10 — Modes de rémunération (E-A révisé) ===");
assert(computeRevenuSuzanne(evenement) === 35 * 12, "Encaissement : prix × inscrits");

const carnetEmotions = createEvenementSession({
  nom: "Carnet des émotions",
  intervenant: "Intervenante extérieure",
  typeActivite: "Atelier intervenant",
  date: "2026-11-12",
  heure: "14:00",
  modeRemuneration: REMUNERATION_MODE.FORFAIT,
  montantSuzanne: 45,
  prixPublicParticipant: 35,
  placesMax: 12,
  inscrits: 8,
  coutMatiere: 10,
  prepMin: 30,
  animMin: 60
});
assert(carnetEmotions.modeRemuneration === REMUNERATION_MODE.FORFAIT, "Mode forfait");
assert(computeRevenuSuzanne(carnetEmotions) === 45, "Forfait : 45 € revenu Suzanne");
assert(computeRevenuSuzanne(carnetEmotions) !== 35 * 8, "Tarif intervenante exclu du CA");
const metricsForfait = computeMetrics(carnetEmotions);
assert(metricsForfait.revenue === 45, "Metrics revenue forfait");
assert(metricsForfait.marge === 35, "Marge = forfait − coût matière");
assert(Math.round(metricsForfait.revenuHoraire) === 23, "Revenu/h déduit temps prep + anim");

const patchedForfait = patchEvenementSession(carnetEmotions, { montantSuzanne: 50, inscrits: 10 });
assert(computeRevenuSuzanne(patchedForfait) === 50, "Patch montant forfait");
assert(patchedForfait.participants === 10, "Inscrits modifiables en forfait");

const pourcentage = createEvenementSession({
  nom: "Commission future",
  modeRemuneration: REMUNERATION_MODE.POURCENTAGE,
  prixPublicParticipant: 40,
  remunerationTaux: 10,
  inscrits: 8
});
assert(normalizeRemunerationMode(REMUNERATION_MODE.POURCENTAGE) === REMUNERATION_MODE.POURCENTAGE, "Mode pourcentage normalisé");
assert(computeRevenuSuzanne(pourcentage) === 32, "Pourcentage : 40 × 8 × 10 %");

const montantParPers = createEvenementSession({
  nom: "Commission fixe future",
  modeRemuneration: REMUNERATION_MODE.MONTANT_PAR_PARTICIPANT,
  montantSuzanne: 5,
  inscrits: 8
});
assert(computeRevenuSuzanne(montantParPers) === 40, "Montant fixe / participant : 5 × 8");

assert(computeRevenuSuzanne(session) === 45 * 8, "Catalogue inchangé : prix × inscrits");
assert(computeRevenuSuzanne(bloque) === 0, "Créneau bloqué : revenu 0");
assert(normalizeRemunerationMode(undefined, SESSION_KIND.CATALOGUE) === null, "Catalogue sans mode");

console.log(`\n=== Résultat : ${passed} ok, ${failed} échec(s) ===`);
process.exit(failed > 0 ? 1 : 0);
