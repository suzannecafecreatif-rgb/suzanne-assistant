import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { THEMES } from "../data/themes.js";
import ImageUpload from "../components/ImageUpload.jsx";
import CatalogueCard from "../components/CatalogueCard.jsx";
import CommunicationTextBlock from "../components/CommunicationTextBlock.jsx";
import MediaGallery from "../components/MediaGallery.jsx";

const DIFFICULTE_OPTIONS = [
  { value: "", label: "— Choisir —" },
  { value: "facile", label: "Facile" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" }
];

function emptyCatalogueForm(record) {
  const id = record?.id || crypto.randomUUID();
  return {
    id,
    nom: "",
    categorie: THEMES[0],
    photoPath: "",
    description: "",
    prixParticipant: "",
    placesMax: "",
    dureeMin: "",
    prepMin: "",
    coutMatiere: "",
    difficulte: "",
    publicConseille: "",
    materials: [],
    conseils: "",
    actif: true,
    instagramPost: "",
    instagramStory: "",
    instagramReel: "",
    facebookPost: "",
    texteSite: "",
    hashtags: "",
    medias: [],
    createdAt: record?.createdAt,
    updatedAt: record?.updatedAt
  };
}

function mergeRecord(record) {
  return { ...emptyCatalogueForm(record), ...record };
}

export default function FicheCatalogue({ prefill, stock, onSave, onUpdate, onDelete, navigate }) {
  const editingRecord = prefill?.editing ? prefill.record : null;
  const isEditing = !!editingRecord;

  const [form, setForm] = useState(() => (editingRecord ? mergeRecord(editingRecord) : emptyCatalogueForm()));
  const [tab, setTab] = useState("infos");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const previewItem = useMemo(() => ({ ...form, actif: true }), [form]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setPhotoPath = (photoPath) => setForm((f) => ({ ...f, photoPath }));

  const setMedias = (medias) => setForm((f) => ({ ...f, medias }));

  const addMaterialRow = () => {
    if (stock.length === 0) return;
    setForm((f) => ({ ...f, materials: [...f.materials, { stockId: stock[0].id, qty: "" }] }));
  };

  const updateMaterialRow = (idx, key, value) => {
    setForm((f) => {
      const materials = [...f.materials];
      materials[idx] = { ...materials[idx], [key]: value };
      return { ...f, materials };
    });
  };

  const removeMaterialRow = (idx) => {
    setForm((f) => ({ ...f, materials: f.materials.filter((_, i) => i !== idx) }));
  };

  const submit = async () => {
    setError("");
    if (!form.nom.trim()) {
      setError("Le nom de l'atelier est obligatoire.");
      setTab("infos");
      return;
    }
    if (!form.categorie) {
      setError("Choisis une catégorie.");
      setTab("infos");
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      nom: form.nom.trim(),
      createdAt: isEditing ? editingRecord.createdAt : new Date().toISOString()
    };

    const result = isEditing ? await onUpdate(payload) : await onSave(payload);
    setSaving(false);

    if (result?.error) {
      const msg = result.error.message || result.error.details || "";
      setError(msg ? `Enregistrement impossible : ${msg}` : "Impossible d'enregistrer. Réessaie dans un instant.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = async () => {
    if (!isEditing || !onDelete) return;
    const label = form.nom.trim() || "ce modèle";
    if (!window.confirm(`Supprimer « ${label} » ?\n\nCette action est définitive (fiche + photo + médias).`)) {
      return;
    }

    setError("");
    setSaving(true);
    const result = await onDelete({ ...form, id: editingRecord.id });
    setSaving(false);

    if (result?.error) {
      const msg = result.error.message || "";
      setError(msg ? `Suppression impossible : ${msg}` : "Impossible de supprimer ce modèle.");
    }
  };

  return (
    <div className="fiche-catalogue">
      <p className="page-title">{isEditing ? "Modifier le modèle" : "Nouveau modèle"}</p>
      <p className="page-sub">Construis ta bibliothèque d'ateliers — l'aperçu se met à jour en direct.</p>

      <div className="fiche-catalogue-layout">
        <aside className="fiche-catalogue-aside">
          <div className="fiche-catalogue-aside-inner">
            <ImageUpload
              catalogueId={form.id}
              photoPath={form.photoPath}
              onPhotoPathChange={setPhotoPath}
              disabled={saving}
            />

            <div className="fiche-catalogue-preview-block">
              <p className="fiche-catalogue-preview-label">Aperçu carte</p>
              <CatalogueCard item={previewItem} preview />
            </div>

            <div className="fiche-catalogue-aside-actions">
              <button type="button" className="btn btn-primary fiche-catalogue-save" onClick={submit} disabled={saving}>
                {saving ? "Enregistrement…" : isEditing ? "Enregistrer" : "Créer le modèle"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate("catalogue")} disabled={saving}>
                Annuler
              </button>
              {isEditing && onDelete && (
                <button type="button" className="btn btn-danger btn-small" onClick={handleDelete} disabled={saving}>
                  Supprimer ce modèle
                </button>
              )}
              {saved && <span className="saved-msg">Modèle enregistré</span>}
              {error && <p className="fiche-catalogue-error">{error}</p>}
            </div>
          </div>
        </aside>

        <section className="fiche-catalogue-main">
          <div className="fiche-catalogue-tabs view-toggle">
            <button type="button" className={tab === "infos" ? "active" : ""} onClick={() => setTab("infos")}>
              Infos
            </button>
            <button type="button" className={tab === "materiel" ? "active" : ""} onClick={() => setTab("materiel")}>
              Matériel
            </button>
            <button type="button" className={tab === "communication" ? "active" : ""} onClick={() => setTab("communication")}>
              Communication
            </button>
          </div>

          <div className="fiche-catalogue-panel form-card">
            {tab === "infos" ? (
              <>
                <label className="field">
                  <span className="label">Nom</span>
                  <input
                    className="input"
                    value={form.nom}
                    onChange={update("nom")}
                    placeholder="Ex. Tufting Découverte"
                    autoFocus={!isEditing}
                  />
                </label>

                <label className="field">
                  <span className="label">Catégorie</span>
                  <select className="input" value={form.categorie} onChange={update("categorie")}>
                    {THEMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="label">Description</span>
                  <textarea
                    className="input fiche-catalogue-textarea"
                    rows={4}
                    value={form.description}
                    onChange={update("description")}
                    placeholder="Ce que les participant·es vont découvrir…"
                  />
                </label>

                <div className="field-row">
                  <label className="field">
                    <span className="label">Prix (€ / pers.)</span>
                    <input className="input" type="number" min="0" step="0.5" value={form.prixParticipant} onChange={update("prixParticipant")} placeholder="45" />
                  </label>
                  <label className="field">
                    <span className="label">Nombre de places</span>
                    <input className="input" type="number" min="1" step="1" value={form.placesMax} onChange={update("placesMax")} placeholder="8" />
                  </label>
                </div>

                <div className="field-row">
                  <label className="field">
                    <span className="label">Durée (min)</span>
                    <input className="input" type="number" min="0" step="5" value={form.dureeMin} onChange={update("dureeMin")} placeholder="120" />
                  </label>
                  <label className="field">
                    <span className="label">Temps de préparation (min)</span>
                    <input className="input" type="number" min="0" step="5" value={form.prepMin} onChange={update("prepMin")} placeholder="30" />
                  </label>
                </div>

                <div className="field-row">
                  <label className="field">
                    <span className="label">Difficulté</span>
                    <select className="input" value={form.difficulte} onChange={update("difficulte")}>
                      {DIFFICULTE_OPTIONS.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="label">Public conseillé</span>
                    <input className="input" value={form.publicConseille} onChange={update("publicConseille")} placeholder="Adultes, ados 14+…" />
                  </label>
                </div>

                <label className="field field-last">
                  <span className="label">Conseils</span>
                  <textarea
                    className="input fiche-catalogue-textarea"
                    rows={3}
                    value={form.conseils}
                    onChange={update("conseils")}
                    placeholder="Notes internes pour toi…"
                  />
                </label>
              </>
            ) : tab === "materiel" ? (
              <>
                <label className="field">
                  <span className="label">Coût matière (€)</span>
                  <input className="input" type="number" min="0" step="0.5" value={form.coutMatiere} onChange={update("coutMatiere")} placeholder="18" />
                </label>

                <div className="materials-field">
                  <span className="label">Matériel (lié au stock)</span>
                  {stock.length === 0 ? (
                    <p className="hint-text">Aucune matière en stock — ajoute-les depuis l'écran Stocks.</p>
                  ) : (
                    <>
                      {form.materials.map((m, idx) => (
                        <div className="material-row" key={idx}>
                          <select className="input" value={m.stockId} onChange={(e) => updateMaterialRow(idx, "stockId", e.target.value)}>
                            {stock.map((s) => (
                              <option key={s.id} value={s.id}>{s.nom}</option>
                            ))}
                          </select>
                          <input className="input qty-input" type="number" min="0" step="0.1" value={m.qty} onChange={(e) => updateMaterialRow(idx, "qty", e.target.value)} placeholder="Qté" />
                          <button type="button" className="btn-icon" aria-label="Retirer" onClick={() => removeMaterialRow(idx)}>
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-ghost btn-small" onClick={addMaterialRow}>
                        <Plus size={13} aria-hidden="true" /> Ajouter une matière
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <CommunicationTextBlock
                  label="Publication Instagram"
                  value={form.instagramPost}
                  onChange={update("instagramPost")}
                  placeholder="Texte de ta publication…"
                  rows={5}
                  showCharCount
                />

                <CommunicationTextBlock
                  label="Story Instagram"
                  value={form.instagramStory}
                  onChange={update("instagramStory")}
                  placeholder="Texte court pour ta story…"
                  rows={3}
                />

                <CommunicationTextBlock
                  label="Idée / script de Reel"
                  value={form.instagramReel}
                  onChange={update("instagramReel")}
                  placeholder="Hook, plan de tournage, voix off…"
                  rows={4}
                />

                <CommunicationTextBlock
                  label="Publication Facebook"
                  value={form.facebookPost}
                  onChange={update("facebookPost")}
                  placeholder="Texte pour Facebook…"
                  rows={4}
                />

                <CommunicationTextBlock
                  label="Texte pour le site internet"
                  value={form.texteSite}
                  onChange={update("texteSite")}
                  placeholder="Description pour ta page web…"
                  rows={4}
                />

                <CommunicationTextBlock
                  label="Hashtags"
                  value={form.hashtags}
                  onChange={update("hashtags")}
                  placeholder="#tufting #ateliercreatif #suzannecafe…"
                  rows={2}
                />

                <MediaGallery
                  catalogueId={form.id}
                  medias={form.medias}
                  onMediasChange={setMedias}
                  disabled={saving}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
