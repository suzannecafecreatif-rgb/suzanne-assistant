import { useMemo, useState } from "react";
import { Pencil, Copy, Trash2 } from "lucide-react";
import { computeMetrics, formatMoney } from "../utils/metrics.js";
import { formatDateShort } from "../utils/dateHelpers.js";
import {
  enrichAllSessions,
  getActivityFilterOptions,
  getSessionActivityName,
  getTypeFilterOptions,
  isFinancialSession
} from "../utils/planningQueries.js";
import { isBlockedSlot, isEvenementSession } from "../utils/planningHelpers.js";
import SessionBadge from "../components/SessionBadge.jsx";

export default function Historique({ ateliers, catalogue = [], onDelete, onDuplicate, navigate }) {
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState(-1);
  const [filterActivity, setFilterActivity] = useState("");
  const [filterType, setFilterType] = useState("");

  const enriched = useMemo(() => enrichAllSessions(ateliers, catalogue), [ateliers, catalogue]);
  const activityOptions = useMemo(() => getActivityFilterOptions(enriched), [enriched]);
  const typeOptions = useMemo(() => getTypeFilterOptions(enriched), [enriched]);

  const rows = [...enriched]
    .filter((a) => {
      const name = getSessionActivityName(a);
      if (filterActivity && name !== filterActivity) return false;
      if (filterType && (a.typeActivite || "") !== filterType) return false;
      return true;
    })
    .map((a) => ({
      ...a,
      activityName: getSessionActivityName(a),
      ...(isFinancialSession(a) ? computeMetrics(a) : { marge: null, revenuHoraire: null })
    }))
    .sort((a, b) => {
      if (sortKey === "date") return sortDir * (new Date(a.date) - new Date(b.date));
      if (sortKey === "marge" || sortKey === "revenuHoraire") {
        const av = a[sortKey] ?? -Infinity;
        const bv = b[sortKey] ?? -Infinity;
        return sortDir * (av - bv);
      }
      return sortDir * ((a[sortKey] || 0) - (b[sortKey] || 0));
    });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const hasFilters = filterActivity || filterType;

  return (
    <div>
      <p className="page-title">Historique</p>
      <p className="page-sub">Ce qui a vraiment marché, ou non.</p>

      {ateliers.length > 0 && (
        <div className="filter-row">
          <select className="input" value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)}>
            <option value="">Toutes les activités</option>
            {activityOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {typeOptions.length > 0 && (
            <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tous les types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty-card">
          <p className="empty-title">
            {ateliers.length === 0 ? "Rien pour l'instant" : "Aucune session pour ce filtre"}
          </p>
          <p className="empty-body">
            {ateliers.length === 0
              ? "Les sessions que tu enregistres apparaîtront ici."
              : hasFilters
              ? "Essaie un autre filtre, ou repars sur toutes les activités."
              : "Aucune session à afficher."}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("date")}>Date</th>
                <th>Activité</th>
                <th>Participants</th>
                <th onClick={() => toggleSort("marge")}>Marge</th>
                <th onClick={() => toggleSort("revenuHoraire")}>€/h</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const blocked = isBlockedSlot(a);
                return (
                  <tr key={a.id}>
                    <td>{formatDateShort(a.date)}</td>
                    <td>
                      <span className="historique-activity-cell">
                        <span className="historique-activity-text">
                          <span>{a.activityName}</span>
                          {isEvenementSession(a) && a.intervenant?.trim() && (
                            <span className="historique-intervenant">{a.intervenant.trim()}</span>
                          )}
                        </span>
                        <SessionBadge session={a} />
                      </span>
                    </td>
                    <td>{blocked ? "—" : a.participants || 0}</td>
                    <td>{blocked ? "—" : formatMoney(a.marge)}</td>
                    <td>{blocked ? "—" : a.revenuHoraire != null ? `${Math.round(a.revenuHoraire)} €/h` : "—"}</td>
                    <td className="row-actions">
                      <button className="btn-icon" aria-label="Modifier" onClick={() => navigate("planning", { focusSession: a.id })}>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
