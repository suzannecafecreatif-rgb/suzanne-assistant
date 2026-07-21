import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await sb
  .from("amelia_webhook_events")
  .select("id, received_at, event_type, event_action, processed, payload")
  .order("received_at", { ascending: false })
  .limit(10);

if (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      count: data.length,
      latest: data[0] ?? null,
      events: data.map((row) => ({
        id: row.id,
        received_at: row.received_at,
        event_type: row.event_type,
        event_action: row.event_action,
        processed: row.processed,
        payload_keys: row.payload ? Object.keys(row.payload) : []
      }))
    },
    null,
    2
  )
);
