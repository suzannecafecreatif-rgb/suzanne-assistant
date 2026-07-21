// Helpers Planning V1 — sessions catalogue (snapshots), événements ponctuels et créneaux bloqués.

import { ACTIVITY_TYPES } from "../data/catalogueMeta.js";

export const SESSION_KIND = {
  CATALOGUE: "catalogue",
  BLOQUE: "bloque",
  EVENEMENT: "evenement"
};

export const SESSION_STATUTS = [
  "Prévu",
  "Réservations ouvertes",
  "Complet",
  "Privé",
  "Annulé"
];

export const DEFAULT_SESSION_STATUT = "Prévu";

/** Anciennes valeurs → statuts V1 (comparaison insensible à la casse). */
const LEGACY_STATUT_MAP = {
  ouvert: "Prévu",
  brouillon: "Prévu",
  planifie: "Prévu",
  "planifié": "Prévu",
  prevu: "Prévu",
  "prévu": "Prévu",
  "reservations ouvertes": "Réservations ouvertes",
  "réservations ouvertes": "Réservations ouvertes",
  complet: "Complet",
  prive: "Privé",
  "privé": "Privé",
  annule: "Annulé",
  "annulé": "Annulé",
  termine: "Complet",
  "terminé": "Complet"
};

function foldStatut(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSessionStatut(statut) {
  if (!statut) return DEFAULT_SESSION_STATUT;
  if (SESSION_STATUTS.includes(statut)) return statut;

  const lowered = statut.trim().toLowerCase();
  if (LEGACY_STATUT_MAP[lowered]) return LEGACY_STATUT_MAP[lowered];

  const folded = foldStatut(statut);
  for (const [legacy, mapped] of Object.entries(LEGACY_STATUT_MAP)) {
    if (foldStatut(legacy) === folded) return mapped;
  }

  return DEFAULT_SESSION_STATUT;
}

/** Regroupe les modèles catalogue actifs par type d'activité (ordre ACTIVITY_TYPES). */
export function groupCatalogueByType(catalogue, searchQuery = "") {
  const q = searchQuery.trim().toLowerCase();
  const active = (catalogue || []).filter((item) => item.actif !== false);
  const filtered = active.filter((item) => {
    if (!q) return true;
    const haystack = `${item.nom || ""} ${item.categorie || ""} ${item.typeActivite || ""}`.toLowerCase();
    return haystack.includes(q);
  });

  const buckets = new Map();
  filtered.forEach((item) => {
    const type = item.typeActivite?.trim() || "Sans type";
    if (!buckets.has(type)) buckets.set(type, []);
    buckets.get(type).push(item);
  });

  buckets.forEach((items) => {
    items.sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"));
  });

  const orderedTypes = [
    ...ACTIVITY_TYPES.filter((type) => buckets.has(type)),
    ...[...buckets.keys()].filter((type) => !ACTIVITY_TYPES.includes(type)).sort((a, b) => a.localeCompare(b, "fr"))
  ];

  return orderedTypes.map((type) => ({ type, items: buckets.get(type) || [] }));
}

export function formatCatalogueDuration(min) {
  const n = Number(min);
  if (!n) return "—";
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatCatalogueMeta(item) {
  const prix = Number(item?.prixParticipant);
  const prixLabel = Number.isFinite(prix) && prix > 0 ? `${Math.round(prix)} €` : "—";
  const duree = formatCatalogueDuration(item?.dureeMin);
  const places = Number(item?.placesMax);
  const placesLabel = Number.isFinite(places) && places > 0 ? `${places} place${places > 1 ? "s" : ""}` : "—";
  return `${prixLabel} · ${duree} · ${placesLabel}`;
}

export const ACTIVITY_TYPE_COLORS = {
  "Atelier guidé": "#e07a3a",
  "Pause créative": "#3d9a5f",
  "Atelier intervenant": "#7b5ea7",
  "Événement privé": "#4a7fb5"
};

export const BLOCKED_SLOT_COLOR = "#8a8178";

/** Couleur calendrier — événements ponctuels (indépendante du type d'activité). */
export const EVENEMENT_COLOR = "#c45c8a";

/** Modes de rémunération pour les événements ponctuels (E-A révisé). */
export const REMUNERATION_MODE = {
  ENCAISSEMENT: "encaissement",
  FORFAIT: "forfait",
  POURCENTAGE: "pourcentage",
  MONTANT_PAR_PARTICIPANT: "montant_par_participant"
};

/** Libellés UI — seuls encaissement et forfait sont exposés en E-B. */
export const REMUNERATION_MODE_LABELS = {
  [REMUNERATION_MODE.ENCAISSEMENT]: "Encaissement par Suzanne",
  [REMUNERATION_MODE.FORFAIT]: "Location de salle / forfait fixe",
  [REMUNERATION_MODE.POURCENTAGE]: "Pourcentage sur les ventes",
  [REMUNERATION_MODE.MONTANT_PAR_PARTICIPANT]: "Montant fixe par participant"
};

export const DEFAULT_REMUNERATION_MODE = REMUNERATION_MODE.ENCAISSEMENT;

/** Modes exposés dans l'interface (E-B) — pourcentage et montant/participant réservés au futur. */
export const UI_REMUNERATION_MODES = [
  REMUNERATION_MODE.ENCAISSEMENT,
  REMUNERATION_MODE.FORFAIT
];

export function getUiRemunerationModeOptions() {
  return UI_REMUNERATION_MODES.map((value) => ({
    value,
    label: REMUNERATION_MODE_LABELS[value]
  }));
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Normalise kind (legacy sans kind → catalogue). */
export function normalizeSessionKind(kind) {
  if (kind === SESSION_KIND.BLOQUE || kind === SESSION_KIND.EVENEMENT || kind === SESSION_KIND.CATALOGUE) {
    return kind;
  }
  return SESSION_KIND.CATALOGUE;
}

export function isBlockedSlot(session) {
  return normalizeSessionKind(session?.kind) === SESSION_KIND.BLOQUE;
}

export function isCatalogueSession(session) {
  return normalizeSessionKind(session?.kind) === SESSION_KIND.CATALOGUE;
}

export function isEvenementSession(session) {
  return normalizeSessionKind(session?.kind) === SESSION_KIND.EVENEMENT;
}

/** Activité planifiable avec données métier (catalogue ou événement ponctuel). */
export function isActivitySession(session) {
  const kind = normalizeSessionKind(session?.kind);
  return kind === SESSION_KIND.CATALOGUE || kind === SESSION_KIND.EVENEMENT;
}

/** Éligible aux indicateurs financiers et au classement Rentabilité. */
export function isFinancialSession(session) {
  return isActivitySession(session);
}

/** Éligible au bloc « Publications à préparer » (hors statut / communique gérés ailleurs). */
export function isPromotableSession(session) {
  return isActivitySession(session);
}

/** Normalise le mode de rémunération (événements ponctuels uniquement). */
export function normalizeRemunerationMode(mode, sessionKind = SESSION_KIND.EVENEMENT) {
  if (sessionKind !== SESSION_KIND.EVENEMENT) return null;
  if (
    mode === REMUNERATION_MODE.FORFAIT
    || mode === REMUNERATION_MODE.POURCENTAGE
    || mode === REMUNERATION_MODE.MONTANT_PAR_PARTICIPANT
  ) {
    return mode;
  }
  return DEFAULT_REMUNERATION_MODE;
}

/**
 * Revenu réellement perçu par Suzanne pour une session.
 * Catalogue : prix × inscrits. Événement : selon mode_remuneration.
 */
export function computeRevenuSuzanne(session) {
  if (!session || isBlockedSlot(session)) return 0;

  if (isEvenementSession(session)) {
    const mode = normalizeRemunerationMode(session.modeRemuneration, session.kind);
    const inscrits = toNumber(session.participants);

    switch (mode) {
      case REMUNERATION_MODE.FORFAIT:
        return toNumber(session.montantSuzanne);
      case REMUNERATION_MODE.POURCENTAGE: {
        const ventes = toNumber(session.prixPublicParticipant) * inscrits;
        return ventes * (toNumber(session.remunerationTaux) / 100);
      }
      case REMUNERATION_MODE.MONTANT_PAR_PARTICIPANT:
        return toNumber(session.montantSuzanne) * inscrits;
      case REMUNERATION_MODE.ENCAISSEMENT:
      default:
        return toNumber(session.prixParticipant) * inscrits;
    }
  }

  return toNumber(session.prixParticipant) * toNumber(session.participants);
}

/** Nom affiché dans le calendrier. */
export function getSessionDisplayName(session) {
  if (isBlockedSlot(session)) {
    return session.libelle?.trim() || session.nom?.trim() || "Créneau bloqué";
  }
  return session.nom?.trim() || session.theme?.trim() || "Sans nom";
}

/** Couleur de puce — gris (bloqué), rose (événement ponctuel), sinon type d'activité. */
export function getSessionTypeColor(session) {
  if (isBlockedSlot(session)) return BLOCKED_SLOT_COLOR;
  if (isEvenementSession(session)) return EVENEMENT_COLOR;
  return ACTIVITY_TYPE_COLORS[session.typeActivite] || BLOCKED_SLOT_COLOR;
}

/**
 * Taux de remplissage 0–1 si places et participants renseignés, sinon null.
 * participants = places prévues / capacité pour la session.
 */
export function getSessionFillRate(session) {
  if (!isActivitySession(session)) return null;
  const capacity = toNumber(session.placesMax || session.participants);
  const booked = toNumber(session.participants);
  if (capacity <= 0 || booked <= 0) return null;
  return Math.min(1, booked / capacity);
}

/** Crée une session avec snapshots depuis un modèle catalogue. */
export function createSessionFromCatalogue(catalogueItem, options = {}) {
  const {
    date,
    heure = "",
    places,
    statut = DEFAULT_SESSION_STATUT,
    notes = "",
    id,
    createdAt
  } = options;

  const placesValue = places ?? catalogueItem.placesMax ?? "";

  return {
    id: id || crypto.randomUUID(),
    kind: SESSION_KIND.CATALOGUE,
    catalogueId: catalogueItem.id,
    nom: (catalogueItem.nom || "").trim(),
    typeActivite: catalogueItem.typeActivite || "",
    categorie: catalogueItem.categorie || "",
    photoPath: catalogueItem.photoPath || "",
    description: catalogueItem.description || "",
    dureeMin: catalogueItem.dureeMin ?? "",
    prixParticipant: catalogueItem.prixParticipant ?? "",
    placesMax: catalogueItem.placesMax ?? "",
    theme: catalogueItem.categorie || catalogueItem.nom || "",
    date: date || "",
    heure,
    heureFin: "",
    libelle: "",
    intervenant: "",
    participants: placesValue,
    statut: normalizeSessionStatut(statut),
    notes: notes || "",
    coutMatiere: "",
    prepMin: catalogueItem.prepMin ?? "",
    animMin: catalogueItem.dureeMin ?? "",
    materials: [],
    communique: false,
    createdAt: createdAt || new Date().toISOString()
  };
}

/** Crée un créneau bloqué sans lien catalogue. */
export function createBlockedSlot(options = {}) {
  const {
    date,
    heure = "",
    heureFin = "",
    libelle = "",
    notes = "",
    statut = DEFAULT_SESSION_STATUT,
    id,
    createdAt
  } = options;

  const label = libelle.trim();

  return {
    id: id || crypto.randomUUID(),
    kind: SESSION_KIND.BLOQUE,
    catalogueId: null,
    nom: label || "Créneau bloqué",
    typeActivite: "",
    categorie: "",
    photoPath: "",
    description: "",
    dureeMin: "",
    prixParticipant: "",
    placesMax: "",
    theme: label || "Créneau bloqué",
    date: date || "",
    heure,
    heureFin,
    libelle: label,
    intervenant: "",
    participants: "",
    statut: normalizeSessionStatut(statut),
    notes: notes || "",
    coutMatiere: "",
    prepMin: "",
    animMin: "",
    materials: [],
    communique: false,
    createdAt: createdAt || new Date().toISOString()
  };
}

/** Crée un événement ponctuel sans lien catalogue. */
export function createEvenementSession(options = {}) {
  const {
    nom = "",
    intervenant = "",
    typeActivite = "",
    date,
    heure = "",
    prixParticipant = "",
    placesMax = "",
    inscrits,
    participants,
    dureeMin = "",
    prepMin = "",
    animMin = "",
    coutMatiere = "",
    notes = "",
    statut = DEFAULT_SESSION_STATUT,
    communique = false,
    modeRemuneration = DEFAULT_REMUNERATION_MODE,
    montantSuzanne = "",
    remunerationTaux = "",
    prixPublicParticipant = "",
    id,
    createdAt
  } = options;

  const label = nom.trim();
  const inscritsValue = inscrits ?? participants ?? "";
  const type = ACTIVITY_TYPES.includes(typeActivite) ? typeActivite : (typeActivite || "").trim();

  return {
    id: id || crypto.randomUUID(),
    kind: SESSION_KIND.EVENEMENT,
    catalogueId: null,
    nom: label,
    typeActivite: type,
    categorie: "",
    photoPath: "",
    description: "",
    dureeMin,
    prixParticipant,
    placesMax,
    theme: label,
    date: date || "",
    heure,
    heureFin: "",
    libelle: "",
    intervenant: (intervenant || "").trim(),
    modeRemuneration: normalizeRemunerationMode(modeRemuneration),
    montantSuzanne,
    remunerationTaux,
    prixPublicParticipant,
    participants: inscritsValue,
    statut: normalizeSessionStatut(statut),
    notes: notes || "",
    coutMatiere,
    prepMin,
    animMin: animMin !== "" ? animMin : dureeMin,
    materials: [],
    communique: !!communique,
    createdAt: createdAt || new Date().toISOString()
  };
}

/**
 * Complète une session pour l'affichage (legacy ou snapshots manquants).
 * Ne modifie pas la session source — retourne une copie enrichie.
 */
export function enrichSession(session, catalogueItems = []) {
  if (!session) return session;

  const enriched = {
    ...session,
    kind: normalizeSessionKind(session.kind),
    statut: normalizeSessionStatut(session.statut)
  };

  if (isBlockedSlot(enriched) || isEvenementSession(enriched)) return enriched;

  const linked = enriched.catalogueId
    ? catalogueItems.find((c) => c.id === enriched.catalogueId)
    : null;

  if (!enriched.nom?.trim()) {
    enriched.nom = linked?.nom || enriched.theme || "";
  }
  if (!enriched.typeActivite && linked?.typeActivite) {
    enriched.typeActivite = linked.typeActivite;
  }
  if (!enriched.categorie && linked?.categorie) {
    enriched.categorie = linked.categorie;
  }
  if (!enriched.photoPath && linked?.photoPath) {
    enriched.photoPath = linked.photoPath;
  }
  if (!enriched.description && linked?.description) {
    enriched.description = linked.description;
  }
  if (enriched.dureeMin === "" && linked?.dureeMin != null && linked.dureeMin !== "") {
    enriched.dureeMin = linked.dureeMin;
  }
  if (enriched.prixParticipant === "" && linked?.prixParticipant != null && linked.prixParticipant !== "") {
    enriched.prixParticipant = linked.prixParticipant;
  }
  if (enriched.placesMax === "" && linked?.placesMax != null && linked.placesMax !== "") {
    enriched.placesMax = linked.placesMax;
  }

  return enriched;
}

/** Met à jour les champs modifiables d'une session catalogue (P-D). */
export function patchCatalogueSession(session, patch = {}) {
  return {
    ...session,
    date: patch.date ?? session.date,
    heure: patch.heure ?? session.heure,
    participants: patch.participants ?? patch.places ?? session.participants,
    statut: patch.statut != null ? normalizeSessionStatut(patch.statut) : session.statut,
    notes: patch.notes ?? session.notes
  };
}

/** Met à jour les champs modifiables d'un créneau bloqué (P-D). */
export function patchBlockedSlot(session, patch = {}) {
  const libelle = patch.libelle != null ? patch.libelle.trim() : session.libelle;
  return {
    ...session,
    date: patch.date ?? session.date,
    heure: patch.heure ?? session.heure,
    heureFin: patch.heureFin ?? session.heureFin,
    libelle: libelle ?? "",
    nom: libelle || session.nom || "Créneau bloqué",
    theme: libelle || session.theme || "Créneau bloqué",
    statut: patch.statut != null ? normalizeSessionStatut(patch.statut) : session.statut,
    notes: patch.notes ?? session.notes
  };
}

/** Met à jour les champs modifiables d'un événement ponctuel. */
export function patchEvenementSession(session, patch = {}) {
  const nom = patch.nom != null ? patch.nom.trim() : session.nom;
  return {
    ...session,
    nom: nom || session.nom || "",
    theme: nom || session.theme || session.nom || "",
    intervenant: patch.intervenant != null ? patch.intervenant.trim() : session.intervenant,
    typeActivite: patch.typeActivite ?? session.typeActivite,
    date: patch.date ?? session.date,
    heure: patch.heure ?? session.heure,
    prixParticipant: patch.prixParticipant ?? patch.prix ?? session.prixParticipant,
    placesMax: patch.placesMax ?? patch.capacite ?? session.placesMax,
    participants: patch.participants ?? patch.inscrits ?? session.participants,
    dureeMin: patch.dureeMin ?? session.dureeMin,
    prepMin: patch.prepMin ?? session.prepMin,
    animMin: patch.animMin ?? session.animMin,
    coutMatiere: patch.coutMatiere ?? session.coutMatiere,
    modeRemuneration: patch.modeRemuneration != null
      ? normalizeRemunerationMode(patch.modeRemuneration)
      : session.modeRemuneration,
    montantSuzanne: patch.montantSuzanne ?? session.montantSuzanne,
    remunerationTaux: patch.remunerationTaux ?? session.remunerationTaux,
    prixPublicParticipant: patch.prixPublicParticipant ?? session.prixPublicParticipant,
    statut: patch.statut != null ? normalizeSessionStatut(patch.statut) : session.statut,
    notes: patch.notes ?? session.notes,
    communique: patch.communique != null ? !!patch.communique : session.communique
  };
}

/** Valide les champs du formulaire « Événement ponctuel » (E-B). */
export function validateEvenementForm(fields) {
  const errors = [];
  if (!fields.nom?.trim()) errors.push("Le nom est obligatoire.");
  if (!fields.heure?.trim()) errors.push("L'heure est obligatoire.");
  if (!fields.typeActivite?.trim()) errors.push("Le type d'activité est obligatoire.");

  const mode = normalizeRemunerationMode(fields.modeRemuneration);
  if (mode === REMUNERATION_MODE.ENCAISSEMENT) {
    if (toNumber(fields.prixParticipant) <= 0) {
      errors.push("Le prix par participant est obligatoire.");
    }
  } else if (mode === REMUNERATION_MODE.FORFAIT) {
    if (toNumber(fields.montantSuzanne) <= 0) {
      errors.push("Le montant revenant à Suzanne est obligatoire.");
    }
  }

  return errors;
}

/** Construit une session événement depuis les champs du formulaire (E-B). */
export function buildEvenementFromForm(fields) {
  return createEvenementSession({
    nom: fields.nom,
    intervenant: fields.intervenant,
    typeActivite: fields.typeActivite,
    date: fields.date,
    heure: fields.heure,
    modeRemuneration: fields.modeRemuneration,
    prixParticipant: fields.prixParticipant,
    montantSuzanne: fields.montantSuzanne,
    prixPublicParticipant: fields.prixPublicParticipant,
    placesMax: fields.placesMax,
    inscrits: fields.inscrits,
    notes: fields.notes
  });
}

/** Duplique une session (snapshots conservés) avec nouvelle date/heure. */
export function duplicateSession(session, options = {}) {
  if (!session) return null;

  const date = options.date ?? session.date;
  const heure = options.heure ?? session.heure ?? "";
  const heureFin = options.heureFin ?? session.heureFin ?? "";

  return {
    ...session,
    id: crypto.randomUUID(),
    date,
    heure,
    heureFin: isBlockedSlot(session) ? heureFin : session.heureFin ?? "",
    createdAt: new Date().toISOString()
  };
}
