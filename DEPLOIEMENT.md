# Mettre Suzanne Assistant en ligne — avec données synchronisées

Ce guide part de zéro et suppose que tu n'as jamais fait ça. Trois
grandes parties : créer la base de données (Supabase), créer les
fichiers du site (build), puis les mettre en ligne (Hostinger).

---

## Partie A — Créer la base de données (Supabase)

### A.1 — Créer le compte et le projet

1. Va sur https://supabase.com et crée un compte gratuit (avec ton
   e-mail habituel).
2. Clique sur **New project**.
3. Choisis un nom (ex. "suzanne-assistant"), une région proche de la
   France (ex. Europe West), et un mot de passe de base de données —
   note-le quelque part, tu n'en auras normalement plus besoin après.
4. Attends 1 à 2 minutes que le projet se crée.

### A.2 — Créer les tables (une seule fois)

1. Dans le menu de gauche, clique sur **SQL Editor**.
2. Clique sur **New query**.
3. Ouvre le fichier `supabase/schema.sql` fourni avec ce projet,
   copie tout son contenu, colle-le dans l'éditeur.
4. Clique sur **Run**. Tu dois voir "Success" — les deux tables
   (`ateliers` et `stock`) sont créées, avec la sécurité qui garantit
   que seule toi peux voir tes données.

### A.3 — Créer ton compte de connexion

Cette application est privée : il n'y a pas de formulaire d'inscription
publique, volontairement.

1. Dans le menu de gauche, va dans **Authentication → Users**.
2. Clique sur **Add user → Create new user**.
3. Renseigne ton e-mail et un mot de passe de ton choix.
4. Coche **Auto Confirm User** (pour ne pas avoir à valider par e-mail).
5. Valide. C'est l'identifiant que tu utiliseras dans l'application.

Pour empêcher que quiconque d'autre puisse créer un compte :

6. Va dans **Authentication → Providers → Email**.
7. Désactive **Allow new users to sign up**.

### A.4 — Récupérer les clés de connexion

1. Va dans **Project Settings → API**.
2. Note deux valeurs :
   - **Project URL** (ressemble à `https://xxxxx.supabase.co`)
   - **anon public key** (une longue chaîne de caractères)

Tu en auras besoin à l'étape B. Ces valeurs ne sont pas un secret à
proprement parler (elles sont faites pour être visibles dans un site
web), mais ne les partage pas inutilement.

---

## Partie B — Créer les fichiers du site (une seule fois)

Sur ton Mac :

1. Ouvre le dossier du projet, trouve le fichier **`.env.example`**.
2. Fais-en une copie, renomme-la **`.env`** (juste ".env", rien
   d'autre).
3. Ouvre ce nouveau fichier `.env` avec TextEdit et remplace les deux
   valeurs par celles notées en A.4 :
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=la-longue-chaîne-copiée
   ```
   Enregistre.
4. Ouvre l'app **Terminal** (Cmd+Espace, tape "Terminal", Entrée).
5. Va dans le dossier du projet :
   ```
   cd Downloads/suzanne-assistant
   ```
6. Colle ces deux commandes, l'une après l'autre :
   ```
   npm install
   npm run build
   ```
7. Un dossier **`dist`** apparaît. C'est lui qu'on met en ligne à la
   partie suivante. Tu n'auras plus besoin du Terminal après ça, sauf
   si on ajoute une fonctionnalité plus tard.

---

## Partie C — Mettre en ligne sur Hostinger

### C.1 — Créer un sous-domaine dédié

1. Connecte-toi à **hPanel**.
2. **Domaines → Sous-domaines**, crée par exemple
   `suzanne.tondomaine.fr`.
3. Note le dossier créé, généralement
   `public_html/suzanne.tondomaine.fr/`.

### C.2 — Envoyer les fichiers

1. Dans hPanel, ouvre **Fichiers → Gestionnaire de fichiers**.
2. Entre dans le dossier du sous-domaine.
3. Envoie **tout le contenu** du dossier `dist` (pas le dossier
   `dist` lui-même) : le fichier `index.html`, le dossier `assets`,
   etc.

C'est tout. Il n'y a plus besoin de fichier `.htaccess` de protection
par mot de passe séparé : la vraie protection est maintenant assurée
par la connexion Supabase (e-mail + mot de passe), pas par le serveur.
Tu peux quand même activer le HTTPS forcé si Hostinger le propose en
une case à cocher.

### C.3 — Vérifier

Ouvre `https://suzanne.tondomaine.fr` sur ton Mac, ton iPad et ton
téléphone. L'écran de connexion doit apparaître. Connecte-toi avec le
compte créé en A.3 — les mêmes données doivent apparaître sur les
trois appareils, puisqu'elles vivent maintenant dans Supabase et non
plus dans chaque navigateur séparément.

Ajoute le lien à l'écran d'accueil de ton iPad et ton téléphone
(Safari → partager → "Sur l'écran d'accueil") pour l'ouvrir comme une
vraie application.

---

## Sauvegardes automatiques — un point à trancher

Le plan gratuit de Supabase conserve tes données normalement, mais ne
fait pas de sauvegardes automatiques récupérables en cas d'erreur
(suppression accidentelle, etc.). Le plan payant "Pro" (environ 25 $
par mois) ajoute des sauvegardes quotidiennes conservées 7 jours.

Pour un logiciel que tu utilises tous les jours pour gérer ton
activité, je te recommande de passer au plan Pro dès que tu seras à
l'aise avec l'outil — c'est une vraie assurance, pas un gadget. Ce
n'est pas obligatoire pour démarrer.

---

## En cas de problème

Si une erreur apparaît (à la connexion, à l'enregistrement d'un
atelier), ouvre les outils de développement du navigateur (clic droit
→ "Inspecter" → onglet "Console") et copie-moi le message affiché en
rouge — je pourrai identifier précisément le fichier en cause.
