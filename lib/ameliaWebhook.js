import { createClient } from "@supabase/supabase-js";

/**
 * Métadonnées légères extraites du payload / headers Amelia.
 * Aucune logique métier — uniquement pour indexer les événements reçus.
 */
export function extractWebhookMeta(payload, headers = {}) {
  const h = normalizeHeaders(headers);
  const fromHeaderType = h["x-amelia-webhook-type"] || h["x-amelia-type"] || null;
  const fromHeaderAction = h["x-amelia-webhook-action"] || h["x-amelia-action"] || null;

  const body = payload && typeof payload === "object" ? payload : {};
  const fromBodyType = pickString(body.type, body.entityType, body.entity, body.bookingType);
  const fromBodyAction = pickString(body.action, body.eventAction, body.webhookAction);

  return {
    event_type: fromHeaderType || fromBodyType || null,
    event_action: fromHeaderAction || fromBodyAction || null
  };
}

function normalizeHeaders(headers) {
  const out = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    out[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
  });
  return out;
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function isAuthorizedToken(queryToken, secret) {
  if (!secret || typeof secret !== "string") return false;
  if (!queryToken || typeof queryToken !== "string") return false;
  return queryToken === secret;
}

export function createServiceSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function logAmeliaWebhookEvent({ payload, headers = {} }) {
  const supabase = createServiceSupabaseClient();
  const { event_type, event_action } = extractWebhookMeta(payload, headers);

  const { error } = await supabase.from("amelia_webhook_events").insert({
    event_type,
    event_action,
    payload,
    processed: false,
    processing_error: null
  });

  if (error) {
    throw new Error(error.message);
  }

  return { event_type, event_action };
}

export async function handleAmeliaWebhookRequest({ method, query = {}, body, headers = {} }) {
  if (method !== "POST") {
    return { status: 405, body: { ok: false, error: "Method Not Allowed" } };
  }

  const secret = process.env.AMELIA_WEBHOOK_SECRET;
  if (!isAuthorizedToken(query.token, secret)) {
    return { status: 401, body: { ok: false, error: "Unauthorized" } };
  }

  const payload = body ?? null;
  if (payload === null || typeof payload !== "object") {
    return {
      status: 400,
      body: { ok: false, error: "Invalid JSON body" }
    };
  }

  try {
    await logAmeliaWebhookEvent({ payload, headers });
    return { status: 200, body: { ok: true } };
  } catch (err) {
    return {
      status: 500,
      body: { ok: false, error: err.message || "Failed to log webhook event" }
    };
  }
}
