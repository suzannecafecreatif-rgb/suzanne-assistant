import { useEffect, useReducer, useCallback, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Historique from "./pages/Historique.jsx";
import Rentabilite from "./pages/Rentabilite.jsx";
import Stocks from "./pages/Stocks.jsx";
import Planning from "./pages/Planning.jsx";
import Catalogue from "./pages/Catalogue.jsx";
import FicheCatalogue from "./pages/FicheCatalogue.jsx";
import { appReducer, initialState } from "./state/appReducer.js";
import {
  loadAteliers, upsertAteliers, deleteAtelierRow,
  loadStock, upsertStock, deleteStockRow,
  loadCatalogue, upsertCatalogueItem, deleteCatalogueRow
} from "./state/storage.js";
import { deleteCatalogueModelFiles } from "./lib/storageUpload.js";
import { supabase } from "./lib/supabaseClient.js";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = pas encore vérifié
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { screen, ateliers, stock, catalogue, prefill, loading, revenuHoraireObjectif } = state;

  // --- Authentification ------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  // --- Chargement des données une fois connectée ------------------------
  useEffect(() => {
    if (!session) return;
    Promise.all([loadAteliers(), loadStock(), loadCatalogue()]).then(([a, s, c]) => {
      dispatch({ type: "INIT_DATA", ateliers: a, stock: s, catalogue: c });
    });
  }, [session]);

  // --- Sauvegarde automatique vers Supabase à chaque changement --------
  useEffect(() => {
    if (session && !loading) upsertAteliers(ateliers);
  }, [ateliers, loading, session]);

  useEffect(() => {
    if (session && !loading) upsertStock(stock);
  }, [stock, loading, session]);

  const navigate = useCallback((key, data) => dispatch({ type: "NAVIGATE", screen: key, prefill: data }), []);

  const handleSave = useCallback((record) => {
    dispatch({ type: "ADD_ATELIER", record });
    dispatch({ type: "CONSUME_STOCK", materials: record.materials });
  }, []);

  const handleUpdateAtelier = useCallback((record) => dispatch({ type: "UPDATE_ATELIER", record }), []);
  const handleMoveAtelier = useCallback((id, date) => dispatch({ type: "MOVE_ATELIER", id, date }), []);
  const handleDuplicate = useCallback((id) => dispatch({ type: "DUPLICATE_ATELIER", id }), []);

  const handleDelete = useCallback((id) => {
    dispatch({ type: "DELETE_ATELIER", id });
    deleteAtelierRow(id);
  }, []);

  const handleAddStock = useCallback((item) => dispatch({ type: "ADD_STOCK", item }), []);
  const handleUpdateStock = useCallback((item) => dispatch({ type: "UPDATE_STOCK", item }), []);

  const handleDuplicateCatalogue = useCallback((item) => {
    navigate("catalogue", { flash: `Dupliquer « ${item.nom || "ce modèle"} » — disponible à l'étape F.` });
  }, [navigate]);

  const handleSaveCatalogue = useCallback(async (item) => {
    const { data, error } = await upsertCatalogueItem(item);
    if (data) {
      const exists = catalogue.some((c) => c.id === data.id);
      dispatch({ type: exists ? "UPDATE_CATALOGUE" : "ADD_CATALOGUE", item: data });
      navigate("catalogue", { flash: "Modèle enregistré." });
    }
    return { data, error };
  }, [catalogue, navigate]);

  const handleUpdateCatalogue = useCallback(async (item) => {
    const { data, error } = await upsertCatalogueItem(item);
    if (data) {
      dispatch({ type: "UPDATE_CATALOGUE", item: data });
      navigate("catalogue", { flash: "Modifications enregistrées." });
    }
    return { data, error };
  }, [navigate]);

  const handleDeleteCatalogue = useCallback(async (item) => {
    const { error } = await deleteCatalogueRow(item.id);
    if (error) return { error };

    const { error: storageError } = await deleteCatalogueModelFiles(item);
    if (storageError) {
      console.error("Erreur suppression fichiers catalogue", storageError);
    }

    dispatch({ type: "DELETE_CATALOGUE", id: item.id });
    navigate("catalogue", { flash: "Modèle supprimé." });
    return { error: null };
  }, [navigate]);

  const handleDeleteStock = useCallback((id) => {
    dispatch({ type: "DELETE_STOCK", id });
    deleteStockRow(id);
  }, []);

  // --- Rendu -------------------------------------------------------------
  if (session === undefined) {
    return <div className="app-root"><p className="page-sub" style={{ padding: "1.5rem" }}>Chargement...</p></div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="app-root">
      <Sidebar screen={screen} navigate={navigate} onLogout={handleLogout} />
      <div className="main">
        {loading ? (
          <p className="page-sub">Chargement...</p>
        ) : screen === "dashboard" ? (
          <Dashboard
            ateliers={ateliers}
            catalogue={catalogue}
            stock={stock}
            onUpdate={handleUpdateAtelier}
            navigate={navigate}
          />
        ) : screen === "catalogue" ? (
          <Catalogue
            catalogue={catalogue}
            navigate={navigate}
            prefill={prefill}
            onDuplicate={handleDuplicateCatalogue}
            onDelete={handleDeleteCatalogue}
          />
        ) : screen === "catalogue-fiche" ? (
          <FicheCatalogue
            prefill={prefill}
            stock={stock}
            onSave={handleSaveCatalogue}
            onUpdate={handleUpdateCatalogue}
            onDelete={handleDeleteCatalogue}
            navigate={navigate}
            revenuHoraireObjectif={revenuHoraireObjectif}
          />
        ) : screen === "planning" ? (
          <Planning
            ateliers={ateliers}
            catalogue={catalogue}
            prefill={prefill}
            onSaveSession={handleSave}
            onUpdateSession={handleUpdateAtelier}
            onDeleteSession={handleDelete}
            navigate={navigate}
          />
        ) : screen === "historique" ? (
          <Historique ateliers={ateliers} onDelete={handleDelete} onDuplicate={handleDuplicate} navigate={navigate} />
        ) : screen === "rentabilite" ? (
          <Rentabilite ateliers={ateliers} />
        ) : screen === "stocks" ? (
          <Stocks stock={stock} onAdd={handleAddStock} onUpdate={handleUpdateStock} onDelete={handleDeleteStock} />
        ) : null}
      </div>
    </div>
  );
}
