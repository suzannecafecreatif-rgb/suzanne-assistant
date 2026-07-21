/**
 * Processeur R-C — upsert reservations depuis amelia_webhook_events.
 */
import {
  AMELIA_ENTITY_APPOINTMENT,
  BOOKING_STATUS,
  INFERRED_ACTION,
  computeImportFingerprint,
  inferWebhookAction,
  normalizeAmeliaAppointmentPayload,
  normalizeWebhookAction
} from "./ameliaNormalize.js";
import { createServiceSupabaseClient, extractWebhookMeta } from "./ameliaWebhook.js";

function getDefaultUserId() {
  return process.env.SUZANNE_DEFAULT_USER_ID?.trim() || null;
}

function getAmeliaTimeZone() {
  return process.env.AMELIA_TIMEZONE?.trim() || "Europe/Paris";
}

function reservationRowFromNormalized(normalized, userId, sessionId, payload, fingerprint) {
  const canceledAt =
    normalized.booking_status === BOOKING_STATUS.CANCELED ? new Date().toISOString() : null;

  return {
    user_id: userId,
    session_id: sessionId,
    amelia_booking_id: normalized.amelia_booking_id,
    amelia_appointment_id: normalized.amelia_appointment_id,
    amelia_entity_type: normalized.amelia_entity_type || AMELIA_ENTITY_APPOINTMENT,
    amelia_service_id: normalized.amelia_service_id,
    amelia_event_id: normalized.amelia_event_id,
    amelia_period_id: normalized.amelia_period_id,
    amelia_customer_id: normalized.amelia_customer_id,
    customer_first_name: normalized.customer_first_name,
    customer_last_name: normalized.customer_last_name,
    customer_email: normalized.customer_email,
    customer_phone: normalized.customer_phone,
    persons: normalized.persons,
    booking_status: normalized.booking_status,
    booking_start: normalized.booking_start,
    booking_end: normalized.booking_end,
    payment_status: normalized.payment_status,
    payment_amount: normalized.payment_amount,
    payment_currency: "EUR",
    payment_gateway: normalized.payment_gateway,
    payment_transaction_id: normalized.payment_transaction_id,
    amelia_payment_id: normalized.amelia_payment_id,
    source: "amelia",
    canceled_at: canceledAt,
    amelia_payload: payload,
    import_fingerprint: fingerprint,
    updated_at: new Date().toISOString()
  };
}

export async function resolveSessionIdFromAmeliaLink(supabase, userId, normalized) {
  if (normalized.amelia_entity_type !== AMELIA_ENTITY_APPOINTMENT) {
    return null;
  }

  const { data, error } = await supabase
    .from("session_amelia_links")
    .select("session_id")
    .eq("user_id", userId)
    .eq("amelia_entity_type", AMELIA_ENTITY_APPOINTMENT)
    .eq("amelia_service_id", normalized.amelia_service_id)
    .eq("booking_start", normalized.booking_start)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.session_id ?? null;
}

export async function findExistingReservation(supabase, userId, ameliaBookingId) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("user_id", userId)
    .eq("amelia_booking_id", ameliaBookingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertReservationFromNormalized({
  supabase,
  userId,
  normalized,
  payload,
  sessionId,
  action
}) {
  const fingerprint = computeImportFingerprint(normalized);
  const existing = await findExistingReservation(supabase, userId, normalized.amelia_booking_id);

  if (action === INFERRED_ACTION.DUPLICATE_NO_OP && existing) {
    return { mode: "noop", reservationId: existing.id, sessionId: existing.session_id };
  }

  const row = reservationRowFromNormalized(normalized, userId, sessionId, payload, fingerprint);

  if (existing) {
    if (
      existing.booking_status !== BOOKING_STATUS.CANCELED &&
      normalized.booking_status !== BOOKING_STATUS.CANCELED
    ) {
      row.canceled_at = null;
    } else if (
      normalized.booking_status === BOOKING_STATUS.CANCELED ||
      normalized.booking_status === BOOKING_STATUS.REJECTED
    ) {
      row.canceled_at = existing.canceled_at ?? new Date().toISOString();
    } else {
      row.canceled_at = existing.canceled_at;
    }

    const { data, error } = await supabase
      .from("reservations")
      .update(row)
      .eq("id", existing.id)
      .select("id, session_id")
      .single();

    if (error) throw new Error(error.message);
    return { mode: "update", reservationId: data.id, sessionId: data.session_id };
  }

  const { data, error } = await supabase.from("reservations").insert(row).select("id, session_id").single();
  if (error) throw new Error(error.message);
  return { mode: "insert", reservationId: data.id, sessionId: data.session_id };
}

/**
 * Traite un événement webhook journalisé (R-C).
 * @returns {Promise<{ok: boolean, action?: string, mode?: string, error?: string, unlinked?: boolean}>}
 */
export async function processAmeliaWebhookEvent({
  eventId,
  payload,
  headers = {},
  eventType = null,
  eventAction = null,
  supabase = null
}) {
  const client = supabase ?? createServiceSupabaseClient();
  const userId = getDefaultUserId();

  if (!userId) {
    await markEventProcessed(client, eventId, {
      error: "SUZANNE_DEFAULT_USER_ID is not configured"
    });
    return { ok: false, error: "SUZANNE_DEFAULT_USER_ID is not configured" };
  }

  const meta = extractWebhookMeta(payload, headers);
  const declaredType = eventType || meta.event_type;
  const declaredAction = eventAction || meta.event_action;

  const normalizedResult = normalizeAmeliaAppointmentPayload(payload, {
    timeZone: getAmeliaTimeZone()
  });

  if (!normalizedResult.ok) {
    await markEventProcessed(client, eventId, {
      error: normalizedResult.error,
      eventType: declaredType,
      eventAction: declaredAction
    });
    return { ok: false, error: normalizedResult.error };
  }

  const normalized = normalizedResult.data;

  if (declaredType && declaredType !== AMELIA_ENTITY_APPOINTMENT && declaredType !== "appointment") {
    await markEventProcessed(client, eventId, {
      error: `Unsupported entity type for R-C V1: ${declaredType}`,
      eventType: declaredType,
      eventAction: declaredAction
    });
    return { ok: false, error: `Unsupported entity type: ${declaredType}` };
  }

  let existing = null;
  try {
    existing = await findExistingReservation(client, userId, normalized.amelia_booking_id);
  } catch (err) {
    await markEventProcessed(client, eventId, {
      error: err.message,
      eventType: declaredType ?? AMELIA_ENTITY_APPOINTMENT,
      eventAction: declaredAction
    });
    return { ok: false, error: err.message };
  }

  const inferredAction = inferWebhookAction(
    normalized,
    existing,
    normalizeWebhookAction(declaredAction) ?? declaredAction
  );

  let sessionId = null;
  try {
    sessionId = await resolveSessionIdFromAmeliaLink(client, userId, normalized);
  } catch (err) {
    await markEventProcessed(client, eventId, {
      error: err.message,
      eventType: declaredType ?? AMELIA_ENTITY_APPOINTMENT,
      eventAction: inferredAction
    });
    return { ok: false, error: err.message };
  }

  try {
    const upsert = await upsertReservationFromNormalized({
      supabase: client,
      userId,
      normalized,
      payload,
      sessionId,
      action: inferredAction
    });

    await markEventProcessed(client, eventId, {
      eventType: declaredType ?? AMELIA_ENTITY_APPOINTMENT,
      eventAction: inferredAction,
      error: sessionId ? null : "unlinked: no session_amelia_links match"
    });

    return {
      ok: true,
      action: inferredAction,
      mode: upsert.mode,
      reservationId: upsert.reservationId,
      sessionId: upsert.sessionId,
      unlinked: !sessionId
    };
  } catch (err) {
    await markEventProcessed(client, eventId, {
      error: err.message,
      eventType: declaredType ?? AMELIA_ENTITY_APPOINTMENT,
      eventAction: inferredAction
    });
    return { ok: false, error: err.message };
  }
}

async function markEventProcessed(supabase, eventId, { error = null, eventType = null, eventAction = null }) {
  const patch = {
    processed: true,
    processed_at: new Date().toISOString(),
    processing_error: error
  };
  if (eventType) patch.event_type = eventType;
  if (eventAction) patch.event_action = eventAction;

  const { error: dbError } = await supabase.from("amelia_webhook_events").update(patch).eq("id", eventId);
  if (dbError) throw new Error(dbError.message);
}

export { markEventProcessed };
