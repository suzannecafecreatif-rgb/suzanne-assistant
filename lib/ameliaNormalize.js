/**
 * Normalisation payload Amelia (mapping R-A) — sans logique upsert.
 */

export const AMELIA_ENTITY_APPOINTMENT = "appointment";

export const BOOKING_STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  CANCELED: "canceled",
  REJECTED: "rejected",
  NO_SHOW: "no_show"
};

export const INFERRED_ACTION = {
  BOOKING_ADDED: "bookingAdded",
  BOOKING_RESCHEDULED: "bookingRescheduled",
  BOOKING_CANCELED: "bookingCanceled",
  BOOKING_STATUS_CHANGED: "bookingStatusChanged",
  DUPLICATE_NO_OP: "duplicateNoOp"
};

const AMELIA_STATUS_MAP = {
  approved: BOOKING_STATUS.ACTIVE,
  pending: BOOKING_STATUS.PENDING,
  canceled: BOOKING_STATUS.CANCELED,
  cancelled: BOOKING_STATUS.CANCELED,
  rejected: BOOKING_STATUS.REJECTED,
  "no-show": BOOKING_STATUS.NO_SHOW,
  noshow: BOOKING_STATUS.NO_SHOW
};

const PAYMENT_STATUS_MAP = {
  paid: "paid",
  pending: "pending",
  partiallypaid: "partially_paid",
  refunded: "refunded"
};

function pickBookingRoot(payload) {
  return payload?.bookings?.["0"] ?? payload?.bookings?.[0] ?? null;
}

function pickAppointmentBookingRoot(payload) {
  return payload?.appointment?.bookings?.["0"] ?? payload?.appointment?.bookings?.[0] ?? null;
}

function pickPayment(booking) {
  return booking?.payments?.["0"] ?? booking?.payments?.[0] ?? null;
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickInt(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function foldStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAmeliaBookingStatus(rawStatus) {
  if (!rawStatus) return BOOKING_STATUS.PENDING;
  const mapped = AMELIA_STATUS_MAP[foldStatus(rawStatus)];
  return mapped ?? BOOKING_STATUS.PENDING;
}

export function normalizeAmeliaPaymentStatus(rawStatus) {
  if (!rawStatus) return "unknown";
  return PAYMENT_STATUS_MAP[foldStatus(rawStatus)] ?? "unknown";
}

export function resolveBookingStatusRaw(payload) {
  const appointmentBooking = pickAppointmentBookingRoot(payload);
  const booking = pickBookingRoot(payload);
  const fromAppointmentBooking = pickString(appointmentBooking?.status);
  const fromBooking = pickString(booking?.status);
  const fromAppointment = pickString(payload?.appointment?.status);

  if (fromAppointmentBooking && fromBooking && foldStatus(fromAppointmentBooking) !== foldStatus(fromBooking)) {
    return fromAppointmentBooking;
  }
  if (fromAppointmentBooking) return fromAppointmentBooking;
  if (fromBooking) return fromBooking;
  if (fromAppointment) return fromAppointment;
  return null;
}

function wallTimeInZone(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date(utcMs));
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return {
    y: get("year"),
    mo: get("month"),
    d: get("day"),
    h: get("hour"),
    mi: get("minute"),
    s: get("second")
  };
}

/**
 * Interprète une datetime Amelia sans offset comme heure murale AMELIA_TIMEZONE.
 * @returns {string|null} ISO8601 UTC
 */
export function parseAmeliaLocalDateTime(value, timeZone = "Europe/Paris") {
  if (!value || typeof value !== "string") return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;

  const wall = {
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    h: Number(m[4]),
    mi: Number(m[5]),
    s: Number(m[6])
  };
  const targetMs = Date.UTC(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s);

  let utcMs = targetMs;
  for (let i = 0; i < 4; i++) {
    const observed = wallTimeInZone(utcMs, timeZone);
    const observedMs = Date.UTC(observed.y, observed.mo - 1, observed.d, observed.h, observed.mi, observed.s);
    const delta = targetMs - observedMs;
    if (delta === 0) return new Date(utcMs).toISOString();
    utcMs += delta;
  }
  return new Date(utcMs).toISOString();
}

export function normalizeAmeliaAppointmentPayload(payload, options = {}) {
  const timeZone = options.timeZone ?? "Europe/Paris";
  const booking = pickBookingRoot(payload);
  const payment = pickPayment(booking);
  const statusRaw = resolveBookingStatusRaw(payload);

  if (!booking) {
    return { ok: false, error: "Missing payload.bookings[\"0\"]" };
  }

  const ameliaBookingId = pickInt(booking.id);
  const ameliaServiceId = pickInt(payload?.appointment?.serviceId, payload?.appointment?.service?.id);

  if (ameliaBookingId === null) {
    return { ok: false, error: "Missing amelia_booking_id" };
  }
  if (ameliaServiceId === null) {
    return { ok: false, error: "Missing amelia_service_id" };
  }

  const bookingStartRaw = pickString(payload?.appointment?.bookingStart);
  const bookingStart = parseAmeliaLocalDateTime(bookingStartRaw, timeZone);
  if (!bookingStart) {
    return { ok: false, error: "Missing or invalid booking_start" };
  }

  const bookingEndRaw = pickString(payload?.appointment?.bookingEnd);
  const bookingEnd = bookingEndRaw ? parseAmeliaLocalDateTime(bookingEndRaw, timeZone) : null;

  const normalized = {
    amelia_entity_type: pickString(payload?.appointment?.type) ?? AMELIA_ENTITY_APPOINTMENT,
    amelia_booking_id: ameliaBookingId,
    amelia_appointment_id: pickInt(payload?.appointment?.id),
    amelia_service_id: ameliaServiceId,
    amelia_event_id: pickInt(payload?.appointment?.eventId),
    amelia_period_id: pickInt(payload?.appointment?.periodId),
    amelia_customer_id: pickInt(booking.customerId, booking.customer?.id),
    booking_start: bookingStart,
    booking_end: bookingEnd,
    booking_created_at: pickString(booking.created),
    persons: pickInt(booking.persons) ?? 1,
    booking_status: normalizeAmeliaBookingStatus(statusRaw),
    booking_status_raw: statusRaw,
    customer_first_name: pickString(booking.customer?.firstName),
    customer_last_name: pickString(booking.customer?.lastName),
    customer_email: pickString(booking.customer?.email),
    customer_phone: pickString(booking.customer?.phone),
    payment_amount: payment?.amount != null ? Number(payment.amount) : null,
    payment_status: normalizeAmeliaPaymentStatus(payment?.status),
    payment_gateway: pickString(payment?.gateway),
    payment_transaction_id: pickString(payment?.transactionId),
    amelia_payment_id: pickInt(payment?.id),
    is_changed_status: booking.isChangedStatus === true || booking.isChangedStatus === "true",
    service_name: pickString(payload?.appointment?.service?.name)
  };

  return { ok: true, data: normalized };
}

export function computeImportFingerprint(normalized) {
  return [
    normalized.amelia_booking_id,
    normalized.booking_start,
    normalized.booking_status,
    normalized.payment_status,
    normalized.payment_amount ?? "",
    normalized.persons
  ].join("|");
}

export function normalizeWebhookAction(rawAction) {
  if (!rawAction || typeof rawAction !== "string") return null;
  const folded = foldStatus(rawAction).replace(/[\s_-]+/g, "");
  const map = {
    bookingadded: INFERRED_ACTION.BOOKING_ADDED,
    bookingrescheduled: INFERRED_ACTION.BOOKING_RESCHEDULED,
    bookingcanceled: INFERRED_ACTION.BOOKING_CANCELED,
    bookingcancelled: INFERRED_ACTION.BOOKING_CANCELED,
    bookingstatuschanged: INFERRED_ACTION.BOOKING_STATUS_CHANGED
  };
  return map[folded] ?? null;
}

export function inferWebhookAction(normalized, existingReservation, declaredAction = null) {
  const fromDeclared = normalizeWebhookAction(declaredAction);
  if (fromDeclared) return fromDeclared;

  const terminal = [BOOKING_STATUS.CANCELED, BOOKING_STATUS.REJECTED];
  if (terminal.includes(normalized.booking_status)) {
    return normalized.booking_status === BOOKING_STATUS.CANCELED
      ? INFERRED_ACTION.BOOKING_CANCELED
      : INFERRED_ACTION.BOOKING_STATUS_CHANGED;
  }

  if (existingReservation?.booking_start && existingReservation.booking_start !== normalized.booking_start) {
    return INFERRED_ACTION.BOOKING_RESCHEDULED;
  }

  if (!existingReservation) {
    return INFERRED_ACTION.BOOKING_ADDED;
  }

  const fp = computeImportFingerprint(normalized);
  if (existingReservation.import_fingerprint === fp) {
    return INFERRED_ACTION.DUPLICATE_NO_OP;
  }

  if (normalized.is_changed_status) {
    return INFERRED_ACTION.BOOKING_STATUS_CHANGED;
  }

  return INFERRED_ACTION.BOOKING_STATUS_CHANGED;
}

export function filterAmeliaRequestHeaders(headers = {}) {
  const out = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    const k = key.toLowerCase();
    if (k.startsWith("x-amelia") || k === "content-type") {
      out[k] = Array.isArray(value) ? value[0] : value;
    }
  });
  return out;
}
