# 00 — Convenciones globales

> Documento vivo. Refleja el estado actual del backend. Aplica a todas las rutas de la API.

## Contenido

- [Base URL](#base-url)
- [Formato de errores](#formato-de-errores)
- [Códigos de error](#códigos-de-error)
- [Autenticación y tokens](#autenticación-y-tokens)
- [Autenticación de clientes](#autenticación-de-clientes)
- [Convención de estados (casing)](#convención-de-estados-casing)
- [Fechas y zona horaria](#fechas-y-zona-horaria)
- [Moneda y montos](#moneda-y-montos)
- [Idempotencia](#idempotencia)

---

## Base URL

```
http://localhost:3000
```

Todas las rutas de gestión requieren `Authorization: Bearer <accessToken>`. Las rutas públicas (`/public/**`) y los webhooks no requieren sesión interna. `GET /customer-auth/me` requiere un access token de cliente separado.

**Rutas que NUNCA llevan `Authorization`:**
`POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /public/restaurants/:restaurantSlug/customer-auth/magic-links` · `POST /public/customer-auth/magic-links/exchange` · `POST /customer-auth/refresh` · `POST /customer-auth/logout` · `POST /webhooks/stripe` (este último se autentica con `Stripe-Signature`, no con Bearer). Si algún frontend envía un Bearer innecesario, la API lo ignora; no es un error.

### CORS

- La API valida el origen contra la variable `CORS_ORIGINS` del servidor (lista separada por comas). En desarrollo por defecto es `http://localhost:4321`; el frontend debe configurarla con su origen real.
- Solo se permiten los orígenes listados. Un origen no listado no recibe cabeceras CORS y el navegador bloquea la respuesta.
- Métodos permitidos: `GET`, `HEAD`, `PUT`, `POST`, `DELETE`, `PATCH`, `OPTIONS`.
- Cabeceras permitidas: `Content-Type`, `Authorization`, `Idempotency-Key`.
- La autenticación viaja en cabeceras (`Authorization`), **no en cookies**; no se necesita `credentials: include` en `fetch` salvo que el frontend use cookies por su cuenta.

---

## Formato de errores

Todas las respuestas de error usan la misma forma:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [{ "field": "name", "code": "too_small", "message": "..." }]
  }
}
```

- `code`: identificador estable de la API (ver tabla abajo). **Es el campo que el frontend debe usar para decidir el comportamiento**, no `message`.
- `message`: legible en español. Puede cambiar; no dependas de su texto.
- `details`: solo presente en errores de validación. `field` es la ruta unida por puntos (ej. `items.0.dishId`), `code` es el código de Zod (`too_small`, `invalid_string`, `custom`, `invalid_enum_value`, ...), no un código de la API.

Regla para el frontend: ante un `401 UNAUTHORIZED` intenta el flujo de refresh (ver Auth); ante `403 FORBIDDEN` no reintentes la misma petición.

## Códigos de error

| HTTP | code | Significado |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 400 | `INVALID_STRIPE_SIGNATURE` | Firma de webhook Stripe inválida |
| 401 | `UNAUTHORIZED` | Token requerido, inválido o expirado |
| 401 | `INVALID_CREDENTIALS` | Email o contraseña incorrectos (también si el email no existe o el usuario está inactivo) |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token interno inválido o expirado |
| 401 | `INVALID_MAGIC_LINK` | Magic link inexistente, vencido, consumido o invalidado |
| 401 | `INVALID_CUSTOMER_REFRESH_TOKEN` | Refresh token de cliente inválido, vencido, reemplazado o revocado |
| 401 | `CUSTOMER_AUTH_REQUIRED` | Access token de cliente ausente, inválido, vencido o sin sesión activa |
| 403 | `FORBIDDEN` | Sin permisos para la acción o la sucursal |
| 404 | `RESTAURANT_NOT_FOUND` | Restaurante no existe |
| 404 | `BRANCH_NOT_FOUND` | Sucursal no existe o no pertenece al restaurante |
| 404 | `USER_NOT_FOUND` | Usuario no existe |
| 404 | `TABLE_NOT_FOUND` | Mesa no existe |
| 404 | `MENU_CATEGORY_NOT_FOUND` | Categoría no existe |
| 404 | `DISH_NOT_FOUND` | Plato no existe o no pertenece al restaurante |
| 404 | `PUBLIC_MENU_NOT_FOUND` | Restaurante o sucursal inexistente, no relacionados, o sucursal inactiva |
| 404 | `PUBLIC_RESERVATION_NOT_FOUND` | Restaurante/sucursal no disponibles para reservas |
| 404 | `PUBLIC_PAYMENT_NOT_FOUND` | Reserva no encontrada **o token de checkout inválido** (no distinguir ambos casos) |
| 404 | `CUSTOMER_RESERVATION_NOT_FOUND` | Reserva o comprobante no disponible para el cliente autenticado |
| 404 | `ROUTE_NOT_FOUND` | La URL no coincide con ninguna ruta registrada |
| 409 | `RESTAURANT_ALREADY_EXISTS` | Ya existe un restaurante (singleton) |
| 409 | `BRANCH_CODE_ALREADY_EXISTS` | Código de sucursal duplicado |
| 409 | `BRANCH_SCHEDULE_CONFLICT` | Intervalos del mismo día solapados |
| 409 | `TABLE_CODE_ALREADY_EXISTS` | Código de mesa duplicado en la sucursal |
| 409 | `MENU_CATEGORY_NAME_ALREADY_EXISTS` | Nombre de categoría duplicado |
| 409 | `DISH_NAME_ALREADY_EXISTS` | Nombre de plato duplicado |
| 409 | `RESERVATION_TIME_UNAVAILABLE` | Horario, anticipación o mesa no disponibles |
| 409 | `DISH_NOT_AVAILABLE` | Uno o más platos no están disponibles en la sucursal |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Clave reutilizada con otra solicitud |
| 409 | `RESERVATION_EXPIRED` | La reserva venció y no admite pagos |
| 409 | `RESERVATION_ALREADY_CONFIRMED` | La reserva ya fue confirmada |
| 409 | `PAYMENT_STATE_CONFLICT` | Conflicto de estado en el pago |
| 409 | `PAYMENT_RECEIPT_NOT_READY` | El comprobante todavía no está disponible |
| 409 | `USER_EMAIL_ALREADY_EXISTS` | Email ya registrado |
| 422 | `BRANCH_SCHEDULE_REQUIRED` | Activar sucursal sin horarios |
| 422 | `LAST_ADMIN_REQUIRED` | No se puede degradar/desactivar al último admin activo |
| 422 | `INVALID_ROLE_BRANCH` | Rol-sucursal incompatible o sucursal inexistente |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno (no exponer detalles al usuario) |
| 500 | `UNKNOWN_ERROR` | Error inesperado lanzado como `HTTPException` de Hono; usa el status que tenga la excepción (mantener la regla: no depender del `message`) |
| 503 | `PAYMENT_PROVIDER_UNAVAILABLE` | Proveedor de pagos no disponible |
| 503 | `DOCUMENT_STORAGE_UNAVAILABLE` | Almacenamiento documental no disponible |

---

## Autenticación y tokens

### Sesión (flujo login → refresh → logout)

1. `POST /auth/login` devuelve `accessToken`, `refreshToken` y `user`.
2. El `accessToken` (JWT, por defecto **25 min**) se envía en `Authorization: Bearer <accessToken>`.
3. Cuando el backend responda `401 UNAUTHORIZED`:
   - Llama a `POST /auth/refresh` con el `refreshToken` actual.
   - Si responde 200, guarda el par nuevo y **reintenta la petición que falló**.
   - Si responde `401 INVALID_REFRESH_TOKEN`, fuerza logout completo (borra credenciales, vuelve al login).
4. `POST /auth/logout` revoca la sesión. Idempotente (siempre 204).

### Reglas críticas para el frontend

- **Refresh token rotativo:** cada `POST /auth/refresh` invalida el token anterior y entrega uno nuevo. Guarda SIEMPRE el último recibido.
- **NUNCA envíes el mismo refresh token dos veces en paralelo.** El backend detecta la reutilización de un token ya rotado como posible robo y **revoca TODAS las sesiones del usuario**. Serializa las llamadas de refresh (un solo `refresh` en vuelo; las demás esperan su resultado). Esto ocurre fácilmente si el frontend lanza dos peticiones simultáneas que reciben `401` a la vez.
- **`403 FORBIDDEN` no se resuelve con refresh:** no reintentes, muéstrale al usuario que no tiene permisos.
- **Las sesiones se revocan de forma inmediata** (el access token deja de funcionar en el siguiente request) cuando:
  - El usuario cambia su propia contraseña (`PATCH /auth/password`) → tras el 204, **el frontend debe forzar logout y re-login**.
  - Un admin desactiva al usuario o le restablece la contraseña.
  - Se detecta reutilización de un refresh token.
  - El usuario hace logout.
- `401 INVALID_CREDENTIALS` es la misma respuesta si el email no existe, la contraseña es incorrecta o el usuario está inactivo: no filtres información.

### Autenticación de clientes

El flujo de clientes no usa contraseñas ni comparte sesiones con trabajadores:

1. Después de un pago confirmado, el backend crea o reutiliza la cuenta y envía un correo con un magic link de un solo uso.
2. `POST /public/customer-auth/magic-links/exchange` intercambia el enlace por `accessToken`, `refreshToken` y el perfil mínimo.
3. El access token de cliente es JWT con audiencia `customer`, dura 25 minutos y se envía como `Authorization: Bearer <customerAccessToken>`.
4. `POST /customer-auth/refresh` rota el refresh token y entrega un par nuevo. Serializa los refresh para evitar reutilización accidental.
5. Si se reutiliza un refresh token ya rotado, el backend revoca todas las sesiones del cliente.
6. `POST /customer-auth/logout` revoca solo la sesión indicada y siempre responde `204`.
7. Los access tokens de cliente nunca son válidos en rutas administrativas.

El perfil devuelto contiene únicamente `fullName`, `email`, `phone` y `restaurantSlug`.
- `GET /customer/reservations` devuelve el historial completo de reservas confirmadas del cliente autenticado.
- `GET /customer/reservations/:reservationId/receipt/download` devuelve una URL HTTPS firmada y temporal para descargar el comprobante disponible.
- Una reserva sin comprobante devuelve `receipt: null` en el historial.

### Checkout token después del pago

- Mientras la reserva está `pending_payment`, el `checkoutToken` conserva las reglas públicas vigentes.
- Una reserva confirmada acepta su token hasta antes de `confirmedAt + 24 horas`.
- Desde `confirmedAt + 24 horas`, checkout y estado de pago responden `404 PUBLIC_PAYMENT_NOT_FOUND` sin revelar la reserva.
- Después de esa ventana el acceso del cliente se realiza mediante customer-auth.

### Correos de clientes

- Los correos automáticos se envían después del commit de confirmación mediante SMTP.
- El correo combina agradecimiento, resumen de reserva y magic link.
- El correo tiene versiones HTML y texto plano en español.
- Un fallo SMTP no revierte el pago, la reserva ni la cuenta.
- `SMTP_PASS` debe ser una contraseña de aplicación de Gmail y nunca se expone en logs, respuestas o documentación real.

---

## Convención de estados (casing)

**Todos los estados en las respuestas usan minúsculas.** Esta es la única convención:

| Recurso | Valores de `status` |
|---------|---------------------|
| Usuario (`user.role`, `user.status`) | `admin` \| `manager` \| `branch_admin` · `active` \| `inactive` |
| Sucursal (`status`) | `active` \| `inactive` |
| Mesa (`status`) | `active` \| `inactive` |
| Categoría (`status`) | `active` \| `inactive` |
| Plato (`status`) | `active` \| `inactive` |
| Config de plato por sucursal (`status`) | `available` \| `sold_out` \| `inactive` |
| Reserva (`status`) | `pending_payment` \| `confirmed` |
| Intento de pago (`payment.status`) | `pending` \| `paid` \| `failed` \| `expired` \| `refund_pending` \| `refunded` \| `refund_failed` |

Los **payloads de entrada** también usan minúsculas (`{"status": "active"}`, `{"role": "branch_admin"}`). El `role` en `POST/PATCH /users` se envía en minúsculas; el mismo `role` en la respuesta viene en minúsculas.

---

## Fechas y zona horaria

- **Zona horaria de negocio: `America/Lima` (UTC-5).**
- Las rutas públicas de reservas (`availability`, `POST /temporary`) interpretan `date` (`YYYY-MM-DD`) y `time` (`HH:mm`) como **hora local de Lima**, no UTC. El frontend debe enviar la fecha/hora que el usuario ve en Lima (no convertir a UTC).
- Los campos `createdAt`, `updatedAt`, `expiresAt`, `confirmedAt`, `reservationExpiresAt`, `checkoutExpiresAt`, `emailVerifiedAt` vienen como **ISO 8601 con offset (UTC)**.
- La reserva expira 15 minutos después de crearse. Para el countdown del frontend, usa `expiresAt` de la respuesta; no asumas que el reloj del dispositivo está sincronizado.

## Moneda y montos

- Moneda única: `PEN` (soles).
- **Todos los montos viajan como cadenas decimales** con exactamente dos posiciones (`"71.80"`), nunca como `number`. No hagas aritmética de punto flotante con ellos: usa operaciones con decimales/céntimos.
- En `POST /temporary`, cada item lleva `unitPrice` y `subtotal` congelados; el `total` es la suma de subtotales.
- En checkout, el total se envía a Stripe en céntimos de `PEN` de forma automática.

## Idempotencia

- `POST /temporary` exige el header `Idempotency-Key` (UUID). Ver detalles en [01-publico.md](./01-publico.md).
- El webhook de Stripe es idempotente por `event.id` (`PaymentWebhookEvent` único).
