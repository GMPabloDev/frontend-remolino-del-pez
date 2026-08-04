# SPEC 10 — Checkout Stripe y confirmación asíncrona

> **Estado:** Aprobado
> **Depende de:** SPEC 08, SPEC 09
> **Fecha:** 2026-08-04
> **Objetivo:** Permitir que el cliente pague una reserva temporal mediante Stripe Checkout y reciba su confirmación asíncrona mediante polling, limpiando el estado local únicamente cuando el backend confirme el pago.

## Por qué existe esta spec

SPEC 09 termina con una reserva `pending_payment`, su resumen congelado, el countdown y un `checkoutToken`, pero todavía mantiene “Continuar al pago” deshabilitado.

El backend ya crea o reutiliza Stripe Checkout Sessions, confirma reservas exclusivamente mediante webhooks y expone una consulta pública de estado. Esta spec conecta ese contrato sin incorporar datos de tarjeta al frontend ni considerar autoritativas las URLs de retorno de Stripe.

## Alcance

**Incluido:**

- Crear `src/features/public-payment/` para contratos, cliente API, queries, almacenamiento de retorno, polling, errores y componentes del resultado de pago.
- Corregir `temporaryReservationResponseSchema` para exigir un `checkoutToken` no vacío conforme al contrato vigente.
- Descartar como inválida una reserva persistida cuyo `checkoutToken` sea nulo, vacío o incompatible.
- Habilitar “Continuar al pago” únicamente para una reserva `pending_payment`, vigente, validada y recuperable desde `sessionStorage`.
- Mantener el botón deshabilitado cuando falte el token, la reserva haya vencido o el contexto no pueda sobrevivir a la redirección externa.
- Crear o reutilizar una Stripe Checkout Session mediante `POST .../reservations/:reservationId/checkout` con `Authorization: Bearer <checkoutToken>` y body vacío.
- Bloquear envíos duplicados mientras el `POST /checkout` esté pendiente.
- No reintentar automáticamente la creación de checkout; los reintentos serán manuales.
- Validar con Zod tanto respuestas exitosas como estados de pago antes de usarlos.
- Comprobar que `reservationId`, `total`, `currency` y `reservationExpiresAt` del checkout coincidan con la reserva congelada antes de redirigir.
- Aceptar `201` para una sesión nueva y `200` para una sesión pendiente reutilizada con el mismo contrato.
- Aceptar `checkoutExpiresAt: null` como expiración desconocida del proveedor, sin tratarlo como error.
- Validar que `checkoutUrl` use HTTPS y que su hostname sea exactamente `checkout.stripe.com`.
- Redirigir mediante `window.location.assign(checkoutUrl)` sin abrir otra pestaña.
- Crear `public-checkout-return:v1` como marcador único por pestaña y escribirlo antes de abandonar el sitio.
- Bloquear la redirección si el marcador o la reserva con su token no pueden persistirse en `sessionStorage`.
- No incluir `checkoutToken`, cliente, carrito ni datos sensibles en el marcador o en la URL.
- Crear la página pública prerenderizada `/payment-result?result=success|cancel` mediante `src/pages/payment-result.astro` y una única isla React.
- Marcar `/payment-result` con `noindex, nofollow`.
- Considerar `result` únicamente una pista de navegación; el backend será siempre la autoridad del resultado.
- Validar al regresar que marcador, reserva persistida, restaurante, sucursal e identificador de reserva coincidan exactamente.
- Mostrar un estado recuperable si falta el marcador o el contexto es inválido, sin recorrer todas las claves de `sessionStorage`.
- Ante `result=success`, consultar el estado inmediatamente y después cada dos segundos mientras la pestaña esté visible.
- Pausar el polling cuando la pestaña esté oculta y reanudarlo inmediatamente al recuperar visibilidad.
- Reintentar errores de red del polling con espera progresiva hasta diez segundos, mostrando un aviso persistente y una acción manual.
- Detener el polling ante respuesta contractual inválida, confirmación, estado terminal o expiración de la reserva.
- Ante `result=cancel`, consultar una vez el estado real y no iniciar polling automático.
- Ante `result` ausente o distinto de `success|cancel`, consultar una vez cuando exista contexto válido y no iniciar polling automático.
- Considerar confirmada la UI únicamente cuando `reservationStatus` sea `confirmed`.
- Tratar `payment.status: paid` con reserva todavía `pending_payment` como confirmación en proceso y continuar el polling.
- Tratar `payment: null` o `payment.status: pending` como estado todavía pendiente.
- Tratar `failed` y `expired` como intentos terminados que permiten otro checkout mientras la reserva siga vigente.
- Mostrar “Intentar pago nuevamente” directamente en `/payment-result` y una acción secundaria para volver al resumen.
- Tratar `refund_pending`, `refunded` y `refund_failed` como estados terminales sin permitir otro cobro.
- Recomendar contactar a la sucursal ante estados de reembolso y mostrar sus datos públicos cuando estén disponibles.
- Ante `RESERVATION_ALREADY_CONFIRMED` al crear checkout, consultar inmediatamente el estado y recuperar la confirmación en lugar de presentar un error definitivo.
- Ante `RESERVATION_EXPIRED`, eliminar la reserva pendiente y el marcador, conservar el carrito y ofrecer iniciar una nueva reserva.
- Ante `PUBLIC_PAYMENT_NOT_FOUND`, eliminar la reserva pendiente y el marcador, conservar el carrito y no distinguir entre reserva inexistente, token inválido o token vencido.
- Ante `PAYMENT_PROVIDER_UNAVAILABLE`, `PAYMENT_STATE_CONFLICT`, error de red o respuesta inválida de checkout, conservar la reserva y ofrecer reintento manual.
- Crear un resumen confirmado sin PII ni token bajo `public-payment-confirmation:v1:{restaurantSlug}:{branchSlug}`.
- Crear `public-payment-confirmation-current:v1` como puntero validado a la confirmación más reciente de la pestaña.
- Restaurar después de una recarga la confirmación actual sin escanear otras claves.
- Mostrar en la confirmación sucursal, fecha, horario, personas, platos congelados, cantidades, total, estado y `confirmedAt`.
- Indicar que la confirmación por correo se procesa por separado y puede tardar, sin afirmar que SMTP tuvo éxito.
- Guardar primero el resumen confirmado y su puntero; después eliminar la reserva pendiente y el marcador; por último vaciar el carrito de la sucursal.
- Vaciar el carrito únicamente después de recibir `reservationStatus: confirmed`.
- Propagar la limpieza del carrito a otras pestañas mediante el comportamiento `storage` ya definido en SPEC 08.
- Si falla inesperadamente el guardado de la confirmación, mantener el resumen en memoria, eliminar igualmente el token y el carrito, y advertir que la vista no sobrevivirá a una recarga.
- Mostrar “Volver al menú” como acción principal e “Ir al inicio” como acción secundaria después de confirmar.
- Reutilizar `Button`, `Alert`, `Badge`, `Separator` y los componentes visuales existentes.
- Mantener los estados de carga, espera, cancelación, fallo, expiración, reembolso, confirmación y almacenamiento degradado mediante contenido persistente y accesible.
- Mantener foco visible, anuncios moderados, navegación por teclado y diseño sin desplazamiento horizontal a 320 px.
- Añadir pruebas de contratos, cliente API, almacenamiento, redirección, polling, estados, limpieza, foco y accesibilidad básica.
- Verificar manualmente el flujo completo con Stripe Test Mode y Stripe CLI.

**Fuera de alcance para futuras specs:**

- Implementar o modificar checkout, webhooks, reembolsos, correo o CORS en el backend.
- Recibir o procesar directamente el webhook de Stripe desde el frontend.
- Confirmar una reserva mediante la URL de éxito, la URL de cancelación o una acción manual.
- Incorporar Stripe.js, Payment Element, Elements o campos de tarjeta propios.
- Instalar nuevos componentes shadcn o una librería de pagos.
- Aceptar dominios de checkout distintos de `checkout.stripe.com`.
- Enviar importes, moneda, platos, precios o URLs de retorno al crear checkout.
- Incluir tokens, PII o identificadores Stripe en URLs, logs, analytics o mensajes de error.
- Implementar magic links, autenticación, sesión, perfil o portal del cliente.
- Verificar desde el frontend si el correo de confirmación fue enviado correctamente.
- Mostrar historial completo de intentos de pago.
- Permitir otro cobro durante un reembolso.
- Solicitar, cancelar o administrar reembolsos.
- Añadir métodos de pago distintos de tarjeta mediante Stripe Checkout.
- Vaciar el carrito por cancelación, error, expiración, retorno inválido o pago todavía pendiente.
- Crear cuentas, historial de reservas, cancelaciones o reprogramaciones.
- Modificar el contrato público documentado en `api-contract/`.

## Modelo de datos

Los schemas Zod son la fuente de verdad para respuestas remotas y valores de `sessionStorage`. Los tipos TypeScript se infieren desde ellos.

El token de la reserva pasa a ser obligatorio conforme al contrato vigente:

```ts
const temporaryReservationResponseSchema = existingTemporaryReservationSchema.extend({
  checkoutToken: z.string().min(1),
});
```

Una reserva antigua con `checkoutToken: null` deja de ser válida. No se migra porque no puede autorizar checkout ni consulta de pago.

Los estados públicos de intento de pago son exhaustivos:

```ts
const paymentAttemptStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "expired",
  "refund_pending",
  "refunded",
  "refund_failed",
]);

const reservationPaymentStatusSchema = z.enum([
  "pending_payment",
  "confirmed",
]);
```

La creación o reutilización de checkout conserva el contrato remoto exacto:

```ts
const publicCheckoutResponseSchema = z.object({
  reservationId: z.uuid(),
  paymentAttemptId: z.uuid(),
  status: z.literal("pending"),
  checkoutUrl: z.url(),
  reservationExpiresAt: z.iso.datetime({ offset: true }),
  checkoutExpiresAt: z.iso.datetime({ offset: true }).nullable(),
  currency: z.literal("PEN"),
  total: reservationMoneySchema,
});
```

Además del schema estructural, el cliente verifica antes de redirigir:

- `reservationId` coincide con la reserva persistida.
- `currency` y `total` coinciden con sus snapshots congelados.
- `reservationExpiresAt` coincide con `expiresAt`.
- `checkoutUrl.protocol` es `https:`.
- `checkoutUrl.hostname` es exactamente `checkout.stripe.com`.
- La reserva continúa vigente.

La consulta de estado no expone URL ni identificadores internos de Stripe:

```ts
const publicPaymentAttemptSchema = z.object({
  id: z.uuid(),
  provider: z.literal("stripe"),
  status: paymentAttemptStatusSchema,
  amount: reservationMoneySchema,
  currency: z.literal("PEN"),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

const publicPaymentStatusSchema = z.object({
  reservationId: z.uuid(),
  reservationStatus: reservationPaymentStatusSchema,
  payment: publicPaymentAttemptSchema.nullable(),
  total: reservationMoneySchema,
  currency: z.literal("PEN"),
  expiresAt: z.iso.datetime({ offset: true }),
  confirmedAt: z.iso.datetime({ offset: true }).nullable(),
});
```

Reglas cruzadas de la respuesta:

- `reservationId`, `total`, `currency` y `expiresAt` coinciden con la reserva local congelada.
- Una reserva `confirmed` exige `confirmedAt` no nulo.
- Una reserva `pending_payment` no se presenta como confirmada aunque el intento figure `paid`.
- `failed` o `expired` habilitan otro checkout solo antes de `expiresAt`.
- Cualquier estado `refund_*` bloquea nuevos cobros.

El marcador de retorno es único por pestaña:

```ts
const publicCheckoutReturnSchema = z.object({
  version: z.literal(1),
  restaurantSlug: publicSlugSchema,
  branchSlug: publicSlugSchema,
  reservationId: z.uuid(),
  paymentAttemptId: z.uuid(),
  initiatedAt: z.iso.datetime({ offset: true }),
  reservationExpiresAt: z.iso.datetime({ offset: true }),
});
```

Clave:

```text
public-checkout-return:v1
```

El marcador:

- Se escribe después de validar la respuesta de checkout y antes de redirigir.
- Nunca contiene `checkoutToken`, PII, `checkoutUrl` ni snapshots del carrito.
- Se considera vencido en `reservationExpiresAt`.
- Se reemplaza al iniciar otro checkout en la misma pestaña.
- Solo es utilizable si coincide con una reserva persistida válida que conserva el token.

La confirmación combina los snapshots sin PII de SPEC 09 con el estado confirmado del backend:

```ts
const storedPublicPaymentConfirmationSchema = storedPublicReservationSchema
  .omit({ version: true, savedAt: true, checkoutToken: true, status: true })
  .extend({
    version: z.literal(1),
    status: z.literal("confirmed"),
    confirmedAt: z.iso.datetime({ offset: true }),
    savedAt: z.iso.datetime({ offset: true }),
  });
```

Clave contextual:

```text
public-payment-confirmation:v1:{restaurantSlug}:{branchSlug}
```

El puntero actual usa una clave fija:

```ts
const currentPublicPaymentConfirmationSchema = z.object({
  version: z.literal(1),
  restaurantSlug: publicSlugSchema,
  branchSlug: publicSlugSchema,
  reservationId: z.uuid(),
  confirmationKey: z.string().min(1),
  savedAt: z.iso.datetime({ offset: true }),
});
```

Clave:

```text
public-payment-confirmation-current:v1
```

Convenciones de confirmación:

- `confirmationKey` debe equivaler exactamente a la clave derivada de los slugs; no permite leer una clave arbitraria.
- La confirmación vive en `sessionStorage` hasta cerrar la pestaña o ser reemplazada como confirmación actual.
- Varias confirmaciones contextuales pueden coexistir, pero el puntero referencia únicamente la más reciente.
- La restauración lee el puntero y después una única clave derivada; nunca recorre todo el almacenamiento.
- El valor no contiene `checkoutToken`, cliente, `paymentAttemptId`, URL de Stripe ni respuestas crudas.
- Si el guardado falla después de confirmar, el mismo modelo vive solo en memoria durante el montaje actual.

El estado visible permanece discriminado:

```ts
type PublicPaymentView =
  | "loading-context"
  | "invalid-context"
  | "creating-checkout"
  | "waiting-confirmation"
  | "cancelled"
  | "attempt-failed"
  | "reservation-expired"
  | "refund"
  | "confirmed"
  | "polling-error";
```

`result=success|cancel` selecciona únicamente el comportamiento inicial de consulta. Nunca establece `PublicPaymentView` por sí solo.

## Plan de implementación

1. Verificar antes de tocar el flujo que CORS admite `Authorization`, que Stripe CLI está escuchando `localhost:3000/webhooks/stripe` y que el backend usa las URLs locales de éxito y cancelación de `/payment-result`.
2. Corregir `temporaryReservationResponseSchema` en `src/features/public-reservation/contracts/public-reservation.schemas.ts` para exigir `checkoutToken` no vacío y actualizar las pruebas que actualmente aceptan `null`.
3. Crear `src/features/public-payment/contracts/public-payment.schemas.ts` con estados, respuesta de checkout, estado de pago, marcador, confirmación y puntero actual.
4. Añadir refinamientos puros para validar coherencia entre checkout, estado remoto y reserva congelada sin mezclar esa lógica con componentes.
5. Crear `src/features/public-payment/lib/public-payment-storage.ts` con claves versionadas, lectura Zod, expiración, escritura y eliminación segura del marcador, confirmación y puntero.
6. Crear `src/features/public-payment/api/public-payment-client.ts` con `POST /checkout` y `GET /payment`, slugs codificados, bearer token y validación de respuesta.
7. Mantener el `checkoutToken` exclusivamente en `Authorization`; comprobar mediante pruebas que no aparece en ruta, query, body ni errores.
8. Extender `src/features/public-api/query/public-query-keys.ts` con una clave de estado aislada por restaurante, sucursal y reserva.
9. Crear `src/features/public-payment/query/public-payment-query.ts` con mutación de checkout sin reintento automático y consulta de estado controlada por el flujo.
10. Crear `src/features/public-payment/lib/public-payment-errors.ts` para mapear errores contractuales a estados persistentes y acciones recuperables sin depender de `message`.
11. Crear `src/features/public-payment/lib/public-payment-state.ts` para clasificar confirmación, espera, reintento, expiración, reembolso e incoherencias transitorias.
12. Crear `src/features/public-payment/components/PublicCheckoutButton.tsx` con bloqueo de doble envío, estado de carga y mensajes accesibles.
13. Actualizar `PublicReservationSummary.tsx` para habilitar el checkout real, retirar el texto de “siguiente spec” y conservar el countdown existente.
14. Actualizar `PublicReservationApp.tsx` para entregar al checkout la reserva vigente, contexto, persistencia y acciones de expiración sin exponer el token a componentes de presentación.
15. Implementar la mutación de checkout, validar IDs, importes, expiración y URL, y escribir `public-checkout-return:v1` antes de ejecutar `window.location.assign`.
16. Bloquear la salida a Stripe cuando la reserva o el marcador no puedan persistirse; conservar la sesión creada para que un reintento manual reutilice el mismo checkout.
17. Crear `src/features/public-payment/components/PublicPaymentWaiting.tsx` para espera de webhook, reintentos de consulta, pausa por visibilidad y anuncios no repetitivos.
18. Crear `src/features/public-payment/components/PublicPaymentResultState.tsx` para cancelación, intento fallido, expiración, reembolso, contexto inválido y errores persistentes.
19. Crear `src/features/public-payment/components/PublicPaymentConfirmation.tsx` con resumen congelado, `confirmedAt`, mensaje prudente sobre correo y acciones al menú e inicio.
20. Crear `src/features/public-payment/PublicPaymentResultApp.tsx` para leer `result`, validar marcador y reserva, restaurar confirmaciones y coordinar todos los estados.
21. Implementar consulta inmediata y polling de dos segundos para `result=success`, con pausa al ocultar la pestaña y reanudación inmediata al volver.
22. Implementar espera progresiva hasta diez segundos para errores de red del polling, aviso persistente y reintento manual; detener ante respuesta inválida.
23. Implementar una sola consulta para `result=cancel` o un valor inválido, sin confiar en el query param para determinar éxito.
24. Continuar consultando cuando el intento figure `paid` pero la reserva siga `pending_payment`; confirmar únicamente con `reservationStatus: confirmed`.
25. Implementar reintento de checkout desde el resultado para intentos `failed` o `expired` mientras la reserva siga vigente.
26. Implementar `RESERVATION_ALREADY_CONFIRMED` mediante una consulta inmediata de estado y finalización segura.
27. Implementar limpieza de reserva y marcador ante `RESERVATION_EXPIRED` o `PUBLIC_PAYMENT_NOT_FOUND`, conservando siempre el carrito.
28. Implementar estados terminales de reembolso, bloquear otro checkout y reutilizar el descubrimiento público para mostrar contacto de la sucursal cuando esté disponible.
29. Al confirmar, construir y guardar el resumen sin token y su puntero, eliminar la reserva pendiente y el marcador, y vaciar después el carrito mediante `removePublicCart`.
30. Mantener la confirmación en memoria y ejecutar igualmente la limpieza sensible si el guardado falla; mostrar un `Alert` sobre la pérdida al recargar.
31. Crear `src/pages/payment-result.astro` con `noindex, nofollow`, composición pública responsive, navegación segura y una isla `client:load`.
32. Crear `tests/public-payment-contracts.test.ts` para schemas, refinamientos, estados, URLs permitidas, claves y ausencia de secretos.
33. Crear `tests/public-payment-client.test.ts` para rutas, bearer, body vacío, `200/201`, errores y respuestas inválidas sin solicitudes reales.
34. Crear `tests/public-payment-storage.test.ts` para aislamiento, puntero, corrupción, expiración, fallo de storage, restauración y confirmación sin token ni PII.
35. Crear `tests/public-payment-ui.test.tsx` para checkout, doble envío, bloqueo de redirección, success, cancel, query inválido, polling, visibilidad, reintentos, reembolsos, limpieza y foco.
36. Ejecutar `bun test`, `bun run check` y `bun run build`; corregir cualquier regresión antes de la prueba remota.
37. Verificar manualmente en Stripe Test Mode una sesión nueva, una reutilizada, pago aprobado, cancelación, tarjeta rechazada, webhook demorado, reintento, recarga del resultado y limpieza final con Stripe CLI activo.

## Criterios de aceptación

- [ ] El backend de desarrollo permite `Authorization` en CORS.
- [ ] `STRIPE_CHECKOUT_SUCCESS_URL` apunta a `http://localhost:4321/payment-result?result=success` durante desarrollo.
- [ ] `STRIPE_CHECKOUT_CANCEL_URL` apunta a `http://localhost:4321/payment-result?result=cancel` durante desarrollo.
- [ ] Producción queda documentada para usar los equivalentes HTTPS del dominio público.
- [ ] Stripe CLI puede reenviar webhooks a `localhost:3000/webhooks/stripe` sin exponer su signing secret al frontend.
- [ ] El signing secret no aparece en la spec, código, commits, logs ni variables públicas.
- [ ] `temporaryReservationResponseSchema` rechaza `checkoutToken: null`, vacío o ausente.
- [ ] Una reserva válida `200/201` conserva un `checkoutToken` opaco no vacío.
- [ ] Una reserva antigua con token nulo se descarta de forma recuperable.
- [ ] “Continuar al pago” está habilitado solo para una reserva pendiente, vigente, coherente y persistida.
- [ ] El botón queda deshabilitado cuando falta token o contexto persistible.
- [ ] El checkout no se inicia después de `expiresAt`.
- [ ] Una activación válida realiza un único `POST .../checkout` con body vacío.
- [ ] El token se envía exclusivamente como `Authorization: Bearer <checkoutToken>`.
- [ ] El token no aparece en body, ruta, query, marcador, errores ni logs.
- [ ] Mientras el `POST` está pendiente, una segunda activación no crea otra solicitud.
- [ ] La mutación no realiza reintentos automáticos.
- [ ] Una respuesta `201` válida prepara una nueva redirección.
- [ ] Una respuesta `200` válida puede reutilizar la misma sesión pendiente.
- [ ] `checkoutExpiresAt: null` no invalida una respuesta coherente.
- [ ] Un `reservationId`, total, moneda o expiración distintos impiden la redirección.
- [ ] Una URL HTTP, malformada o con hostname distinto de `checkout.stripe.com` impide la redirección.
- [ ] Una URL HTTPS de `checkout.stripe.com` se abre mediante `window.location.assign`.
- [ ] No se abre una segunda pestaña ni se usa `window.open`.
- [ ] `public-checkout-return:v1` se escribe antes de abandonar el sitio.
- [ ] El marcador contiene únicamente versión, slugs, IDs públicos y timestamps acordados.
- [ ] El marcador no contiene token, PII, URL de checkout ni carrito.
- [ ] Si la escritura del marcador falla, el navegador no sale hacia Stripe.
- [ ] Si la reserva con token solo existe en memoria, el navegador no sale hacia Stripe.
- [ ] Un reintento después de fallar el almacenamiento puede reutilizar la sesión creada por el backend.
- [ ] `/payment-result` existe como página pública prerenderizada.
- [ ] `/payment-result` contiene `noindex, nofollow` sin aplicarlo al inicio o menú.
- [ ] `result=success` no muestra confirmación antes de consultar al backend.
- [ ] `result=cancel` no se interpreta como prueba de cancelación definitiva.
- [ ] Un `result` ausente o inválido no confirma ni inicia polling automático.
- [ ] Un retorno sin marcador válido muestra un estado recuperable.
- [ ] La recuperación no recorre todas las claves de `sessionStorage`.
- [ ] Marcador y reserva deben coincidir en restaurante, sucursal e identificador.
- [ ] Un marcador vencido se elimina y no inicia solicitudes.
- [ ] Ante success se realiza una consulta inmediata.
- [ ] Mientras siga pendiente y visible, se consulta aproximadamente cada dos segundos.
- [ ] Ocultar la pestaña pausa nuevas consultas periódicas.
- [ ] Volver a la pestaña activa una consulta inmediata.
- [ ] Los errores de red usan espera progresiva con máximo de diez segundos.
- [ ] Un error de polling muestra información persistente y una acción manual.
- [ ] Una respuesta contractual inválida detiene el polling y no modifica almacenamiento.
- [ ] El polling se detiene al confirmar, alcanzar un estado terminal o vencer la reserva.
- [ ] `payment: null` permanece como espera sin tratarse como error.
- [ ] `payment.status: pending` mantiene la espera.
- [ ] `payment.status: paid` con reserva pendiente continúa como confirmación en proceso.
- [ ] Solo `reservationStatus: confirmed` produce la vista confirmada.
- [ ] Una confirmación exige `confirmedAt` válido.
- [ ] `failed` o `expired` detienen el polling y permiten reintentar antes de vencer.
- [ ] Reintentar desde `/payment-result` vuelve a usar el endpoint de checkout y las mismas validaciones.
- [ ] La cancelación ofrece reintentar y volver al resumen mientras la reserva siga vigente.
- [ ] `refund_pending`, `refunded` y `refund_failed` no permiten otro checkout.
- [ ] Los estados de reembolso recomiendan contactar a la sucursal.
- [ ] Los datos de contacto proceden del descubrimiento público y tienen fallback recuperable.
- [ ] `RESERVATION_ALREADY_CONFIRMED` consulta el estado e intenta recuperar la confirmación.
- [ ] `RESERVATION_EXPIRED` elimina reserva y marcador, pero conserva el carrito.
- [ ] `PUBLIC_PAYMENT_NOT_FOUND` elimina reserva y marcador sin revelar la causa interna.
- [ ] `PAYMENT_PROVIDER_UNAVAILABLE` conserva la reserva y ofrece reintento manual.
- [ ] `PAYMENT_STATE_CONFLICT` no dispara otro checkout automáticamente.
- [ ] Un error de red o respuesta inválida de checkout conserva la reserva y el carrito.
- [ ] Confirmar crea `public-payment-confirmation:v1:{restaurantSlug}:{branchSlug}`.
- [ ] El resumen confirmado contiene snapshots, total, estado, timestamps y contexto.
- [ ] El resumen confirmado no contiene cliente, token, URL, `paymentAttemptId` ni identificadores Stripe.
- [ ] `public-payment-confirmation-current:v1` referencia únicamente una clave derivada y validada.
- [ ] Recargar `/payment-result` restaura la confirmación más reciente de la pestaña.
- [ ] Una confirmación corrupta o un puntero arbitrario se descartan sin romper la página.
- [ ] El resumen muestra sucursal, fecha, horario, personas, platos, cantidades, total y `confirmedAt`.
- [ ] El mensaje indica que el correo se procesa por separado y puede tardar.
- [ ] La UI no afirma que SMTP tuvo éxito.
- [ ] La reserva pendiente y el marcador se eliminan únicamente después de confirmar.
- [ ] El carrito se vacía únicamente después de confirmar.
- [ ] Vaciar el carrito afecta solo al restaurante y sucursal confirmados.
- [ ] La limpieza válida se refleja en otras pestañas mediante `storage`.
- [ ] Cancelar, fallar, vencer o recibir un retorno inválido no vacía el carrito.
- [ ] Si falla el guardado de confirmación, el resumen continúa visible en memoria.
- [ ] Ante ese fallo, el token se elimina y se advierte que una recarga perderá la vista.
- [ ] La confirmación ofrece “Volver al menú” como acción principal.
- [ ] La confirmación ofrece “Ir al inicio” como acción secundaria.
- [ ] Ninguna vista incorpora magic links, login, perfil o portal del cliente.
- [ ] No se instala Stripe.js ni se renderizan campos de tarjeta.
- [ ] No se instalan nuevos componentes shadcn.
- [ ] Los estados usan componentes existentes y no dependen exclusivamente del color.
- [ ] Carga, espera y polling no anuncian cada consulta ni saturan al lector de pantalla.
- [ ] Errores y estados terminales reciben foco de manera predecible.
- [ ] El flujo puede operarse con teclado y mantiene foco visible.
- [ ] `/reserve` y `/payment-result` no generan desplazamiento horizontal a 320 px.
- [ ] Las pruebas no realizan solicitudes reales, no navegan a Stripe y no dependen del reloj real.
- [ ] `bun test` finaliza sin errores.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.
- [ ] Stripe Test Mode confirma un pago aprobado mediante webhook y el frontend muestra la confirmación.
- [ ] Una cancelación vuelve al resultado sin confirmar ni vaciar el carrito.
- [ ] Una tarjeta de prueba rechazada permite otro intento mientras la reserva siga vigente.
- [ ] Un webhook demorado mantiene la espera y termina en confirmación al procesarse.
- [ ] La prueba manual no realiza cargos reales ni utiliza claves live.
- [ ] No se modifica el backend ni se implementan autenticación de cliente, magic links, correo, reembolsos o métodos de pago adicionales.

## Decisiones

- **Sí:** continuar con checkout y confirmación inmediatamente después de SPEC 09.
- **Sí:** usar Stripe Checkout Sessions alojado conforme al contrato backend.
- **No:** instalar Stripe.js, Elements o capturar datos de tarjeta en el frontend.
- **Sí:** crear `/payment-result?result=success|cancel` como retorno común.
- **No:** crear URLs distintas que incluyan restaurante, sucursal, reserva o token.
- **Sí:** tratar success y cancel como pistas no confiables.
- **No:** confirmar mediante la redirección del navegador.
- **Sí:** confirmar visualmente solo cuando el backend responda `reservationStatus: confirmed`.
- **Sí:** usar polling porque la transición real depende del webhook firmado.
- **Sí:** consulta inmediata y frecuencia visible de dos segundos.
- **Sí:** pausar con la pestaña oculta y consultar al volver.
- **Sí:** espera progresiva hasta diez segundos para errores de red.
- **No:** continuar automáticamente ante una respuesta contractual inválida.
- **Sí:** una sola consulta para cancel o query param inválido.
- **Sí:** mantener `paid + pending_payment` como confirmación todavía en proceso.
- **No:** interpretar el estado del intento como sustituto del estado de la reserva.
- **Sí:** permitir otro checkout después de `failed` o `expired` si la reserva sigue vigente.
- **No:** obligar a crear otra reserva por el fallo de un único intento.
- **Sí:** bloquear nuevos cobros durante cualquier estado de reembolso.
- **Sí:** exigir `checkoutToken` no vacío según el contrato actualizado.
- **No:** conservar compatibilidad con reservas locales que contienen token nulo.
- **Sí:** transportar el token exclusivamente como bearer.
- **No:** guardar el token en el marcador, confirmación, URL o logs.
- **Sí:** usar un marcador fijo por pestaña para recuperar el contexto después de Stripe.
- **No:** recorrer `sessionStorage` buscando una reserva candidata.
- **Sí:** bloquear la redirección si el contexto no sobrevivirá al viaje externo.
- **No:** incluir el token en el marcador como fallback de almacenamiento.
- **Sí:** validar HTTPS y hostname exacto `checkout.stripe.com` antes de redirigir.
- **No:** aceptar redirects arbitrarios aunque procedan de una respuesta con forma válida.
- **Sí:** usar `window.location.assign` en la misma pestaña.
- **No:** abrir Stripe mediante popup o pestaña adicional.
- **Sí:** guardar una confirmación sin PII ni token por restaurante y sucursal.
- **Sí:** mantener un puntero separado a la confirmación actual para soportar recargas.
- **No:** mantener el token durante la ventana posterior de 24 horas cuando el frontend ya confirmó y no lo necesita.
- **Sí:** limpiar reserva, marcador y carrito únicamente después de confirmación backend.
- **No:** vaciar el carrito por cancelación, fallo, expiración o incertidumbre.
- **Sí:** limpiar igualmente el token si falla el guardado local posterior a una confirmación real.
- **Sí:** mantener en memoria el resumen confirmado cuando `sessionStorage` falle.
- **Sí:** conservar el carrito ante `PUBLIC_PAYMENT_NOT_FOUND` porque no existe confirmación verificable.
- **Sí:** consultar el estado ante `RESERVATION_ALREADY_CONFIRMED` para recuperar una carrera legítima.
- **Sí:** usar estados persistentes y acciones manuales para errores.
- **No:** usar un toaster como única representación del resultado de un pago.
- **Sí:** indicar que el correo se procesa por separado y puede tardar.
- **No:** afirmar que el email fue enviado porque el endpoint de pago no expone el estado SMTP.
- **Sí:** mantener magic links y autenticación de cliente fuera de alcance.
- **Sí:** reutilizar componentes UI existentes.
- **No:** instalar componentes shadcn o dependencias visuales nuevas.
- **Sí:** verificar manualmente con Stripe Test Mode y Stripe CLI.
- **No:** incluir la actualización de Stripe CLI en el alcance funcional de esta spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La URL de éxito llega antes que el webhook | Consultar inmediatamente y mantener polling hasta la confirmación real. |
| La URL de cancelación no representa el estado final del intento | Consultar una vez y permitir reintento solo según el backend y la vigencia. |
| El usuario paga pero pierde el contexto local al volver | Exigir reserva y marcador persistidos antes de salir a Stripe. |
| `checkoutToken` aparece en URL, logs o estado no sensible | Transportarlo solo como bearer y probar su ausencia en marcador, confirmación y errores. |
| Una respuesta comprometida intenta redirigir a phishing | Exigir HTTPS y hostname exacto `checkout.stripe.com`. |
| Dos activaciones crean flujos concurrentes | Bloquear la mutación en vuelo y dejar que el backend reutilice una sesión pendiente. |
| El webhook tarda más de lo esperado | Mostrar espera persistente, polling visible cada dos segundos y reintento de red controlado. |
| La pestaña oculta genera tráfico innecesario | Pausar polling y consultar inmediatamente al recuperar visibilidad. |
| La red oscila durante la confirmación | Aplicar espera progresiva hasta diez segundos y ofrecer reintento manual. |
| Un intento `paid` aparece antes de la reserva confirmada | Mantener “confirmación en proceso” y no limpiar hasta `reservationStatus: confirmed`. |
| El usuario reintenta durante un reembolso | Tratar todos los estados `refund_*` como terminales y bloquear checkout. |
| La reserva vence durante Stripe Checkout | Detener al alcanzar `expiresAt`, conservar el carrito y mostrar el camino para reservar de nuevo. |
| El backend confirma mientras el cliente vuelve a pulsar checkout | Resolver `RESERVATION_ALREADY_CONFIRMED` consultando el estado protegido. |
| La confirmación se guarda pero la limpieza queda parcial | Mantener operaciones idempotentes, claves derivadas y repetir limpieza al restaurar una confirmación válida. |
| `sessionStorage` falla después de confirmar | Mostrar el resumen en memoria, eliminar la credencial y avisar que la recarga perderá la vista. |
| El carrito se vacía antes de confirmar | Centralizar la limpieza exclusivamente en la transición backend `confirmed`. |
| Otra pestaña conserva un carrito ya pagado | Eliminar la clave exacta de `localStorage` para propagar el evento `storage`. |
| El frontend promete un correo que SMTP no entregó | Usar un mensaje neutral que indique procesamiento separado y posible demora. |
| Una clave manipulada hace leer almacenamiento ajeno | Validar slugs, IDs y que el puntero coincida con la clave derivada exacta. |
| El polling satura lectores de pantalla | Anunciar cambios de estado e hitos, no cada tick o solicitud. |
| Las URLs backend siguen apuntando a otra ruta | Verificar las variables de retorno como primer paso antes de implementar o probar. |

## Lo que **no** está en esta spec

- Cambios en endpoints, CORS, webhooks, modelos o reglas del backend.
- Confirmación manual del pago.
- Stripe.js, Elements o formularios de tarjeta propios.
- Checkout embebido, popups o pestañas adicionales.
- Tokens, PII o datos de pago en URLs.
- Magic links, autenticación o portal del cliente.
- Verificación del envío SMTP.
- Historial completo de pagos.
- Gestión o solicitud de reembolsos.
- Métodos de pago adicionales.
- Cancelación o reprogramación de reservas.
- Vaciado del carrito antes de la confirmación backend.
- Nuevos componentes shadcn o librerías visuales.
- Cambios al contrato documentado en `api-contract/`.
- Actualización de Stripe CLI.

Cada capacidad diferida deberá definirse en una spec independiente cuando exista un alcance concreto.
