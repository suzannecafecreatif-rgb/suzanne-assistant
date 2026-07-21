/**
 * Scénarios de test pour planningHelpers.js
 * Exécution : node scripts/test-planning.mjs
 */
import {
  ACTIVITY_TYPE_COLORS,
  BLOCKED_SLOT_COLOR,
  createBlockedSlot,
  createSessionFromCatalogue,
  enrichSession,
  getSessionDisplayName,
  getSessionFillRate,
  getSessionTypeColor,
  isBlockedSlot,
  normalizeSessionStatut,
  patchBlockedSlot,
  patchCatalogueSession,
  SESSION_KIND,
  SESSION_STATUTS
} from "../src/utils/planningHelpers.js";

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

console.log(`\n=== Résultat : ${passed} ok, ${failed} échec(s) ===`);
process.exit(failed > 0 ? 1 : 0);
