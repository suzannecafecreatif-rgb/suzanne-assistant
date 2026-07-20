/**
 * Scénarios de test manuels pour profitabilityHelpers.js
 * Exécution : node scripts/test-profitability.mjs
 */
import {
  computeProfitability,
  computeProfitabilityScenarios,
  computeSeuilRentabilite,
  coutVariableParticipant,
  getProfitabilityStatus,
  PROFITABILITY_STATUS
} from "../src/utils/profitabilityHelpers.js";

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

function approx(a, b, epsilon = 0.01) {
  return Math.abs(a - b) <= epsilon;
}

const modeleTufting = {
  prixParticipant: 45,
  placesMax: 8,
  prepMin: 30,
  dureeMin: 120,
  rangementMin: 30,
  coutMatiereParticipant: 12,
  coutBoissonParticipant: 2,
  coutGourmandiseParticipant: 1.5,
  autresCoutsParticipant: 0,
  coutsFixesAtelier: 40
};

console.log("=== Scénario 1 — Tufting Découverte @ 8 participants ===");
const s1 = computeProfitability(modeleTufting, 8);
console.log(JSON.stringify(s1, null, 2));
assert(s1.ca === 360, "CA = 360");
assert(s1.coutVariableParticipant === 15.5, "Coût variable/pers. = 15.5");
assert(s1.coutTotal === 164, "Coût total = 164");
assert(s1.margeBrute === 196, "Marge brute = 196");
assert(s1.tempsTotalMin === 180, "Temps total = 180 min");
assert(approx(s1.revenuHoraire, 65.33), "Revenu/h ≈ 65.33 €");
assert(s1.statut === PROFITABILITY_STATUS.GREEN, "Statut vert (≥ 50 €/h)");

console.log("\n=== Scénario 2 — Seuil de rentabilité ===");
const seuil = computeSeuilRentabilite(modeleTufting);
console.log("Seuil:", seuil);
assert(seuil === 2, "Seuil = 2 participants (40 / 29.5 arrondi sup.)");
const s2 = computeProfitability(modeleTufting, 4);
assert(s2.margeBrute >= 0, "Marge ≥ 0 au seuil");

console.log("\n=== Scénario 3 — 1 participant (marge négative) ===");
const s3 = computeProfitability(modeleTufting, 1);
assert(s3.margeBrute < 0, "Marge négative à 1 participant");
assert(s3.statut === PROFITABILITY_STATUS.RED, "Statut rouge");

console.log("\n=== Scénario 4 — Marge positive mais €/h faible ===");
const modeleBas = {
  ...modeleTufting,
  prixParticipant: 20,
  coutMatiereParticipant: 8,
  coutBoissonParticipant: 2,
  autresCoutsFixes: 10,
  coutsFixesAtelier: 10
};
const s4 = computeProfitability(modeleBas, 6, { revenuHoraireObjectif: 50 });
assert(s4.margeBrute > 0, "Marge positive");
assert(s4.revenuHoraire < 50, "Revenu/h sous l'objectif");
assert(s4.statut === PROFITABILITY_STATUS.ORANGE, "Statut orange");

console.log("\n=== Scénario 5 — Marge unitaire ≤ 0 (jamais rentable) ===");
const modeleImpossible = {
  prixParticipant: 10,
  coutMatiereParticipant: 12,
  autresCoutsFixes: 50,
  coutsFixesAtelier: 50
};
assert(computeSeuilRentabilite(modeleImpossible) === null, "Seuil null si marge unitaire ≤ 0");

console.log("\n=== Scénario 6 — Scénarios 1 / 50 % / complet ===");
const scenarios = computeProfitabilityScenarios(modeleTufting);
assert(scenarios.one.participants === 1, "Scénario 1 pers.");
assert(scenarios.half.participants === 4, "Scénario 50 % = 4 pers.");
assert(scenarios.full.participants === 8, "Scénario complet = 8 pers.");

console.log("\n=== Scénario 7 — getProfitabilityStatus ===");
assert(getProfitabilityStatus(-1, 10) === PROFITABILITY_STATUS.RED, "Rouge si marge < 0");
assert(getProfitabilityStatus(10, 60, 50) === PROFITABILITY_STATUS.GREEN, "Vert si ≥ objectif");
assert(getProfitabilityStatus(10, 30, 50) === PROFITABILITY_STATUS.ORANGE, "Orange si marge OK mais €/h bas");

console.log(`\n=== Résultat : ${passed} ok, ${failed} échec(s) ===`);
process.exit(failed > 0 ? 1 : 0);
