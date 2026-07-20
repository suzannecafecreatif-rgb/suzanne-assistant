import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import {
  deleteCatalogueFile,
  getCatalogueSignedUrl,
  replaceCataloguePhoto,
  uploadCataloguePhoto,
  validateImageFile
} from "../lib/storageUpload.js";

/**
 * Import de la photo principale d'un modèle catalogue.
 * Props :
 * - catalogueId : identifiant du modèle (UUID, connu avant le premier enregistrement BDD)
 * - photoPath : chemin Storage actuel (contrôlé par le parent)
 * - onPhotoPathChange : callback(path | "")
 */
export default function ImageUpload({
  catalogueId,
  photoPath = "",
  onPhotoPathChange,
  disabled = false
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const localPreviewRef = useRef(null);

  const [userId, setUserId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Récupère l'utilisateur connecté (requis par les politiques RLS Storage).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Affiche la photo existante via URL signée.
  useEffect(() => {
    let cancelled = false;

    if (!photoPath) {
      setPreviewUrl(null);
      return undefined;
    }

    getCatalogueSignedUrl(photoPath).then(({ url, error: urlError }) => {
      if (cancelled) return;
      if (urlError) {
        console.error("Erreur de prévisualisation", urlError);
        setPreviewUrl(null);
        return;
      }
      setPreviewUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  // Libère l'aperçu local temporaire (blob) après upload ou démontage.
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
        localPreviewRef.current = null;
      }
    };
  }, []);

  const setLocalPreview = useCallback((file) => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
    }
    const blobUrl = URL.createObjectURL(file);
    localPreviewRef.current = blobUrl;
    setPreviewUrl(blobUrl);
  }, []);

  const handleFile = useCallback(async (file) => {
    setError("");

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!userId) {
      setError("Session non disponible. Reconnecte-toi.");
      return;
    }
    if (!catalogueId) {
      setError("Identifiant du modèle manquant.");
      return;
    }

    setLocalPreview(file);
    setUploading(true);

    const uploadFn = photoPath
      ? () => replaceCataloguePhoto(userId, catalogueId, file, photoPath)
      : () => uploadCataloguePhoto(userId, catalogueId, file);

    const { path, error: uploadError } = await uploadFn();

    setUploading(false);

    if (uploadError) {
      setError(uploadError.message || "Échec de l'upload.");
      if (photoPath) {
        getCatalogueSignedUrl(photoPath).then(({ url }) => setPreviewUrl(url));
      } else {
        setPreviewUrl(null);
      }
      return;
    }

    onPhotoPathChange(path);
  }, [catalogueId, onPhotoPathChange, photoPath, setLocalPreview, userId]);

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleRemove = async () => {
    if (disabled || uploading) return;
    setError("");

    if (photoPath) {
      setUploading(true);
      const { error: deleteError } = await deleteCatalogueFile(photoPath);
      setUploading(false);
      if (deleteError) {
        setError(deleteError.message || "Impossible de supprimer la photo.");
        return;
      }
    }

    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    setPreviewUrl(null);
    onPhotoPathChange("");
  };

  const canInteract = !disabled && !uploading && !!userId && !!catalogueId;

  return (
    <div className="image-upload">
      <span className="label">Photo</span>

      <div className={`image-upload-box${previewUrl ? " has-preview" : ""}`}>
        {previewUrl ? (
          <img src={previewUrl} alt="Aperçu de l'atelier" className="image-upload-preview" />
        ) : (
          <div className="image-upload-placeholder">
            <ImagePlus size={28} aria-hidden="true" />
            <p>JPG, PNG ou WebP · max. 5 Mo</p>
          </div>
        )}

        {uploading && (
          <div className="image-upload-overlay" aria-live="polite">
            <Loader2 size={22} className="spin" aria-hidden="true" />
            <span>Envoi en cours…</span>
          </div>
        )}
      </div>

      <div className="image-upload-actions">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="image-upload-input"
          onChange={onInputChange}
          disabled={!canInteract}
        />
        <label htmlFor={inputId} className={`btn btn-ghost btn-small${canInteract ? "" : " disabled"}`}>
          {photoPath ? "Remplacer la photo" : "Choisir une photo"}
        </label>
        {previewUrl && (
          <button
            type="button"
            className="btn btn-ghost btn-small image-upload-remove"
            onClick={handleRemove}
            disabled={!canInteract}
          >
            <Trash2 size={14} aria-hidden="true" />
            Supprimer
          </button>
        )}
      </div>

      {!catalogueId && (
        <p className="hint-text">L'identifiant du modèle est requis pour envoyer une photo.</p>
      )}
      {error && <p className="image-upload-error">{error}</p>}
    </div>
  );
}
