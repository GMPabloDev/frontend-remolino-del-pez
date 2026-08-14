# 01 — API pública y autenticación de clientes (frontend de clientes)

> El descubrimiento, la reserva y el pago son públicos. El acceso a la cuenta usa customer-auth y no comparte sesiones con trabajadores.

## Flujo recomendado (de extremo a extremo)

1. **Descubrir**: `GET /public/restaurants/:restaurantSlug` y `GET /public/restaurants/:restaurantSlug/branches` → construir selector de sucursal (solo sucursales `active` con sus reglas y horarios).
2. **Menú**: `GET .../branches/:branchSlug/menu` → mostrar platos `available`/`sold_out`.
3. **Disponibilidad**: `GET .../reservations/availability?date=&partySize=` → horarios libres.
4. **Reservar**: `POST .../reservations/temporary` con `Idempotency-Key` → obtiene la reserva `pending_payment` y el `checkoutToken`.
5. **Pagar**: `POST .../reservations/:reservationId/checkout` (Bearer = `checkoutToken`) → redirige al usuario a `checkoutUrl` de Stripe.
6. **Regreso y confirmación**: tras el redirect (success/cancel), consulta `GET .../reservations/:reservationId/payment` **en polling** hasta que `reservationStatus` sea `confirmed` (o `payment.status` deje de ser `pending`). No existe un endpoint de confirmación manual: la confirma el webhook de Stripe de forma asíncrona.
7. **Correo postpago**: cuando el webhook confirma el pago, el backend crea o reutiliza la cuenta y envía un correo combinado de agradecimiento, resumen, comprobante PDF adjunto y acceso.
8. **Acceso**: el cliente intercambia el magic link por tokens, o solicita otro enlace desde el endpoint manual.
9. **Historial**: el cliente autenticado consulta `GET /customer/reservations` y solicita la descarga desde `GET /customer/reservations/:reservationId/receipt/download`.

Contenido:

- [GET / (health)](#get--health)
- [GET /public/restaurants/:restaurantSlug](#get-publicrestaurantsrestaurantslug)
- [GET /public/restaurants/:restaurantSlug/branches](#get-publicrestaurantsrestaurantslugbranches)
- [GET /public/restaurants/:restaurantSlug/branches/:branchSlug/menu](#get-publicrestaurantsrestaurantslugbranchesbranchslugmenu)
- [GET .../reservations/availability](#get-reservationsavailability)
- [POST .../reservations/temporary](#post-reservationstemporary)
- [POST .../reservations/:reservationId/checkout](#post-reservationsreservationidcheckout)
- [GET .../reservations/:reservationId/payment](#get-reservationsreservationidpayment)
- [POST /public/restaurants/:restaurantSlug/customer-auth/magic-links](#post-publicrestaurantsrestaurantslugcustomer-authmagic-links)
- [POST /public/customer-auth/magic-links/exchange](#post-publiccustomer-authmagic-linksexchange)
- [POST /customer-auth/refresh](#post-customer-authrefresh)
- [POST /customer-auth/logout](#post-customer-authlogout)
- [GET /customer-auth/me](#get-customer-authme)
- [GET /customer/reservations](#get-customerreservations)
- [GET /customer/reservations/:reservationId/receipt/download](#get-customerreservationsreservationidreceiptdownload)
- [POST /webhooks/stripe](#post-webhooksstripe)
- [Gotchas de pago y expiración](#gotchas-de-pago-y-expiracion)

---

## GET / (health)

Verifica que el servidor esté levantado. Sin autenticación.

**Response 200:** texto plano `Hello Hono!` (no es JSON).

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

- `phone` y `email` pueden venir `null` si el restaurante no los tiene configurados. Trátalos como opcionales en el UI.

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
- `email` puede venir `null` si la sucursal no tiene uno configurado.

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
  "billingDocument": {
    "type": "BOLETA",
    "documentNumber": "12345678"
  },
  "items": [
    {
      "dishId": "uuid",
      "quantity": 2
    }
  ]
}
```

Para solicitar factura, reemplaza `billingDocument` por:

```json
{
  "type": "FACTURA",
  "ruc": "20123456789",
  "businessName": "Empresa Demo S.A.C.",
  "fiscalAddress": "Av. Principal 123, Lima"
}
```

Validaciones y reglas:

- `time` usa únicamente minutos `00`, `15`, `30` o `45` (formato `HH:mm`).
- `date`/`time` en hora local de Lima.
- Se aplican anticipación mínima/máxima, horario de atención y `maxPartySize`.
- 1 a 50 platos distintos; cada cantidad entre 1 y 99; **un plato no puede repetirse**.
- Solo se aceptan platos activos con configuración `available` **y cuya categoría también esté activa**.
- `customer.phone` en formato E.164 (`+51987654321`).
- `billingDocument` es obligatorio y usa una unión discriminada:
  - `BOLETA`: `documentNumber` es un DNI de exactamente 8 dígitos.
  - `FACTURA`: `ruc` debe tener exactamente 11 dígitos, además de `businessName` y `fiscalAddress`.
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
  "billingDocument": {
    "type": "BOLETA",
    "documentNumber": "12345678"
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

- `checkoutToken` viene siempre presente en las respuestas 200 y 201. Es opaco: no intentes parsearlo ni derivar información de él; úsalo solo como Bearer en checkout/estado de pago.

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
- `404 PUBLIC_PAYMENT_NOT_FOUND` (reserva no encontrada, token inválido, token ausente o checkout token confirmado con más de 24 horas)
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

## POST /public/restaurants/:restaurantSlug/customer-auth/magic-links

Solicita un nuevo enlace de acceso para una cuenta existente del restaurante. No requiere autenticación.

**Request:**
```json
{
  "email": "ana@example.com"
}
```

**Response 202:**
```json
{
  "message": "Si existe una cuenta elegible, enviaremos un enlace de acceso."
}
```

La misma respuesta se devuelve si el restaurante, correo o cuenta no existen, o si la solicitud está dentro del cooldown de un minuto. Una solicitud aceptada invalida los magic links anteriores no consumidos. Los correos automáticos enviados tras pagos confirmados no están sujetos a este cooldown.

**Errores:** `400 VALIDATION_ERROR` si el slug o email tienen formato inválido.

---

## POST /public/customer-auth/magic-links/exchange

Intercambia un magic link válido de un solo uso por una sesión de cliente. El frontend debe retirar el token de la URL con `history.replaceState` inmediatamente después del intercambio.

**Request:**
```json
{
  "token": "opaque-base64url-token"
}
```

**Response 200:**
```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "customer": {
    "fullName": "Ana Pérez",
    "email": "ana@example.com",
    "phone": "+51987654321",
    "restaurantSlug": "central"
  }
}
```

El magic link vence en 15 minutos y solo puede consumirse una vez. El access token dura 25 minutos y el refresh token 30 días.

**Errores:** `400 VALIDATION_ERROR`, `401 INVALID_MAGIC_LINK`.

---

## POST /customer-auth/refresh

Rota el refresh token del cliente. El token usado queda invalidado inmediatamente.

**Request:**
```json
{
  "refreshToken": "opaque-token"
}
```

**Response 200:** mismo formato que el intercambio del magic link, con un nuevo par de tokens.

Si se reutiliza un refresh token reemplazado, se revocan todas las sesiones activas del cliente.

**Errores:** `400 VALIDATION_ERROR`, `401 INVALID_CUSTOMER_REFRESH_TOKEN`.

---

## POST /customer-auth/logout

Revoca únicamente la sesión asociada al refresh token. Es idempotente.

**Response 204:** sin contenido.

---

## GET /customer-auth/me

Devuelve el perfil mínimo del cliente autenticado. Requiere `Authorization: Bearer <customerAccessToken>`.

**Response 200:**
```json
{
  "fullName": "Ana Pérez",
  "email": "ana@example.com",
  "phone": "+51987654321",
  "restaurantSlug": "central"
}
```

---

## GET /customer/reservations

Devuelve todas las reservas confirmadas del cliente autenticado, ordenadas de la más reciente a la más antigua.

**Headers:** `Authorization: Bearer <customerAccessToken>`

**Response 200:**
```json
[
  {
    "id": "uuid",
    "status": "confirmed",
    "branch": {
      "slug": "miraflores",
      "name": "Sucursal Miraflores",
      "address": "Av. Ejemplo 123",
      "district": "Miraflores",
      "province": "Lima",
      "department": "Lima"
    },
    "startAt": "ISO8601",
    "endAt": "ISO8601",
    "timezone": "America/Lima",
    "partySize": 4,
    "items": [],
    "currency": "PEN",
    "total": "71.80",
    "confirmedAt": "ISO8601",
    "receipt": {
      "type": "BOLETA",
      "number": "B001-000001",
      "status": "available",
      "generatedAt": "ISO8601"
    }
  }
]
```

- Devuelve `200 []` si no hay reservas.
- La reserva puede devolver `receipt: null` mientras no tenga comprobante.
- `receipt.type` identifica si es `BOLETA` o `FACTURA`.
- La numeración usa `B001-XXXXXX` para boletas y `F001-XXXXXX` para facturas.
- No expone mesa, IDs Stripe, tokens ni metadata de Cloudinary.

**Errores:** `401 CUSTOMER_AUTH_REQUIRED`.

---

## GET /customer/reservations/:reservationId/receipt/download

Genera una URL firmada y temporal para descargar el comprobante del cliente autenticado.

**Headers:** `Authorization: Bearer <customerAccessToken>`

**Response 200:**
```json
{
  "fileName": "boleta-B001-000001.pdf",
  "downloadUrl": "https://res.cloudinary.com/...",
  "expiresAt": "ISO8601"
}
```

La URL dura cinco minutos, no se persiste y la respuesta usa `Cache-Control: no-store`. El nombre del archivo será `boleta-B001-XXXXXX.pdf` o `factura-F001-XXXXXX.pdf`, según el tipo de documento.

**Errores:**

- `401 CUSTOMER_AUTH_REQUIRED`
- `404 CUSTOMER_RESERVATION_NOT_FOUND` si no pertenece al cliente o no tiene comprobante.
- `409 PAYMENT_RECEIPT_NOT_READY` si el comprobante está pendiente o falló.
- `503 DOCUMENT_STORAGE_UNAVAILABLE` si Cloudinary no puede firmar la descarga.

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
- **Token postpago:** una reserva confirmada acepta su `checkoutToken` hasta antes de `confirmedAt + 24 horas`. Después, checkout y estado de pago responden `404 PUBLIC_PAYMENT_NOT_FOUND`; usa customer-auth.
- **Correo postpago:** el webhook crea o vincula la cuenta y envía un correo HTML/texto con agradecimiento, resumen, comprobante PDF adjunto y magic link. Un fallo SMTP no revierte el pago ni la reserva.
- **Comprobante:** el PDF se almacena en Cloudinary como recurso restringido. El cliente autenticado obtiene una URL firmada temporal desde su historial.
- **`confirmedAt`** pasa de `null` a ISO8601 cuando la reserva se confirma.
- Si el cliente cancela en Stripe, el intento quedará `expired` por webhook; el polling terminará con `payment.status: "expired"` y podrás ofrecer reintentar.
