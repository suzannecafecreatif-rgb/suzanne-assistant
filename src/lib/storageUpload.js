// Upload et gestion des fichiers dans le bucket privé Supabase « catalogue ».
// Structure : catalogue/{user_id}/{catalogue_id}/cover.{ext}

import { supabase } from "./supabaseClient.js";

export const CATALOGUE_BUCKET = "catalogue";

const SIGNED_URL_TTL_SEC = 3600;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_COMM_MEDIA_TYPES = [...ACCEPTED_IMAGE_TYPES, "video/mp4"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4"
};

/** Valide un fichier image avant upload. Retourne null si OK, sinon un message d'erreur. */
export function validateImageFile(file) {
  if (!file) return "Aucun fichier sélectionné.";
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Format accepté : JPG, PNG ou WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "La photo ne doit pas dépasser 5 Mo.";
  }
  return null;
}

/** Valide un fichier média communication (photo ou vidéo MP4). */
export function validateCommunicationMediaFile(file) {
  if (!file) return "Aucun fichier sélectionné.";
  if (!ACCEPTED_COMM_MEDIA_TYPES.includes(file.type)) {
    return "Formats acceptés : JPG, PNG, WebP ou MP4.";
  }
  const maxBytes = file.type === "video/mp4" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const maxLabel = file.type === "video/mp4" ? "50 Mo" : "5 Mo";
  if (file.size > maxBytes) {
    return `Le fichier ne doit pas dépasser ${maxLabel}.`;
  }
  return null;
}

export function getMediaTypeFromFile(file) {
  return file.type.startsWith("video/") ? "video" : "photo";
}

/** Chemin Storage pour un média communication. */
export function buildCommunicationMediaPath(userId, catalogueId, file, mediaId) {
  const ext = EXT_BY_MIME[file.type] || "jpg";
  return `${userId}/${catalogueId}/communication/${mediaId}.${ext}`;
}

/** Upload un média communication (photo ou vidéo). */
export async function uploadCommunicationMedia(userId, catalogueId, file, mediaId) {
  const validationError = validateCommunicationMediaFile(file);
  if (validationError) return { path: null, error: new Error(validationError) };

  const path = buildCommunicationMediaPath(userId, catalogueId, file, mediaId);
  const { error } = await supabase.storage
    .from(CATALOGUE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return { path: null, error };
  return { path, error: null };
}

/** Chemin Storage pour la photo principale d'un modèle catalogue. */
export function buildCataloguePhotoPath(userId, catalogueId, file) {
  const ext = EXT_BY_MIME[file.type] || "jpg";
  return `${userId}/${catalogueId}/cover.${ext}`;
}

/** Upload une photo principale (création ou remplacement avec upsert). */
export async function uploadCataloguePhoto(userId, catalogueId, file) {
  const validationError = validateImageFile(file);
  if (validationError) return { path: null, error: new Error(validationError) };

  const path = buildCataloguePhotoPath(userId, catalogueId, file);
  const { error } = await supabase.storage
    .from(CATALOGUE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return { path: null, error };
  return { path, error: null };
}

/** Remplace une photo : upload la nouvelle, supprime l'ancienne si le chemin diffère. */
export async function replaceCataloguePhoto(userId, catalogueId, file, previousPath) {
  const { path, error } = await uploadCataloguePhoto(userId, catalogueId, file);
  if (error) return { path: null, error };

  if (previousPath && previousPath !== path) {
    const { error: deleteError } = await deleteCatalogueFile(previousPath);
    if (deleteError) console.error("Impossible de supprimer l'ancienne photo", deleteError);
  }

  return { path, error: null };
}

/** Supprime plusieurs fichiers du bucket catalogue. */
export async function deleteCatalogueFiles(paths) {
  const list = (paths || []).filter(Boolean);
  if (list.length === 0) return { error: null };

  const { error } = await supabase.storage.from(CATALOGUE_BUCKET).remove(list);
  if (error) return { error };
  return { error: null };
}

/** Supprime la photo et tous les médias communication d'un modèle catalogue. */
export async function deleteCatalogueModelFiles(item) {
  const paths = [];
  if (item?.photoPath) paths.push(item.photoPath);
  if (Array.isArray(item?.medias)) {
    item.medias.forEach((m) => {
      if (m?.path) paths.push(m.path);
    });
  }
  return deleteCatalogueFiles(paths);
}

/** Supprime un fichier du bucket catalogue. */
export async function deleteCatalogueFile(path) {
  if (!path) return { error: null };

  const { error } = await supabase.storage.from(CATALOGUE_BUCKET).remove([path]);
  if (error) return { error };
  return { error: null };
}

/** URL signée pour afficher un fichier d'un bucket privé. */
export async function getCatalogueSignedUrl(path, expiresIn = SIGNED_URL_TTL_SEC) {
  if (!path) return { url: null, error: null };

  const { data, error } = await supabase.storage
    .from(CATALOGUE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) return { url: null, error };
  return { url: data.signedUrl, error: null };
}

/** Copie un fichier Storage (utilisé plus tard pour « Dupliquer un modèle »). */
export async function copyCatalogueFile(sourcePath, destPath) {
  if (!sourcePath || !destPath) {
    return { path: null, error: new Error("Chemins source et destination requis.") };
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(CATALOGUE_BUCKET)
    .download(sourcePath);

  if (downloadError) return { path: null, error: downloadError };

  const { error: uploadError } = await supabase.storage
    .from(CATALOGUE_BUCKET)
    .upload(destPath, blob, { upsert: true });

  if (uploadError) return { path: null, error: uploadError };
  return { path: destPath, error: null };
}
