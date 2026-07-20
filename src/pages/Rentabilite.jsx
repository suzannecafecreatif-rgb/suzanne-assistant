import { computeMetrics, formatMoney } from "../utils/metrics.js";
import { formatDateShort } from "../utils/dateHelpers.js";

export default function Rentabilite({ ateliers }) {
  const rows = [...ateliers]
    .map((a) => ({ ...a, ...computeMetrics(a) }))
    .filter((a) => a.revenuHoraire != null)
    .sort((a, b) => b.revenuHoraire - a.revenuHoraire);

  const best = rows[0];
  const worst = rows[rows.length - 1];

  return (
    <div>
      <p className="page-title">Rentabilité</p>
      <p className="page-sub">Classement de tous tes ateliers par revenu horaire réel.</p>

      {rows.length === 0 ? (
        <div className="empty-card">
          <p className="empty-title">Pas encore de classement</p>
          <p className="empty-body">Renseigne le temps passé sur tes ateliers pour voir apparaître leur rentabilité ici.</p>
        </div>
      ) : (
        <>
          {best && rows.length > 1 && best.revenuHoraire !== worst.revenuHoraire && (
            <div className="mini-list" style={{ marginBottom: "1rem" }}>
              <div className="mini-list-item">
                <div>
                  <p className="mini-list-theme">Continue à programmer {best.theme}</p>
                  <p className="mini-list-reason">{Math.round(best.revenuHoraire)} €/h, ton meilleur revenu horaire</p>
                </div>
              </div>
              <div className="mini-list-item">
                <div>
                  <p className="mini-list-theme">Repense {worst.theme}</p>
                  <p className="mini-list-reason">{Math.round(worst.revenuHoraire)} €/h seulement, marge ou prix à revoir</p>
                </div>
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Rang</th><th>Thème</th><th>Date</th><th>Marge</th><th>Coût matière</th><th>Temps</th><th>€/h</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => (
                  <tr key={a.id}>
                    <td>{i + 1}</td>
                    <td>{a.theme}</td>
                    <td>{formatDateShort(a.date)}</td>
                    <td>{formatMoney(a.marge)}</td>
                    <td>{formatMoney(Number(a.coutMatiere) || 0)}</td>
                    <td>{a.heures ? `${a.heures.toFixed(1)} h` : "—"}</td>
                    <td>{Math.round(a.revenuHoraire)} €/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
