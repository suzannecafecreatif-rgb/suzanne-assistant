import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  ACTIVITY_TYPE_COLORS,
  createBlockedSlot,
  createSessionFromCatalogue,
  formatCatalogueMeta,
  groupCatalogueByType,
  SESSION_KIND
} from "../utils/planningHelpers.js";

function formatDateLabel(dateIso) {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

export default function PlanningAddModal({ date, kind, catalogue, onClose, onSave, navigate }) {
  const isCatalogue = kind === SESSION_KIND.CATALOGUE;

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [heure, setHeure] = useState("");
  const [places, setPlaces] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [libelle, setLibelle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
              {isCatalogue ? "Activité du catalogue" : "Créneau bloqué"}
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
