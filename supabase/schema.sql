-- Suzanne Assistant — schéma de base de données
-- Peut être relancé sans erreur (idempotent) : à exécuter dans
-- Supabase > SQL Editor > New query, puis "Run".

-- Table des ateliers -----------------------------------------------
create table if not exists ateliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  theme text not null,
  date date not null,
  prix_participant numeric,
  participants integer,
  cout_matiere numeric,
  prep_min integer,
  anim_min integer,
  notes text,
  materials jsonb default '[]'::jsonb,
  communique boolean default false,
  created_at timestamptz default now()
);

alter table ateliers enable row level security;

drop policy if exists "ateliers_select_own" on ateliers;
create policy "ateliers_select_own" on ateliers
  for select using (auth.uid() = user_id);

drop policy if exists "ateliers_insert_own" on ateliers;
create policy "ateliers_insert_own" on ateliers
  for insert with check (auth.uid() = user_id);

drop policy if exists "ateliers_update_own" on ateliers;
create policy "ateliers_update_own" on ateliers
  for update using (auth.uid() = user_id);

drop policy if exists "ateliers_delete_own" on ateliers;
create policy "ateliers_delete_own" on ateliers
  for delete using (auth.uid() = user_id);

-- Table des matières (stock) -----------------------------------------
create table if not exists stock (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom text not null,
  quantite numeric,
  unite text,
  seuil_alerte numeric,
  created_at timestamptz default now()
);

alter table stock enable row level security;

drop policy if exists "stock_select_own" on stock;
create policy "stock_select_own" on stock
  for select using (auth.uid() = user_id);

drop policy if exists "stock_insert_own" on stock;
create policy "stock_insert_own" on stock
  for insert with check (auth.uid() = user_id);

drop policy if exists "stock_update_own" on stock;
create policy "stock_update_own" on stock
  for update using (auth.uid() = user_id);

drop policy if exists "stock_delete_own" on stock;
create policy "stock_delete_own" on stock
  for delete using (auth.uid() = user_id);

-- Table catalogue (modèles d'ateliers réutilisables) ----------------
create table if not exists catalogue_ateliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Informations essentielles
  nom text not null,
  type_activite text not null,
  categorie text not null,
  photo_path text,
  description text,
  prix_participant numeric,
  places_max integer,
  duree_min integer,
  prep_min integer,
  cout_matiere numeric,
  cout_matiere_participant numeric,
  cout_boisson_participant numeric,
  cout_gourmandise_participant numeric,
  autres_couts_participant numeric,
  couts_fixes_atelier numeric,
  rangement_min integer,
  difficulte text check (difficulte is null or difficulte in ('facile', 'intermediaire', 'avance')),
  public_conseille text,
  materials jsonb default '[]'::jsonb,
  conseils text,
  actif boolean default true,

  -- Communication (intégrée à la fiche)
  instagram_post text,
  instagram_story text,
  instagram_reel text,
  facebook_post text,
  texte_site text,
  hashtags text,
  medias jsonb default '[]'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table catalogue_ateliers enable row level security;

drop policy if exists "catalogue_select_own" on catalogue_ateliers;
create policy "catalogue_select_own" on catalogue_ateliers
  for select using (auth.uid() = user_id);

drop policy if exists "catalogue_insert_own" on catalogue_ateliers;
create policy "catalogue_insert_own" on catalogue_ateliers
  for insert with check (auth.uid() = user_id);

drop policy if exists "catalogue_update_own" on catalogue_ateliers;
create policy "catalogue_update_own" on catalogue_ateliers
  for update using (auth.uid() = user_id);

drop policy if exists "catalogue_delete_own" on catalogue_ateliers;
create policy "catalogue_delete_own" on catalogue_ateliers
  for delete using (auth.uid() = user_id);

-- Lien sessions planifiées ↔ modèles catalogue -----------------------
alter table ateliers add column if not exists catalogue_id uuid
  references catalogue_ateliers(id) on delete set null;
alter table ateliers add column if not exists nom text;
alter table ateliers add column if not exists heure text;
alter table ateliers add column if not exists statut text default 'ouvert';

update ateliers set nom = theme where nom is null and theme is not null;

-- Supabase Storage — bucket catalogue (privé) ----------------------
insert into storage.buckets (id, name, public)
values ('catalogue', 'catalogue', false)
on conflict (id) do nothing;

drop policy if exists "catalogue_storage_select" on storage.objects;
create policy "catalogue_storage_select" on storage.objects
  for select using (
    bucket_id = 'catalogue'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "catalogue_storage_insert" on storage.objects;
create policy "catalogue_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'catalogue'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "catalogue_storage_update" on storage.objects;
create policy "catalogue_storage_update" on storage.objects
  for update using (
    bucket_id = 'catalogue'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "catalogue_storage_delete" on storage.objects;
create policy "catalogue_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'catalogue'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Rentabilité catalogue — coûts variables / participant + fixes session
alter table catalogue_ateliers add column if not exists cout_matiere_participant numeric;
alter table catalogue_ateliers add column if not exists cout_boisson_participant numeric;
alter table catalogue_ateliers add column if not exists cout_gourmandise_participant numeric;
alter table catalogue_ateliers add column if not exists autres_couts_participant numeric;
alter table catalogue_ateliers add column if not exists couts_fixes_atelier numeric;
alter table catalogue_ateliers add column if not exists rangement_min integer;

-- Migration legacy : cout_matiere → cout_matiere_participant
update catalogue_ateliers
set cout_matiere_participant = cout_matiere
where cout_matiere_participant is null and cout_matiere is not null;

-- Migration R-B : anciens noms de colonnes → nouveaux noms
update catalogue_ateliers
set autres_couts_participant = autre_cout_participant
where autres_couts_participant is null and autre_cout_participant is not null;

update catalogue_ateliers
set couts_fixes_atelier = autres_couts_fixes
where couts_fixes_atelier is null and autres_couts_fixes is not null;

-- Type d'activité (catalogue)
alter table catalogue_ateliers add column if not exists type_activite text;

update catalogue_ateliers
set type_activite = 'Atelier guidé'
where type_activite is null;

alter table catalogue_ateliers drop constraint if exists catalogue_type_activite_check;
alter table catalogue_ateliers add constraint catalogue_type_activite_check
  check (type_activite in ('Atelier guidé', 'Pause créative', 'Atelier intervenant', 'Événement privé'));

-- Planning V1 — snapshots sessions + créneaux bloqués (P-A)
alter table ateliers add column if not exists notes text;
alter table ateliers add column if not exists kind text default 'catalogue';
alter table ateliers add column if not exists type_activite text;
alter table ateliers add column if not exists categorie text;
alter table ateliers add column if not exists photo_path text;
alter table ateliers add column if not exists description text;
alter table ateliers add column if not exists duree_min integer;
alter table ateliers add column if not exists places_max integer;
alter table ateliers add column if not exists heure_fin text;
alter table ateliers add column if not exists libelle text;

update ateliers set kind = 'catalogue' where kind is null;

-- Migration statuts legacy → V1 (casse et accents)
update ateliers
set statut = case
  when statut is null then 'Prévu'
  when statut in ('Prévu', 'Réservations ouvertes', 'Complet', 'Privé', 'Annulé') then statut
  when lower(trim(statut)) in ('prévu', 'prevu', 'ouvert', 'brouillon', 'planifié', 'planifie') then 'Prévu'
  when lower(trim(statut)) in ('réservations ouvertes', 'reservations ouvertes') then 'Réservations ouvertes'
  when lower(trim(statut)) in ('complet', 'terminé', 'termine') then 'Complet'
  when lower(trim(statut)) in ('privé', 'prive') then 'Privé'
  when lower(trim(statut)) in ('annulé', 'annule') then 'Annulé'
  else 'Prévu'
end;

update ateliers
set statut = 'Prévu'
where statut not in ('Prévu', 'Réservations ouvertes', 'Complet', 'Privé', 'Annulé');

update ateliers a
set
  nom = coalesce(nullif(a.nom, ''), c.nom),
  type_activite = coalesce(a.type_activite, c.type_activite),
  categorie = coalesce(a.categorie, c.categorie),
  photo_path = coalesce(a.photo_path, c.photo_path),
  description = coalesce(a.description, c.description),
  duree_min = coalesce(a.duree_min, c.duree_min),
  prix_participant = coalesce(a.prix_participant, c.prix_participant),
  places_max = coalesce(a.places_max, c.places_max)
from catalogue_ateliers c
where a.catalogue_id = c.id;

alter table ateliers drop constraint if exists ateliers_kind_check;
alter table ateliers add constraint ateliers_kind_check
  check (kind in ('catalogue', 'bloque', 'evenement'));

-- E-A — Événements ponctuels (sans lien catalogue)
alter table ateliers add column if not exists intervenant text;

-- E-A révisé — modes de rémunération (événements ponctuels)
alter table ateliers add column if not exists mode_remuneration text;
alter table ateliers add column if not exists montant_suzanne numeric;
alter table ateliers add column if not exists remuneration_taux numeric;
alter table ateliers add column if not exists prix_public_participant numeric;

update ateliers
set mode_remuneration = 'encaissement'
where kind = 'evenement' and mode_remuneration is null;

alter table ateliers drop constraint if exists ateliers_mode_remuneration_check;
alter table ateliers add constraint ateliers_mode_remuneration_check
  check (
    mode_remuneration is null
    or mode_remuneration in (
      'encaissement',
      'forfait',
      'pourcentage',
      'montant_par_participant'
    )
  );

alter table ateliers drop constraint if exists ateliers_statut_check;
alter table ateliers add constraint ateliers_statut_check
  check (statut in ('Prévu', 'Réservations ouvertes', 'Complet', 'Privé', 'Annulé'));

-- R-B — Journal Amelia webhooks (réception uniquement)
create table if not exists amelia_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_type text,
  event_action text,
  payload jsonb not null,
  processed boolean not null default false,
  processing_error text
);

alter table amelia_webhook_events enable row level security;

create index if not exists amelia_webhook_events_received_at_idx
  on amelia_webhook_events (received_at desc);

create index if not exists amelia_webhook_events_processed_idx
  on amelia_webhook_events (processed);
