/**
 * Migration R-A/R-C en production Supabase.
 * Usage : SUPABASE_ACCESS_TOKEN=xxx node scripts/migrate-rc-production.mjs
 */
const PROJECT_REF = "ajanfugqygcprakmnanf";

const migrationSql = `
-- R-A/R-C incremental (amelia_webhook_events existe déjà en prod)
alter table ateliers add column if not exists amelia_service_id integer;
alter table ateliers add column if not exists amelia_event_id integer;
alter table ateliers add column if not exists amelia_period_id integer;

create table if not exists session_amelia_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references ateliers(id) on delete cascade,
  amelia_entity_type text not null
    check (amelia_entity_type in ('appointment', 'event')),
  amelia_service_id integer,
  amelia_event_id integer,
  amelia_period_id integer,
  booking_start timestamptz,
  link_source text not null default 'manual'
    check (link_source in ('manual', 'auto', 'import')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create index if not exists session_amelia_links_lookup_appointment_idx
  on session_amelia_links (user_id, amelia_entity_type, amelia_service_id, booking_start)
  where amelia_entity_type = 'appointment';

alter table session_amelia_links enable row level security;

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references ateliers(id) on delete set null,
  amelia_booking_id integer not null,
  amelia_appointment_id integer,
  amelia_entity_type text not null
    check (amelia_entity_type in ('appointment', 'event', 'package')),
  amelia_service_id integer,
  amelia_event_id integer,
  amelia_period_id integer,
  amelia_customer_id integer,
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  customer_phone text,
  persons integer not null default 1 check (persons > 0),
  booking_status text not null,
  booking_start timestamptz,
  booking_end timestamptz,
  payment_status text,
  payment_amount numeric,
  payment_currency text default 'EUR',
  payment_gateway text,
  payment_transaction_id text,
  amelia_payment_id integer,
  source text not null default 'amelia'
    check (source in ('amelia', 'manual')),
  canceled_at timestamptz,
  amelia_payload jsonb,
  import_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, amelia_booking_id)
);

create index if not exists reservations_session_id_idx on reservations (session_id);
create index if not exists reservations_booking_status_idx on reservations (booking_status);
create index if not exists reservations_amelia_service_start_idx
  on reservations (amelia_service_id, booking_start);

alter table reservations enable row level security;

alter table amelia_webhook_events add column if not exists request_headers jsonb;
alter table amelia_webhook_events add column if not exists processed_at timestamptz;
`;

const verifySql = `
select 'tables' as check_type, tablename
from pg_tables
where schemaname = 'public'
  and tablename in ('reservations', 'session_amelia_links', 'amelia_webhook_events')
order by tablename;

select 'indexes' as check_type, indexname, tablename
from pg_indexes
where schemaname = 'public'
  and (
    tablename in ('reservations', 'session_amelia_links', 'amelia_webhook_events')
    or indexname like 'reservations_%'
    or indexname like 'session_amelia_links_%'
    or indexname like 'amelia_webhook_events_%'
  )
order by tablename, indexname;

select 'constraints' as check_type, conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid::regclass::text in ('reservations', 'session_amelia_links', 'amelia_webhook_events')
order by table_name, conname;

select 'rls' as check_type, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('reservations', 'session_amelia_links', 'amelia_webhook_events')
order by c.relname;

select 'columns' as check_type, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'amelia_webhook_events'
  and column_name in ('request_headers', 'processed_at')
order by column_name;
`;

function loadToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  return null;
}

async function mgmt(path, { method = "GET", body } = {}) {
  const token = loadToken();
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN missing");
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`Mgmt API ${res.status}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }
  return json;
}

async function runQuery(label, query) {
  console.log(`\n=== ${label} ===`);
  const result = await mgmt(`/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    body: { query }
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  await runQuery("Migration R-A/R-C", migrationSql);
  await runQuery("Vérification contraintes / index / RLS", verifySql);
  console.log("\nMigration R-A/R-C terminée.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
