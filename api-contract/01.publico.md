# 01 — API pública (frontend de clientes)

> Sin autenticación. Este es el flujo que sigue la app del cliente para descubrir, reservar y pagar.

## Flujo recomendado (de extremo a extremo)

1. **Descubrir**: `GET /public/restaurants/:restaurantSlug` y `GET /public/restaurants/:restaurantSlug/branches` → construir selector de sucursal (solo sucursales `active` con sus reglas y horarios).
2. **Menú**: `GET .../branches/:branchSlug/menu` → mostrar platos `available`/`sold_out`.
3. **Disponibilidad**: `GET .../reservations/availability?date=&partySize=` → horarios libres.
4. **Reservar**: `POST .../reservations/temporary` con `Idempotency-Key` → obtiene la reserva `pending_payment` y el `checkoutToken`.
5. **Pagar**: `POST .../reservations/:reservationId/checkout` (Bearer = `checkoutToken`) → redirige al usuario a `checkoutUrl` de Stripe.
6. **Regreso y confirmación**: tras el redirect (success/cancel), consulta `GET .../reservations/:reservationId/payment` **en polling** hasta que `reservationStatus` sea `confirmed` (o `payment.status` deje de ser `pending`). No existe un endpoint de confirmación manual: la confirma el webhook de Stripe de forma asíncrona.

Contenido:

- [GET /public/restaurants/:restaurantSlug](#get-publicrestaurantsrestaurantslug)
- [GET /public/restaurants/:restaurantSlug/branches](#get-publicrestaurantsrestaurantslugbranches)
- [GET /public/restaurants/:restaurantSlug/branches/:branchSlug/menu](#get-publicrestaurantsrestaurantslugbranchesbranchslugmenu)
- [GET .../reservations/availability](#get-reservationsavailability)
- [POST .../reservations/temporary](#post-reservationstemporary)
- [POST .../reservations/:reservationId/checkout](#post-reservationsreservationidcheckout)
- [GET .../reservations/:reservationId/payment](#get-reservationsreservationidpayment)
- [POST /webhooks/stripe](#post-webhooksstripe)
- [Gotchas de pago y expiración](#gotchas-de-pago-y-expiracion)

---

## GET /public/restaurants/:restaurantSlug

Devuelve únicamente la información pública del restaurante.

**Response 200:**
```json
{
  "slug": "central",
  "name": "Central",
  "phone": "999888777",
  "email": "contacto@central.pe",
  "timezone": "America/Lima"
}
```

No expone `legalName`, `taxId`, UUID ni timestamps.

**Errores:** `404 RESTAURANT_NOT_FOUND`

---

## GET /public/restaurants/:restaurantSlug/branches

Lista las sucursales `active` del restaurante, ordenadas por `name ASC, slug ASC`. Un restaurante sin sucursales activas devuelve `200 []`.

**Response 200:**
```json
[
  {
    "restaurantSlug": "central",
    "branchSlug": "miraflores",
    "name": "Sucursal Miraflores",
    "address": "Av. Larco 123",
    "district": "Miraflores",
    "province": "Lima",
    "department": "Lima",
    "phone": "999111222",
    "email": "miraflores@central.pe",
    "rules": {
      "defaultReservationDurationMinutes": 60,
      "minimumAdvanceMinutes": 60,
      "maximumAdvanceDays": 30,
      "arrivalToleranceMinutes": 15,
      "maxPartySize": 8
    },
    "intervals": [
      { "dayOfWeek": 1, "startTime": "12:00", "endTime": "22:00" }
    ]
  }
]
```

- `dayOfWeek`: `1-7` (`1` = lunes).
- No expone UUID, `code`, `status` ni timestamps de sucursal.

**Errores:** `404 RESTAURANT_NOT_FOUND`

---

## GET /public/restaurants/:restaurantSlug/branches/:branchSlug/menu

Devuelve el menú publicable de una sucursal activa.

**Response 200** (sucursal activa sin platos publicables):
```json
{
  "restaurantSlug": "central",
  "branchSlug": "miraflores",
  "categories": []
}
```

**Response 200** (con platos):
```json
{
  "restaurantSlug": "central",
  "branchSlug": "miraflores",
  "categories": [
    {
      "id": "uuid",
      "name": "Fondos",
      "position": 2,
      "dishes": [
        {
          "id": "uuid",
          "name": "Lomo saltado",
          "description": "Lomo de res con papas y arroz",
          "imageUrl": "https://example.com/lomo.jpg",
          "ingredients": ["Lomo de res", "Papa", "Arroz"],
          "allergens": ["Soya"],
          "position": 1,
          "price": "35.90",
          "status": "available"
        }
      ]
    }
  ]
}
```

- Solo aparecen categorías activas, platos activos y configuraciones `available` o `sold_out`.
- Configuraciones `inactive` y platos sin configuración local se omiten.
- Categorías sin platos publicables se omiten.
- Platos `sold_out` aparecen marcados pero visibles (no bloquees el UI con ellos, pero puedes mostrarlos deshabilitados).
- Categorías y platos ordenados por `position ASC` y `name ASC`.
- `price` es string decimal con 2 posiciones.

**Errores:** `404 PUBLIC_MENU_NOT_FOUND` (restaurante o sucursal inexistente, no relacionados, o sucursal inactiva).

---

## GET .../reservations/availability

```
GET /public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/availability?date=YYYY-MM-DD&partySize=int
```

Consulta horarios disponibles de una sucursal.

**Response 200:**
```json
{
  "date": "2026-08-01",
  "timezone": "America/Lima",
  "durationMinutes": 60,
  "availableTimes": ["12:00", "12:15", "12:30"]
}
```

Reglas de negocio que el frontend debe conocer:

- Los `availableTimes` **ya vienen filtrados** por la ventana de anticipación (`minimumAdvanceMinutes` / `maximumAdvanceDays`), el horario de atención, los bloques de 15 minutos, la duración configurada y la existencia de al menos una mesa activa con capacidad suficiente. No calcules tú la ventana.
- Una fecha válida sin opciones devuelve `availableTimes: []`.
- `date` y `partySize` se interpretan en hora local de Lima.
- No expone mesas ni cantidades disponibles.

**Errores:**
- `400 VALIDATION_ERROR` (fecha malformada o inválida, `partySize` no positivo)
- `409 RESERVATION_TIME_UNAVAILABLE` si `partySize > maxPartySize` (avísale al usuario el máximo de la sucursal, que viene en `GET branches`)
- `404 PUBLIC_RESERVATION_NOT_FOUND` si la sucursal no existe, está inactiva o no tiene reglas

---

## POST .../reservations/temporary

```
POST /public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/temporary
```

Crea un bloqueo temporal de **15 minutos** y asigna automáticamente una mesa activa con la menor capacidad suficiente. La mesa no se expone en la respuesta.

**Header obligatorio:**
```text
Idempotency-Key: UUID   # debe ser un UUID válido
```

**Request:**
```json
{
  "date": "2026-08-01",
  "time": "13:30",
  "partySize": 4,
  "customer": {
    "fullName": "Ana Torres",
    "email": "ana@example.com",
    "phone": "+51987654321"
  },
  "items": [
    {
      "dishId": "uuid",
      "quantity": 2
    }
  ]
}
```

Validaciones y reglas:

- `time` usa únicamente minutos `00`, `15`, `30` o `45` (formato `HH:mm`).
- `date`/`time` en hora local de Lima.
- Se aplican anticipación mínima/máxima, horario de atención y `maxPartySize`.
- 1 a 50 platos distintos; cada cantidad entre 1 y 99; **un plato no puede repetirse**.
- Solo se aceptan platos activos con configuración `available` **y cuya categoría también esté activa**.
- `customer.phone` en formato E.164 (`+51987654321`).
- Los nombres y precios se congelan en la reserva. El total es la suma de subtotales en `PEN`.
- La reserva queda `pending_payment` y expira lógicamente 15 minutos después de su creación; las vencidas dejan de bloquear mesas sin tarea programada.
- Las solicitudes concurrentes se procesan con aislamiento `Serializable`. No se combinan mesas.

**Response 201** (nueva):
```json
{
  "id": "uuid",
  "branchSlug": "miraflores",
  "status": "pending_payment",
  "date": "2026-08-01",
  "startTime": "13:30",
  "endTime": "14:30",
  "timezone": "America/Lima",
  "durationMinutes": 60,
  "expiresAt": "ISO8601",
  "partySize": 4,
  "customer": {
    "fullName": "Ana Torres",
    "email": "ana@example.com",
    "phone": "+51987654321"
  },
  "items": [
    {
      "dishId": "uuid",
      "name": "Lomo saltado",
      "unitPrice": "35.90",
      "quantity": 2,
      "subtotal": "71.80"
    }
  ],
  "currency": "PEN",
  "total": "71.80",
  "checkoutToken": "base64url-opaque-token",
  "createdAt": "ISO8601"
}
```

**Idempotencia:** repetir la misma `Idempotency-Key` con el **mismo payload** devuelve `200` con la reserva original (mismo `checkoutToken`), incluso si ya venció — es la forma segura de reintentar un envío ante una falla de red. Reutilizar la clave con otro restaurante, sucursal o payload devuelve `409 IDEMPOTENCY_KEY_REUSED`. La clave se puede regenerar para un intento de reserva distinto (por ejemplo, si el usuario cambia fecha/hora).

**Errores:**
- `400 VALIDATION_ERROR`
- `404 PUBLIC_RESERVATION_NOT_FOUND`
- `409 RESERVATION_TIME_UNAVAILABLE`
- `409 DISH_NOT_AVAILABLE`
- `409 IDEMPOTENCY_KEY_REUSED`

---

## POST .../reservations/:reservationId/checkout

```
POST /public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/:reservationId/checkout
```

Crea o reutiliza una Stripe Checkout Session. Body vacío. El importe y moneda se derivan de la reserva (Stripe recibe el total en céntimos de `PEN` y los line items desde los snapshots congelados).

**Headers:** `Authorization: Bearer <checkoutToken>`

**Response 201** (nueva sesión):
```json
{
  "reservationId": "uuid",
  "paymentAttemptId": "uuid",
  "status": "pending",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "reservationExpiresAt": "ISO8601",
  "checkoutExpiresAt": "ISO8601 | null",
  "currency": "PEN",
  "total": "71.80"
}
```

- **Response 200** (sesión pendiente reutilizada): mismo formato. Si ya existe un intento `pending` con URL, se reutiliza.
- `checkoutExpiresAt` puede ser `null` si el proveedor no reporta expiración; trátalo como "desconocido", no como error.

**Errores:**
- `404 PUBLIC_PAYMENT_NOT_FOUND` (reserva no encontrada, token inválido o token ausente)
- `409 RESERVATION_EXPIRED`
- `409 RESERVATION_ALREADY_CONFIRMED`
- `503 PAYMENT_PROVIDER_UNAVAILABLE`

---

## GET .../reservations/:reservationId/payment

```
GET /public/restaurants/:restaurantSlug/branches/:branchSlug/reservations/:reservationId/payment
```

Consulta el estado de la reserva y su último intento de pago. No expone URL de checkout ni identificadores de Stripe.

**Headers:** `Authorization: Bearer <checkoutToken>`

**Response 200:**
```json
{
  "reservationId": "uuid",
  "reservationStatus": "pending_payment",
  "payment": {
    "id": "uuid",
    "provider": "stripe",
    "status": "pending",
    "amount": "71.80",
    "currency": "PEN",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "total": "71.80",
  "currency": "PEN",
  "expiresAt": "ISO8601",
  "confirmedAt": null
}
```

- `payment` es `null` si todavía no existe ningún intento.
- Este es el endpoint para **polling** tras el redirect de Stripe: el estado final llega por webhook.

**Errores:** `404 PUBLIC_PAYMENT_NOT_FOUND`

---

## POST /webhooks/stripe

Recibe eventos de Stripe. Autenticado por `Stripe-Signature`. Procesa idempotentemente (`event.id` único). Eventos no utilizados responden `200` sin cambios.

**Response 200:** `{ "received": true }`

**Errores:** `400 INVALID_STRIPE_SIGNATURE`. Errores recuperables responden con estado no exitoso → Stripe reintenta.

**Estados de PaymentAttempt:** `pending` → `paid` | `failed` | `expired` | `refund_pending` → `refunded` | `refund_failed`.

**Flujo de confirmación:**
1. `checkout.session.completed` → valida importe, moneda y vigencia.
2. Si es válido y oportuno → confirma atómicamente (reserva `confirmed`, intento `paid`).
3. Si es tardío, duplicado o inconsistente → reembolso automático (`refund_pending` → `refunded`).

**Verificación con Stripe CLI:**
```sh
stripe listen --forward-to localhost:3000/webhooks/stripe
stripe events resend <event-id>
```

---

## Gotchas de pago y expiración

- **Expiración de la reserva:** 15 minutos tras su creación. Pasada `expiresAt`, `/checkout` responde `409 RESERVATION_EXPIRED`. Deshabilita el botón de pago con un countdown basado en `expiresAt`.
- **`failed` / `expired` NO cancelan la reserva.** Si un intento de pago falla o expira, la reserva sigue `pending_payment` y se puede volver a llamar a `/checkout`: se creará un intento nuevo. No obligues al cliente a reservar de nuevo.
- **Confirmación asíncrona:** no hay endpoint de confirmación. Tras regresar de Stripe (URL de éxito/cancel configuradas en el backend), haz polling a `GET .../payment` con un intervalo (ej. 2s) hasta que `reservationStatus` sea `confirmed` o `payment.status` sea `paid`/`failed`. Detén el polling al alcanzar `expiresAt`.
- **`confirmedAt`** pasa de `null` a ISO8601 cuando la reserva se confirma.
- Si el cliente cancela en Stripe, el intento quedará `expired` por webhook; el polling terminará con `payment.status: "expired"` y podrás ofrecer reintentar.
