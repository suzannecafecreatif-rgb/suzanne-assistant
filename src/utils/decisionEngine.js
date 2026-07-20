import { THEMES } from "../data/themes.js";
import { computeMetrics } from "./metrics.js";
import {
  MS_WEEK,
  capitalize,
  getSaisonLabel,
  mondayOf,
  addDays,
  isoDate,
  formatDateShort
} from "./dateHelpers.js";

export function computeSuggestions(ateliers, { excludeThemes = [], count = 3 } = {}) {
  const now = new Date();
  const month = now.getMonth();
  const candidates = THEMES.filter((t) => !excludeThemes.includes(t));

  const scored = candidates.map((theme) => {
    const history = ateliers
      .filter((a) => a.theme === theme)
      .sort((x, y) => new Date(y.date) - new Date(x.date));
    const reasonParts = [];
    let score = 4;

    if (history.length === 0) {
      reasonParts.push("jamais testé, bon moyen de commencer à mesurer sa rentabilité");
    } else {
      const last = history[0];
      const weeksSince = Math.max(0, Math.round((now - new Date(last.date)) / MS_WEEK));
      const horaires = history.map(computeMetrics).map((m) => m.revenuHoraire).filter((v) => v != null);
      const avgHoraire = horaires.length ? horaires.reduce((a, b) => a + b, 0) / horaires.length : null;

      if (weeksSince >= 4) reasonParts.push(`pas proposé depuis ${weeksSince} semaines`);
      else reasonParts.push(`proposé il y a ${weeksSince || "moins d'une"} semaine${weeksSince > 1 ? "s" : ""}`);
      if (avgHoraire != null) reasonParts.push(`marge moyenne de ${Math.round(avgHoraire)} €/h`);

      score = weeksSince * 1.5 + (avgHoraire ? avgHoraire / 8 : 0);
    }

    if (theme === "Bougies" && [9, 10, 11].includes(month)) {
      score += 6;
      reasonParts.push("saison des fêtes, forte demande habituelle");
    }
    if (theme === "Création saisonnière") {
      score += 2;
      reasonParts.push(`peut coller à ${getSaisonLabel(month)}`);
    }

    return { theme, reason: capitalize(reasonParts.join(" · ")), score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, count);
}

export function materialFeasibility(theme, ateliers, stock) {
  const history = ateliers.filter((a) => a.theme === theme && a.materials && a.materials.length > 0);
  if (history.length === 0 || stock.length === 0) {
    return { status: "neutral", text: "Pas encore assez de données matière pour ce thème." };
  }
  const totals = {};
  const counts = {};
  history.forEach((a) => a.materials.forEach((m) => {
    if (!m.stockId) return;
    totals[m.stockId] = (totals[m.stockId] || 0) + (Number(m.qty) || 0);
    counts[m.stockId] = (counts[m.stockId] || 0) + 1;
  }));
  const shortages = [];
  Object.keys(totals).forEach((stockId) => {
    const avgNeeded = totals[stockId] / counts[stockId];
    const item = stock.find((s) => s.id === stockId);
    if (item && Number(item.quantite) < avgNeeded) shortages.push(item.nom);
  });
  if (shortages.length > 0) {
    return { status: "warn", text: `Stock probablement insuffisant : ${shortages.join(", ")}.` };
  }
  return { status: "ok", text: "Stock suffisant d'après tes dernières séances." };
}

export function buildDirectorBrief(ateliers, stock) {
  const now = new Date();
  const month = now.getMonth();

  const allMetrics = ateliers.map(computeMetrics);
  const allHoraires = allMetrics.map((m) => m.revenuHoraire).filter((v) => v != null);
  const globalAvgHoraire = allHoraires.length ? allHoraires.reduce((a, b) => a + b, 0) / allHoraires.length : null;
  const allPrices = ateliers.map((a) => Number(a.prixParticipant)).filter((v) => v > 0);
  const globalAvgPrice = allPrices.length ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : null;
  const allParticipants = ateliers.map((a) => Number(a.participants)).filter((v) => v > 0);
  const globalAvgParticipants = allParticipants.length ? allParticipants.reduce((a, b) => a + b, 0) / allParticipants.length : null;

  const scored = THEMES.map((theme) => {
    const history = ateliers.filter((a) => a.theme === theme).sort((x, y) => new Date(y.date) - new Date(x.date));
    const future = ateliers.filter((a) => a.theme === theme && new Date(a.date) > now && (new Date(a.date) - now) <= 21 * 24 * 3600 * 1000);
    const duplicate = future.length > 0;
    const horaires = history.map(computeMetrics).map((m) => m.revenuHoraire).filter((v) => v != null);
    const avgHoraire = horaires.length ? horaires.reduce((a, b) => a + b, 0) / horaires.length : null;
    const weeksSince = history.length ? Math.max(0, Math.round((now - new Date(history[0].date)) / MS_WEEK)) : null;

    let score = weeksSince == null ? 5 : weeksSince * 1.5 + (avgHoraire ? avgHoraire / 8 : 0);
    let seasonOk = false;
    let seasonText = "Pas de contrainte saisonnière particulière ce mois-ci.";
    if (theme === "Bougies" && [9, 10, 11].includes(month)) {
      score += 6; seasonOk = true; seasonText = "Saison des fêtes, la demande est habituellement forte.";
    }
    if (theme === "Création saisonnière") {
      score += 2; seasonOk = true; seasonText = `Peut coller à ${getSaisonLabel(month)}.`;
    }
    if (duplicate) score -= 100;

    return { theme, history, future, duplicate, avgHoraire, weeksSince, score, seasonOk, seasonText };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const chosen = sorted.find((s) => !s.duplicate) || sorted[0];

  const themePrices = chosen.history.map((a) => Number(a.prixParticipant)).filter((v) => v > 0);
  const prixConseille = themePrices.length
    ? Math.round((themePrices.reduce((a, b) => a + b, 0) / themePrices.length) / 5) * 5
    : globalAvgPrice
    ? Math.round(globalAvgPrice / 5) * 5
    : 30;

  const themeParticipants = chosen.history.map((a) => Number(a.participants)).filter((v) => v > 0);
  const placesConseillees = themeParticipants.length
    ? Math.round(themeParticipants.reduce((a, b) => a + b, 0) / themeParticipants.length)
    : globalAvgParticipants
    ? Math.round(globalAvgParticipants)
    : 8;

  const criteria = [];
  criteria.push({
    label: "Récence",
    status: chosen.weeksSince == null ? "neutral" : chosen.weeksSince >= 4 ? "ok" : "warn",
    text: chosen.weeksSince == null
      ? "Jamais testé, bon moyen de commencer à mesurer sa rentabilité."
      : chosen.weeksSince >= 4
      ? `Pas proposé depuis ${chosen.weeksSince} semaines.`
      : `Proposé il y a seulement ${chosen.weeksSince || "moins d'une"} semaine${chosen.weeksSince > 1 ? "s" : ""}.`
  });
  criteria.push({ label: "Saison", status: chosen.seasonOk ? "ok" : "neutral", text: chosen.seasonText });
  criteria.push({
    label: "Rentabilité",
    status: chosen.avgHoraire == null ? "neutral" : globalAvgHoraire == null ? "neutral" : chosen.avgHoraire >= globalAvgHoraire ? "ok" : "warn",
    text: chosen.avgHoraire == null
      ? "Pas encore assez de données de rentabilité pour ce thème."
      : `Marge moyenne de ${Math.round(chosen.avgHoraire)} €/h${globalAvgHoraire != null ? (chosen.avgHoraire >= globalAvgHoraire ? ", au-dessus de ta moyenne." : ", en dessous de ta moyenne.") : "."}`
  });
  criteria.push({
    label: "Risque de doublon",
    status: chosen.duplicate ? "warn" : "ok",
    text: chosen.duplicate
      ? `Déjà programmé le ${formatDateShort(chosen.future[0].date)}, à espacer.`
      : "Aucun autre atelier de ce thème prévu prochainement."
  });
  const materialCheck = materialFeasibility(chosen.theme, ateliers, stock);
  criteria.push({ label: "Matières", status: materialCheck.status, text: materialCheck.text });

  const reasonSummary = criteria
    .filter((c) => c.status !== "neutral")
    .map((c) => c.text)
    .slice(0, 2)
    .join(" ") || criteria[0].text;

  return { theme: chosen.theme, reasonSummary, criteria, prixConseille, placesConseillees };
}

export function computeTrends(ateliers) {
  const declining = [];
  let best = null;
  THEMES.forEach((theme) => {
    const history = ateliers
      .filter((a) => a.theme === theme)
      .sort((x, y) => new Date(x.date) - new Date(y.date))
      .map(computeMetrics)
      .map((m) => m.revenuHoraire)
      .filter((v) => v != null);
    if (history.length === 0) return;
    const overallAvg = history.reduce((a, b) => a + b, 0) / history.length;
    if (best == null || overallAvg > best.avg) best = { theme, avg: overallAvg };
    if (history.length >= 4) {
      const mid = Math.floor(history.length / 2);
      const previous = history.slice(0, mid);
      const recent = history.slice(mid);
      const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (recentAvg < prevAvg * 0.85) {
        declining.push({ theme, prevAvg, recentAvg });
      }
    }
  });
  return { best, declining };
}

export function freeSlotsThisWeek(ateliers) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const monday = mondayOf(now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const byDate = {};
  ateliers.forEach((a) => { byDate[a.date] = (byDate[a.date] || 0) + 1; });
  return days.filter((d) => d >= now && !byDate[isoDate(d)]);
}
