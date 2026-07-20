import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function Stocks({ stock, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({ nom: "", quantite: "", unite: "", seuilAlerte: "" });

  const submit = () => {
    if (!form.nom.trim()) return;
    onAdd({ ...form, id: crypto.randomUUID() });
    setForm({ nom: "", quantite: "", unite: "", seuilAlerte: "" });
  };

  const alertes = stock.filter((s) => Number(s.quantite) <= Number(s.seuilAlerte || 0));

  return (
    <div>
      <p className="page-title">Stocks</p>
      <p className="page-sub">Tes matières, et ce qu'il faut recommander.</p>

      {alertes.length > 0 && (
        <div className="alert-card">
          <p className="alert-title"><AlertTriangle size={14} aria-hidden="true" /> Liste d'achats</p>
          <p className="alert-body">
            {alertes.map((a) => `${a.nom} (manque ${Math.max(0, Math.round((Number(a.seuilAlerte) || 0) - (Number(a.quantite) || 0)))} ${a.unite || ""})`.trim()).join(" · ")}
          </p>
        </div>
      )}

      <div className="card form-card" style={{ marginBottom: "1rem" }}>
        <div className="field-row">
          <label className="field">
            <span className="label">Nom de la matière</span>
            <input className="input" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Mèches de bougies" />
          </label>
          <label className="field">
            <span className="label">Quantité actuelle</span>
            <input className="input" type="number" min="0" value={form.quantite} onChange={(e) => setForm((f) => ({ ...f, quantite: e.target.value }))} placeholder="12" />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="label">Unité</span>
            <input className="input" value={form.unite} onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))} placeholder="pièces, kg, m..." />
          </label>
          <label className="field">
            <span className="label">Seuil d'alerte</span>
            <input className="input" type="number" min="0" value={form.seuilAlerte} onChange={(e) => setForm((f) => ({ ...f, seuilAlerte: e.target.value }))} placeholder="3" />
          </label>
        </div>
        <button type="button" className="btn btn-primary" onClick={submit}>Ajouter la matière</button>
      </div>

      {stock.length === 0 ? (
        <div className="empty-card">
          <p className="empty-title">Aucune matière enregistrée</p>
          <p className="empty-body">Ajoute tes matières pour suivre les stocks et être alertée à temps.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Matière</th><th>Quantité</th><th>Seuil</th><th /></tr>
            </thead>
            <tbody>
              {stock.map((s) => {
                const low = Number(s.quantite) <= Number(s.seuilAlerte || 0);
                return (
                  <tr key={s.id}>
                    <td>{s.nom}</td>
                    <td>
                      <input
                        className="input qty-input"
                        type="number"
                        value={s.quantite}
                        onChange={(e) => onUpdate({ ...s, quantite: e.target.value })}
                      /> {s.unite}
                      {low && <span className="badge-alert">bas</span>}
                    </td>
                    <td>{s.seuilAlerte || 0}</td>
                    <td>
                      <button className="btn-icon" aria-label="Supprimer" onClick={() => onDelete(s.id)}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
