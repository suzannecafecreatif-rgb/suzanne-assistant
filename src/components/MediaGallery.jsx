import { useEffect, useId, useState } from "react";
import { Film, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import {
  deleteCatalogueFile,
  getCatalogueSignedUrl,
  getMediaTypeFromFile,
  uploadCommunicationMedia
} from "../lib/storageUpload.js";

/**
 * Galerie de médias communication (photos + vidéos MP4).
 * Structure Storage : {user_id}/{catalogue_id}/communication/{mediaId}.{ext}
 */
export default function MediaGallery({
  catalogueId,
  medias = [],
  onMediasChange,
  disabled = false
}) {
  const inputId = useId();
  const [userId, setUserId] = useState(null);
  const [previewUrls, setPreviewUrls] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Charge les URL signées pour les vignettes.
  useEffect(() => {
    let cancelled = false;

    const loadUrls = async () => {
      const entries = await Promise.all(
        medias.map(async (m) => {
          const { url } = await getCatalogueSignedUrl(m.path);
          return [m.id, url];
        })
      );
      if (!cancelled) {
        setPreviewUrls(Object.fromEntries(entries.filter(([, url]) => url)));
      }
    };

    if (medias.length === 0) {
      setPreviewUrls({});
      return undefined;
    }

    loadUrls();
    return () => {
      cancelled = true;
    };
  }, [medias]);

  const canInteract = !disabled && !uploading && !!userId && !!catalogueId;

  const handleFiles = async (fileList) => {
    setError("");
    if (!canInteract || !fileList?.length) return;

    setUploading(true);
    const nextMedias = [...medias];
    let lastError = null;

    for (const file of Array.from(fileList)) {
      const mediaId = crypto.randomUUID();
      const { path, error: uploadError } = await uploadCommunicationMedia(
        userId,
        catalogueId,
        file,
        mediaId
      );

      if (uploadError) {
        lastError = uploadError.message || "Échec de l'upload.";
        continue;
      }

      nextMedias.push({
        id: mediaId,
        type: getMediaTypeFromFile(file),
        path,
        label: file.name.replace(/\.[^.]+$/, "")
      });
    }

    onMediasChange(nextMedias);
    setUploading(false);

    if (lastError) setError(lastError);
  };

  const onInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const updateLabel = (id, label) => {
    onMediasChange(medias.map((m) => (m.id === id ? { ...m, label } : m)));
  };

  const removeMedia = async (media) => {
    if (!canInteract) return;
    setError("");
    setUploading(true);

    const { error: deleteError } = await deleteCatalogueFile(media.path);
    setUploading(false);

    if (deleteError) {
      setError(deleteError.message || "Impossible de supprimer ce média.");
      return;
    }

    onMediasChange(medias.filter((m) => m.id !== media.id));
    setPreviewUrls((prev) => {
      const next = { ...prev };
      delete next[media.id];
      return next;
    });
  };

  return (
    <div className="media-gallery">
      <div className="media-gallery-header">
        <span className="label">Galerie médias</span>
        <p className="hint-text">Photos (JPG, PNG, WebP) et vidéos MP4 · plusieurs fichiers à la fois</p>
      </div>

      <div className="media-gallery-toolbar">
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4"
          multiple
          className="image-upload-input"
          onChange={onInputChange}
          disabled={!canInteract}
        />
        <label htmlFor={inputId} className={`btn btn-ghost btn-small${canInteract ? "" : " disabled"}`}>
          {uploading ? (
            <>
              <Loader2 size={13} className="spin" aria-hidden="true" />
              Envoi…
            </>
          ) : (
            <>
              <ImagePlus size={13} aria-hidden="true" />
              Ajouter des médias
            </>
          )}
        </label>
      </div>

      {medias.length === 0 ? (
        <div className="media-gallery-empty">
          <Film size={24} aria-hidden="true" />
          <p>Aucun média pour l'instant — idéal pour stocker visuels prêts pour Instagram ou Facebook.</p>
        </div>
      ) : (
        <div className="media-gallery-grid">
          {medias.map((media) => (
            <div key={media.id} className="media-gallery-item">
              <div className="media-gallery-thumb">
                {media.type === "video" ? (
                  previewUrls[media.id] ? (
                    <video src={previewUrls[media.id]} className="media-gallery-video" muted playsInline />
                  ) : (
                    <div className="media-gallery-video-placeholder">
                      <Film size={22} aria-hidden="true" />
                    </div>
                  )
                ) : previewUrls[media.id] ? (
                  <img src={previewUrls[media.id]} alt="" className="media-gallery-img" />
                ) : (
                  <div className="media-gallery-video-placeholder">
                    <Loader2 size={18} className="spin" aria-hidden="true" />
                  </div>
                )}
                {media.type === "video" && (
                  <span className="media-gallery-badge">Vidéo</span>
                )}
              </div>
              <input
                className="input media-gallery-label"
                value={media.label || ""}
                onChange={(e) => updateLabel(media.id, e.target.value)}
                placeholder="Nom ou légende"
                disabled={disabled || uploading}
              />
              <button
                type="button"
                className="btn-icon media-gallery-delete"
                aria-label="Supprimer ce média"
                onClick={() => removeMedia(media)}
                disabled={!canInteract}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="image-upload-error">{error}</p>}
    </div>
  );
}
