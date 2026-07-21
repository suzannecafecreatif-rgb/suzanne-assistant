/**
 * Tests unitaires — webhook Amelia R-B
 * Exécution : node scripts/test-webhook-amelia.mjs
 */
import {
  extractWebhookMeta,
  handleAmeliaWebhookRequest,
  isAuthorizedToken
} from "../lib/ameliaWebhook.js";

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

const SECRET = "test-secret-rb";

console.log("=== Scénario 1 — Autorisation token ===");
assert(isAuthorizedToken("test-secret-rb", SECRET), "Token valide");
assert(!isAuthorizedToken("wrong", SECRET), "Token invalide");
assert(!isAuthorizedToken(undefined, SECRET), "Token absent");
assert(!isAuthorizedToken("x", ""), "Secret absent");

console.log("\n=== Scénario 2 — Métadonnées légères (sans logique métier) ===");
const meta = extractWebhookMeta(
  { type: "appointment", action: "bookingAdded", booking: { id: 1 } },
  { "x-amelia-webhook-type": "appointment" }
);
assert(meta.event_type === "appointment", "event_type depuis header/body");
assert(meta.event_action === "bookingAdded", "event_action depuis body");

console.log("\n=== Scénario 3 — Handler HTTP (sans Supabase) ===");
const prevSecret = process.env.AMELIA_WEBHOOK_SECRET;
process.env.AMELIA_WEBHOOK_SECRET = SECRET;

const getResult = await handleAmeliaWebhookRequest({ method: "GET", query: {} });
assert(getResult.status === 405, "GET → 405");

const noToken = await handleAmeliaWebhookRequest({ method: "POST", query: {}, body: {} });
assert(noToken.status === 401, "POST sans token → 401");
assert(noToken.body.error === "Unauthorized", "Message Unauthorized");

const badToken = await handleAmeliaWebhookRequest({
  method: "POST",
  query: { token: "bad" },
  body: { hello: "amelia" }
});
assert(badToken.status === 401, "POST mauvais token → 401");

const invalidBody = await handleAmeliaWebhookRequest({
  method: "POST",
  query: { token: SECRET },
  body: "not-json-object"
});
assert(invalidBody.status === 400, "POST body invalide → 400");

const goodTokenNoDb = await handleAmeliaWebhookRequest({
  method: "POST",
  query: { token: SECRET },
  body: { type: "appointment", action: "bookingAdded", sample: true }
});
assert(
  goodTokenNoDb.status === 500 || goodTokenNoDb.status === 200,
  "POST bon token → 200 (si Supabase configuré) ou 500 (sinon)"
);

if (prevSecret === undefined) delete process.env.AMELIA_WEBHOOK_SECRET;
else process.env.AMELIA_WEBHOOK_SECRET = prevSecret;

console.log(`\n=== Résultat : ${passed} ok, ${failed} échec(s) ===`);
process.exit(failed > 0 ? 1 : 0);
