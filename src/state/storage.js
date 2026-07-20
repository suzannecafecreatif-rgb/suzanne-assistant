// Couche de persistance. C'est le SEUL endroit du projet qui parle
// à la base de données. Le reste de l'application (écrans, reducer)
// ne connaît pas Supabase et n'a pas besoin d'en avoir connaissance.

import { supabase } from "../lib/supabaseClient.js";

// --- Conversion entre le format base de données (snake_case) et --
// --- le format utilisé dans l'application (camelCase) ------------

// Convertit une valeur null/undefined venant de la base en valeur sûre
// pour un champ de formulaire contrôlé React (jamais null).
function safeText(v) {
  return v == null ? "" : v;
}
function safeNumberField(v) {
  return v == null ? "" : v;
}
function safeArray(v) {
  return Array.isArray(v) ? v : [];
}
function safeBool(v) {
  return !!v;
}

function atelierFromRow(r) {
  return {
    id: r.id,
    catalogueId: r.catalogue_id || null,
    nom: safeText(r.nom),
    theme: safeText(r.theme),
    date: safeText(r.date),
    heure: safeText(r.heure),
    statut: safeText(r.statut) || "ouvert",
    prixParticipant: safeNumberField(r.prix_participant),
    participants: safeNumberField(r.participants),
    coutMatiere: safeNumberField(r.cout_matiere),
    prepMin: safeNumberField(r.prep_min),
    animMin: safeNumberField(r.anim_min),
    notes: safeText(r.notes),
    materials: safeArray(r.materials),
    communique: safeBool(r.communique),
    createdAt: r.created_at
  };
}

function atelierToRow(a) {
  return {
    id: a.id,
    catalogue_id: a.catalogueId || null,
    nom: a.nom || null,
    theme: a.theme,
    date: a.date,
    heure: a.heure || null,
    statut: a.statut || "ouvert",
    prix_participant: a.prixParticipant === "" || a.prixParticipant == null ? null : Number(a.prixParticipant),
    participants: a.participants === "" || a.participants == null ? null : Number(a.participants),
    cout_matiere: a.coutMatiere === "" || a.coutMatiere == null ? null : Number(a.coutMatiere),
    prep_min: a.prepMin === "" || a.prepMin == null ? null : Number(a.prepMin),
    anim_min: a.animMin === "" || a.animMin == null ? null : Number(a.animMin),
    notes: a.notes || "",
    materials: a.materials || [],
    communique: !!a.communique,
    created_at: a.createdAt
  };
}

function catalogueFromRow(r) {
  const coutMatiereParticipant = safeNumberField(
    r.cout_matiere_participant ?? r.cout_matiere
  );
  return {
    id: r.id,
    nom: safeText(r.nom),
    typeActivite: safeText(r.type_activite),
    categorie: safeText(r.categorie),
    photoPath: safeText(r.photo_path),
    description: safeText(r.description),
    prixParticipant: safeNumberField(r.prix_participant),
    placesMax: safeNumberField(r.places_max),
    dureeMin: safeNumberField(r.duree_min),
    prepMin: safeNumberField(r.prep_min),
    rangementMin: safeNumberField(r.rangement_min),
    coutMatiereParticipant,
    coutBoissonParticipant: safeNumberField(r.cout_boisson_participant),
    coutGourmandiseParticipant: safeNumberField(r.cout_gourmandise_participant),
    autresCoutsParticipant: safeNumberField(r.autres_couts_participant ?? r.autre_cout_participant),
    coutsFixesAtelier: safeNumberField(r.couts_fixes_atelier ?? r.autres_couts_fixes),
    // Alias legacy — même valeur que coutMatiereParticipant
    coutMatiere: coutMatiereParticipant,
    difficulte: safeText(r.difficulte),
    publicConseille: safeText(r.public_conseille),
    materials: safeArray(r.materials),
    conseils: safeText(r.conseils),
    actif: r.actif !== false,
    instagramPost: safeText(r.instagram_post),
    instagramStory: safeText(r.instagram_story),
    instagramReel: safeText(r.instagram_reel),
    facebookPost: safeText(r.facebook_post),
    texteSite: safeText(r.texte_site),
    hashtags: safeText(r.hashtags),
    medias: safeArray(r.medias),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function toNullableNumber(v) {
  return v === "" || v == null ? null : Number(v);
}

function catalogueToRow(c) {
  const coutMatiereParticipant = toNullableNumber(c.coutMatiereParticipant ?? c.coutMatiere);
  return {
    id: c.id,
    nom: c.nom,
    type_activite: c.typeActivite || null,
    categorie: c.categorie,
    photo_path: c.photoPath || null,
    description: c.description || "",
    prix_participant: toNullableNumber(c.prixParticipant),
    places_max: toNullableNumber(c.placesMax),
    duree_min: toNullableNumber(c.dureeMin),
    prep_min: toNullableNumber(c.prepMin),
    rangement_min: toNullableNumber(c.rangementMin),
    cout_matiere_participant: coutMatiereParticipant,
    cout_boisson_participant: toNullableNumber(c.coutBoissonParticipant),
    cout_gourmandise_participant: toNullableNumber(c.coutGourmandiseParticipant),
    autres_couts_participant: toNullableNumber(c.autresCoutsParticipant),
    couts_fixes_atelier: toNullableNumber(c.coutsFixesAtelier),
    cout_matiere: coutMatiereParticipant,
    difficulte: c.difficulte || null,
    public_conseille: c.publicConseille || "",
    materials: c.materials || [],
    conseils: c.conseils || "",
    actif: c.actif !== false,
    instagram_post: c.instagramPost || "",
    instagram_story: c.instagramStory || "",
    instagram_reel: c.instagramReel || "",
    facebook_post: c.facebookPost || "",
    texte_site: c.texteSite || "",
    hashtags: c.hashtags || "",
    medias: c.medias || [],
    created_at: c.createdAt,
    updated_at: new Date().toISOString()
  };
}

function stockFromRow(r) {
  return {
    id: r.id,
    nom: safeText(r.nom),
    quantite: safeNumberField(r.quantite),
    unite: safeText(r.unite),
    seuilAlerte: safeNumberField(r.seuil_alerte)
  };
}

function stockToRow(s) {
  return {
    id: s.id,
    nom: s.nom,
    quantite: s.quantite === "" || s.quantite == null ? null : Number(s.quantite),
    unite: s.unite || "",
    seuil_alerte: s.seuilAlerte === "" || s.seuilAlerte == null ? null : Number(s.seuilAlerte)
  };
}

// --- Ateliers -------------------------------------------------------

export async function loadAteliers() {
  const { data, error } = await supabase.from("ateliers").select("*").order("date", { ascending: true });
  if (error) {
    console.error("Erreur de chargement des ateliers", error);
    return [];
  }
  return (data || []).map(atelierFromRow);
}

export async function upsertAteliers(list) {
  if (!list || list.length === 0) return;
  const rows = list.map(atelierToRow);
  const { error } = await supabase.from("ateliers").upsert(rows);
  if (error) console.error("Erreur de sauvegarde des ateliers", error);
}

export async function deleteAtelierRow(id) {
  const { error } = await supabase.from("ateliers").delete().eq("id", id);
  if (error) console.error("Erreur de suppression de l'atelier", error);
}

// --- Stock ------------------------------------------------------------

export async function loadStock() {
  const { data, error } = await supabase.from("stock").select("*").order("nom", { ascending: true });
  if (error) {
    console.error("Erreur de chargement du stock", error);
    return [];
  }
  return (data || []).map(stockFromRow);
}

export async function upsertStock(list) {
  if (!list || list.length === 0) return;
  const rows = list.map(stockToRow);
  const { error } = await supabase.from("stock").upsert(rows);
  if (error) console.error("Erreur de sauvegarde du stock", error);
}

export async function deleteStockRow(id) {
  const { error } = await supabase.from("stock").delete().eq("id", id);
  if (error) console.error("Erreur de suppression de la matière", error);
}

// --- Catalogue (modèles d'ateliers) -----------------------------------

export async function loadCatalogue() {
  const { data, error } = await supabase
    .from("catalogue_ateliers")
    .select("*")
    .order("nom", { ascending: true });
  if (error) {
    console.error("Erreur de chargement du catalogue", error);
    return [];
  }
  return (data || []).map(catalogueFromRow);
}

export async function upsertCatalogueItem(item) {
  if (!item) return { error: new Error("Modèle catalogue manquant") };
  const row = catalogueToRow(item);
  const { data, error } = await supabase
    .from("catalogue_ateliers")
    .upsert(row)
    .select("*")
    .single();
  if (error) {
    console.error("Erreur de sauvegarde du modèle catalogue", error);
    return { error };
  }
  return { data: catalogueFromRow(data) };
}

export async function deleteCatalogueRow(id) {
  const { error } = await supabase.from("catalogue_ateliers").delete().eq("id", id);
  if (error) {
    console.error("Erreur de suppression du modèle catalogue", error);
    return { error };
  }
  return { error: null };
}
