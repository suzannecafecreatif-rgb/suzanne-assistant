# Suzanne Assistant

Assistante de pilotage pour Suzanne Café Créatif — React + Vite +
Supabase (base de données et authentification).

## Démarrage

Voir **DEPLOIEMENT.md** pour la procédure complète, de la création du
compte Supabase jusqu'à la mise en ligne sur Hostinger.

En résumé, pour lancer le projet en local :

```bash
cp .env.example .env   # puis renseigner les vraies valeurs Supabase
npm install
npm run dev
```

## Structure du projet

```
supabase/
  schema.sql    script à exécuter une fois dans Supabase (tables + sécurité)
src/
  lib/          client Supabase (lit les variables d'environnement)
  data/         constantes partagées (liste des thèmes d'ateliers)
  utils/        fonctions pures : calculs, moteur de décision, dates
  state/        état central (reducer) + persistance (Supabase)
  components/   composants réutilisables (Sidebar, AtelierPill)
  pages/        un fichier par écran (Login, Dashboard, Planning, etc.)
  App.jsx       authentification + état central + écrans
  main.jsx      point d'entrée
  index.css     feuille de style globale
```

## Données et confidentialité

- Les données (ateliers, stock) vivent dans une base Supabase, pas
  dans le navigateur : elles sont identiques sur tous les appareils
  connectés avec le même compte.
- Chaque ligne de donnée est protégée par une politique de sécurité
  (Row Level Security) : personne d'autre que le compte propriétaire
  ne peut la lire ou la modifier, même en connaissant l'adresse du
  site.
- La connexion se fait par e-mail et mot de passe (pas d'inscription
  publique).

## Variables d'environnement

Aucun secret n'est écrit dans le code. Le fichier `.env` (jamais
partagé, exclu du projet par `.gitignore`) contient :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Commandes disponibles

- `npm run dev` — lance le serveur de développement
- `npm run build` — construit la version de production dans `dist/`
- `npm run preview` — prévisualise la version construite
