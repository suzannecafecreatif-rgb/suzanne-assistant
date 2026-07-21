import { useEffect, useState } from "react";
import { Copy, Trash2, X } from "lucide-react";
import {
  duplicateSession,
  formatCatalogueDuration,
  formatCatalogueMeta,
  getSessionDisplayName,
  getSessionTypeColor,
  isBlockedSlot,
  patchBlockedSlot,
  patchCatalogueSession,
  SESSION_STATUTS
} from "../utils/planningHelpers.js";

function formatDateLabel(dateIso) {
  if (!dateIso) return "—";
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatPrix(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

function initForm(session) {
  if (isBlockedSlot(session)) {
    return {
      date: session.date || "",
      heure: session.heure || "",
      heureFin: session.heureFin || "",
      libelle: session.libelle || "",
      statut: session.statut || "Prévu",
      notes: session.notes || ""
    };
  }
  return {
    date: session.date || "",
    heure: session.heure || "",
    places: session.participants ?? "",
    statut: session.statut || "Prévu",
    notes: session.notes || ""
  };
}

function initDuplicateForm(session) {
  return {
    date: session.date || "",
    heure: session.heure || "",
    heureFin: session.heureFin || ""
  };
}

export default function PlanningDetailModal({
  session,
  onClose,
  onUpdate,
  onSaveDuplicate,
  onDelete
}) {
  const blocked = isBlockedSlot(session);
  const color = getSessionTypeColor(session);
  const title = getSessionDisplayName(session);

  const [form, setForm] = useState(() => initForm(session));
  const [dupForm, setDupForm] = useState(() => initDuplicateForm(session));
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [error, setError] = useState("");
  const [dupError, setDupError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dupSaving, setDupSaving] = useState(false);

  useEffect(() => {
    setForm(initForm(session));
    setDupForm(initDuplicateForm(session));
    setShowDuplicate(false);
    setError("");
    setDupError("");
  }, [session]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.date) {
      setError("La date est obligatoire.");
      return;
    }
    if (!form.heure?.trim()) {
      setError("L'heure est obligatoire.");
      return;
    }
    if (blocked && !form.heureFin?.trim()) {
      setError("L'heure de fin est obligatoire.");
      return;
    }

    setSaving(true);
    const updated = blocked
      ? patchBlockedSlot(session, form)
      : patchCatalogueSession(session, { ...form, participants: form.places });
    await onUpdate(updated);
    setSaving(false);
    onClose();
  };

  const handleDuplicate = async (e) => {
    e.preventDefault();
    setDupError("");

    if (!dupForm.date) {
      setDupError("La date est obligatoire.");
      return;
    }
    if (!dupForm.heure?.trim()) {
      setDupError("L'heure est obligatoire.");
      return;
    }
    if (blocked && !dupForm.heureFin?.trim()) {
      setDupError("L'heure de fin est obligatoire.");
      return;
    }

    setDupSaving(true);
    const copy = duplicateSession(session, dupForm);
    await onSaveDuplicate(copy);
    setDupSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    const label = getSessionDisplayName(session);
    const when = formatDateLabel(session.date);
    if (!window.confirm(`Supprimer « ${label} » du ${when} ?\n\nCette action est définitive.`)) {
      return;
    }
    await onDelete(session.id);
    onClose();
  };

  return (
    <div className="planning-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="planning-modal planning-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="planning-modal-header planning-detail-header">
          <div>
            <p
              className="planning-detail-type"
              style={{ "--session-color": color }}
            >
              {blocked ? "Créneau bloqué" : session.typeActivite || "Activité catalogue"}
            </p>
            <h2 id="planning-detail-title" className="planning-modal-title">{title}</h2>
            <p className="planning-modal-eyebrow">{formatDateLabel(session.date)}</p>
          </div>
          <button type="button" className="btn-icon" aria-label="Fermer" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <form className="planning-modal-body" onSubmit={handleSave}>
          {!blocked && (
            <section className="planning-detail-snapshot" aria-label="Informations figées au moment de la planification">
              <p className="planning-detail-section-label">Snapshot catalogue</p>
              <dl className="planning-detail-meta">
                <div><dt>Nom</dt><dd>{session.nom || "—"}</dd></div>
                <div><dt>Type</dt><dd>{session.typeActivite || "—"}</dd></div>
                <div><dt>Catégorie</dt><dd>{session.categorie || "—"}</dd></div>
                <div><dt>Prix</dt><dd>{formatPrix(session.prixParticipant)}</dd></div>
                <div><dt>Durée</dt><dd>{formatCatalogueDuration(session.dureeMin)}</dd></div>
                <div><dt>Capacité max</dt><dd>{session.placesMax || "—"}</dd></div>
              </dl>
              {session.description?.trim() && (
                <p className="planning-detail-description">{session.description}</p>
              )}
              <p className="planning-detail-hint">{formatCatalogueMeta(session)}</p>
            </section>
          )}

          <section className="planning-modal-fields">
            <p className="planning-detail-section-label">
              {blocked ? "Informations du créneau" : "Occurrence planifiée"}
            </p>

            <label className="field">
              <span className="label">Date</span>
              <input className="input" type="date" value={form.date} onChange={update("date")} required />
            </label>

            <div className="field-row">
              <label className="field">
                <span className="label">{blocked ? "Heure de début" : "Heure"}</span>
                <input className="input" type="time" value={form.heure} onChange={update("heure")} required />
              </label>
              {blocked ? (
                <label className="field">
                  <span className="label">Heure de fin</span>
                  <input className="input" type="time" value={form.heureFin} onChange={update("heureFin")} required />
                </label>
              ) : (
                <label className="field">
                  <span className="label">Places prévues</span>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    value={form.places}
                    onChange={update("places")}
                    placeholder={session.placesMax || "8"}
                  />
                </label>
              )}
            </div>

            {blocked && (
              <label className="field">
                <span className="label">Libellé</span>
                <input
                  className="input"
                  value={form.libelle}
                  onChange={update("libelle")}
                  placeholder="Ex. Privatisation possible, Réservé…"
                />
              </label>
            )}

            <label className="field">
              <span className="label">Statut</span>
              <select className="input" value={form.statut} onChange={update("statut")}>
                {SESSION_STATUTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="label">Notes internes</span>
              <textarea
                className="input planning-modal-textarea"
                rows={3}
                value={form.notes}
                onChange={update("notes")}
                placeholder="Notes internes…"
              />
            </label>
          </section>

          {error && <p className="planning-modal-error">{error}</p>}

          <footer className="planning-detail-footer">
            <button
              type="button"
              className="btn btn-ghost planning-detail-delete"
              onClick={handleDelete}
              disabled={saving || dupSaving}
            >
              <Trash2 size={14} aria-hidden="true" /> Supprimer
            </button>
            <div className="planning-detail-footer-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowDuplicate((v) => !v)}
                disabled={saving || dupSaving}
              >
                <Copy size={14} aria-hidden="true" /> Dupliquer
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving || dupSaving}>
                Fermer
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || dupSaving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </footer>
        </form>

        {showDuplicate && (
          <form className="planning-detail-duplicate" onSubmit={handleDuplicate}>
            <p className="planning-detail-section-label">Dupliquer vers une nouvelle date</p>
            <label className="field">
              <span className="label">Nouvelle date</span>
              <input
                className="input"
                type="date"
                value={dupForm.date}
                onChange={(e) => setDupForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span className="label">{blocked ? "Heure de début" : "Heure"}</span>
                <input
                  className="input"
                  type="time"
                  value={dupForm.heure}
                  onChange={(e) => setDupForm((f) => ({ ...f, heure: e.target.value }))}
                  required
                />
              </label>
              {blocked && (
                <label className="field">
                  <span className="label">Heure de fin</span>
                  <input
                    className="input"
                    type="time"
                    value={dupForm.heureFin}
                    onChange={(e) => setDupForm((f) => ({ ...f, heureFin: e.target.value }))}
                    required
                  />
                </label>
              )}
            </div>
            {dupError && <p className="planning-modal-error">{dupError}</p>}
            <button type="submit" className="btn btn-primary btn-small" disabled={dupSaving || saving}>
              {dupSaving ? "Création…" : "Créer la copie"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
