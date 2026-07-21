import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ACTIVITY_TYPES } from "../data/catalogueMeta.js";
import {
  ACTIVITY_TYPE_COLORS,
  buildEvenementFromForm,
  createBlockedSlot,
  createSessionFromCatalogue,
  formatCatalogueMeta,
  getUiRemunerationModeOptions,
  groupCatalogueByType,
  REMUNERATION_MODE,
  SESSION_KIND,
  validateEvenementForm
} from "../utils/planningHelpers.js";

function formatDateLabel(dateIso) {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

const MODAL_TITLES = {
  [SESSION_KIND.CATALOGUE]: "Activité du catalogue",
  [SESSION_KIND.EVENEMENT]: "Événement ponctuel",
  [SESSION_KIND.BLOQUE]: "Créneau bloqué"
};

export default function PlanningAddModal({ date, kind, catalogue, onClose, onSave, navigate }) {
  const isCatalogue = kind === SESSION_KIND.CATALOGUE;
  const isEvenement = kind === SESSION_KIND.EVENEMENT;

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [heure, setHeure] = useState("");
  const [places, setPlaces] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [libelle, setLibelle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [nom, setNom] = useState("");
  const [intervenant, setIntervenant] = useState("");
  const [typeActivite, setTypeActivite] = useState(ACTIVITY_TYPES[0] || "");
  const [modeRemuneration, setModeRemuneration] = useState(REMUNERATION_MODE.ENCAISSEMENT);
  const [prixParticipant, setPrixParticipant] = useState("");
  const [montantSuzanne, setMontantSuzanne] = useState("");
  const [prixPublicParticipant, setPrixPublicParticipant] = useState("");
  const [placesMax, setPlacesMax] = useState("");
  const [inscrits, setInscrits] = useState("");

  const remunerationOptions = useMemo(() => getUiRemunerationModeOptions(), []);
  const groups = useMemo(() => groupCatalogueByType(catalogue, search), [catalogue, search]);
  const selectedItem = useMemo(
    () => catalogue.find((item) => item.id === selectedId),
    [catalogue, selectedId]
  );

  useEffect(() => {
    if (!selectedItem) return;
    setPlaces(selectedItem.placesMax ?? "");
  }, [selectedItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isCatalogue) {
      if (!selectedItem) {
        setError("Choisis une activité dans le catalogue.");
        return;
      }
      if (!heure.trim()) {
        setError("L'heure est obligatoire.");
        return;
      }
      setSaving(true);
      const record = createSessionFromCatalogue(selectedItem, {
        date,
        heure: heure.trim(),
        places
      });
      await onSave(record);
      setSaving(false);
      return;
    }

    if (isEvenement) {
      const validationErrors = validateEvenementForm({
        nom,
        heure,
        typeActivite,
        modeRemuneration,
        prixParticipant,
        montantSuzanne
      });
      if (validationErrors.length > 0) {
        setError(validationErrors[0]);
        return;
      }
      setSaving(true);
      const record = buildEvenementFromForm({
        date,
        nom: nom.trim(),
        intervenant: intervenant.trim(),
        typeActivite,
        heure: heure.trim(),
        modeRemuneration,
        prixParticipant,
        montantSuzanne,
        prixPublicParticipant,
        placesMax,
        inscrits,
        notes: notes.trim()
      });
      await onSave(record);
      setSaving(false);
      return;
    }

    if (!heure.trim() || !heureFin.trim()) {
      setError("Les heures de début et de fin sont obligatoires.");
      return;
    }

    setSaving(true);
    const record = createBlockedSlot({
      date,
      heure: heure.trim(),
      heureFin: heureFin.trim(),
      libelle: libelle.trim(),
      notes: notes.trim()
    });
    await onSave(record);
    setSaving(false);
  };

  const showEncaissementFields = isEvenement && modeRemuneration === REMUNERATION_MODE.ENCAISSEMENT;
  const showForfaitFields = isEvenement && modeRemuneration === REMUNERATION_MODE.FORFAIT;

  return (
    <div className="planning-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="planning-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="planning-modal-header">
          <div>
            <p className="planning-modal-eyebrow">{formatDateLabel(date)}</p>
            <h2 id="planning-modal-title" className="planning-modal-title">
              {MODAL_TITLES[kind] || "Ajouter au planning"}
            </h2>
          </div>
          <button type="button" className="btn-icon" aria-label="Fermer" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <form className="planning-modal-body" onSubmit={handleSubmit}>
          {isCatalogue ? (
            <>
              {catalogue.filter((c) => c.actif !== false).length === 0 ? (
                <div className="planning-modal-empty">
                  <p>Aucun modèle actif dans le Catalogue.</p>
                  {navigate && (
                    <button type="button" className="btn btn-primary btn-small" onClick={() => navigate("catalogue")}>
                      Ouvrir le Catalogue
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <label className="planning-modal-search">
                    <Search size={15} aria-hidden="true" />
                    <input
                      className="input"
                      type="search"
                      placeholder="Rechercher une activité…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>

                  <div className="planning-catalogue-picker">
                    {groups.length === 0 ? (
                      <p className="hint-text">Aucun modèle ne correspond à ta recherche.</p>
                    ) : (
                      groups.map((group) => (
                        <section key={group.type} className="planning-catalogue-group">
                          <h3
                            className="planning-catalogue-group-title"
                            style={{ "--type-color": ACTIVITY_TYPE_COLORS[group.type] || "#8a8178" }}
                          >
                            {group.type}
                            <span className="planning-catalogue-group-count">{group.items.length}</span>
                          </h3>
                          <div className="planning-catalogue-group-list">
                            {group.items.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={`planning-catalogue-option${selectedId === item.id ? " is-selected" : ""}`}
                                onClick={() => setSelectedId(item.id)}
                              >
                                <span className="planning-catalogue-option-name">{item.nom || "Sans nom"}</span>
                                {item.categorie && (
                                  <span className="planning-catalogue-option-category">{item.categorie}</span>
                                )}
                                <span className="planning-catalogue-option-meta">{formatCatalogueMeta(item)}</span>
                              </button>
                            ))}
                          </div>
                        </section>
                      ))
                    )}
                  </div>

                  {selectedItem && (
                    <div className="planning-modal-fields">
                      <p className="planning-modal-selected">
                        Modèle sélectionné : <strong>{selectedItem.nom}</strong>
                      </p>
                      <div className="field-row">
                        <label className="field">
                          <span className="label">Heure</span>
                          <input
                            className="input"
                            type="time"
                            value={heure}
                            onChange={(e) => setHeure(e.target.value)}
                            required
                          />
                        </label>
                        <label className="field">
                          <span className="label">Nombre de places</span>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            step="1"
                            value={places}
                            onChange={(e) => setPlaces(e.target.value)}
                            placeholder={selectedItem.placesMax || "8"}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : isEvenement ? (
            <div className="planning-modal-fields planning-modal-fields--flush">
              <label className="field">
                <span className="label">Nom de l'événement</span>
                <input
                  className="input"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex. Carnet des émotions"
                  required
                />
              </label>

              <label className="field">
                <span className="label">Intervenant (facultatif)</span>
                <input
                  className="input"
                  value={intervenant}
                  onChange={(e) => setIntervenant(e.target.value)}
                  placeholder="Nom de l'intervenant·e"
                />
              </label>

              <label className="field">
                <span className="label">Type d'activité</span>
                <select className="input" value={typeActivite} onChange={(e) => setTypeActivite(e.target.value)}>
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <fieldset className="planning-mode-fieldset">
                <legend className="label">Mode de rémunération</legend>
                <div className="planning-mode-options">
                  {remunerationOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`planning-mode-option${modeRemuneration === option.value ? " is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="modeRemuneration"
                        value={option.value}
                        checked={modeRemuneration === option.value}
                        onChange={() => setModeRemuneration(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {showEncaissementFields && (
                <div className="field-row">
                  <label className="field">
                    <span className="label">Prix par participant</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={prixParticipant}
                      onChange={(e) => setPrixParticipant(e.target.value)}
                      placeholder="Ex. 35"
                    />
                  </label>
                  <label className="field">
                    <span className="label">Capacité maximale</span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      step="1"
                      value={placesMax}
                      onChange={(e) => setPlacesMax(e.target.value)}
                      placeholder="Ex. 12"
                    />
                  </label>
                </div>
              )}

              {showForfaitFields && (
                <>
                  <label className="field">
                    <span className="label">Montant revenant à Suzanne</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={montantSuzanne}
                      onChange={(e) => setMontantSuzanne(e.target.value)}
                      placeholder="Ex. 45"
                    />
                  </label>
                  <div className="field-row">
                    <label className="field">
                      <span className="label">Capacité maximale</span>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        step="1"
                        value={placesMax}
                        onChange={(e) => setPlacesMax(e.target.value)}
                        placeholder="Ex. 12"
                      />
                    </label>
                    <label className="field">
                      <span className="label">Tarif participant (intervenante)</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="1"
                        value={prixPublicParticipant}
                        onChange={(e) => setPrixPublicParticipant(e.target.value)}
                        placeholder="Facultatif"
                      />
                    </label>
                  </div>
                </>
              )}

              <div className="field-row">
                <label className="field">
                  <span className="label">Heure</span>
                  <input
                    className="input"
                    type="time"
                    value={heure}
                    onChange={(e) => setHeure(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span className="label">Nombre d'inscrits</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={inscrits}
                    onChange={(e) => setInscrits(e.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>

              <label className="field">
                <span className="label">Note (facultative)</span>
                <textarea
                  className="input planning-modal-textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes internes…"
                />
              </label>
            </div>
          ) : (
            <div className="planning-modal-fields">
              <div className="field-row">
                <label className="field">
                  <span className="label">Heure de début</span>
                  <input
                    className="input"
                    type="time"
                    value={heure}
                    onChange={(e) => setHeure(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span className="label">Heure de fin</span>
                  <input
                    className="input"
                    type="time"
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="field">
                <span className="label">Libellé (facultatif)</span>
                <input
                  className="input"
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder="Ex. Créneau atelier, Privatisation possible, Réservé…"
                />
              </label>
              <label className="field">
                <span className="label">Note (facultative)</span>
                <textarea
                  className="input planning-modal-textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes internes…"
                />
              </label>
            </div>
          )}

          {error && <p className="planning-modal-error">{error}</p>}

          <footer className="planning-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || (isCatalogue && catalogue.filter((c) => c.actif !== false).length === 0)}
            >
              {saving ? "Enregistrement…" : "Ajouter au planning"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
