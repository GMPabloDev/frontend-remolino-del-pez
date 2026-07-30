# API Contract — Reservas de Restaurante

> Documento vivo. Refleja el estado actual del backend. Copiar manualmente al proyecto frontend.

## Errores (todas las rutas)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [{ "field": "name", "code": "too_small", "message": "..." }]
  }
}
```

| HTTP | code | Significado |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 401 | `UNAUTHORIZED` | Token requerido, inválido o expirado |
| 401 | `INVALID_CREDENTIALS` | Email o contraseña incorrectos |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token inválido o expirado |
| 403 | `FORBIDDEN` | Sin permisos |
| 404 | `RESTAURANT_NOT_FOUND` | Restaurante no existe |
| 404 | `BRANCH_NOT_FOUND` | Sucursal no existe |
| 404 | `USER_NOT_FOUND` | Usuario no existe |
| 404 | `TABLE_NOT_FOUND` | Mesa no existe |
| 404 | `MENU_CATEGORY_NOT_FOUND` | Categoría no existe |
| 404 | `DISH_NOT_FOUND` | Plato no existe |
| 404 | `PUBLIC_MENU_NOT_FOUND` | Menú público no disponible |
| 404 | `PUBLIC_RESERVATION_NOT_FOUND` | Restaurante o sucursal no disponible para reservas |
| 404 | `PUBLIC_PAYMENT_NOT_FOUND` | Reserva no encontrada o token de checkout inválido |
| 400 | `INVALID_STRIPE_SIGNATURE` | Firma de webhook Stripe inválida |
| 409 | `RESTAURANT_ALREADY_EXISTS` | Ya existe un restaurante |
| 409 | `BRANCH_CODE_ALREADY_EXISTS` | Código de sucursal duplicado |
| 409 | `BRANCH_SCHEDULE_CONFLICT` | Horarios solapados |
| 409 | `TABLE_CODE_ALREADY_EXISTS` | Código de mesa duplicado |
| 409 | `MENU_CATEGORY_NAME_ALREADY_EXISTS` | Nombre de categoría duplicado |
| 409 | `DISH_NAME_ALREADY_EXISTS` | Nombre de plato duplicado |
| 409 | `RESERVATION_TIME_UNAVAILABLE` | Horario o mesa no disponible |
| 409 | `DISH_NOT_AVAILABLE` | Plato no disponible en la sucursal |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Clave reutilizada con otra solicitud |
| 409 | `RESERVATION_EXPIRED` | La reserva venció y no admite pagos |
| 409 | `RESERVATION_ALREADY_CONFIRMED` | La reserva ya fue confirmada |
| 409 | `PAYMENT_STATE_CONFLICT` | Conflicto de estado en el pago |
| 503 | `PAYMENT_PROVIDER_UNAVAILABLE` | Proveedor de pagos no disponible |
| 409 | `USER_EMAIL_ALREADY_EXISTS` | Email ya registrado |
| 422 | `BRANCH_SCHEDULE_REQUIRED` | Activar sin horarios |
| 422 | `LAST_ADMIN_REQUIRED` | Último admin activo |
| 422 | `INVALID_ROLE_BRANCH` | Rol-sucursal incompatible |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno |

---

## Auth

### POST /auth/login

**Request:**
```json
{ "email": "string", "password": "string" }
```

**Response 200:**
```json
{
  "accessToken": "string (JWT, 25 min)",
  "refreshToken": "string (opaco, 30 días)",
  "user": { "id": "uuid", "fullName": "string", "email": "string", "phone": "string | null", "role": "ADMIN|MANAGER|BRANCH_ADMIN", "status": "ACTIVE|INACTIVE", "branchId": "uuid | null", "createdAt": "ISO8601", "updatedAt": "ISO8601" }
}
```

**Errores:** `401 INVALID_CREDENTIALS` (mismo mensaje si email no existe, contraseña incorrecta o usuario inactivo).

---

### POST /auth/refresh

Rota el refresh token. El anterior se invalida. Reutilización de un token rotado → revoca todas las sesiones del usuario.

**Request:**
```json
{ "refreshToken": "string" }
```

**Response 200:** mismo formato que login.

**Errores:** `401 INVALID_REFRESH_TOKEN`

---

### POST /auth/logout

Revoca la sesión del refresh token. Idempotente.

**Request:**
```json
{ "refreshToken": "string" }
```

**Response 204:** sin contenido.

---

### PATCH /auth/password

Requiere `Authorization: Bearer <accessToken>`. Revoca todas las sesiones.

**Request:**
```json
{ "currentPassword": "string", "newPassword": "string (10-128, mayúscula, minúscula, número)" }
```

**Response 204:** sin contenido.

**Errores:** `401 INVALID_CREDENTIALS`

---

## Usuarios (requiere `Authorization: Bearer <accessToken>`, rol `ADMIN`)

### POST /users

**Request:**
```json
{
  "fullName": "string (1-150)",
  "email": "string (email, único)",
  "phone?": "string",
  "password": "string (10-128, mayúscula, minúscula, número)",
  "role": "admin | manager | branch_admin",
  "branchId?": "uuid (requerido si role=branch_admin, prohibido si admin o manager)"
}
```

**Response 201:** perfil del usuario (sin `passwordHash`).

---

### GET /users

**Query:** `?role=admin|manager|branch_admin&status=active|inactive&branchId=uuid` (todos opcionales, combinables).

**Response 200:** `User[]` (sin `passwordHash`). Sin paginación.

---

### GET /users/:userId

**Response 200:** `User` (sin `passwordHash`).

---

### PATCH /users/:userId

**Request:** todos los campos opcionales (mismo formato que POST).

**Errores:** `422 LAST_ADMIN_REQUIRED` si se degrada o desactiva al último admin activo.

---

### PATCH /users/:userId/status

**Request:**
```json
{ "status": "active | inactive" }
```

- `inactive` → revoca todas las sesiones.
- No se puede desactivar al último `ADMIN` activo.

---

### PUT /users/:userId/password

Restablece la contraseña de otro usuario. Revoca todas sus sesiones.

**Request:**
```json
{ "password": "string (10-128, mayúscula, minúscula, número)" }
```

---

## Restaurante (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants` | `admin` |
| `GET` | `/restaurants/:restaurantId` | Todos |
| `PATCH` | `/restaurants/:restaurantId` | `admin` |

### POST /restaurants

Crea el restaurante (singleton).

**Request:**
```json
{
  "name": "string",
  "legalName": "string",
  "taxId": "string (11 dígitos)",
  "phone?": "string",
  "email?": "string"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "name": "string",
  "legalName": "string",
  "taxId": "string",
  "phone": "string | null",
  "email": "string | null",
  "timezone": "America/Lima",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### GET /restaurants/:restaurantId

**Response 200:** igual que `POST 201`.

### PATCH /restaurants/:restaurantId

**Request:** todos los campos opcionales (mismo formato que POST).

---

## Sucursales (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/branches` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/branches` | Todos (filtrado) |
| `GET` | `/restaurants/:rid/branches/:bid` | Todos (restringido) |
| `PATCH` | `/restaurants/:rid/branches/:bid` | `admin`, `manager`, `branch_admin`* |
| `PUT` | `/restaurants/:rid/branches/:bid/schedule` | `admin`, `manager`, `branch_admin`* |
| `PATCH` | `/restaurants/:rid/branches/:bid/status` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre su sucursal; otra → `403 FORBIDDEN`.

### POST /restaurants/:restaurantId/branches

**Request:**
```json
{
  "name": "string",
  "code": "string (normalizado a mayúsculas)",
  "address": "string",
  "district": "string",
  "province": "string",
  "department": "string",
  "phone": "string",
  "email?": "string",
  "rules": {
    "defaultReservationDurationMinutes": "int > 0",
    "minimumAdvanceMinutes": "int > 0",
    "maximumAdvanceDays": "int > 0",
    "arrivalToleranceMinutes": "int > 0",
    "maxPartySize": "int > 0"
  }
}
```

**Constraint:** `minimumAdvanceMinutes < maximumAdvanceDays * 24 * 60`.

**Response 201:**
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "name": "string",
  "code": "MAYÚSCULAS",
  "address": "string",
  "district": "string",
  "province": "string",
  "department": "string",
  "phone": "string",
  "email": "string | null",
  "status": "INACTIVE",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "rules": { /* BranchRules */ },
  "intervals": []
}
```

### GET /restaurants/:restaurantId/branches

**Query:** `?status=active|inactive` (opcional).

- `admin` y `manager`: todas las sucursales.
- `branch_admin`: solo su sucursal asignada.

**Response 200:** `Branch[]` (cada una con `rules` e `intervals`).

### GET /restaurants/:restaurantId/branches/:branchId

**Response 200:** `Branch` con `rules` e `intervals`.

### PATCH /restaurants/:restaurantId/branches/:branchId

**Request:** todos los campos opcionales (`rules` también parcial).

### PUT /restaurants/:restaurantId/branches/:branchId/schedule

Reemplaza todos los intervalos atómicamente.

**Request:**
```json
{
  "intervals": [
    { "dayOfWeek": "1-7 (1=lunes)", "startTime": "HH:mm", "endTime": "HH:mm" }
  ]
}
```

**Constraints:** `startTime < endTime`, sin solapamientos en un mismo día.

### PATCH /restaurants/:restaurantId/branches/:branchId/status

**Request:**
```json
{ "status": "active | inactive" }
```

- `active` requiere al menos un intervalo (`422` si no).
- `inactive` siempre se permite.

---

## Mesas (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/branches/:bid/tables` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/branches/:bid/tables` | Todos (restringido) |
| `GET` | `/restaurants/:rid/branches/:bid/tables/:tid` | Todos (restringido) |
| `PATCH` | `/restaurants/:rid/branches/:bid/tables/:tid` | `admin`, `manager`, `branch_admin`* |
| `PATCH` | `/restaurants/:rid/branches/:bid/tables/:tid/status` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre mesas de su sucursal asignada; otra sucursal → `403 FORBIDDEN`.

### POST /restaurants/:restaurantId/branches/:branchId/tables

**Request:**
```json
{
  "code": "string (1-30, letras, números, guiones y guiones bajos)",
  "capacity": "int > 0"
}
```

- `code` se recorta y normaliza a mayúsculas.
- La mesa se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "branchId": "uuid",
  "code": "TERRAZA-02",
  "capacity": 4,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 TABLE_CODE_ALREADY_EXISTS`, `404 BRANCH_NOT_FOUND`

### GET /restaurants/:restaurantId/branches/:branchId/tables

**Query:** `?status=active|inactive` (opcional).

- `admin` y `manager`: todas las mesas de la sucursal.
- `branch_admin`: solo las mesas de su sucursal.

**Response 200:** `DiningTable[]`

### GET /restaurants/:restaurantId/branches/:branchId/tables/:tableId

**Response 200:** `DiningTable`

**Errores:** `404 TABLE_NOT_FOUND`, `404 BRANCH_NOT_FOUND`

### PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId

**Request:** todos los campos opcionales.
```json
{
  "code": "string",
  "capacity": "int > 0"
}
```

- Si se cambia el código, se normaliza y valida unicidad dentro de la sucursal.

**Errores:** `404 TABLE_NOT_FOUND`, `409 TABLE_CODE_ALREADY_EXISTS`

### PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId/status

**Request:**
```json
{ "status": "active | inactive" }
```

- Se permite activar mesas incluso si la sucursal está inactiva.

**Errores:** `404 TABLE_NOT_FOUND`

---

## Catálogo — Categorías (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/menu/categories` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/menu/categories` | Todos |
| `GET` | `/restaurants/:rid/menu/categories/:cid` | Todos |
| `PATCH` | `/restaurants/:rid/menu/categories/:cid` | `admin`, `manager` |
| `PATCH` | `/restaurants/:rid/menu/categories/:cid/status` | `admin`, `manager` |

### POST /restaurants/:restaurantId/menu/categories

```json
{
  "name": "Fondos",
  "position": 2
}
```

- `name`: 1-80 caracteres, único por restaurante (sin distinguir mayúsculas/minúsculas).
- `position`: entero positivo.
- La categoría se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "name": "Fondos",
  "position": 2,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 MENU_CATEGORY_NAME_ALREADY_EXISTS`, `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/menu/categories

**Query:** `?status=active|inactive` (opcional).

**Response 200:** `MenuCategory[]`, ordenado por `position` ascendente y `name` ascendente.

### GET /restaurants/:restaurantId/menu/categories/:categoryId

**Errores:** `404 MENU_CATEGORY_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/categories/:categoryId

```json
{ "name": "Nuevo nombre", "position": 3 }
```

Todos los campos opcionales.

**Errores:** `404 MENU_CATEGORY_NOT_FOUND`, `409 MENU_CATEGORY_NAME_ALREADY_EXISTS`

### PATCH /restaurants/:restaurantId/menu/categories/:categoryId/status

```json
{ "status": "active" }
```

- Desactivar una categoría conserva sus platos y configuraciones por sucursal.

---

## Catálogo — Platos (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/menu/dishes` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/menu/dishes` | Todos |
| `GET` | `/restaurants/:rid/menu/dishes/:did` | Todos |
| `PATCH` | `/restaurants/:rid/menu/dishes/:did` | `admin`, `manager` |
| `PATCH` | `/restaurants/:rid/menu/dishes/:did/status` | `admin`, `manager` |

### POST /restaurants/:restaurantId/menu/dishes

```json
{
  "name": "Lomo saltado",
  "description": "Lomo de res con papas y arroz",
  "imageUrl": "https://example.com/lomo.jpg",
  "ingredients": ["Lomo de res", "Papa", "Arroz"],
  "allergens": ["Soya"],
  "categoryId": "uuid",
  "position": 1
}
```

- `name`: 1-120 caracteres, único por restaurante.
- `description`: 1-1000 caracteres.
- `imageUrl`: nulo o URL `http/https` de hasta 2048 caracteres.
- `ingredients`: máx. 50 elementos de 1-100 caracteres.
- `allergens`: máx. 30 elementos de 1-100 caracteres.
- Ingredientes y alérgenos se normalizan: recorte, sin vacíos, sin duplicados case-insensitive.
- `categoryId`: UUID de una categoría del mismo restaurante.
- `position`: entero positivo.
- El plato se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "categoryId": "uuid",
  "categoryName": "Fondos",
  "name": "Lomo saltado",
  "description": "Lomo de res con papas y arroz",
  "imageUrl": "https://example.com/lomo.jpg",
  "ingredients": ["Lomo de res", "Papa", "Arroz"],
  "allergens": ["Soya"],
  "position": 1,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 DISH_NAME_ALREADY_EXISTS`, `404 MENU_CATEGORY_NOT_FOUND`, `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/menu/dishes

**Query:** `?status=active|inactive` (opcional).

**Response 200:** `DishDto[]`, ordenado por `position` ascendente y `name` ascendente.

### GET /restaurants/:restaurantId/menu/dishes/:dishId

**Errores:** `404 DISH_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/dishes/:dishId

Todos los campos opcionales. `imageUrl` acepta `null` para eliminar la referencia.

```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "imageUrl": null,
  "ingredients": ["Nuevo ingrediente"],
  "allergens": [],
  "categoryId": "uuid",
  "position": 3
}
```

- Actualizar `ingredients` o `allergens` reemplaza la lista completa.

**Errores:** `404 DISH_NOT_FOUND`, `409 DISH_NAME_ALREADY_EXISTS`, `404 MENU_CATEGORY_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/dishes/:dishId/status

```json
{ "status": "active" }
```

- Desactivar un plato conserva sus configuraciones por sucursal.

---

## Catálogo — Configuración por sucursal (requiere `Authorization: Bearer <accessToken>`)

| Método | Ruta | Roles |
|--------|------|-------|
| `GET` | `/restaurants/:rid/branches/:bid/dishes` | Todos (restringido) |
| `PUT` | `/restaurants/:rid/branches/:bid/dishes/:did` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre su sucursal asignada; otra sucursal → `403 FORBIDDEN`.

### GET /restaurants/:restaurantId/branches/:branchId/dishes

Devuelve todos los platos globales con su configuración local o `null`.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "restaurantId": "uuid",
    "categoryId": "uuid",
    "categoryName": "Fondos",
    "name": "Lomo saltado",
    "description": "Lomo de res con papas y arroz",
    "imageUrl": "https://example.com/lomo.jpg",
    "ingredients": ["Lomo de res", "Papa", "Arroz"],
    "allergens": ["Soya"],
    "position": 1,
    "status": "active",
    "branchConfiguration": {
      "price": "35.90",
      "status": "available"
    },
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

### PUT /restaurants/:restaurantId/branches/:branchId/dishes/:dishId

Crea o reemplaza la configuración comercial de un plato en una sucursal. Idempotente.

```json
{
  "price": "35.90",
  "status": "available"
}
```

- `price`: cadena decimal con exactamente dos posiciones (ej. `"35.90"`). Mayor que `0.00` y máximo `99999999.99`.
- `status`: `available`, `sold_out` o `inactive`.

**Response 200:**
```json
{
  "price": "35.90",
  "status": "available"
}
```

- Configurar un plato no requiere que la categoría, el plato o la sucursal estén activos.

**Errores:** `404 BRANCH_NOT_FOUND`, `404 DISH_NOT_FOUND`, `403 FORBIDDEN`

---

## Menú público (sin autenticación)

| Método | Ruta |
|--------|------|
| `GET` | `/public/restaurants/:rid/branches/:bid/menu` |

### GET /public/restaurants/:restaurantId/branches/:branchId/menu

Devuelve el menú publicable de una sucursal activa. Sin autenticación.

**Response 200** (sucursal activa sin platos publicables):
```json
{
  "restaurantId": "uuid",
  "branchId": "uuid",
  "categories": []
}
```

**Response 200** (con platos):
```json
{
  "restaurantId": "uuid",
  "branchId": "uuid",
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
- Platos `sold_out` aparecen marcados pero visibles.
- Categorías y platos se ordenan por `position` ascendente y `name` ascendente.

**Errores:** `404 PUBLIC_MENU_NOT_FOUND` (restaurante o sucursal inexistente, no relacionados, o sucursal inactiva).

## Reservas temporales públicas

No requieren autenticación.

### GET /public/restaurants/:restaurantId/branches/:branchId/reservations/availability

Consulta horarios disponibles de una sucursal.

**Query:**

```text
?date=YYYY-MM-DD&partySize=int
```

La respuesta usa `America/Lima`, bloques de 15 minutos y la duración configurada en la sucursal.

**Response 200:**

```json
{
  "date": "2026-08-01",
  "timezone": "America/Lima",
  "durationMinutes": 60,
  "availableTimes": ["12:00", "12:15", "12:30"]
}
```

No expone mesas ni cantidades disponibles. Una fecha válida sin opciones devuelve `availableTimes: []`.

### POST /public/restaurants/:restaurantId/branches/:branchId/reservations/temporary

Crea un bloqueo temporal de 15 minutos y asigna automáticamente una mesa activa con la menor capacidad suficiente. La mesa no se expone en la respuesta.

**Header obligatorio:**

```text
Idempotency-Key: UUID
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

Reglas:

- `time` usa únicamente minutos `00`, `15`, `30` o `45`.
- Se aplican anticipación mínima, máxima, horario de atención y `maxPartySize`.
- Se exige entre 1 y 50 platos distintos.
- Cada cantidad debe estar entre 1 y 99.
- Solo se aceptan platos activos y configurados como `available`.
- Los nombres y precios se congelan en la reserva.
- El total es la suma de subtotales en `PEN`.
- La reserva queda como `pending_payment`.
- Expira lógicamente 15 minutos después de su creación.
- Las reservas vencidas dejan de bloquear mesas sin necesidad de una tarea programada.
- Las solicitudes concurrentes se procesan con aislamiento `Serializable`.
- No se combinan mesas.

**Persistencia:** `Reservation` conserva cliente, sucursal, mesa interna, intervalo, expiración, estado, moneda, total, clave idempotente y hash de solicitud. `ReservationItem` conserva el plato, nombre, precio unitario, cantidad y subtotal congelados. Las reservas temporales usan `PENDING_PAYMENT`; `CONFIRMED` queda reservado para pagos futuros.

**Response 201:**

```json
{
  "id": "uuid",
  "branchId": "uuid",
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

Repetir la misma clave con el mismo payload devuelve `200` con la reserva original (incluyendo el mismo `checkoutToken`), incluso si ya venció. Reutilizarla con otro restaurante, sucursal o payload devuelve `409 IDEMPOTENCY_KEY_REUSED`.

**Errores:**

- `400 VALIDATION_ERROR`
- `404 PUBLIC_RESERVATION_NOT_FOUND`
- `409 RESERVATION_TIME_UNAVAILABLE`
- `409 DISH_NOT_AVAILABLE`
- `409 IDEMPOTENCY_KEY_REUSED`

---

## Pagos (Stripe Checkout)

Todas las rutas de pago usan el token opaco devuelto en la creación de la reserva temporal. No requieren sesión de usuario interno.

### POST /public/restaurants/:rid/branches/:bid/reservations/:reservationId/checkout

Crea o reutiliza una Stripe Checkout Session. Body vacío. El importe y moneda se derivan de la reserva; Stripe recibe el total en céntimos de PEN y los line items desde los snapshots.

**Headers:** `Authorization: Bearer <checkoutToken>`

**Response 201 (nueva sesión):**
```json
{
  "reservationId": "uuid",
  "paymentAttemptId": "uuid",
  "status": "pending",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "reservationExpiresAt": "ISO8601",
  "checkoutExpiresAt": "ISO8601",
  "currency": "PEN",
  "total": "71.80"
}
```

**Response 200 (sesión pendiente reutilizada):** mismo formato.

**Errores:** `404 PUBLIC_PAYMENT_NOT_FOUND`, `409 RESERVATION_EXPIRED`, `409 RESERVATION_ALREADY_CONFIRMED`, `503 PAYMENT_PROVIDER_UNAVAILABLE`.

---

### GET /public/restaurants/:rid/branches/:bid/reservations/:reservationId/payment

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

`payment` es `null` si todavía no existe ningún intento.

**Errores:** `404 PUBLIC_PAYMENT_NOT_FOUND`.

---

### POST /webhooks/stripe

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
