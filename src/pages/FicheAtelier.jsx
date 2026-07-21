// Écran legacy — remplacé par le Planning (calendrier). Conservé le temps de la transition.
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { THEMES } from "../data/themes.js";
import { computeMetrics, formatMoney } from "../utils/metrics.js";

const emptyForm = () => ({
  theme: THEMES[0],
  date: new Date().toISOString().slice(0, 10),
  prixParticipant: "",
  participants: "",
  coutMatiere: "",
  prepMin: "",
  animMin: "",
  notes: "",
  materials: [],
  communique: false
});

export default function FicheAtelier({ prefill, stock, onSave, onUpdate, navigate }) {
  const editingRecord = prefill?.editing ? prefill.record : null;
  const [form, setForm] = useState(
    editingRecord
      ? { ...emptyForm(), ...editingRecord }
      : {
          ...emptyForm(),
          theme: prefill?.theme || THEMES[0],
          date: prefill?.date || new Date().toISOString().slice(0, 10),
          prixParticipant: prefill?.prixParticipant ?? "",
          participants: prefill?.participants ?? ""
        }
  );
  const [saved, setSaved] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const metrics = computeMetrics(form);

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

  const submit = () => {
    if (editingRecord) {
      onUpdate({ ...form, id: editingRecord.id, createdAt: editingRecord.createdAt });
    } else {
      onSave({ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    if (editingRecord) navigate("historique");
    else setForm(emptyForm());
  };

  return (
    <div>
      <div className="redirect-banner">
        <p>Tu veux créer un <strong>modèle réutilisable</strong> (photo, fiche, communication) ?</p>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("catalogue")}>
          Aller au Catalogue
        </button>
      </div>

      <p className="page-title">{editingRecord ? "Modifier l'atelier" : "Planifier une session"}</p>
      <p className="page-sub">Choisis une date et saisis les infos pour une occurrence planifiée. Pour un modèle permanent, utilise le Catalogue.</p>

      <div className="card form-card">
        <div className="field-row">
          <label className="field">
            <span className="label">Thème</span>
            <select className="input" value={form.theme} onChange={update("theme")}>
              {THEMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Date</span>
            <input className="input" type="date" value={form.date} onChange={update("date")} />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="label">Prix par participant (€)</span>
            <input className="input" type="number" min="0" step="0.5" value={form.prixParticipant} onChange={update("prixParticipant")} placeholder="35" />
          </label>
          <label className="field">
            <span className="label">Nombre de participants</span>
            <input className="input" type="number" min="0" step="1" value={form.participants} onChange={update("participants")} placeholder="8" />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="label">Coût matières (€)</span>
            <input className="input" type="number" min="0" step="0.5" value={form.coutMatiere} onChange={update("coutMatiere")} placeholder="60" />
          </label>
          <label className="field">
            <span className="label">Temps préparation (min)</span>
            <input className="input" type="number" min="0" step="5" value={form.prepMin} onChange={update("prepMin")} placeholder="30" />
          </label>
          <label className="field">
            <span className="label">Temps animation (min)</span>
            <input className="input" type="number" min="0" step="5" value={form.animMin} onChange={update("animMin")} placeholder="120" />
          </label>
        </div>

        <label className="field">
          <span className="label">Notes</span>
          <textarea className="input" rows={2} value={form.notes} onChange={update("notes")} placeholder="Ce qui a bien ou moins bien marché" />
        </label>

        <div className="field materials-field">
          <span className="label">Matières utilisées {!editingRecord && "(déduites du stock à l'enregistrement)"}</span>
          {stock.length === 0 ? (
            <p className="hint-text">Aucune matière enregistrée pour l'instant, ajoute-les depuis Stocks.</p>
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

        <label className="checkbox-field">
          <input type="checkbox" checked={!!form.communique} onChange={(e) => setForm((f) => ({ ...f, communique: e.target.checked }))} />
          <span>Communication déjà préparée pour cet atelier</span>
        </label>

        <div className="compute-row">
          <div><span className="compute-label">Marge</span><span className="compute-value">{formatMoney(metrics.marge)}</span></div>
          <div><span className="compute-label">Revenu horaire</span><span className="compute-value">{metrics.revenuHoraire != null ? `${Math.round(metrics.revenuHoraire)} €/h` : "—"}</span></div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={submit}>
            {editingRecord ? "Enregistrer les modifications" : "Enregistrer l'atelier"}
          </button>
          {editingRecord && (
            <button type="button" className="btn btn-ghost" onClick={() => navigate("historique")}>Annuler</button>
          )}
          {saved && <span className="saved-msg">Atelier enregistré</span>}
        </div>
      </div>
    </div>
  );
}
