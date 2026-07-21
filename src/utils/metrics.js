import { computeRevenuSuzanne } from "./planningHelpers.js";

export function computeMetrics(a) {
  const revenue = computeRevenuSuzanne(a);
  const marge = revenue - (Number(a.coutMatiere) || 0);
  const heures = ((Number(a.prepMin) || 0) + (Number(a.animMin) || 0)) / 60;
  const revenuHoraire = heures > 0 ? marge / heures : null;
  return { revenue, marge, heures, revenuHoraire };
}

export function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}
