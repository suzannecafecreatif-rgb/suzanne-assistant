import { useEffect, useMemo, useState } from "react";
import {
  computeProfitability,
  computeProfitabilityScenarios,
  getProfitabilityVerdict,
  PROFITABILITY_STATUS
} from "../utils/profitabilityHelpers.js";
import { formatMoney } from "../utils/metrics.js";

function toInt(v, fallback = 1) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function formatEuroDetail(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
}

export default function CatalogueRentabiliteTab({ form, update, revenuHoraireObjectif }) {
  const placesMax = toInt(form.placesMax, 8);
  const [participants, setParticipants] = useState(() => Math.max(1, Math.ceil(placesMax / 2)));

  useEffect(() => {
    setParticipants((prev) => Math.min(Math.max(1, prev), placesMax));
  }, [placesMax]);

  const options = useMemo(() => ({ revenuHoraireObjectif }), [revenuHoraireObjectif]);
  const metrics = useMemo(() => computeProfitability(form, participants, options), [form, participants, options]);
  const scenarios = useMemo(() => computeProfitabilityScenarios(form, options), [form, options]);
  const verdict = useMemo(() => getProfitabilityVerdict(metrics), [metrics]);

  const prix = Number(form.prixParticipant) || 0;
  const coutVarPers = metrics.coutVariableParticipant;
  const coutVarTotal = coutVarPers * metrics.participants;
  const coutsFixes = Number(form.coutsFixesAtelier ?? form.autresCoutsFixes) || 0;

  const scenarioButtons = [
    { key: "one", label: "1 pers.", value: 1 },
    { key: "half", label: "50 %", value: scenarios.half.participants },
    { key: "full", label: "Complet", value: scenarios.full.participants }
  ];

  return (
    <div className="rentabilite-tab">
      <section className="rentabilite-section">
        <h3 className="rentabilite-section-title">Coûts de l'atelier</h3>
        <p className="hint-text rentabilite-hint">
          Saisis les coûts par participant et les coûts fixes de la session. Le simulateur se met à jour en direct.
        </p>

        <div className="field-row">
          <label className="field">
            <span className="label">Coût matière / participant (€)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              value={form.coutMatiereParticipant ?? form.coutMatiere ?? ""}
              onChange={update("coutMatiereParticipant")}
              placeholder="12"
            />
          </label>
          <label className="field">
            <span className="label">Coût boisson / participant (€)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              value={form.coutBoissonParticipant}
              onChange={update("coutBoissonParticipant")}
              placeholder="2"
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="label">Coût gourmandise / participant (€)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              value={form.coutGourmandiseParticipant}
              onChange={update("coutGourmandiseParticipant")}
              placeholder="1.5"
            />
          </label>
          <label className="field">
            <span className="label">Autres coûts par participant (€)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              value={form.autresCoutsParticipant ?? form.autreCoutParticipant ?? ""}
              onChange={update("autresCoutsParticipant")}
              placeholder="0"
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="label">Coûts fixes de l'atelier (€)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              value={form.coutsFixesAtelier ?? form.autresCoutsFixes ?? ""}
              onChange={update("coutsFixesAtelier")}
              placeholder="40"
            />
          </label>
          <label className="field">
            <span className="label">Temps de rangement (min)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="5"
              value={form.rangementMin}
              onChange={update("rangementMin")}
              placeholder="30"
            />
          </label>
        </div>
      </section>

      <section className="rentabilite-section">
        <h3 className="rentabilite-section-title">Simulateur</h3>
        <div className="rentabilite-simulator">
          <div className="rentabilite-simulator-head">
            <span className="label">Nombre de participants</span>
            <strong className="rentabilite-simulator-value">{participants} / {placesMax}</strong>
          </div>
          <input
            className="rentabilite-range"
            type="range"
            min="1"
            max={placesMax}
            step="1"
            value={participants}
            onChange={(e) => setParticipants(Number(e.target.value))}
          />
          <div className="rentabilite-scenarios">
            {scenarioButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                className={`btn btn-ghost btn-small${participants === btn.value ? " active" : ""}`}
                onClick={() => setParticipants(btn.value)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={`rentabilite-decision rentabilite-decision--${metrics.statut}`}>
        <article className="rentabilite-block">
          <h4 className="rentabilite-block-title">💶 Chiffre d'affaires</h4>
          <p className="rentabilite-block-main">{formatMoney(metrics.ca)}</p>
          <p className="rentabilite-block-detail">
            {formatEuroDetail(prix)} × {metrics.participants} participant{metrics.participants > 1 ? "s" : ""}
          </p>
        </article>

        <article className="rentabilite-block">
          <h4 className="rentabilite-block-title">💸 Coûts</h4>
          <p className="rentabilite-block-main">{formatMoney(metrics.coutTotal)}</p>
          <ul className="rentabilite-cost-list">
            <li>
              <span>Variables ({formatEuroDetail(coutVarPers)} × {metrics.participants})</span>
              <span>{formatMoney(coutVarTotal)}</span>
            </li>
            <li>
              <span>Coûts fixes de l'atelier</span>
              <span>{formatMoney(coutsFixes)}</span>
            </li>
          </ul>
        </article>

        <article className="rentabilite-block">
          <h4 className="rentabilite-block-title">📈 Résultat</h4>
          <p className="rentabilite-block-main">{formatMoney(metrics.margeBrute)}</p>
          <ul className="rentabilite-cost-list">
            <li>
              <span>Revenu horaire</span>
              <span>{metrics.revenuHoraire != null ? `${Math.round(metrics.revenuHoraire)} €/h` : "—"}</span>
            </li>
            <li>
              <span>Temps total</span>
              <span>{metrics.tempsTotalMin > 0 ? `${metrics.tempsTotalMin} min` : "—"}</span>
            </li>
            <li>
              <span>Seuil de rentabilité</span>
              <span>
                {metrics.seuilRentabilite != null
                  ? `${metrics.seuilRentabilite} participant${metrics.seuilRentabilite > 1 ? "s" : ""}`
                  : "Jamais rentable"}
              </span>
            </li>
          </ul>
        </article>

        <article className={`rentabilite-block rentabilite-block-verdict rentabilite-block-verdict--${metrics.statut}`}>
          <h4 className="rentabilite-block-title">🎯 Verdict</h4>
          <p className="rentabilite-verdict-title">{verdict.titre}</p>
          <p className="rentabilite-verdict-text">{verdict.texte}</p>
          {metrics.statut === PROFITABILITY_STATUS.ORANGE && metrics.revenuHoraire != null && (
            <p className="rentabilite-verdict-meta">
              Objectif : {revenuHoraireObjectif} €/h · actuellement {Math.round(metrics.revenuHoraire)} €/h
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
