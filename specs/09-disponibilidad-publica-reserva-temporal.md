# SPEC 09 — Disponibilidad pública y reserva temporal

> **Estado:** Aprobado
> **Depende de:** SPEC 02, SPEC 04, SPEC 08
> **Fecha:** 2026-08-03
> **Objetivo:** Permitir que el cliente consulte horarios y cree una reserva temporal de quince minutos desde su carrito mediante un flujo público idempotente, sin iniciar el pago.

## Por qué existe esta spec

SPEC 08 permite seleccionar platos y deja visible “Continuar con la reserva”, pero todavía no consulta mesas disponibles, recopila los datos del cliente ni crea el bloqueo temporal que exige el backend.

Esta spec completa ese tramo mediante `/reserve?branch=<branchSlug>` y termina con una reserva `pending_payment`, su resumen congelado y el tiempo restante. El checkout, Stripe y la confirmación asíncrona pertenecen a una spec posterior.

Antes de implementar esta spec, el backend debe permitir `Idempotency-Key` en el preflight CORS. Actualmente `../backend/src/index.ts` admite únicamente `Content-Type` y `Authorization`; sin esa corrección externa el navegador bloqueará `POST /reservations/temporary`.

## Alcance

**Incluido:**

- Crear `src/features/public-reservation/` para contratos, cliente API, queries, idempotencia, persistencia de sesión, fechas, countdown y componentes del flujo público.
- Crear la página pública prerenderizada `/reserve?branch=<branchSlug>` mediante `src/pages/reserve.astro` y una única isla React.
- Marcar `/reserve` con `noindex, nofollow`.
- Actualizar el `Layout` público para aceptar metadatos `robots` sin afectar las páginas ya existentes.
- Habilitar “Continuar con la reserva” en el carrito únicamente cuando exista al menos un plato y todos estén `available`.
- Mantener deshabilitada la continuación cuando haya platos `sold_out`, `removed` o `unverified`, indicando qué debe corregirse.
- Mantener deshabilitada la continuación cuando `PUBLIC_USE_MENU_FIXTURE=true`, explicando que una reserva real requiere la API y el menú reales.
- Navegar desde el carrito a `/reserve?branch=<branchSlug>` sin serializar platos ni datos sensibles en la URL.
- Leer el carrito persistido de la sucursal y reconciliarlo nuevamente contra el menú vigente antes de habilitar el formulario.
- Crear un traspaso temporal mediante `sessionStorage` cuando el carrito funcione solo en memoria porque `localStorage` falló.
- Permanecer en el menú y mostrar un `Alert` persistente cuando no sea posible transferir el carrito ni mediante `localStorage` ni mediante `sessionStorage`.
- Rechazar estados parciales cuando falte `branch`, el slug sea inválido, la sucursal no esté en el descubrimiento público o el carrito esté vacío.
- Mostrar acciones recuperables para volver al selector de sucursal o al menú correcto según el contexto disponible.
- Reutilizar la consulta pública de sucursales para obtener nombre, reglas y `maxPartySize` de la sucursal activa.
- Reutilizar React Hook Form, Zod, `zodResolver`, `Field`, `Input`, `Button`, `Alert`, `Empty`, `Badge` y `Separator` según las convenciones existentes.
- Instalar `Calendar` y `Popover` mediante `bunx --bun shadcn@latest add calendar popover`.
- Componer el patrón Date Picker de shadcn con `Calendar` dentro de `Popover`; no buscar ni instalar un registro independiente llamado `Date Picker`.
- Presentar una sola página con tres pasos visibles: fecha y personas, horario, y datos del cliente con revisión.
- Mantener el paso 2 deshabilitado hasta obtener una respuesta válida de disponibilidad.
- Mantener el paso 3 deshabilitado hasta seleccionar un horario disponible.
- Explicar en cada paso bloqueado qué dato o acción falta.
- Limitar el calendario desde la fecha actual en `America/Lima` hasta la fecha máxima orientativa derivada de `maximumAdvanceDays`.
- No calcular horarios, mesas, anticipación mínima ni duración en el frontend; el backend entrega `availableTimes` ya filtrado.
- Consultar disponibilidad únicamente al activar “Ver horarios”, usando fecha y cantidad de personas válidas.
- Aceptar una cantidad entera de personas entre `1` y `maxPartySize` de la sucursal.
- Invalidar la respuesta y el horario seleccionado cuando cambien fecha o cantidad de personas.
- Mostrar los horarios como una selección única operable con teclado y conservar exactamente el valor `HH:mm` del backend.
- Mostrar un estado vacío cuando una fecha válida no tenga horarios, con acciones para cambiar la fecha o la cantidad de personas.
- Mostrar la duración devuelta por disponibilidad como información; no usarla para fabricar horarios adicionales.
- Recopilar nombre completo, email y teléfono en el tercer paso.
- Exigir nombre completo de 2 a 150 caracteres y email válido de hasta 320 caracteres.
- Aceptar el teléfono E.164 completo, mostrar `+51987654321` como ejemplo y eliminar espacios o guiones antes de validarlo.
- Exigir que el teléfono normalizado cumpla `+` seguido de 8 a 15 dígitos.
- Mantener nombre, email y teléfono únicamente en memoria durante el formulario.
- No persistir PII en `localStorage`, `sessionStorage`, URL, logs ni objetos de telemetría.
- Mostrar antes del envío la sucursal, fecha, hora, personas, platos, cantidades y subtotal estimado del carrito.
- Construir el payload remoto únicamente con fecha, hora, personas, cliente normalizado e identificadores y cantidades del carrito reconciliado.
- Generar un UUID para `Idempotency-Key` en el primer envío válido.
- Reutilizar la misma clave al reintentar exactamente el mismo payload después de un error de red o una respuesta inválida.
- Generar una clave nueva cuando cambien fecha, hora, personas, cliente o carrito.
- Mantener el intento idempotente completo solo en memoria porque contiene PII.
- Bloquear envíos duplicados mientras `POST /temporary` esté pendiente y desactivar el reintento automático de la mutación.
- Validar con Zod todas las respuestas de disponibilidad y reserva antes de introducirlas en estado o almacenamiento.
- Aceptar `201` para una creación nueva y `200` para un replay idempotente con el mismo contrato de respuesta.
- Tratar la creación como autoridad final aunque el horario haya aparecido en la consulta previa.
- Mostrar `VALIDATION_ERROR`, `PUBLIC_RESERVATION_NOT_FOUND`, `RESERVATION_TIME_UNAVAILABLE`, `DISH_NOT_AVAILABLE`, `IDEMPOTENCY_KEY_REUSED`, errores de red y respuestas inválidas mediante estados persistentes.
- Ante `RESERVATION_TIME_UNAVAILABLE`, conservar fecha, personas y cliente, deseleccionar la hora y volver a consultar disponibilidad.
- Ante `DISH_NOT_AVAILABLE`, reconsultar el menú, reconciliar el carrito y ofrecer volver al menú para corregirlo sin eliminar platos automáticamente.
- Ante error de red o respuesta inválida durante la creación, conservar valores e `Idempotency-Key` y ofrecer un reintento manual del mismo payload.
- Ante `IDEMPOTENCY_KEY_REUSED`, descartar el intento en memoria, exigir una nueva revisión y no generar un reenvío automático.
- Enfocar el primer error de campo ante validación local y el `Alert` persistente ante errores remotos.
- Guardar después de una creación válida una versión sin PII de la reserva en `sessionStorage`.
- Usar `public-reservation:v1:{restaurantSlug}:{branchSlug}` como clave de la reserva vigente.
- Guardar identificador, horario, personas, platos congelados, total, moneda, timestamps y `checkoutToken`, pero omitir siempre el objeto `customer`.
- Tratar `checkoutToken` como credencial bearer sensible: no mostrarlo, incluirlo en URLs, logs ni mensajes de error.
- Validar el valor de `sessionStorage` con Zod, comprobar slugs y eliminar valores corruptos, incompatibles o vencidos cuando sea posible.
- Mostrar directamente el resumen cuando exista una reserva válida y vigente de la misma sucursal en esa pestaña.
- Impedir crear otra reserva para la misma sucursal y pestaña mientras la reserva restaurada siga vigente.
- No sincronizar una reserva ni su token entre pestañas; `sessionStorage` mantiene el aislamiento deliberado.
- Mantener el carrito intacto después de crear la reserva temporal.
- No modificar el resumen congelado si el carrito cambia después de crear la reserva.
- Mostrar en el resumen horario, personas, duración, platos congelados, cantidades, subtotales, total y estado `pending_payment`.
- Omitir nombre, email y teléfono del resumen persistible y de la vista restaurada.
- Mostrar un countdown accesible basado inicialmente en `createdAt` y `expiresAt` del servidor y actualizado con un reloj monotónico durante la sesión montada.
- Al restaurar después de una recarga, comparar `expiresAt` con la hora del dispositivo porque el contrato no ofrece un endpoint de hora del servidor.
- Al llegar a cero, eliminar la reserva de `sessionStorage`, mostrar “Reserva vencida” y permitir consultar nuevamente los horarios con el carrito conservado.
- Exigir que los datos del cliente se introduzcan de nuevo después de una recarga o una expiración.
- Mostrar “Continuar al pago” deshabilitado y asociado a una explicación de que Stripe se integrará en la siguiente spec.
- Mantener carga, vacío, error, éxito, expiración y almacenamiento degradado accesibles mediante contenido persistente, no mediante un toaster público.
- Mantener el flujo operable con teclado, foco visible, anuncios no duplicados y diseño responsive sin desplazamiento horizontal a 320 px.
- Añadir pruebas de contratos, cliente API, fechas, idempotencia, almacenamiento, transferencia del carrito, disponibilidad, formulario, errores, resumen, countdown y navegación.
- Mantener el backend como autoridad para sucursal, reglas, disponibilidad, precios, platos, mesa asignada y expiración.

**Fuera de alcance para futuras specs:**

- Crear o modificar el permiso CORS del backend; admitir `Idempotency-Key` es un requisito previo externo.
- Crear fixtures de disponibilidad o de reservas temporales.
- Calcular disponibilidad, combinar mesas o revelar identificadores y códigos de mesa.
- Iniciar checkout, llamar endpoints de pago o redirigir a Stripe.
- Consultar mediante polling el estado de pago.
- Confirmar, cancelar, reprogramar o eliminar una reserva.
- Vaciar el carrito al crear la reserva temporal.
- Persistir PII o el formulario completo entre recargas.
- Recuperar automáticamente un envío incierto después de recargar la página.
- Sincronizar reservas o `checkoutToken` entre pestañas o dispositivos.
- Crear cuentas de cliente, historial de reservas o autenticación pública.
- Enviar emails, SMS o notificaciones de confirmación.
- Añadir impuestos, descuentos, promociones, propinas o cargos adicionales.
- Incorporar CAPTCHA, rate limiting, analítica o telemetría de PII.
- Modificar modelos, endpoints, reglas, asignación de mesas, idempotencia o normalización del backend.
- Crear gestión staff de reservas.
- Rediseñar globalmente el menú o el sitio público.

## Modelo de datos

Los schemas Zod son la fuente de verdad para consultas, formularios, respuestas remotas y almacenamiento de sesión. Los tipos TypeScript se infieren desde ellos.

La disponibilidad conserva los valores contractuales del backend:

```ts
const reservationDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidCalendarDate);

const reservationTimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/);

const publicAvailabilitySchema = z.object({
  date: reservationDateSchema,
  timezone: z.literal("America/Lima"),
  durationMinutes: z.number().int().positive(),
  availableTimes: z.array(reservationTimeSchema),
});
```

`availableTimes` no se amplía ni se completa en el frontend. Los duplicados se eliminan de forma defensiva para presentación sin alterar el orden ascendente esperado.

Los parámetros de disponibilidad son independientes del formulario completo:

```ts
const availabilityRequestSchema = z.object({
  date: reservationDateSchema,
  partySize: z.number().int().positive(),
});
```

`partySize` se refina además contra `branch.rules.maxPartySize` en el contexto del formulario. El backend conserva la validación definitiva cuando las reglas cambian entre consultas.

Los datos del cliente se normalizan antes de construir el payload:

```ts
const reservationCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().max(320).pipe(z.email()).transform(toLowerCase),
  phone: z
    .string()
    .transform(removeSpacesAndHyphens)
    .pipe(z.string().regex(/^\+\d{8,15}$/)),
});

const publicReservationFormSchema = z.object({
  date: reservationDateSchema,
  partySize: z.number().int().positive(),
  time: reservationTimeSchema,
  customer: reservationCustomerSchema,
});
```

La transformación del teléfono elimina exclusivamente espacios y guiones. No inventa un prefijo, no reemplaza `00` por `+` y no convierte un número nacional en E.164.

El payload remoto añade los platos reconciliados y nunca envía snapshots locales de precio o nombre:

```ts
interface CreateTemporaryReservationRequest {
  date: string;
  time: string;
  partySize: number;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  items: Array<{
    dishId: string;
    quantity: number;
  }>;
}
```

Convenciones del payload:

- `items` contiene entre 1 y 50 platos distintos.
- Cada cantidad permanece entre 1 y 99 conforme a SPEC 08.
- El orden de `items` se estabiliza por `dishId` antes de comparar intentos idempotentes.
- `date` y `time` representan hora local de `America/Lima`; nunca se convierten a UTC.
- El backend vuelve a resolver platos, precios, horario y mesa dentro de la creación.

La respuesta de reserva temporal valida todos los snapshots congelados:

```ts
const reservationMoneySchema = z.string().regex(/^\d{1,8}\.\d{2}$/);

const temporaryReservationResponseSchema = z.object({
  id: z.uuid(),
  branchSlug: publicSlugSchema,
  status: z.literal("pending_payment"),
  date: reservationDateSchema,
  startTime: reservationTimeSchema,
  endTime: reservationTimeSchema,
  timezone: z.literal("America/Lima"),
  durationMinutes: z.number().int().positive(),
  expiresAt: z.iso.datetime({ offset: true }),
  partySize: z.number().int().positive(),
  customer: reservationCustomerSchema,
  items: z.array(z.object({
    dishId: z.uuid(),
    name: z.string().min(1),
    unitPrice: reservationMoneySchema,
    quantity: z.number().int().min(1).max(99),
    subtotal: reservationMoneySchema,
  })).min(1).max(50),
  currency: z.literal("PEN"),
  total: reservationMoneySchema,
  checkoutToken: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
});
```

Los importes permanecen como cadenas decimales. La vista reutiliza la conversión a céntimos de SPEC 08 para comprobar y formatear subtotales sin aritmética binaria de punto flotante.

La clave idempotente y el payload se conservan juntos únicamente en memoria:

```ts
interface ReservationAttempt {
  idempotencyKey: string;
  payload: CreateTemporaryReservationRequest;
}
```

Reglas de idempotencia frontend:

- El primer envío válido crea `crypto.randomUUID()`.
- Un error de red o respuesta inválida conserva `ReservationAttempt`.
- Un reintento compara el payload normalizado completo con el intento anterior.
- Un payload idéntico reutiliza la clave.
- Cualquier diferencia descarta el intento y genera una clave nueva.
- `RESERVATION_TIME_UNAVAILABLE`, `DISH_NOT_AVAILABLE` e `IDEMPOTENCY_KEY_REUSED` cierran el intento porque exigen revisar el flujo.
- La mutación nunca se reintenta automáticamente.

La reserva guardada omite PII de forma estructural:

```ts
const storedPublicReservationSchema = temporaryReservationResponseSchema
  .omit({ customer: true })
  .extend({
    version: z.literal(1),
    restaurantSlug: publicSlugSchema,
    savedAt: z.iso.datetime({ offset: true }),
  });
```

Clave de almacenamiento:

```text
public-reservation:v1:{restaurantSlug}:{branchSlug}
```

Ejemplo:

```text
public-reservation:v1:restaurante-olimpico:miraflores
```

Convenciones de almacenamiento de la reserva:

- Se usa exclusivamente `sessionStorage`.
- La reserva queda aislada por restaurante, sucursal y pestaña.
- `checkoutToken` se conserva únicamente para que SPEC 10 pueda autenticar checkout y consulta de pago.
- El valor no contiene `customer`, `Idempotency-Key`, payload enviado, errores ni respuestas crudas.
- Una forma inválida, versión desconocida, slug distinto o `expiresAt` vencido se descarta y elimina cuando sea posible.
- Un fallo de `sessionStorage` no oculta una creación exitosa; el resumen continúa en memoria y muestra que no sobrevivirá a una recarga.

El traspaso degradado del carrito reutiliza `storedPublicCartSchema` y no añade PII:

```ts
const publicReservationCartHandoffSchema = z.object({
  version: z.literal(1),
  restaurantSlug: publicSlugSchema,
  branchSlug: publicSlugSchema,
  createdAt: z.iso.datetime({ offset: true }),
  cart: storedPublicCartSchema,
});
```

Clave del traspaso:

```text
public-reservation-cart-handoff:v1:{restaurantSlug}:{branchSlug}
```

El traspaso solo se crea cuando el carrito está en modo memoria. Se valida y reconcilia en `/reserve`; no sustituye la persistencia normal de siete días de SPEC 08 ni se envía por URL.

El estado visible del flujo se mantiene discriminado:

```ts
type PublicReservationView =
  | "loading-context"
  | "invalid-context"
  | "cart-review-required"
  | "form"
  | "submitting"
  | "created"
  | "expired";
```

Los tres pasos forman parte de `form`. El estado remoto de disponibilidad permanece en TanStack Query y los valores editables permanecen en React Hook Form.

## Plan de implementación

1. Verificar antes de tocar el frontend que el preflight del backend admite `Idempotency-Key`; si no lo admite, detener `/spec-impl` y resolver ese requisito fuera de esta spec.
2. Ejecutar `bunx --bun shadcn@latest add calendar popover`, revisar los archivos y dependencias generados, y no sobrescribir `button.tsx` ni otros componentes instalados.
3. Crear `src/features/public-reservation/contracts/public-reservation.schemas.ts` con schemas de fecha, hora, disponibilidad, cliente, formulario, payload, respuesta y almacenamiento sin PII.
4. Crear `src/features/public-reservation/lib/public-reservation-date.ts` para validar fechas de calendario, obtener el día actual de Lima, construir límites del Date Picker y formatear `YYYY-MM-DD` sin `toISOString()`.
5. Crear `src/features/public-reservation/lib/public-reservation-idempotency.ts` para normalizar payloads, estabilizar items, generar UUID y decidir cuándo reutilizar o reemplazar una clave.
6. Crear `src/features/public-reservation/lib/public-reservation-storage.ts` para claves versionadas, lectura Zod, escritura, expiración y eliminación segura en `sessionStorage`.
7. Añadir al módulo de almacenamiento el traspaso temporal del carrito para el caso en que `localStorage` no esté disponible.
8. Extender `src/features/public-api/api/request-public-json.ts` con opciones de método, body y headers sin alterar el comportamiento de las consultas públicas existentes.
9. Crear `src/features/public-reservation/api/public-reservation-client.ts` con `GET /availability` y `POST /temporary`, codificación segura de slugs, query params, JSON y `Idempotency-Key`.
10. Extender `src/features/public-api/query/public-query-keys.ts` con una clave de disponibilidad aislada por restaurante, sucursal, fecha y personas.
11. Crear `src/features/public-reservation/query/public-reservation-query.ts` con consulta explícita de disponibilidad y mutación sin reintento automático para reserva temporal.
12. Crear `src/features/public-reservation/lib/public-reservation-errors.ts` para mapear los códigos contractuales a estados persistentes y acciones recuperables sin depender de `message`.
13. Extender el contexto del carrito con restaurante, sucursal y capacidad de preparar el traspaso degradado sin exponer detalles de almacenamiento a los componentes visuales.
14. Actualizar `PublicCartSheet.tsx` para calcular elegibilidad, explicar platos no disponibles o no verificados y habilitar navegación solo con carrito completo y API real.
15. Integrar en “Continuar con la reserva” el traspaso por `sessionStorage` cuando el carrito esté en memoria y cancelar la navegación con `Alert` si tampoco puede escribirse allí.
16. Crear `src/features/public-reservation/components/PublicReservationDatePicker.tsx` componiendo `Popover`, `Calendar`, `Button`, label, descripción y error de campo accesible.
17. Crear `PublicReservationAvailabilityStep.tsx` con Date Picker, cantidad de personas, límites de sucursal y botón “Ver horarios”.
18. Crear `PublicReservationTimeStep.tsx` con carga, reintento, vacío y selección única por teclado de `availableTimes`.
19. Crear `PublicReservationCustomerStep.tsx` con React Hook Form, nombre, email, teléfono E.164, normalización y errores asociados.
20. Crear `PublicReservationReview.tsx` con sucursal, fecha, hora, personas, platos reconciliados, cantidades y subtotal estimado antes del envío.
21. Crear `PublicReservationCountdown.tsx` con temporizador monotónico, anuncio moderado, formato `mm:ss`, expiración a cero y respeto por `prefers-reduced-motion`.
22. Crear `PublicReservationSummary.tsx` con snapshots congelados, total, expiración, estado `pending_payment` y “Continuar al pago” deshabilitado y explicado.
23. Crear `PublicReservationFlow.tsx` para coordinar los tres pasos visibles, bloquear progresión, invalidar horarios, gestionar el intento idempotente y enfocar errores.
24. Implementar en el flujo el tratamiento específico de `RESERVATION_TIME_UNAVAILABLE` para conservar valores, limpiar hora y reconsultar disponibilidad.
25. Implementar `DISH_NOT_AVAILABLE` mediante reconsulta del menú, reconciliación y regreso explícito al menú sin eliminar automáticamente ningún plato.
26. Implementar reintentos manuales de red o respuesta inválida con el mismo payload y la misma clave, sin duplicar envíos pendientes.
27. Crear `src/features/public-reservation/PublicReservationApp.tsx` para validar query, cargar sucursal, carrito y menú, resolver el traspaso, restaurar reservas y componer estados.
28. Escuchar cambios del carrito persistente antes de crear la reserva; reconciliar el snapshot y generar una nueva clave si cambia el payload.
29. Después de una creación válida, guardar la versión sin PII, congelar el resumen y dejar de reaccionar a cambios posteriores del carrito.
30. Al restaurar una reserva vigente, mostrar directamente el resumen; al detectar expiración, eliminarla y habilitar un nuevo flujo con el carrito existente.
31. Crear `src/pages/reserve.astro` como página pública prerenderizada, con encabezado, navegación de regreso, isla `client:load` y composición responsive.
32. Extender `src/layouts/Layout.astro` con una prop opcional para `robots` y usar `noindex, nofollow` únicamente en `/reserve`.
33. Crear pruebas de contratos y cliente API para schemas, normalización, URLs, headers, `200/201`, errores y ausencia de solicitudes reales.
34. Crear pruebas de fechas e idempotencia para Lima, límites, cambios de payload, replay exacto y ausencia de reintentos automáticos.
35. Crear pruebas de almacenamiento para aislamiento por slug y pestaña, omisión de PII, token, corrupción, expiración, fallo de storage y traspaso del carrito.
36. Crear pruebas de UI para tres pasos, bloqueos, Date Picker, disponibilidad, vacío, teléfono, revisión, foco, envío duplicado y estados contractuales.
37. Crear pruebas de resumen y countdown para creación, restauración, segunda reserva bloqueada, expiración y botón de pago deshabilitado.
38. Crear pruebas de integración del carrito para elegibilidad, fixtures, navegación, almacenamiento degradado, reconciliación y conservación tras crear la reserva.
39. Ejecutar `bun test`, `bun run check` y `bun run build`; verificar manualmente preflight, API real, teclado, foco, recarga, countdown y responsive a 320 px.

## Criterios de aceptación

- [ ] El backend utilizado para la prueba responde al preflight permitiendo `Idempotency-Key`.
- [ ] La implementación frontend no modifica archivos del backend para resolver ese requisito.
- [ ] `Calendar` y `Popover` se añaden mediante `bunx --bun shadcn@latest add calendar popover`.
- [ ] El Date Picker se compone con los componentes shadcn instalados y no depende de un registro inexistente llamado `Date Picker`.
- [ ] No se sobrescriben componentes shadcn existentes sin revisar diferencias.
- [ ] “Continuar con la reserva” permanece deshabilitado cuando el carrito está vacío.
- [ ] Un carrito con cualquier plato agotado, retirado o no verificado no puede continuar.
- [ ] El bloqueo indica cuáles platos requieren corrección y no depende solo del color.
- [ ] Un carrito no vacío cuyos platos están todos disponibles puede continuar.
- [ ] Con `PUBLIC_USE_MENU_FIXTURE=true`, la continuación queda deshabilitada y explica que las reservas requieren la API real.
- [ ] Con `PUBLIC_USE_MENU_FIXTURE=false`, un carrito real elegible navega a `/reserve?branch=<branchSlug>`.
- [ ] La URL contiene únicamente el slug de sucursal y nunca platos, cantidades, cliente, token o clave idempotente.
- [ ] Si `localStorage` funciona, `/reserve` restaura el carrito versionado de la sucursal correcta.
- [ ] Si el carrito está en memoria, se intenta un traspaso validado mediante `sessionStorage` antes de navegar.
- [ ] Si ambos almacenamientos fallan, la navegación no ocurre y un `Alert` persistente explica el problema.
- [ ] Un traspaso de otra sucursal o restaurante se ignora.
- [ ] `/reserve` sin `branch` muestra un estado recuperable y no consulta disponibilidad ni crea reservas.
- [ ] Un slug malformado o desconocido no construye una reserva parcial.
- [ ] Una sucursal ausente del descubrimiento público ofrece volver al selector de sucursal.
- [ ] Un carrito vacío, vencido o inválido ofrece volver al menú de la sucursal cuando el slug sea válido.
- [ ] `/reserve` vuelve a consultar el menú y reconcilia el carrito antes de habilitar el formulario.
- [ ] Un fallo del menú marca la selección como no verificada y bloquea la creación con reintento visible.
- [ ] La página muestra simultáneamente los encabezados de los tres pasos.
- [ ] El paso de horario explica que primero debe consultarse fecha y personas.
- [ ] El paso de cliente explica que primero debe elegirse un horario.
- [ ] Los controles de un paso bloqueado no son operables ni reciben foco de forma engañosa.
- [ ] El Date Picker tiene nombre accesible, puede abrirse, recorrerse y cerrarse con teclado y devuelve el foco al disparador.
- [ ] La fecha seleccionada se envía como `YYYY-MM-DD` de Lima y no se desplaza un día por conversión UTC.
- [ ] El calendario no permite fechas anteriores al día actual en `America/Lima`.
- [ ] El calendario limita de forma orientativa la selección según `maximumAdvanceDays` de la sucursal.
- [ ] El frontend no calcula la anticipación mínima ni inventa horarios para completar un día.
- [ ] Personas acepta únicamente enteros desde `1` hasta `maxPartySize`.
- [ ] El máximo visible procede de la sucursal pública actual.
- [ ] Una regla desactualizada sigue siendo rechazada correctamente por el backend.
- [ ] Completar fecha y personas no consulta automáticamente disponibilidad.
- [ ] Activar “Ver horarios” realiza una única consulta con `date` y `partySize` válidos.
- [ ] Mientras la consulta está pendiente, el botón evita solicitudes duplicadas y comunica la carga.
- [ ] La respuesta se valida con Zod antes de mostrar horarios.
- [ ] Solo se muestran valores incluidos en `availableTimes`.
- [ ] Los horarios mantienen formato `HH:mm`, orden comprensible y selección única.
- [ ] Cada horario se puede seleccionar solo con teclado y comunica su estado seleccionado.
- [ ] Cambiar fecha elimina la selección horaria y exige volver a consultar.
- [ ] Cambiar personas elimina la selección horaria y exige volver a consultar.
- [ ] `availableTimes: []` muestra que no existen horarios sin tratar la respuesta como error.
- [ ] El estado sin horarios permite cambiar fecha o personas sin regresar al menú.
- [ ] La duración mostrada coincide con `durationMinutes` de la respuesta.
- [ ] `VALIDATION_ERROR` de disponibilidad conserva los valores editables y muestra una corrección persistente.
- [ ] `RESERVATION_TIME_UNAVAILABLE` por exceso de personas informa el máximo conocido de la sucursal.
- [ ] `PUBLIC_RESERVATION_NOT_FOUND` presenta la sucursal como no disponible y evita nuevas solicitudes parciales.
- [ ] Un error de red o respuesta inválida de disponibilidad muestra reintento persistente.
- [ ] Nombre completo exige entre 2 y 150 caracteres después de `trim`.
- [ ] Email exige formato válido, admite hasta 320 caracteres y se envía en minúsculas.
- [ ] El teléfono muestra `+51987654321` como ejemplo de E.164 completo.
- [ ] Espacios y guiones del teléfono se eliminan antes de validarlo y enviarlo.
- [ ] El frontend no añade `+51` ni otro prefijo automáticamente.
- [ ] Un teléfono normalizado sin `+` o con menos de 8 o más de 15 dígitos impide el envío.
- [ ] Cada error local aparece junto a su control y el primer campo inválido recibe foco.
- [ ] Nombre, email y teléfono no se escriben en `localStorage`, `sessionStorage`, URL ni logs.
- [ ] Recargar antes de crear la reserva obliga a introducir de nuevo los datos del cliente.
- [ ] La revisión previa muestra sucursal, fecha, hora, personas, platos y cantidades.
- [ ] El subtotal previo usa únicamente platos reconciliados disponibles y céntimos enteros.
- [ ] El payload contiene únicamente fecha, hora, personas, cliente normalizado, `dishId` y cantidad.
- [ ] El payload no envía nombre local, imagen, precio, subtotal, disponibilidad ni objetos completos del menú.
- [ ] Cada `dishId` aparece una sola vez y conserva una cantidad entre 1 y 99.
- [ ] El primer envío válido genera un `Idempotency-Key` UUID.
- [ ] El header llega exactamente como `Idempotency-Key` y no dentro del body o la URL.
- [ ] Mientras el `POST` está pendiente, el botón queda deshabilitado y una segunda activación no crea otra solicitud.
- [ ] La mutación no realiza reintentos automáticos.
- [ ] Un error de red conserva todos los valores y permite reintentar manualmente con la misma clave y payload.
- [ ] Una respuesta inválida conserva la misma clave para un replay seguro.
- [ ] Cambiar cualquier dato del payload genera una clave nueva en el siguiente envío.
- [ ] Cambiar el carrito antes de crear la reserva genera una clave nueva.
- [ ] Una recarga durante una respuesta perdida no persiste ni recupera el payload con PII.
- [ ] Una respuesta `201` válida crea el estado de resumen.
- [ ] Una respuesta `200` de replay idempotente crea el mismo estado de resumen sin duplicarlo.
- [ ] `RESERVATION_TIME_UNAVAILABLE` conserva fecha, personas y cliente, limpia la hora y vuelve a consultar disponibilidad.
- [ ] El horario que dejó de estar disponible no permanece visualmente seleccionado.
- [ ] `DISH_NOT_AVAILABLE` vuelve a consultar el menú y reconcilia el carrito.
- [ ] Ningún plato se elimina automáticamente ante `DISH_NOT_AVAILABLE`.
- [ ] El usuario recibe un enlace al menú para corregir platos no disponibles.
- [ ] `IDEMPOTENCY_KEY_REUSED` no se reintenta automáticamente y exige revisar un nuevo intento.
- [ ] `PUBLIC_RESERVATION_NOT_FOUND` bloquea el envío y ofrece volver al descubrimiento público.
- [ ] Los errores remotos mueven el foco al `Alert` persistente y no dependen de un toast.
- [ ] Todas las respuestas exitosas se validan con Zod antes de entrar en estado o almacenamiento.
- [ ] Una respuesta sin `checkoutToken` válido se trata como respuesta inválida.
- [ ] Una reserva creada se guarda en `public-reservation:v1:{restaurantSlug}:{branchSlug}`.
- [ ] El valor guardado incluye versión, slugs, reserva, snapshots, total, timestamps y `checkoutToken`.
- [ ] El valor guardado omite `customer`, `Idempotency-Key`, payload y respuestas crudas.
- [ ] El `checkoutToken` nunca se muestra, registra ni incluye en enlaces.
- [ ] Una forma corrupta, versión desconocida o slugs distintos se descarta sin romper la página.
- [ ] Una reserva vencida se elimina de `sessionStorage` cuando sea posible.
- [ ] Un fallo de escritura mantiene visible el resumen en memoria y advierte que se perderá al recargar.
- [ ] Recargar con una reserva vigente muestra directamente su resumen sin volver a enviar `POST`.
- [ ] Una reserva vigente impide abrir el formulario para bloquear otra mesa de la misma sucursal y pestaña.
- [ ] Otra pestaña no recibe automáticamente la reserva ni el `checkoutToken`.
- [ ] Crear la reserva no vacía ni modifica el carrito de SPEC 08.
- [ ] Cambiar el carrito después de crear la reserva no altera sus platos ni total congelados.
- [ ] El resumen muestra estado pendiente, sucursal, horario, duración, personas, líneas y total en PEN.
- [ ] El resumen restaurado no muestra nombre, email ni teléfono.
- [ ] El countdown inicial deriva su duración de `createdAt` y `expiresAt` del servidor.
- [ ] Durante la sesión montada, el countdown usa tiempo monotónico y no crea un intervalo por render.
- [ ] El countdown tiene texto accesible y no anuncia cada segundo a lectores de pantalla.
- [ ] Restaurar compara `expiresAt` con el reloj disponible y documenta al backend como autoridad final.
- [ ] Al llegar a cero se muestra “Reserva vencida” y desaparece la acción futura de pago.
- [ ] Después de vencer puede consultarse nuevamente disponibilidad con el carrito conservado.
- [ ] Después de una recarga o expiración deben introducirse nuevamente los datos del cliente.
- [ ] “Continuar al pago” está visible, deshabilitado y asociado a una explicación sobre la siguiente spec.
- [ ] Ninguna interacción llama a `/checkout`, `/payment`, Stripe ni un endpoint de confirmación.
- [ ] `/reserve` contiene `noindex, nofollow` sin aplicarlo por accidente al inicio o al menú.
- [ ] Carga, contexto inválido, carrito inválido, vacío, error, creación y expiración tienen estados persistentes.
- [ ] El flujo completo puede operarse con teclado y mantiene foco visible.
- [ ] Calendario, horarios, formularios, alertas y resumen no generan desplazamiento horizontal a 320 px.
- [ ] Las pruebas no realizan solicitudes reales, no dependen del reloj real y no esperan quince minutos.
- [ ] `bun test` finaliza sin errores.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.
- [ ] No se modifica el backend ni se implementan fixtures de reserva, checkout, Stripe, polling, confirmación, cancelación o gestión staff.

## Decisiones

- **Sí:** continuar con disponibilidad y reserva temporal inmediatamente después de SPEC 08.
- **Sí:** separar checkout, Stripe y confirmación de pago en una spec posterior.
- **Sí:** terminar esta spec al obtener una reserva `pending_payment`, mostrar su resumen y mantener su countdown.
- **Sí:** crear `/reserve?branch=<branchSlug>` en vez de ampliar el `Sheet` del carrito.
- **No:** serializar el carrito o datos del cliente en la URL.
- **Sí:** usar una única página con tres pasos visibles y progresión bloqueada hasta completar cada requisito.
- **No:** ocultar pasos futuros en un wizard que impida comprender el flujo completo.
- **Sí:** consultar disponibilidad mediante un botón explícito “Ver horarios”.
- **No:** consultar automáticamente con cada cambio de fecha o personas.
- **Sí:** usar la respuesta del backend como única fuente de horarios disponibles.
- **No:** calcular anticipación, intervalos, duración o mesas en el frontend.
- **Sí:** usar el Date Picker de shadcn compuesto con `Calendar` y `Popover`.
- **No:** instalar un supuesto componente independiente `Date Picker` ni otra librería de calendario.
- **Sí:** calcular los límites visuales del calendario en `America/Lima` y enviar `YYYY-MM-DD` sin convertir a UTC.
- **Sí:** permitir entre 1 y `maxPartySize` personas según la sucursal pública.
- **Sí:** mostrar un estado vacío y recuperable cuando no existan horarios.
- **Sí:** exigir nombre, email y teléfono E.164 completo.
- **Sí:** eliminar espacios y guiones del teléfono antes de validarlo.
- **No:** asumir que todos los clientes usan `+51` ni añadir el prefijo automáticamente.
- **Sí:** mantener PII solo en memoria durante el formulario.
- **No:** persistir el formulario completo para recuperar una recarga o una respuesta de red incierta.
- **Sí:** usar React Hook Form, Zod y `zodResolver` según SPEC 04.
- **Sí:** generar y administrar `Idempotency-Key` en el cliente.
- **Sí:** reutilizar la clave únicamente para un replay manual del mismo payload normalizado.
- **No:** reintentar automáticamente `POST /temporary`.
- **Sí:** generar una clave nueva cuando cambie cualquier parte del payload.
- **Sí:** conservar el intento idempotente completo solo en memoria.
- **Sí:** tratar el `POST` como autoridad final porque la disponibilidad consultada puede quedar obsoleta.
- **Sí:** ante horario perdido, conservar los demás datos, limpiar la hora y reconsultar.
- **Sí:** ante plato no disponible, reconciliar y pedir corrección explícita.
- **No:** eliminar platos del carrito silenciosamente.
- **Sí:** conservar el carrito hasta que el pago sea confirmado en una spec posterior.
- **No:** vaciar el carrito al crear el bloqueo temporal.
- **Sí:** guardar la reserva sin PII y su `checkoutToken` en `sessionStorage` hasta `expiresAt`.
- **No:** usar `localStorage` para la reserva ni compartirla entre pestañas.
- **Sí:** usar `public-reservation:v1:{restaurantSlug}:{branchSlug}` como clave versionada.
- **Sí:** impedir otra reserva de la misma sucursal y pestaña mientras exista una vigente.
- **No:** ofrecer cancelación local porque el backend no tiene endpoint de cancelación.
- **Sí:** restaurar directamente el resumen de una reserva vigente.
- **Sí:** eliminar el valor vencido y permitir empezar de nuevo con el carrito existente.
- **Sí:** omitir siempre la PII del resumen persistible.
- **Sí:** mostrar “Continuar al pago” deshabilitado como punto de integración para la siguiente spec.
- **No:** iniciar Stripe, checkout o polling desde esta spec.
- **Sí:** usar `Alert` y estados persistentes para errores y conflictos.
- **No:** añadir un toaster público para información que requiere lectura y acción.
- **Sí:** intentar `sessionStorage` como traspaso cuando el carrito funciona solo en memoria.
- **No:** navegar si no existe ningún canal seguro para transferir el carrito.
- **Sí:** exigir `PUBLIC_USE_MENU_FIXTURE=false` para reservas reales.
- **No:** crear disponibilidad o reservas simuladas para platos fixture.
- **Sí:** exigir como prerrequisito que el backend permita `Idempotency-Key` mediante CORS.
- **No:** añadir un BFF Astro para ocultar una configuración CORS incompleta del API público.
- **No:** modificar el backend desde esta spec frontend.
- **Sí:** aceptar que, después de recargar, la expiración solo puede compararse con el reloj del dispositivo.
- **Sí:** mantener al backend como autoridad definitiva del estado pagable en la siguiente spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El navegador bloquea el POST porque CORS no admite `Idempotency-Key` | Exigir la corrección previa en el backend, verificar el preflight antes de implementar y no añadir un proxy BFF como parche. |
| Un horario desaparece entre el GET y el POST | Tratar disponibilidad como orientativa, conservar los campos, limpiar la hora y reconsultar ante `RESERVATION_TIME_UNAVAILABLE`. |
| Un plato cambia de precio o disponibilidad durante el formulario | Reconciliar al entrar y ante cambios del carrito; dejar que el POST valide y congele los valores definitivos. |
| Una respuesta de red se pierde después de crear la reserva | Conservar payload y clave en memoria para replay manual idéntico. |
| El usuario recarga durante una respuesta incierta | No persistir PII; documentar que el intento no puede recuperarse automáticamente y que el bloqueo huérfano vencerá en quince minutos. |
| Un reintento usa la misma clave con un payload modificado | Comparar el payload normalizado completo y generar una clave nueva ante cualquier diferencia. |
| Una segunda reserva bloquea otra mesa sin posibilidad de cancelar | Restaurar y mostrar la reserva vigente; bloquear un nuevo formulario hasta `expiresAt`. |
| El reloj del dispositivo está desajustado al restaurar | Usar timestamps del servidor durante la creación, reconocer la limitación tras recarga y validar vigencia definitivamente al iniciar checkout en la siguiente spec. |
| `checkoutToken` queda expuesto por URL, logs o UI | Conservarlo solo en `sessionStorage`, omitirlo de renderizado y errores, y probar que no aparece en enlaces. |
| Un XSS accede al token guardado en `sessionStorage` | Mantener dependencias controladas, evitar HTML no confiable y limitar el token a la pestaña y vigencia de la reserva. |
| `sessionStorage` está bloqueado o lleno después de crear | Mantener el resumen en memoria, mostrar advertencia y no anunciar recuperación tras recarga. |
| `localStorage` falla al navegar desde el carrito | Transferir un snapshot validado y sin PII mediante `sessionStorage`; si también falla, no abandonar el menú. |
| Una fecha cambia de día por usar UTC | Construir y formatear fechas por componentes de calendario de Lima, sin `toISOString()` para el valor `YYYY-MM-DD`. |
| El límite visual de fecha no coincide exactamente con la ventana por horas | Mantenerlo orientativo y mostrar únicamente los horarios filtrados por el backend. |
| El teléfono parece válido visualmente pero no cumple E.164 | Mostrar ejemplo, normalizar solo espacios/guiones y validar el valor final con la misma expresión contractual. |
| El modo fixture permite seleccionar IDs inexistentes en backend | Deshabilitar continuación mientras `PUBLIC_USE_MENU_FIXTURE=true` y exigir `false` para el flujo real. |
| El carrito cambia en otra pestaña durante el formulario | Escuchar su clave, reconciliar antes del POST e invalidar la clave idempotente si cambia el payload. |
| El carrito cambia después de crear la reserva | Separar el resumen congelado del estado del carrito y no recalcular la reserva creada. |
| El countdown anuncia cada segundo y satura al lector de pantalla | Actualizar visualmente por segundo y anunciar únicamente hitos relevantes y expiración. |
| Un calendario dentro de Popover pierde foco o navegación móvil | Usar la composición shadcn, probar teclado, retorno de foco, viewport estrecho y áreas táctiles. |
| Los errores transitorios desaparecen antes de poder actuar | Usar `Alert` persistente con foco y acción de reintento, sin depender de Sonner. |

## Lo que **no** está en esta spec

- Cambios CORS o de cualquier otro tipo en el backend.
- BFF o proxy público en Astro.
- Fixtures de disponibilidad o reservas.
- Cálculo frontend de mesas u horarios.
- Persistencia de PII o del payload idempotente.
- Recuperación automática de un POST incierto después de recargar.
- Checkout o creación de sesiones de Stripe.
- Redirección a Stripe.
- Polling de estado de pago.
- Confirmación, cancelación o reprogramación de reservas.
- Vaciado del carrito antes de confirmar el pago.
- Sincronización de reservas entre pestañas o dispositivos.
- Cuenta, historial o autenticación del cliente.
- Emails, SMS o comprobantes.
- Impuestos, descuentos, promociones, propinas o cargos.
- CAPTCHA, rate limiting o analítica.
- Administración staff de reservas.
- Cambios en modelos, endpoints o reglas del backend.
- Rediseño general del menú y del sitio público.

Checkout, pago, confirmación asíncrona y limpieza final del carrito deberán definirse en una spec independiente.
