# SPEC 12 — Historial de reservas y comprobantes PDF

> **Status:** Implementado
> **Depends on:** SPEC 11
> **Date:** 2026-08-13
> **Objective:** Permitir que el cliente autenticado consulte sus reservas confirmadas agrupadas en próximas y anteriores, y obtenga enlaces temporales para descargar sus comprobantes PDF disponibles.

## Scope

**In:**

- Integrar el historial dentro de `/customer/account`, conservando el perfil y el cierre de sesión implementados por SPEC 11.
- Consultar `GET /customer/reservations` con la sesión de cliente y validar la respuesta completa antes de renderizarla.
- Mostrar todas las reservas confirmadas devueltas por el backend, sin paginación local ni truncamiento.
- Agrupar como “Próximas” las reservas cuyo `endAt` todavía no haya pasado y como “Anteriores” aquellas cuyo `endAt` sea anterior al instante actual.
- Conservar dentro de cada grupo el orden recibido de la API, que entrega las reservas de la más reciente a la más antigua.
- Mostrar por reserva sucursal, ubicación, fecha, intervalo horario, cantidad de personas, platos, cantidades, precios, subtotales, total, fecha de confirmación y estado del comprobante.
- Formatear fechas y horas en español usando la zona `America/Lima` recibida en el contrato, sin reinterpretarlas en la zona local del dispositivo.
- Representar de forma diferenciada comprobantes ausentes, `pending`, `failed` y `available`.
- Solicitar explícitamente `GET /customer/reservations/:reservationId/receipt/download` solo para comprobantes `available`.
- Tras una respuesta válida, mostrar un enlace temporal “Descargar comprobante PDF” en la tarjeta de la reserva; no abrirlo automáticamente.
- Mantener la URL firmada, su nombre y expiración únicamente en memoria mientras la tarjeta esté montada y retirarla al vencer según el reloj disponible.
- Evitar solicitudes duplicadas por reserva mientras se genera el enlace temporal.
- Resolver carga, historial vacío, error de listado, generación del enlace, enlace vencido y errores de descarga mediante estados persistentes y recuperables.
- Reutilizar la sesión, el refresh coordinado, el cliente autenticado, TanStack Query y los componentes visuales existentes.

**Out of scope:**

- Crear una ruta o portal distinto de `/customer/account`.
- Mostrar reservas `pending_payment`, canceladas, reembolsadas o ajenas al historial confirmado devuelto por la API.
- Cancelar, reprogramar, modificar o repetir una reserva.
- Mostrar historial de intentos de pago, datos de tarjeta, mesa, identificadores Stripe, tokens o metadata de Cloudinary.
- Generar, regenerar, adjuntar, almacenar o eliminar PDFs desde el frontend.
- Descargar mediante `checkoutToken` o desde la confirmación pública de pago.
- Persistir respuestas del historial o URLs firmadas en `localStorage`, `sessionStorage`, cookies, URL o logs.
- Hacer polling del estado del comprobante o reintentar automáticamente su descarga.
- Añadir paginación, filtros, búsqueda, exportación masiva o agrupaciones adicionales.
- Modificar endpoints, schemas, CORS, almacenamiento documental o lógica del backend.
- Instalar dependencias o componentes shadcn nuevos.

## Contracts and data

Los schemas Zod son la fuente de verdad de las respuestas del historial y de la descarga. Los tipos TypeScript se infieren desde ellos.

El historial conserva el contrato de `GET /customer/reservations`:

```ts
const customerReceiptStatusSchema = z.enum([
  "pending",
  "available",
  "failed",
]);

const customerReservationReceiptSchema = z.object({
  number: z.string().min(1),
  status: customerReceiptStatusSchema,
  generatedAt: z.iso.datetime({ offset: true }).nullable(),
});

const customerReservationSchema = z.object({
  id: z.uuid(),
  status: z.literal("confirmed"),
  branch: z.object({
    slug: publicSlugSchema,
    name: z.string().min(1),
    address: z.string().min(1),
    district: z.string().min(1),
    province: z.string().min(1),
    department: z.string().min(1),
  }),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  timezone: z.literal("America/Lima"),
  partySize: z.number().int().positive(),
  items: z.array(z.object({
    dishId: z.uuid(),
    name: z.string().min(1),
    unitPrice: reservationMoneySchema,
    quantity: z.number().int().positive(),
    subtotal: reservationMoneySchema,
  })),
  currency: z.literal("PEN"),
  total: reservationMoneySchema,
  confirmedAt: z.iso.datetime({ offset: true }),
  receipt: customerReservationReceiptSchema.nullable(),
});

const customerReservationHistorySchema = z.array(customerReservationSchema);
```

Reglas de presentación:

- `receipt: null` significa que la reserva no tiene un comprobante descargable y no muestra una acción de generación de enlace.
- `pending` se presenta como “Comprobante en preparación”.
- `failed` se presenta como “Comprobante no disponible”, sin prometer regeneración.
- `available` habilita “Generar enlace de descarga” y exige `generatedAt` válido para presentarse como disponible.
- Los importes permanecen como cadenas decimales; se convierten a céntimos enteros únicamente para formatearlos como PEN, sin recalcular los totales del backend.
- La agrupación compara `endAt` como instante ISO con el reloj actual. Una reserva en curso permanece en “Próximas”. No se crea un temporizador para mover tarjetas; la clasificación se actualiza al renderizar o refetchear el historial.

La descarga conserva el contrato de `GET /customer/reservations/:reservationId/receipt/download`:

```ts
const customerReceiptDownloadSchema = z.object({
  fileName: z.string().min(1).max(255),
  downloadUrl: z.url(),
  expiresAt: z.iso.datetime({ offset: true }),
});
```

Antes de mostrar el enlace, el frontend comprueba además que:

- `downloadUrl` use exactamente el protocolo `https:`.
- `fileName` sea un nombre base terminado en `.pdf`, sin `/`, `\\` ni segmentos de ruta.
- `expiresAt` sea posterior al reloj disponible en el momento de recibir la respuesta.

El enlace usa `download={fileName}` y `referrerPolicy="no-referrer"`. La URL firmada no entra en query params, almacenamiento, logs ni mensajes de error. Cuando vence, se elimina del estado y vuelve a mostrarse la acción para generar otra.

Los errores de descarga se resuelven por `error.code`, nunca por `message`:

- `CUSTOMER_RESERVATION_NOT_FOUND`: retirar cualquier enlace de esa tarjeta, no revelar si la reserva existe o pertenece a otra cuenta y permitir actualizar el historial.
- `PAYMENT_RECEIPT_NOT_READY`: retirar el enlace, indicar que el comprobante todavía no está disponible y permitir actualizar el historial.
- `DOCUMENT_STORAGE_UNAVAILABLE`, `NETWORK_ERROR` o `INVALID_API_RESPONSE`: conservar la reserva, mostrar un error persistente y permitir un reintento manual.
- `CUSTOMER_AUTH_REQUIRED`: reutilizar el refresh coordinado y el único replay definidos en SPEC 11; si la sesión queda inválida, aplicar el flujo anónimo existente.

## Implementation plan

1. Verificar que el backend vigente exponga `GET /customer/reservations` y `GET /customer/reservations/:reservationId/receipt/download` con los códigos y `Cache-Control: no-store` documentados en `api-contract/`.
2. Crear `src/features/customer-reservations/contracts/customer-reservation.schemas.ts` con los schemas de historial, reserva, items, comprobante y enlace temporal, incluyendo las validaciones cruzadas de estado, HTTPS, nombre PDF y expiración.
3. Crear `src/features/customer-reservations/api/customer-reservations-client.ts` sobre `CustomerApiClient` para listar reservas y solicitar una descarga con el UUID codificado, sin duplicar refresh ni parsing de errores.
4. Extender `src/features/customer-auth/query/customer-query-keys.ts` con una clave de historial aislada por `restaurantSlug` y crear `src/features/customer-reservations/query/customer-reservations-query.ts` para la consulta autenticada.
5. Crear `src/features/customer-reservations/lib/customer-reservation-presentation.ts` para agrupar por `endAt`, conservar el orden remoto y formatear fechas de `America/Lima` e importes PEN sin depender de la zona del dispositivo.
6. Crear `src/features/customer-reservations/lib/customer-reservation-errors.ts` para mapear los códigos de listado y descarga a mensajes y acciones recuperables sin exponer respuestas crudas.
7. Crear `CustomerReceiptDownload.tsx` con generación explícita, bloqueo por solicitud en vuelo, estado local del enlace, expiración, enlace con nombre seguro y foco gestionado para errores.
8. Crear `CustomerReservationCard.tsx` para presentar la sucursal, horario, personas, items, total, confirmación y estado del comprobante sin mostrar datos internos.
9. Crear `CustomerReservationHistory.tsx` con carga, error, reintento, vacío y las secciones “Próximas” y “Anteriores”; omitir únicamente una sección cuando su grupo esté vacío.
10. Actualizar `src/features/customer-auth/CustomerAccountApp.tsx` para sustituir el aviso de “próximamente” por el historial, mantener perfil y logout disponibles, y aislar un error del historial para que no oculte los datos de cuenta ya cargados.
11. Verificar manualmente sesión restaurada, historial vacío y poblado, ambos grupos, cada estado de comprobante, enlace válido y vencido, doble activación, refresh, logout, teclado, foco y responsive a 320 px.
12. Ejecutar `bun run check` y `bun run build` sin modificar el backend ni añadir dependencias.

## Acceptance criteria

- [ ] `/customer/account` conserva el perfil mínimo y la acción de logout de SPEC 11.
- [ ] El historial solo se consulta después de que la sesión alcance `authenticated`.
- [ ] La consulta usa `Authorization: Bearer <customerAccessToken>` mediante `CustomerApiClient` y no expone el token fuera del controlador existente.
- [ ] Un `401 CUSTOMER_AUTH_REQUIRED` produce como máximo el refresh coordinado y el replay único de SPEC 11.
- [ ] Una respuesta `200 []` muestra un estado vacío y no se trata como error.
- [ ] Una respuesta válida muestra todas las reservas confirmadas sin paginarlas ni truncarlas.
- [ ] Una respuesta contractual inválida no introduce reservas parciales en la UI.
- [ ] Las reservas cuyo `endAt` no pasó aparecen en “Próximas”.
- [ ] Las reservas cuyo `endAt` pasó aparecen en “Anteriores”.
- [ ] Una reserva en curso no aparece como anterior.
- [ ] Cada grupo conserva el orden entregado por la API.
- [ ] Si un grupo está vacío se omite su sección sin ocultar el otro; si ambos están vacíos se muestra el estado vacío global.
- [ ] Fecha, hora y confirmación se muestran en español y `America/Lima`, independientemente de la zona del dispositivo.
- [ ] Cada tarjeta muestra sucursal, ubicación, intervalo, personas, items, cantidades, importes, total y confirmación.
- [ ] La UI no muestra mesa, IDs Stripe, tokens, magic links ni metadata de Cloudinary.
- [ ] `receipt: null` no rompe el historial ni ofrece descargar.
- [ ] Un comprobante `pending` se presenta en preparación y no ofrece descargar.
- [ ] Un comprobante `failed` se presenta no disponible y no promete regeneración.
- [ ] Solo un comprobante `available` ofrece “Generar enlace de descarga”.
- [ ] Activar esa acción realiza un único `GET /customer/reservations/:reservationId/receipt/download` para el UUID exacto.
- [ ] Mientras se genera el enlace, una segunda activación de la misma tarjeta no crea otra solicitud.
- [ ] Una respuesta válida no abre ni descarga el PDF automáticamente.
- [ ] La respuesta válida muestra un enlace “Descargar comprobante PDF” asociado al `fileName` recibido.
- [ ] El enlace solo se muestra si la URL es HTTPS, el nombre es un PDF seguro y `expiresAt` todavía no pasó.
- [ ] El enlace aplica `download` y `no-referrer` sin abrir una pestaña automáticamente.
- [ ] Al vencer el enlace se elimina y vuelve a estar disponible la generación manual.
- [ ] La URL firmada vive solo en memoria y desaparece al desmontar la tarjeta, cerrar sesión o recargar.
- [ ] La URL firmada no aparece en Web Storage, cookies, rutas, query params, logs ni textos de error.
- [ ] `CUSTOMER_RESERVATION_NOT_FOUND` no revela propiedad o existencia y permite actualizar el historial.
- [ ] `PAYMENT_RECEIPT_NOT_READY` retira el enlace y permite actualizar el estado del historial.
- [ ] `DOCUMENT_STORAGE_UNAVAILABLE`, red o respuesta inválida conservan la tarjeta y ofrecen reintento manual.
- [ ] La generación del enlace no tiene polling ni reintentos automáticos.
- [ ] Un error del historial no oculta el perfil o el logout y ofrece un reintento persistente.
- [ ] Carga, vacío, errores, estados de comprobante y enlaces no dependen únicamente del color.
- [ ] Todos los controles son operables con teclado, mantienen foco visible y los errores accionables reciben foco predecible.
- [ ] El historial no genera desplazamiento horizontal a 320 px, incluso con nombres largos e items numerosos.
- [ ] No se crean rutas nuevas, no se instalan dependencias y no se modifica el backend.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.

## Decisions

- **Sí:** integrar el historial en la cuenta existente en vez de crear otra ruta protegida.
- **Sí:** agrupar por vigencia del intervalo en “Próximas” y “Anteriores”.
- **Sí:** considerar próxima una reserva en curso hasta que pase `endAt`.
- **Sí:** conservar el orden remoto dentro de cada grupo.
- **No:** añadir ordenamiento configurable, filtros o paginación sin soporte contractual.
- **Sí:** mostrar el detalle de items dentro de cada reserva para representar el historial completo devuelto por la API.
- **Sí:** generar la URL firmada solo bajo acción explícita del cliente.
- **Sí:** mostrar un segundo enlace temporal después de generarlo.
- **No:** abrir una pestaña, navegar o iniciar la descarga automáticamente al recibir la URL.
- **Sí:** mantener cada URL exclusivamente en estado local y retirarla al vencer.
- **No:** cachear URLs firmadas en TanStack Query o cualquier almacenamiento persistente.
- **Sí:** permitir reintento manual ante fallos recuperables.
- **No:** hacer polling o reintentar automáticamente comprobantes pendientes, fallidos o indisponibles.
- **Sí:** reutilizar el aislamiento, refresh y limpieza de caché de customer-auth.
- **No:** ampliar el BFF porque los endpoints autenticados ya aceptan el access token de cliente en memoria.

## Risks

- Una URL firmada expone temporalmente un documento con datos personales; se mitiga solicitándola bajo acción explícita, validando HTTPS, evitando referrer y almacenamiento, y retirándola al vencer o desmontar.
- El atributo `download` puede depender del comportamiento cross-origin del proveedor; el backend ya genera la URL con disposición de descarga y nombre estable, por lo que el frontend no intenta descargar el binario mediante `fetch` ni crear blobs.
- El reloj del dispositivo puede estar desajustado respecto de `expiresAt`; el frontend lo usa solo para ocultar enlaces evidentemente vencidos y el almacenamiento documental conserva la autoridad definitiva.
- El endpoint entrega el historial completo sin paginación; la implementación evita copias adicionales de datos y mantiene tarjetas legibles, pero una futura paginación requiere primero un contrato backend.
- Un comprobante puede cambiar de `available` a no descargable entre listado y solicitud; los códigos `CUSTOMER_RESERVATION_NOT_FOUND` y `PAYMENT_RECEIPT_NOT_READY` se tratan como estados recuperables sin revelar detalles internos.
