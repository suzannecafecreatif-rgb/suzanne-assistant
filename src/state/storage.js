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
    theme: safeText(r.theme),
    date: safeText(r.date),
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
    theme: a.theme,
    date: a.date,
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
