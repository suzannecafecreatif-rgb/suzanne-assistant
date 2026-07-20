// État central unique de l'application. Toute donnée qui change
// passe par une action décrite ici, et par ce chemin uniquement.
// Aucun composant d'écran ne modifie l'état directement.

import { DEFAULT_REVENU_HORAIRE_OBJECTIF } from "../utils/profitabilityHelpers.js";

export const initialState = {
  screen: "catalogue",
  ateliers: [],
  stock: [],
  catalogue: [],
  prefill: null,
  loading: true,
  revenuHoraireObjectif: DEFAULT_REVENU_HORAIRE_OBJECTIF
};

export function appReducer(state, action) {
  switch (action.type) {
    case "INIT_DATA":
      return {
        ...state,
        ateliers: action.ateliers,
        stock: action.stock,
        catalogue: action.catalogue ?? state.catalogue,
        loading: false
      };

    case "SET_CATALOGUE":
      return { ...state, catalogue: action.catalogue };

    case "ADD_CATALOGUE":
      return { ...state, catalogue: [...state.catalogue, action.item] };

    case "UPDATE_CATALOGUE":
      return {
        ...state,
        catalogue: state.catalogue.map((c) => (c.id === action.item.id ? action.item : c))
      };

    case "DELETE_CATALOGUE":
      return { ...state, catalogue: state.catalogue.filter((c) => c.id !== action.id) };

    case "NAVIGATE":
      return { ...state, screen: action.screen, prefill: action.prefill || null };

    case "ADD_ATELIER":
      return { ...state, ateliers: [...state.ateliers, action.record] };

    case "UPDATE_ATELIER":
      return { ...state, ateliers: state.ateliers.map((a) => (a.id === action.record.id ? action.record : a)) };

    case "MOVE_ATELIER":
      return { ...state, ateliers: state.ateliers.map((a) => (a.id === action.id ? { ...a, date: action.date } : a)) };

    case "DUPLICATE_ATELIER": {
      const source = state.ateliers.find((a) => a.id === action.id);
      if (!source) return state;
      const copy = {
        ...source,
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString()
      };
      return { ...state, ateliers: [...state.ateliers, copy] };
    }

    case "DELETE_ATELIER":
      return { ...state, ateliers: state.ateliers.filter((a) => a.id !== action.id) };

    case "CONSUME_STOCK": {
      if (!action.materials || action.materials.length === 0) return state;
      const stock = state.stock.map((item) => {
        const used = action.materials.find((m) => m.stockId === item.id);
        if (!used || !used.qty) return item;
        const remaining = Math.max(0, (Number(item.quantite) || 0) - (Number(used.qty) || 0));
        return { ...item, quantite: remaining };
      });
      return { ...state, stock };
    }

    case "ADD_STOCK":
      return { ...state, stock: [...state.stock, action.item] };

    case "UPDATE_STOCK":
      return { ...state, stock: state.stock.map((s) => (s.id === action.item.id ? action.item : s)) };

    case "DELETE_STOCK":
      return { ...state, stock: state.stock.filter((s) => s.id !== action.id) };

    case "SET_REVENU_HORAIRE_OBJECTIF":
      return { ...state, revenuHoraireObjectif: action.value };

    default:
      return state;
  }
}
