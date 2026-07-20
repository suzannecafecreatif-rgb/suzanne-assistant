import { useEffect, useState } from "react";
import { Clock, Copy, ImageIcon, Pencil, Trash2, Users } from "lucide-react";
import { getCatalogueSignedUrl } from "../lib/storageUpload.js";

const DIFFICULTE_LABELS = {
  facile: "Facile",
  intermediaire: "Intermédiaire",
  avance: "Avancé"
};

function formatDuree(min) {
  const n = Number(min);
  if (!n) return "—";
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function formatPrix(prix) {
  const n = Number(prix);
  if (!n) return "—";
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

export default function CatalogueCard({ item, onEdit, onDuplicate, onDelete, preview = false, className = "" }) {
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!item.photoPath) {
      setPhotoUrl(null);
      return undefined;
    }

    getCatalogueSignedUrl(item.photoPath).then(({ url }) => {
      if (!cancelled) setPhotoUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [item.photoPath]);

  const difficulteLabel = DIFFICULTE_LABELS[item.difficulte] || "—";

  return (
    <article className={`catalogue-card${item.actif === false ? " is-inactive" : ""}${preview ? " catalogue-card-preview" : ""}${className ? ` ${className}` : ""}`}>
      <div className="catalogue-card-photo">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="catalogue-card-img" />
        ) : (
          <div className="catalogue-card-photo-placeholder" aria-hidden="true">
            <ImageIcon size={28} />
          </div>
        )}
        {(item.typeActivite || item.categorie) && (
          <div className="catalogue-card-badges">
            {item.typeActivite && (
              <span className="catalogue-card-type">{item.typeActivite}</span>
            )}
            {item.categorie && (
              <span className="catalogue-card-category">{item.categorie}</span>
            )}
          </div>
        )}
      </div>

      <div className="catalogue-card-body">
        <h3 className="catalogue-card-title">{item.nom || "Sans nom"}</h3>

        <div className="catalogue-card-meta">
          <span className="catalogue-card-price">{formatPrix(item.prixParticipant)}</span>
          <span className="catalogue-card-meta-item">
            <Clock size={13} aria-hidden="true" />
            {formatDuree(item.dureeMin)}
          </span>
          <span className="catalogue-card-meta-item">
            <Users size={13} aria-hidden="true" />
            {item.placesMax ? `${item.placesMax} places` : "—"}
          </span>
        </div>

        <p className="catalogue-card-difficulte">{difficulteLabel}</p>

        {!preview && (
          <div className="catalogue-card-actions">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => onEdit(item)}>
              <Pencil size={13} aria-hidden="true" />
              Modifier
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => onDuplicate(item)}
            >
              <Copy size={13} aria-hidden="true" />
              Dupliquer
            </button>
            {onDelete && (
              <button
                type="button"
                className="btn btn-ghost btn-small catalogue-card-delete"
                onClick={() => onDelete(item)}
                aria-label={`Supprimer ${item.nom || "ce modèle"}`}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
