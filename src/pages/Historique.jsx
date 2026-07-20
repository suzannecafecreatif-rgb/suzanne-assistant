import { useState } from "react";
import { Pencil, Copy, Trash2 } from "lucide-react";
import { THEMES } from "../data/themes.js";
import { computeMetrics, formatMoney } from "../utils/metrics.js";
import { formatDateShort } from "../utils/dateHelpers.js";

export default function Historique({ ateliers, onDelete, onDuplicate, navigate }) {
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState(-1);
  const [filterTheme, setFilterTheme] = useState("");

  const rows = [...ateliers]
    .filter((a) => !filterTheme || a.theme === filterTheme)
    .map((a) => ({ ...a, ...computeMetrics(a) }))
    .sort((a, b) => {
      if (sortKey === "date") return sortDir * (new Date(a.date) - new Date(b.date));
      return sortDir * ((a[sortKey] || 0) - (b[sortKey] || 0));
    });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  return (
    <div>
      <p className="page-title">Historique</p>
      <p className="page-sub">Ce qui a vraiment marché, ou non.</p>

      {ateliers.length > 0 && (
        <div className="filter-row">
          <select className="input" value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)}>
            <option value="">Tous les thèmes</option>
            {THEMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty-card">
          <p className="empty-title">{ateliers.length === 0 ? "Rien pour l'instant" : "Aucun atelier pour ce thème"}</p>
          <p className="empty-body">
            {ateliers.length === 0
              ? "Les ateliers que tu enregistres apparaîtront ici."
              : "Essaie un autre thème, ou repars sur tous les thèmes."}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("date")}>Date</th>
                <th>Thème</th>
                <th>Participants</th>
                <th onClick={() => toggleSort("marge")}>Marge</th>
                <th onClick={() => toggleSort("revenuHoraire")}>€/h</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateShort(a.date)}</td>
                  <td>{a.theme}</td>
                  <td>{a.participants || 0}</td>
                  <td>{formatMoney(a.marge)}</td>
                  <td>{a.revenuHoraire != null ? `${Math.round(a.revenuHoraire)} €/h` : "—"}</td>
                  <td className="row-actions">
                    <button className="btn-icon" aria-label="Modifier" onClick={() => navigate("fiche", { editing: true, record: a })}>
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button className="btn-icon" aria-label="Dupliquer" onClick={() => onDuplicate(a.id)}>
                      <Copy size={14} aria-hidden="true" />
                    </button>
                    <button className="btn-icon" aria-label="Supprimer" onClick={() => onDelete(a.id)}>
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
