/**
 * Déploiement R-C production : env Vercel, test webhook, vérif import.
 * Usage :
 *   SUZANNE_DEFAULT_USER_ID=uuid node scripts/deploy-rc-production.mjs
 * ou avec vercel env run après ajout des vars.
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const WEBHOOK_URL = "https://suzanne-assistant.vercel.app/api/webhooks/amelia";

/** Payload réel simplifié — booking #8 */
const PAYLOAD_BOOKING_8 = {
  bookings: {
    "0": {
      id: 8,
      price: 79,
      status: "approved",
      created: "2026-07-21 18:04:54",
      persons: 1,
      customerId: 3,
      appointmentId: 8
    }
  },
  appointment: {
    id: 8,
    status: "approved",
    serviceId: 12,
    bookingStart: "2026-07-30 16:30:00",
    bookingEnd: "2026-07-30 18:30:00",
    bookings: {
      "0": {
        id: 8,
        status: "approved",
        price: 79,
        persons: 1
      }
    }
  },
  customer: {
    id: 3,
    firstName: "Test",
    lastName: "RC",
    email: "rc-test@example.com",
    phone: "+33600000000"
  },
  payment: {
    amount: 0,
    status: "pending",
    gateway: "onSite",
    currency: "EUR"
  }
};

function mustEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function postWebhook(secret, payload, headers = {}) {
  const res = await fetch(`${WEBHOOK_URL}?token=${encodeURIComponent(secret)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function verifyImport(sb, bookingId) {
  const { data: events, error: evErr } = await sb
    .from("amelia_webhook_events")
    .select("id, processed, processing_error, processed_at, event_type, event_action")
    .order("received_at", { ascending: false })
    .limit(5);

  const { data: reservations, error: rErr } = await sb
    .from("reservations")
    .select("*")
    .eq("amelia_booking_id", bookingId);

  const { count, error: dupErr } = await sb
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("amelia_booking_id", bookingId);

  return {
    eventsError: evErr?.message ?? null,
    latestEvents: events?.slice(0, 3) ?? [],
    reservationsError: rErr?.message ?? null,
    reservations: reservations ?? [],
    reservationCount: count ?? null,
    duplicateCheckError: dupErr?.message ?? null
  };
}

async function main() {
  const secret = mustEnv("AMELIA_WEBHOOK_SECRET");
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  const userId = mustEnv("SUZANNE_DEFAULT_USER_ID");

  console.log("1) Test webhook production (payload booking #8)...");
  const rcTest = Date.now();
  const payload = { ...PAYLOAD_BOOKING_8, rc_prod_test: rcTest };
  const wh = await postWebhook(secret, payload, {
    "x-amelia-webhook-type": "appointment",
    "x-amelia-webhook-action": "bookingAdded"
  });
  console.log("   HTTP", wh.status, JSON.stringify(wh.body));

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("\n2) Vérification base...");
  const report = await verifyImport(sb, 8);
  console.log(JSON.stringify(report, null, 2));

  const ok =
    wh.status === 200 &&
    wh.body?.ok === true &&
    wh.body?.import?.processed === true &&
    report.reservationCount === 1 &&
    report.reservations?.[0]?.booking_status === "approved" &&
    Number(report.reservations?.[0]?.payment_amount) === 0;

  console.log("\n3) Résultat global:", ok ? "OK" : "ÉCHEC");
  console.log("   SUZANNE_DEFAULT_USER_ID utilisé:", userId);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
