/**
 * Tests unitaires — normalisation & import Amelia R-C
 * Exécution : node scripts/test-amelia-import.mjs
 */
import {
  BOOKING_STATUS,
  INFERRED_ACTION,
  computeImportFingerprint,
  inferWebhookAction,
  normalizeAmeliaAppointmentPayload,
  normalizeWebhookAction,
  parseAmeliaLocalDateTime,
  resolveBookingStatusRaw
} from "../lib/ameliaNormalize.js";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

/** Payload réel simplifié — booking #8 (booking added, 2026-07-30 16:30) */
const PAYLOAD_BOOKING_8 = {
  bookings: {
    "0": {
      id: 8,
      price: 79,
      status: "approved",
      created: "2026-07-21 18:04:54",
      persons: 1,
      isChangedStatus: true,
      customerId: 13,
      customer: {
        id: 13,
        firstName: "test",
        lastName: "test",
        email: "contactaquantin@aol.com",
        phone: null
      },
      payments: {
        "0": {
          id: 8,
          amount: 0,
          status: "pending",
          gateway: "onSite",
          transactionId: null
        }
      },
      appointmentId: 4
    }
  },
  appointment: {
    id: 4,
    type: "appointment",
    status: "approved",
    serviceId: 12,
    bookingStart: "2026-07-30 16:30:00",
    bookingEnd: "2026-07-30 19:30:00",
    service: { id: 12, name: "Tufting", price: 95 },
    bookings: {
      "0": {
        id: 8,
        status: "approved",
        persons: 1,
        customer: { firstName: "test", lastName: "test", email: "contactaquantin@aol.com" }
      }
    }
  }
};

/** Payload réel simplifié — booking #7 (status conflict → rejected) */
const PAYLOAD_BOOKING_7 = {
  bookings: {
    "0": {
      id: 7,
      price: 79,
      status: "approved",
      created: "2026-07-21 17:58:02",
      persons: 1,
      isChangedStatus: true,
      customer: {
        firstName: "test",
        lastName: "test",
        email: "contactaquantin@aol.com"
      },
      payments: {
        "0": { id: 7, amount: 0, status: "pending", gateway: "onSite", transactionId: null }
      }
    }
  },
  appointment: {
    id: 3,
    type: "appointment",
    status: "rejected",
    serviceId: 12,
    bookingStart: "2026-07-29 14:00:00",
    bookingEnd: "2026-07-29 17:00:00",
    service: { id: 12, name: "Tufting" },
    bookings: {
      "0": {
        id: 7,
        status: "rejected",
        persons: 1
      }
    }
  }
};

console.log("=== Scénario 1 — Timezone Europe/Paris ===");
const parsed = parseAmeliaLocalDateTime("2026-07-30 16:30:00", "Europe/Paris");
assert(parsed === "2026-07-30T14:30:00.000Z", "16:30 Paris été → 14:30 UTC");

console.log("\n=== Scénario 2 — Normalisation booking #8 ===");
const n8 = normalizeAmeliaAppointmentPayload(PAYLOAD_BOOKING_8);
assert(n8.ok, "payload #8 valide");
assert(n8.data.amelia_booking_id === 8, "booking_id = 8");
assert(n8.data.amelia_service_id === 12, "service_id = 12");
assert(n8.data.booking_start === "2026-07-30T14:30:00.000Z", "booking_start normalisé");
assert(n8.data.booking_status === BOOKING_STATUS.ACTIVE, "statut active");

console.log("\n=== Scénario 3 — Conflit statuts booking #7 ===");
assert(resolveBookingStatusRaw(PAYLOAD_BOOKING_7) === "rejected", "priorité appointment.bookings status");
const n7 = normalizeAmeliaAppointmentPayload(PAYLOAD_BOOKING_7);
assert(n7.data.booking_status === BOOKING_STATUS.REJECTED, "statut rejected normalisé");

console.log("\n=== Scénario 4 — Inférence action ===");
assert(
  inferWebhookAction(n8.data, null, normalizeWebhookAction("bookingAdded")) === INFERRED_ACTION.BOOKING_ADDED,
  "header/body bookingAdded"
);
assert(
  inferWebhookAction(n7.data, { booking_start: n7.data.booking_start, import_fingerprint: "x" }, null) ===
    INFERRED_ACTION.BOOKING_STATUS_CHANGED,
  "rejected sans existant → status changed"
);

const fp8 = computeImportFingerprint(n8.data);
assert(
  inferWebhookAction(n8.data, { booking_start: n8.data.booking_start, import_fingerprint: fp8 }, null) ===
    INFERRED_ACTION.DUPLICATE_NO_OP,
  "fingerprint identique → duplicateNoOp"
);

assert(
  inferWebhookAction(
    { ...n8.data, booking_start: "2026-07-31T14:30:00.000Z" },
    { booking_start: n8.data.booking_start, import_fingerprint: fp8 },
    null
  ) === INFERRED_ACTION.BOOKING_RESCHEDULED,
  "booking_start différent → rescheduled"
);

console.log("\n=== Scénario 5 — Mapping actions Amelia ===");
assert(normalizeWebhookAction("booking_status_changed") === INFERRED_ACTION.BOOKING_STATUS_CHANGED, "snake case");
assert(normalizeWebhookAction("Booking Added") === INFERRED_ACTION.BOOKING_ADDED, "espaces");

console.log(`\n=== Résultat : ${passed} ok, ${failed} échec(s) ===`);
process.exit(failed > 0 ? 1 : 0);
