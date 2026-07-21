import { useEffect, useMemo, useState } from "react";
import { Copy, Trash2, X } from "lucide-react";
import { ACTIVITY_TYPES } from "../data/catalogueMeta.js";
import {
  computeRevenuSuzanne,
  duplicateSession,
  formatRevenuSuzanne,
  getSessionTypeColor,
  getUiRemunerationModeOptions,
  initEvenementDetailForm,
  patchEvenementFromForm,
  REMUNERATION_MODE,
  REMUNERATION_MODE_LABELS,
  validateEvenementForm
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

export default function PlanningEvenementDetailModal({
  session,
  onClose,
  onUpdate,
  onSaveDuplicate,
  onDelete
}) {
  const color = getSessionTypeColor(session);
  const remunerationOptions = useMemo(() => getUiRemunerationModeOptions(), []);

  const [form, setForm] = useState(() => initEvenementDetailForm(session));
  const [dupForm, setDupForm] = useState({ date: session.date || "", heure: session.heure || "" });
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [error, setError] = useState("");
  const [dupError, setDupError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dupSaving, setDupSaving] = useState(false);

  useEffect(() => {
    setForm(initEvenementDetailForm(session));
    setDupForm({ date: session.date || "", heure: session.heure || "" });
    setShowDuplicate(false);
    setError("");
    setDupError("");
  }, [session]);

  const previewSession = useMemo(
    () => patchEvenementFromForm(session, form),
    [session, form]
  );
  const revenuLabel = formatRevenuSuzanne(previewSession);
  const showEncaissementFields = form.modeRemuneration === REMUNERATION_MODE.ENCAISSEMENT;
  const showForfaitFields = form.modeRemuneration === REMUNERATION_MODE.FORFAIT;

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.date) {
      setError("La date est obligatoire.");
      return;
    }

    const validationErrors = validateEvenementForm(form);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    setSaving(true);
    await onUpdate(patchEvenementFromForm(session, form));
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

    setDupSaving(true);
    const copy = duplicateSession(session, dupForm);
    await onSaveDuplicate(copy);
    setDupSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    const label = form.nom.trim() || "Événement ponctuel";
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
        className="planning-modal planning-detail-modal planning-evenement-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-evenement-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="planning-modal-header planning-detail-header">
          <div>
            <p className="planning-detail-type" style={{ "--session-color": color }}>
              Événement ponctuel
            </p>
            <h2 id="planning-evenement-detail-title" className="planning-modal-title">
              {form.nom.trim() || "Sans nom"}
            </h2>
            <p className="planning-modal-eyebrow">{formatDateLabel(form.date || session.date)}</p>
          </div>
          <button type="button" className="btn-icon" aria-label="Fermer" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <form className="planning-modal-body" onSubmit={handleSave}>
          <section className="planning-modal-fields planning-modal-fields--flush">
            <label className="field">
              <span className="label">Nom</span>
              <input className="input" value={form.nom} onChange={update("nom")} required />
            </label>

            <label className="field">
              <span className="label">Intervenant</span>
              <input
                className="input"
                value={form.intervenant}
                onChange={update("intervenant")}
                placeholder="Facultatif"
              />
            </label>

            <label className="field">
              <span className="label">Type d'activité</span>
              <select className="input" value={form.typeActivite} onChange={update("typeActivite")}>
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <div className="field-row">
              <label className="field">
                <span className="label">Date</span>
                <input className="input" type="date" value={form.date} onChange={update("date")} required />
              </label>
              <label className="field">
                <span className="label">Heure</span>
                <input className="input" type="time" value={form.heure} onChange={update("heure")} required />
              </label>
            </div>

            <fieldset className="planning-mode-fieldset">
              <legend className="label">Mode de rémunération</legend>
              <div className="planning-mode-options">
                {remunerationOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`planning-mode-option${form.modeRemuneration === option.value ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="detailModeRemuneration"
                      value={option.value}
                      checked={form.modeRemuneration === option.value}
                      onChange={() => setForm((f) => ({ ...f, modeRemuneration: option.value }))}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {showEncaissementFields && (
              <label className="field">
                <span className="label">Prix par participant</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.prixParticipant}
                  onChange={update("prixParticipant")}
                />
              </label>
            )}

            {showForfaitFields && (
              <div className="field-row">
                <label className="field">
                  <span className="label">Montant revenant à Suzanne</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.montantSuzanne}
                    onChange={update("montantSuzanne")}
                  />
                </label>
                <label className="field">
                  <span className="label">Tarif participant (intervenante)</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.prixPublicParticipant}
                    onChange={update("prixPublicParticipant")}
                    placeholder="Facultatif"
                  />
                </label>
              </div>
            )}

            <div className="planning-detail-revenu" aria-live="polite">
              <span className="planning-detail-revenu-label">Revenu Suzanne</span>
              <strong className="planning-detail-revenu-value">{revenuLabel}</strong>
              <span className="planning-detail-revenu-hint">
                {REMUNERATION_MODE_LABELS[form.modeRemuneration] || "—"}
                {computeRevenuSuzanne(previewSession) > 0 ? "" : " · complète les champs financiers"}
              </span>
            </div>

            <div className="field-row">
              <label className="field">
                <span className="label">Capacité maximale</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={form.placesMax}
                  onChange={update("placesMax")}
                />
              </label>
              <label className="field">
                <span className="label">Nombre d'inscrits</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.inscrits}
                  onChange={update("inscrits")}
                />
              </label>
            </div>

            <label className="field">
              <span className="label">Notes</span>
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
            <label className="field">
              <span className="label">Heure</span>
              <input
                className="input"
                type="time"
                value={dupForm.heure}
                onChange={(e) => setDupForm((f) => ({ ...f, heure: e.target.value }))}
                required
              />
            </label>
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
