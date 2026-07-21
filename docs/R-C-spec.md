# R-C — Spécification finale (import Amelia → reservations)

Version validée après analyse R-A et prise en compte des **4 remarques** de pré-requis.

---

## Remarques validées

| # | Remarque | Décision retenue |
|---|----------|------------------|
| **1** | Migration R-A : tables `reservations` + `session_amelia_links` | **Validée.** Ajoutées dans `supabase/schema.sql` (section R-A/R-C). RLS activée, accès écriture via `service_role` uniquement (comme `amelia_webhook_events`). |
| **2** | Enrichissement R-B : persister headers Amelia | **Validée.** Colonne `request_headers jsonb` sur `amelia_webhook_events` ; sous-ensemble filtré `x-amelia-*` + `content-type`. Priorité `event_type` / `event_action` : headers → body → heuristique. |
| **3** | Timezone `booking_start` | **Validée.** Variable `AMELIA_TIMEZONE` (défaut `Europe/Paris`). Les datetime Amelia `YYYY-MM-DD HH:mm:ss` sont interprétées comme heure **murale** dans ce fuseau, puis stockées en `timestamptz`. Matching `session_amelia_links.booking_start` sur la même normalisation. |
| **4** | `SUZANNE_DEFAULT_USER_ID` | **Validée.** Variable Vercel obligatoire pour R-C. Mono-utilisateur : toutes les lignes `reservations` et la résolution `session_amelia_links` utilisent cet UUID (référence `auth.users`). |

---

## Périmètre R-C

| Inclus | Exclus (R-D+) |
|--------|----------------|
| Normalisation payload (mapping R-A) | Recalcul `ateliers.participants` |
| Inférence action (headers + heuristique) | Statuts session Complet / Réservations ouvertes |
| Upsert `reservations` | UI participantes |
| Résolution `session_id` via `session_amelia_links` | `computeRevenuSuzanne` |
| Idempotence / anti-doublons | Création auto de liens Amelia |

**Finances :** R-C ne met à jour que `payment_*` informatifs. Le CA reste `computeRevenuSuzanne(session)`.

---

## Clé d'identité réservation

```
unique (user_id, amelia_booking_id)
```

- `amelia_booking_id` ← `payload.bookings["0"].id`
- **Jamais** de matching par nom de service.

## Clé de liaison session

```
session_amelia_links WHERE amelia_entity_type = 'appointment'
  AND amelia_service_id = payload.appointment.serviceId
  AND booking_start = normalize(payload.appointment.bookingStart)
```

---

## Algorithme (résumé)

1. Webhook R-B insère `amelia_webhook_events` (`processed=false`, headers persistés).
2. R-C normalise le payload → objet intermédiaire.
3. Infère `event_action` (headers d'abord, sinon heuristique R-A).
4. Cherche `reservations` par `(user_id, amelia_booking_id)`.
5. Résout `session_id` via `session_amelia_links` (re-fait si reschedule).
6. **CREATE** si absent, **UPDATE** si présent ; **jamais DELETE** (annulation → `booking_status=canceled`, `canceled_at`).
7. Empreinte `import_fingerprint` : anti-doublon same-state → no-op.
8. Marque `amelia_webhook_events.processed=true` (+ `processing_error` si besoin).
9. HTTP **200** Amelia dès journalisation (même orphelin ou erreur métier).

### Mapping statuts booking

| Amelia (`appointment.bookings["0"].status`) | Suzanne `booking_status` |
|---------------------------------------------|--------------------------|
| approved | active |
| pending | pending |
| canceled | canceled |
| rejected | rejected |
| no-show | no_show |

Priorité statut : `appointment.bookings["0"].status`, puis `appointment.status` si conflit avec `bookings["0"]`.

### Inférence action (si headers absents)

| Ordre | Condition | Action |
|-------|-----------|--------|
| 1 | Statut → canceled/rejected | bookingCanceled / bookingStatusChanged |
| 2 | `booking_start` ≠ stocké | bookingRescheduled |
| 3 | `isChangedStatus` + existe | bookingStatusChanged |
| 4 | N'existe pas | bookingAdded |
| 5 | Fingerprint identique | duplicateNoOp |
| 6 | Sinon | bookingStatusChanged |

---

## Tables modifiées par R-C

| Étape | Tables |
|-------|--------|
| Réception R-B | `amelia_webhook_events` INSERT |
| Enrichissement headers | `amelia_webhook_events` (déjà à l'INSERT) |
| Import R-C | `reservations` INSERT/UPDATE ; `amelia_webhook_events` UPDATE |
| Lecture seule | `session_amelia_links` |

**Non modifiées en R-C :** `ateliers`, `session_amelia_links` (écriture), `catalogue_ateliers`.
