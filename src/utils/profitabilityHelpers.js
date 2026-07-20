// Calculs de rentabilité pour les modèles catalogue.
// Coûts variables = par participant · coûts fixes = par session.

export const DEFAULT_REVENU_HORAIRE_OBJECTIF = 50;

export const PROFITABILITY_STATUS = {
  RED: "red",
  ORANGE: "orange",
  GREEN: "green"
};

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Somme des coûts variables par participant (€/pers.). */
export function coutVariableParticipant(model) {
  return (
    toNumber(model?.coutMatiereParticipant)
    + toNumber(model?.coutBoissonParticipant)
    + toNumber(model?.coutGourmandiseParticipant)
    + toNumber(model?.autresCoutsParticipant ?? model?.autreCoutParticipant)
  );
}

/** Seuil minimum de participants pour couvrir les coûts fixes. */
export function computeSeuilRentabilite(model) {
  const margeUnitaire = toNumber(model?.prixParticipant) - coutVariableParticipant(model);
  const fixes = toNumber(model?.coutsFixesAtelier ?? model?.autresCoutsFixes);

  if (margeUnitaire <= 0) return null;

  return Math.max(1, Math.ceil(fixes / margeUnitaire));
}

/** Statut couleur : rouge / orange / vert selon marge et objectif €/h. */
export function getProfitabilityStatus(margeBrute, revenuHoraire, revenuHoraireObjectif = DEFAULT_REVENU_HORAIRE_OBJECTIF) {
  if (margeBrute < 0) return PROFITABILITY_STATUS.RED;
  if (revenuHoraire == null) return PROFITABILITY_STATUS.ORANGE;
  if (revenuHoraire >= revenuHoraireObjectif) return PROFITABILITY_STATUS.GREEN;
  return PROFITABILITY_STATUS.ORANGE;
}

/**
 * Calcule la rentabilité pour un nombre de participants donné.
 * @returns {Object} ca, coutTotal, margeBrute, revenuHoraire, margeUnitaire, statut…
 */
export function computeProfitability(model, participants, options = {}) {
  const nParticipants = Math.max(0, Math.floor(toNumber(participants)));
  const prix = toNumber(model?.prixParticipant);
  const coutVar = coutVariableParticipant(model);
  const fixes = toNumber(model?.coutsFixesAtelier ?? model?.autresCoutsFixes);
  const objectif = options.revenuHoraireObjectif ?? DEFAULT_REVENU_HORAIRE_OBJECTIF;

  const ca = prix * nParticipants;
  const coutTotal = coutVar * nParticipants + fixes;
  const margeBrute = ca - coutTotal;

  const tempsTotalMin = toNumber(model?.prepMin) + toNumber(model?.dureeMin) + toNumber(model?.rangementMin);
  const tempsTotalHeures = tempsTotalMin > 0 ? tempsTotalMin / 60 : 0;
  const revenuHoraire = tempsTotalHeures > 0 ? margeBrute / tempsTotalHeures : null;

  const margeUnitaire = prix - coutVar;
  const statut = getProfitabilityStatus(margeBrute, revenuHoraire, objectif);

  return {
    participants: nParticipants,
    ca,
    coutVariableParticipant: coutVar,
    coutTotal,
    margeBrute,
    margeUnitaire,
    tempsTotalMin,
    tempsTotalHeures,
    revenuHoraire,
    seuilRentabilite: computeSeuilRentabilite(model),
    statut,
    revenuHoraireObjectif: objectif
  };
}

/** Scénarios standard : 1 participant, 50 % des places, complet. */
export function computeProfitabilityScenarios(model, options = {}) {
  const placesMax = Math.max(1, Math.floor(toNumber(model?.placesMax)) || 1);
  const half = Math.max(1, Math.ceil(placesMax / 2));

  return {
    seuilRentabilite: computeSeuilRentabilite(model),
    one: computeProfitability(model, 1, options),
    half: computeProfitability(model, half, options),
    full: computeProfitability(model, placesMax, options)
  };
}

/** Verdict orienté décision pour l'interface Rentabilité. */
export function getProfitabilityVerdict(metrics) {
  const objectif = metrics.revenuHoraireObjectif ?? DEFAULT_REVENU_HORAIRE_OBJECTIF;

  if (metrics.statut === PROFITABILITY_STATUS.RED) {
    return {
      titre: "À revoir",
      texte: metrics.seuilRentabilite != null
        ? `À ${metrics.participants} participant${metrics.participants > 1 ? "s" : ""}, tu es en perte. Il te faut au moins ${metrics.seuilRentabilite} inscription${metrics.seuilRentabilite > 1 ? "s" : ""} pour couvrir les coûts fixes — ou revois le prix et les coûts.`
        : "Le prix ne couvre même pas les coûts par participant. Augmente le prix ou réduis les coûts variables avant de planifier cette session."
    };
  }

  if (metrics.statut === PROFITABILITY_STATUS.ORANGE) {
    return {
      titre: "Rentable, à surveiller",
      texte: metrics.revenuHoraire != null
        ? `La marge est positive (${Math.round(metrics.margeBrute)} €) mais ton revenu horaire (${Math.round(metrics.revenuHoraire)} €/h) reste sous l'objectif de ${objectif} €/h. Un groupe un peu plus large ou un léger ajustement de prix peut t'aider.`
        : "La marge est positive mais le temps total n'est pas renseigné — complète préparation, durée et rangement pour estimer ton revenu horaire."
    };
  }

  return {
    titre: "Rentable",
    texte: metrics.revenuHoraire != null
      ? `À ${metrics.participants} participant${metrics.participants > 1 ? "s" : ""}, tu génères ${Math.round(metrics.margeBrute)} € de marge pour ${metrics.tempsTotalHeures.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h de travail — soit ${Math.round(metrics.revenuHoraire)} €/h, au-dessus de ton objectif.`
      : `À ${metrics.participants} participant${metrics.participants > 1 ? "s" : ""}, la marge est bonne. Renseigne les temps pour confirmer ton revenu horaire.`
  };
}
