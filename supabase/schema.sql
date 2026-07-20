-- Suzanne Assistant — schéma de base de données
-- À exécuter UNE FOIS dans Supabase : Dashboard > SQL Editor > New query
-- Colle tout ce fichier, puis clique sur "Run".

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

create policy "ateliers_select_own" on ateliers
  for select using (auth.uid() = user_id);
create policy "ateliers_insert_own" on ateliers
  for insert with check (auth.uid() = user_id);
create policy "ateliers_update_own" on ateliers
  for update using (auth.uid() = user_id);
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

create policy "stock_select_own" on stock
  for select using (auth.uid() = user_id);
create policy "stock_insert_own" on stock
  for insert with check (auth.uid() = user_id);
create policy "stock_update_own" on stock
  for update using (auth.uid() = user_id);
create policy "stock_delete_own" on stock
  for delete using (auth.uid() = user_id);
