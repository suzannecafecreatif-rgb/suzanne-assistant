import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { THEMES } from "../data/themes.js";
import CatalogueCard from "../components/CatalogueCard.jsx";

export default function Catalogue({ catalogue, navigate, prefill, onDuplicate, onDelete }) {
  const [search, setSearch] = useState("");
  const [filterCategorie, setFilterCategorie] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!prefill?.flash) return undefined;
    setNotice(prefill.flash);
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [prefill?.flash]);

  const activeItems = useMemo(
    () => catalogue.filter((c) => c.actif !== false),
    [catalogue]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeItems.filter((c) => {
      if (filterCategorie && c.categorie !== filterCategorie) return false;
      if (!q) return true;
      return (c.nom || "").toLowerCase().includes(q);
    });
  }, [activeItems, search, filterCategorie]);

  const handleEdit = (item) => {
    navigate("catalogue-fiche", { editing: true, record: item });
  };

  const handleDuplicate = (item) => {
    if (onDuplicate) {
      onDuplicate(item);
      return;
    }
    setNotice("La duplication sera disponible à l'étape F.");
    setTimeout(() => setNotice(""), 3500);
  };

  const handleDelete = async (item) => {
    const label = item.nom || "ce modèle";
    if (!window.confirm(`Supprimer « ${label} » ?\n\nCette action est définitive (fiche + fichiers).`)) {
      return;
    }
    if (onDelete) await onDelete(item);
  };

  const handleCreate = () => {
    navigate("catalogue-fiche", { creating: true });
  };

  return (
    <div>
      <p className="page-title">Catalogue</p>
      <p className="page-sub">
        Ta bibliothèque d'ateliers réutilisables — {activeItems.length} modèle{activeItems.length !== 1 ? "s" : ""} actif{activeItems.length !== 1 ? "s" : ""}.
      </p>

      {notice && (
        <div className="flash-notice" role="status">{notice}</div>
      )}

      <div className="catalogue-toolbar">
        <div className="catalogue-search">
          <Search size={15} className="catalogue-search-icon" aria-hidden="true" />
          <input
            className="input catalogue-search-input"
            type="search"
            placeholder="Rechercher par nom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher un atelier par nom"
          />
        </div>
        <select
          className="input catalogue-filter"
          value={filterCategorie}
          onChange={(e) => setFilterCategorie(e.target.value)}
          aria-label="Filtrer par catégorie"
        >
          <option value="">Toutes les catégories</option>
          {THEMES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={handleCreate}>
          <Plus size={15} aria-hidden="true" />
          Nouveau modèle
        </button>
      </div>

      {catalogue.length === 0 ? (
        <div className="empty-card">
          <p className="empty-title">Ta bibliothèque est vide</p>
          <p className="empty-body">
            Crée ton premier modèle d'atelier pour préparer la rentrée sans ressaisir les mêmes informations à chaque fois.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            <Plus size={15} aria-hidden="true" />
            Créer un modèle
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <p className="empty-title">Aucun résultat</p>
          <p className="empty-body">
            Aucun modèle ne correspond à ta recherche. Essaie un autre nom ou une autre catégorie.
          </p>
        </div>
      ) : (
        <div className="catalogue-grid">
          {filtered.map((item) => (
            <CatalogueCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
