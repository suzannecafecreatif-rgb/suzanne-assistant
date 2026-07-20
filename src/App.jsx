import { useEffect, useReducer, useCallback, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import FicheAtelier from "./pages/FicheAtelier.jsx";
import Historique from "./pages/Historique.jsx";
import Rentabilite from "./pages/Rentabilite.jsx";
import Stocks from "./pages/Stocks.jsx";
import Planning from "./pages/Planning.jsx";
import { appReducer, initialState } from "./state/appReducer.js";
import {
  loadAteliers, upsertAteliers, deleteAtelierRow,
  loadStock, upsertStock, deleteStockRow
} from "./state/storage.js";
import { supabase } from "./lib/supabaseClient.js";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = pas encore vérifié
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { screen, ateliers, stock, prefill, loading } = state;

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
    Promise.all([loadAteliers(), loadStock()]).then(([a, s]) => {
      dispatch({ type: "INIT_DATA", ateliers: a, stock: s });
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
          <Dashboard ateliers={ateliers} stock={stock} onUpdate={handleUpdateAtelier} navigate={navigate} />
        ) : screen === "fiche" ? (
          <FicheAtelier prefill={prefill} stock={stock} onSave={handleSave} onUpdate={handleUpdateAtelier} navigate={navigate} />
        ) : screen === "historique" ? (
          <Historique ateliers={ateliers} onDelete={handleDelete} onDuplicate={handleDuplicate} navigate={navigate} />
        ) : screen === "rentabilite" ? (
          <Rentabilite ateliers={ateliers} />
        ) : screen === "stocks" ? (
          <Stocks stock={stock} onAdd={handleAddStock} onUpdate={handleUpdateStock} onDelete={handleDeleteStock} />
        ) : screen === "planning" ? (
          <Planning ateliers={ateliers} onMove={handleMoveAtelier} navigate={navigate} />
        ) : null}
      </div>
    </div>
  );
}
