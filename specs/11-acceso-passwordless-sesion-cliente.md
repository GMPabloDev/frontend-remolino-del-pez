# SPEC 11 — Acceso passwordless y sesión del cliente

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 03, SPEC 10
> **Fecha:** 2026-08-04
> **Objetivo:** Permitir que el cliente acceda sin contraseña mediante magic links, mantenga una sesión segura y consulte su perfil mínimo desde un área protegida.

## Por qué existe esta spec

SPEC 10 confirma el pago y avisa que el correo se procesa por separado, pero el frontend todavía no puede consumir el magic link enviado por el backend ni restaurar una sesión de cliente.

El backend ya expone solicitud manual, intercambio de magic links, rotación de refresh token, logout y perfil mínimo. La consulta de reservas permanece separada porque el contrato vigente todavía no ofrece listado ni detalle de reservas del cliente.

## Alcance

**Incluido:**

- Crear `src/features/customer-auth/` como módulo independiente de `staff-auth` para contratos, BFF, cliente autenticado, sesión, coordinación entre pestañas, errores y componentes.
- Mantener completamente separadas las cookies, canales, locks, tokens, estados y cachés de clientes y trabajadores.
- Reutilizar el patrón de seguridad de staff: refresh token en cookie `HttpOnly`, access token solo en memoria y BFF Astro para intercambio, refresh y logout.
- Extraer únicamente las primitivas genéricas necesarias de coordinación de refresh y validación de origen para evitar que customer-auth dependa de carpetas de staff.
- Crear `POST /api/customer-auth/magic-links` para solicitar un enlace mediante el BFF.
- Crear `POST /api/customer-auth/exchange` para intercambiar el token opaco y establecer la cookie de refresh.
- Crear `POST /api/customer-auth/refresh` para rotar la sesión y sustituir siempre la cookie por el último refresh token.
- Crear `POST /api/customer-auth/logout` para revocar la sesión cuando sea posible y eliminar siempre la cookie local.
- Validar el origen de todas las mutaciones del BFF antes de leer bodies o cookies.
- Usar una cookie exclusiva llamada `customer_refresh_token`, con `HttpOnly`, `SameSite=Strict`, `Secure` en producción, path `/api/customer-auth` y vigencia máxima de treinta días.
- No devolver nunca el refresh token desde el BFF al navegador ni exponerlo a JavaScript.
- Mantener el access token únicamente dentro del controlador de sesión y mensajes transitorios entre pestañas; nunca en cookies legibles, Web Storage, URL, HTML o logs.
- Exigir que el `restaurantSlug` del perfil coincida con `PUBLIC_RESTAURANT_SLUG` antes de aceptar o restaurar una sesión.
- Revocar o descartar de forma segura una autenticación que pertenezca a otro restaurante.
- Crear `/customer/access` para solicitar manualmente un magic link con el restaurante configurado y un email válido.
- No aceptar un slug de restaurante escrito por el usuario ni procedente de la query para construir la solicitud manual.
- Mantener el email solamente en memoria durante el formulario.
- Mostrar la misma confirmación genérica para toda respuesta `202`, sin revelar si restaurante, cuenta o correo existen.
- Deshabilitar otro envío durante sesenta segundos en el montaje actual sin persistir email ni cooldown.
- Mantener el backend como autoridad del cooldown; recargar la página no evita su límite real.
- Crear `/auth/magic-link?token=...` conforme a `CUSTOMER_MAGIC_LINK_URL` del backend.
- Añadir una preparación cliente temprana que lea el token y lo retire mediante `history.replaceState` antes de iniciar el intercambio y antes de renderizarlo en una isla.
- Mantener el token retirado únicamente en memoria durante el intercambio y sus reintentos de red.
- Añadir `Referrer-Policy: no-referrer` a la página del magic link para reducir exposición durante la navegación inicial.
- Intercambiar el token mediante el BFF y redirigir con `window.location.replace` a `/customer/account` después de una respuesta válida.
- Mostrar un único estado para enlaces ausentes, vencidos, consumidos, invalidados o inexistentes.
- Ofrecer desde ese estado una acción hacia `/customer/access` para solicitar otro enlace.
- Ante un error de red durante el intercambio, conservar el token solo en memoria y permitir reintento manual.
- Después de recargar un intercambio fallido, exigir solicitar otro enlace porque el token ya no permanecerá en URL ni almacenamiento.
- Crear `/customer/account` como shell Astro sin datos privados y una isla React que restaura la sesión antes de mostrar contenido.
- Consultar `GET /customer-auth/me` con el bearer de cliente y validar el perfil antes de renderizarlo.
- Mostrar únicamente nombre, email, teléfono y restaurante en el área protegida.
- Mostrar una acción para cerrar sesión.
- Redirigir desde `/customer/account` hacia `/customer/access` cuando no exista una sesión recuperable.
- Permanecer en `/customer/account` con un estado persistente y acción de reintento cuando falle la red o el backend no esté disponible.
- Redirigir desde `/customer/access` a `/customer/account` cuando ya exista una sesión válida.
- Restaurar la sesión al montar mediante el BFF de refresh sin leer la cookie desde JavaScript.
- Serializar cada refresh dentro de la pestaña y entre pestañas para no reutilizar en paralelo un token rotativo.
- Compartir de forma transitoria la autenticación recién rotada mediante un canal exclusivo de customer-auth, sin escribir tokens en `localStorage`.
- Propagar logout e invalidación de sesión a las demás pestañas del mismo origen.
- Limpiar la caché autenticada cuando la sesión deje de estar autenticada.
- Ante `CUSTOMER_AUTH_REQUIRED`, ejecutar como máximo un refresh coordinado y repetir la petición original una sola vez.
- Ante `INVALID_CUSTOMER_REFRESH_TOKEN`, eliminar la cookie, invalidar la sesión y no reintentar automáticamente.
- Tratar `403` y errores contractuales como errores definitivos de la petición; no resolverlos mediante refresh.
- Añadir “Acceso clientes” en el inicio, menú público y confirmación de pago.
- Añadir en la confirmación un mensaje prudente: el acceso se procesa por correo y puede solicitarse uno nuevo si no llega.
- No afirmar que SMTP entregó el correo ni que una cuenta existe antes de autenticar.
- Marcar `/customer/access`, `/auth/magic-link` y `/customer/account` con `noindex, nofollow`.
- Reutilizar `Layout`, `Button`, `Input`, `Field`, `Alert`, `Badge` y `Separator` sin instalar dependencias ni componentes shadcn nuevos.
- Mantener carga, éxito genérico, enlace inválido, error de red, sesión ausente, backend no disponible, perfil y logout mediante contenido persistente y accesible.
- Mantener navegación por teclado, foco visible, foco gestionado en errores y diseño sin desplazamiento horizontal a 320 px.
- Añadir pruebas automatizadas de contratos, BFF, cookies, sesión, coordinación, cliente autenticado, formularios, rutas y UI.
- Verificar manualmente solicitud, recepción, limpieza de URL, intercambio, restauración, refresh, varias pestañas y logout mediante un magic link real.

**Fuera de alcance para futuras specs:**

- Listar, consultar o mostrar reservas del cliente.
- Mostrar historial de pagos o intentos de pago.
- Cancelar, reprogramar o modificar reservas.
- Solicitar reembolsos.
- Editar nombre, email o teléfono del perfil.
- Crear cuentas antes de un pago confirmado.
- Añadir registro, contraseña, recuperación de contraseña, OAuth o redes sociales.
- Compartir una identidad entre restaurantes diferentes.
- Cambiar endpoints, tokens, sesiones, correo, SMTP o modelos del backend.
- Verificar desde el frontend si Gmail aceptó o entregó el correo.
- Reintentar automáticamente correos fallidos.
- Persistir access tokens, refresh tokens, magic links o email en `localStorage` o `sessionStorage`.
- Usar cookies backend de sesión de cliente; la cookie definida aquí pertenece exclusivamente al BFF Astro.
- Incorporar CAPTCHA, rate limiting por IP, analítica o telemetría con PII.
- Crear una administración staff de clientes.
- Instalar dependencias o componentes visuales nuevos.

## Modelo de datos

Los schemas Zod son la fuente de verdad para formularios, respuestas remotas y contratos entre el navegador y el BFF. Los tipos TypeScript se infieren desde ellos.

La solicitud manual usa el restaurante configurado y no lo recibe del formulario:

```ts
const customerMagicLinkRequestSchema = z.object({
  email: z.string().trim().max(320).pipe(z.email()).transform(toLowerCase),
});

const customerMagicLinkAcceptedSchema = z.object({
  message: z.string().min(1),
});
```

El BFF añade `runtimeConfig.restaurantSlug` al endpoint remoto. El email no se incluye en URL, logs, almacenamiento ni mensajes de éxito.

El magic link permanece opaco:

```ts
const customerMagicLinkExchangeSchema = z.object({
  token: z.string().min(1).max(2048),
});
```

El frontend no decodifica, normaliza ni interpreta el token. Solo elimina espacios accidentales de los extremos si el contrato remoto lo admite; cualquier otra transformación queda prohibida.

El perfil mínimo conserva el contrato backend exacto:

```ts
const customerProfileSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  restaurantSlug: publicSlugSchema,
});
```

La respuesta privada del backend contiene ambos tokens:

```ts
const backendCustomerAuthenticationSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  customer: customerProfileSchema,
});
```

Solo el servidor Astro puede usar esa forma completa. La respuesta del BFF elimina estructuralmente el refresh token:

```ts
const customerSessionResponseSchema = z.object({
  accessToken: z.string().min(1),
  customer: customerProfileSchema,
});
```

Invariantes del BFF:

- `customer.restaurantSlug` debe coincidir exactamente con `PUBLIC_RESTAURANT_SLUG`.
- El refresh token se escribe en la cookie antes de responder al navegador.
- La respuesta JSON nunca contiene `refreshToken`.
- Un error de autenticación borra una cookie inválida cuando corresponda.
- Un error o perfil cruzado no deja una cookie nueva activa.
- Las respuestas y excepciones no incluyen tokens ni bodies remotos completos.

La cookie usa estas convenciones:

```text
Nombre: customer_refresh_token
Path: /api/customer-auth
HttpOnly: true
SameSite: Strict
Secure: true en producción
Max-Age: 2592000 segundos
```

No existe un modelo persistido de sesión en JavaScript. El estado vive en memoria:

```ts
type CustomerSessionStatus =
  | "checking"
  | "anonymous"
  | "authenticated"
  | "unavailable";

interface CustomerSessionSnapshot {
  status: CustomerSessionStatus;
  customer: CustomerProfile | null;
  accessToken: string | null;
}
```

`unavailable` significa que no fue posible comprobar la cookie por un problema recuperable de red o backend. No equivale a sesión inválida y no debe borrar la cookie.

Los mensajes entre pestañas pertenecen a un canal versionado y exclusivo:

```ts
type CustomerAuthMessage =
  | { type: "session-refreshed"; authentication: CustomerSessionResponse }
  | { type: "logout" }
  | { type: "session-invalidated" };
```

Convenciones del canal:

- La autenticación viaja únicamente como mensaje transitorio de `BroadcastChannel`.
- Ningún token se usa como payload de eventos persistidos en `localStorage`.
- El fallback de almacenamiento puede transportar solo señales sin secretos.
- Locks y leases pueden escribir identificadores aleatorios y expiraciones, pero nunca tokens ni PII.
- Los nombres incluyen `customer-auth` y nunca reutilizan los de staff.

El formulario de acceso mantiene un estado local discriminado:

```ts
type CustomerAccessView =
  | "checking-session"
  | "form"
  | "submitting"
  | "request-accepted"
  | "request-error";
```

El consumidor del magic link mantiene el token fuera del estado renderizado:

```ts
type CustomerMagicLinkView =
  | "reading-token"
  | "exchanging"
  | "network-error"
  | "invalid-link"
  | "authenticated";
```

El token se conserva en una referencia privada mientras la página está montada. No forma parte de props serializadas, React Query, mensajes de error ni nodos del DOM.

## Plan de implementación

1. Verificar que `CUSTOMER_MAGIC_LINK_URL` del backend apunta a `http://localhost:4321/auth/magic-link` en desarrollo y al equivalente HTTPS en producción.
2. Verificar que el backend vigente expone solicitud, intercambio, refresh, logout y `GET /customer-auth/me` con los códigos documentados.
3. Mover `refresh-coordinator.ts` a una ubicación neutral bajo `src/lib/auth/`, conservar su API configurable y actualizar staff sin cambiar su comportamiento.
4. Mover la validación de origen a `src/lib/server/validate-request-origin.ts` y actualizar las rutas BFF de staff para reutilizarla.
5. Ejecutar las pruebas de staff después de las extracciones para asegurar que login, bootstrap, refresh coordinado y logout no cambian.
6. Crear `src/features/customer-auth/contracts/customer-auth.schemas.ts` con email, token opaco, perfil, respuesta backend y respuesta pública del BFF.
7. Crear `src/features/customer-auth/server/customer-auth-cookie.ts` con nombre, path, atributos, escritura y eliminación aislados de staff.
8. Crear `src/features/customer-auth/server/customer-auth-backend.ts` para solicitud, intercambio, refresh, logout y perfil conforme al contrato remoto.
9. Crear `src/features/customer-auth/server/customer-auth-http.ts` para parsing, respuestas y errores redactados del BFF sin incluir secretos.
10. Añadir la comprobación central de `restaurantSlug` antes de aceptar respuestas de intercambio o refresh.
11. Crear `src/pages/api/customer-auth/magic-links.ts` con validación de origen, email Zod y llamada al endpoint público del restaurante configurado.
12. Crear `src/pages/api/customer-auth/exchange.ts` para validar origen y token, intercambiarlo, comprobar restaurante, establecer la cookie y devolver solo access token y perfil.
13. Crear `src/pages/api/customer-auth/refresh.ts` para leer la cookie, rotarla, reemplazarla y borrar valores inválidos.
14. Crear `src/pages/api/customer-auth/logout.ts` con revocación remota best-effort, eliminación incondicional de cookie y respuesta `204`.
15. Crear `src/features/customer-auth/api/customer-auth-bff-client.ts` para solicitud, intercambio, refresh y logout same-origin.
16. Crear `src/features/customer-auth/session/customer-auth-channel.ts` con mensajes transitorios de refresh, logout e invalidación y nombres exclusivos.
17. Crear `src/features/customer-auth/session/customer-session.ts` con access token en memoria, bootstrap, intercambio, refresh, logout, invalidación y suscripciones.
18. Integrar el coordinador genérico con un lock `customer-auth:refresh-lock:v1` distinto del lock administrativo.
19. Hacer que las pestañas seguidoras consuman el resultado transitorio de un refresh líder cuando `BroadcastChannel` esté disponible, evitando un segundo refresh innecesario.
20. Implementar fallback sin secretos para logout e invalidación cuando `BroadcastChannel` no esté disponible.
21. Crear `src/features/customer-auth/api/customer-api-client.ts` para bearer de cliente, validación Zod, refresh único ante `CUSTOMER_AUTH_REQUIRED` y un solo replay de la petición.
22. Crear `src/features/customer-auth/query/customer-query-client.tsx` y una clave de perfil exclusiva, sin mezclar cachés de staff ni públicas.
23. Crear `CustomerAuthProvider.tsx` para bootstrap, suscripción, limpieza de caché y acceso seguro al controlador.
24. Crear `CustomerAccessForm.tsx` con React Hook Form, Zod, email normalizado, foco de error y respuesta `202` genérica.
25. Añadir al formulario el bloqueo local de sesenta segundos sin persistir email ni crear un contador anunciado cada segundo.
26. Crear `CustomerAccessApp.tsx` para comprobar sesión, redirigir usuarios autenticados y mantener disponible la solicitud anónima.
27. Crear un bootstrap temprano para `/auth/magic-link` que capture el token, aplique `history.replaceState` y lo entregue en memoria a la isla sin serializarlo.
28. Crear `CustomerMagicLinkApp.tsx` con intercambio inmediato, reintento de red en memoria, estado inválido único y redirección mediante `window.location.replace`.
29. Crear `CustomerAccountApp.tsx` con shell de carga, protección cliente, consulta `GET /customer-auth/me`, perfil mínimo y logout.
30. Implementar en la cuenta la redirección de sesión ausente y el estado recuperable de servicio no disponible sin borrar una cookie potencialmente válida.
31. Crear `src/pages/customer/access.astro`, `src/pages/auth/magic-link.astro` y `src/pages/customer/account.astro` con `noindex, nofollow` y composición pública responsive.
32. Extender `Layout.astro` con metadatos de referrer opcionales y aplicar `no-referrer` únicamente a la ruta del magic link.
33. Añadir enlaces “Acceso clientes” en `src/pages/index.astro` y `src/pages/menu.astro` sin eliminar sus indicadores ni navegación actuales.
34. Actualizar `PublicPaymentConfirmation.tsx` para explicar prudentemente el acceso por correo y enlazar a `/customer/access` sin afirmar entrega SMTP.
35. Crear pruebas de contratos y backend client para schemas, slugs, rutas, bodies, respuestas inválidas y redacción de secretos.
36. Crear pruebas BFF para origen, cookie, path, flags, rotación, aislamiento de staff, perfil cruzado, errores y ausencia de refresh token en JSON.
37. Crear pruebas de sesión para bootstrap, access en memoria, refresh único, replay único, invalidación, indisponibilidad y logout local.
38. Crear pruebas de coordinación para concurrencia dentro de una pestaña, varias pestañas, mensajes transitorios, locks separados y ausencia de tokens en Web Storage.
39. Crear pruebas UI para email, respuesta opaca, cooldown, limpieza de URL, enlace inválido, reintento de red, redirecciones, perfil, logout, foco y teclado.
40. Crear pruebas de rutas y navegación para `noindex`, `no-referrer`, enlaces públicos y ausencia del token en contenido renderizado.
41. Ejecutar `bun test`, `bun run check` y `bun run build`; corregir regresiones de customer-auth, staff-auth, menú y resultado de pago.
42. Verificar manualmente con backend y SMTP reales solicitud, recepción, URL limpia, intercambio único, perfil, recarga, expiración del access token, dos pestañas y logout.

## Criterios de aceptación

### Contrato y aislamiento

- [ ] El backend configurado expone los cinco endpoints de customer-auth documentados.
- [ ] `CUSTOMER_MAGIC_LINK_URL` termina en `/auth/magic-link` para el dominio frontend correcto.
- [ ] Customer-auth no importa controladores, cookies, canales ni schemas específicos de staff.
- [ ] Staff y cliente usan cookies con nombres y paths distintos.
- [ ] Staff y cliente usan canales y locks con nombres distintos.
- [ ] Un token de cliente nunca se presenta a una ruta staff.
- [ ] Un token staff nunca se presenta a `GET /customer-auth/me`.
- [ ] Extraer primitivas genéricas no cambia el comportamiento ni rompe las pruebas de staff.
- [ ] No se modifica ningún archivo del backend desde esta spec.

### Solicitud manual

- [ ] `/customer/access` existe y contiene `noindex, nofollow`.
- [ ] La página ofrece un campo email y una acción clara para solicitar acceso.
- [ ] El email se valida, recorta y normaliza antes del envío.
- [ ] Un email inválido impide la solicitud y su control recibe foco.
- [ ] El restaurante usado procede exclusivamente de `PUBLIC_RESTAURANT_SLUG`.
- [ ] La página no acepta un restaurante alternativo por query, campo o almacenamiento.
- [ ] El email viaja en el body y nunca en ruta o query.
- [ ] El email no se escribe en `localStorage`, `sessionStorage` ni logs.
- [ ] Una respuesta `202` muestra el mismo mensaje genérico para cualquier cuenta elegible o no elegible.
- [ ] La UI no afirma que el correo exista, que la cuenta exista o que SMTP entregó el mensaje.
- [ ] Después de `202`, el botón permanece deshabilitado durante sesenta segundos en esa vista.
- [ ] El cooldown visual no anuncia cada segundo a lectores de pantalla.
- [ ] Recargar no persiste el email ni pretende sustituir el cooldown backend.
- [ ] Un error de red muestra un `Alert` persistente y permite reintento manual.
- [ ] Una respuesta contractual inválida no se presenta como solicitud aceptada.
- [ ] Una sesión ya autenticada que visita `/customer/access` termina en `/customer/account`.

### Intercambio del magic link

- [ ] `/auth/magic-link` existe y contiene `noindex, nofollow`.
- [ ] La página aplica una política `no-referrer`.
- [ ] El token se lee desde `token` y se retira mediante `history.replaceState` antes del `fetch` de intercambio.
- [ ] La URL visible después del bootstrap no contiene el token.
- [ ] El token no aparece en props serializadas, DOM, alerts, errores, analytics ni Web Storage.
- [ ] El token se envía únicamente en el body de `POST /api/customer-auth/exchange`.
- [ ] Un token válido se intercambia una sola vez mientras la petición está pendiente.
- [ ] El BFF valida la respuesta backend antes de establecer sesión.
- [ ] Un perfil cuyo `restaurantSlug` difiere del configurado no crea una sesión frontend.
- [ ] El JSON del BFF contiene access token y perfil, pero nunca refresh token.
- [ ] Una autenticación válida redirige mediante `window.location.replace("/customer/account")`.
- [ ] Un token ausente no dispara una solicitud y muestra el mismo estado de enlace inválido.
- [ ] `INVALID_MAGIC_LINK` no distingue entre vencido, consumido, invalidado o inexistente.
- [ ] El estado inválido ofrece solicitar otro enlace en `/customer/access`.
- [ ] Un error de red conserva el token únicamente en memoria y ofrece reintento manual.
- [ ] Reintentar después de un error de red reutiliza el mismo token sin devolverlo a la URL.
- [ ] Recargar después de retirar el token exige solicitar un enlace nuevo.
- [ ] Los errores nunca muestran ni registran el token opaco.

### BFF y cookies

- [ ] Todas las mutaciones `/api/customer-auth/*` validan `Origin` antes de actuar.
- [ ] La cookie se llama `customer_refresh_token`.
- [ ] La cookie usa path exacto `/api/customer-auth`.
- [ ] La cookie usa `HttpOnly` y `SameSite=Strict`.
- [ ] La cookie usa `Secure` en producción.
- [ ] La cookie tiene `Max-Age` de treinta días.
- [ ] JavaScript no puede leer el refresh token.
- [ ] Intercambio y refresh reemplazan la cookie con el último token rotado.
- [ ] El refresh token nunca aparece en respuestas JSON, logs o errores.
- [ ] `INVALID_CUSTOMER_REFRESH_TOKEN` elimina la cookie inválida.
- [ ] Logout elimina la cookie aunque el backend no esté disponible.
- [ ] Logout remoto usa el refresh token únicamente desde el servidor Astro.
- [ ] Repetir logout devuelve `204` y mantiene el estado local anónimo.
- [ ] Las respuestas backend inválidas no introducen tokens ni perfiles parciales en sesión.

### Sesión, refresh y perfil

- [ ] El access token vive únicamente en memoria durante la sesión montada.
- [ ] Recargar una página no recupera el access token anterior desde almacenamiento.
- [ ] El bootstrap obtiene un access token nuevo mediante la cookie HttpOnly y el BFF.
- [ ] La respuesta de bootstrap valida access token, perfil y restaurante.
- [ ] `/customer/account` no renderiza datos privados antes de completar la comprobación.
- [ ] Una sesión válida consulta `GET /customer-auth/me` con bearer de cliente.
- [ ] El perfil mostrado contiene únicamente nombre, email, teléfono y restaurante.
- [ ] No se muestran UUID, timestamps, pagos ni reservas.
- [ ] `CUSTOMER_AUTH_REQUIRED` activa como máximo un refresh y un replay de la petición.
- [ ] Dos peticiones simultáneas de una pestaña comparten el mismo refresh en vuelo.
- [ ] Dos pestañas no envían en paralelo el mismo refresh token.
- [ ] Cuando `BroadcastChannel` está disponible, un refresh líder comparte transitoriamente el resultado y evita un segundo refresh inmediato.
- [ ] Ningún mensaje con access token se persiste en `localStorage`.
- [ ] Los fallbacks de Web Storage contienen únicamente señales, IDs aleatorios y expiraciones.
- [ ] Reutilización o invalidez del refresh deja todas las vistas frontend en estado anónimo.
- [ ] Logout se propaga a las demás pestañas.
- [ ] Invalidar la sesión limpia la caché autenticada de cliente.
- [ ] Una sesión ausente en `/customer/account` redirige a `/customer/access`.
- [ ] Un error de red durante bootstrap o perfil permanece en la cuenta con reintento visible.
- [ ] Un error de red recuperable no elimina una cookie potencialmente válida.
- [ ] La acción de logout no depende de que el backend responda para retirar datos de la UI.

### Integración pública y UX

- [ ] Inicio contiene un enlace visible y operable “Acceso clientes”.
- [ ] Menú contiene un enlace visible y operable “Acceso clientes”.
- [ ] La confirmación de pago contiene una acción hacia `/customer/access`.
- [ ] La confirmación explica que el acceso se procesa por correo y puede solicitarse uno nuevo.
- [ ] La confirmación no afirma que SMTP entregó el mensaje.
- [ ] `/customer/account` contiene `noindex, nofollow`.
- [ ] Carga, éxito genérico, enlace inválido, error de red, sesión ausente e indisponibilidad se representan con contenido persistente.
- [ ] Los errores accionables reciben foco sin depender de un toast.
- [ ] Formularios, enlaces, perfil y logout se operan completamente con teclado.
- [ ] El foco visible permanece perceptible en todas las acciones.
- [ ] Los estados no dependen únicamente del color.
- [ ] Las tres páginas nuevas no generan desplazamiento horizontal a 320 px.
- [ ] No se instalan componentes shadcn ni dependencias nuevas.

### Verificación

- [ ] Las pruebas no realizan solicitudes reales ni envían correos.
- [ ] Las pruebas verifican que magic, access y refresh tokens no aparecen en almacenamiento o errores.
- [ ] Las pruebas verifican aislamiento completo entre staff-auth y customer-auth.
- [ ] Las pruebas verifican refresh rotativo, concurrencia, replay único y logout entre pestañas.
- [ ] `bun test` finaliza sin errores.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.
- [ ] Una solicitud manual real produce la respuesta genérica acordada.
- [ ] Un correo real permite abrir `/auth/magic-link?token=...` y la URL se limpia antes del intercambio.
- [ ] El mismo enlace real no puede consumirse una segunda vez.
- [ ] Recargar `/customer/account` restaura una sesión válida mediante el BFF.
- [ ] La expiración del access token provoca un único refresh y la petición continúa.
- [ ] Dos pestañas abiertas mantienen una sesión coherente sin reutilizar en paralelo el refresh token.
- [ ] Logout en una pestaña deja las demás en estado anónimo.
- [ ] No se implementa listado, detalle, cancelación ni modificación de reservas.

## Decisiones

- **Sí:** separar autenticación del cliente y consulta de reservas en specs distintas.
- **No:** inventar endpoints de reservas que todavía no existen en el contrato backend.
- **Sí:** usar `/customer/access`, `/auth/magic-link` y `/customer/account`.
- **Sí:** usar el mismo patrón general de seguridad que staff.
- **No:** compartir cookies, canales, locks, controladores o cachés con staff.
- **Sí:** usar un BFF Astro para que el refresh token permanezca en cookie HttpOnly.
- **No:** entregar el refresh token al JavaScript del navegador.
- **Sí:** mantener el access token solo en memoria.
- **No:** persistir access token, refresh token, magic link o email en Web Storage.
- **Sí:** cookie `customer_refresh_token` con path limitado a `/api/customer-auth`.
- **Sí:** `SameSite=Strict`, `HttpOnly` y `Secure` en producción.
- **Sí:** validar `Origin` en todas las mutaciones BFF.
- **Sí:** exigir que la sesión pertenezca a `PUBLIC_RESTAURANT_SLUG`.
- **No:** permitir seleccionar o inyectar otro restaurante desde la pantalla de acceso.
- **Sí:** retirar el magic link de la URL antes del intercambio.
- **Sí:** aplicar `no-referrer` a la ruta del magic link.
- **No:** conservar el token para sobrevivir una recarga.
- **Sí:** mantenerlo en memoria para reintentar únicamente un fallo de red durante el montaje actual.
- **Sí:** unificar enlaces vencidos, consumidos, invalidados e inexistentes en el mismo estado.
- **No:** revelar la causa interna de `INVALID_MAGIC_LINK`.
- **Sí:** mostrar siempre la respuesta genérica de solicitud manual.
- **No:** afirmar que una cuenta existe o que SMTP entregó el correo.
- **Sí:** bloquear otro envío durante sesenta segundos en la vista actual.
- **No:** persistir el email o el cooldown visual.
- **Sí:** serializar refresh dentro y entre pestañas.
- **Sí:** compartir el resultado rotado mediante mensajes transitorios cuando sea posible.
- **No:** transportar tokens mediante eventos persistidos en `localStorage`.
- **Sí:** propagar logout e invalidación entre pestañas.
- **Sí:** reintentar una petición autenticada una sola vez después de refresh.
- **No:** intentar resolver `403` o respuestas contractuales inválidas mediante refresh.
- **Sí:** usar una shell Astro y protección cliente para `/customer/account`.
- **No:** incluir datos privados en HTML prerenderizado.
- **Sí:** mostrar únicamente el perfil mínimo de `GET /customer-auth/me`.
- **No:** editar el perfil ni añadir reservas en esta entrega.
- **Sí:** enlazar acceso desde inicio, menú y confirmación de pago.
- **Sí:** marcar las páginas de autenticación y cuenta con `noindex, nofollow`.
- **Sí:** reutilizar componentes existentes.
- **No:** instalar dependencias visuales o de autenticación nuevas.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El magic link queda en historial, referrer o capturas de errores | Retirarlo en el bootstrap cliente más temprano, aplicar `no-referrer`, no serializarlo y mantenerlo únicamente en memoria. |
| Dos pestañas rotan simultáneamente el mismo refresh token y el backend interpreta reutilización | Coordinar con lock exclusivo, compartir transitoriamente el resultado del líder y no ejecutar refresh paralelos. |
| Una pestaña conserva un access token asociado a una sesión reemplazada | Propagar la autenticación rotada por `BroadcastChannel` y refrescar una sola vez ante `CUSTOMER_AUTH_REQUIRED`. |
| Un XSS roba el access token en memoria | Evitar HTML no confiable, mantener dependencias controladas y no ampliar la exposición mediante almacenamiento persistente. |
| CSRF contra refresh, logout o solicitud de enlaces | Cookie `SameSite=Strict`, path reducido y validación estricta de `Origin` en cada mutación BFF. |
| El BFF devuelve accidentalmente el refresh token | Construir una respuesta pública distinta, validarla y probar explícitamente la ausencia de `refreshToken`. |
| Un magic link de otro restaurante abre sesión en este frontend | Comparar el perfil con `PUBLIC_RESTAURANT_SLUG` antes de aceptar la autenticación y revocar o descartar el resultado. |
| El usuario recarga después de un fallo de red y pierde el token ya retirado | Explicar que debe solicitar otro enlace; no degradar seguridad guardando el token. |
| La respuesta genérica se interpreta como confirmación de cuenta o entrega | Usar texto condicional y no variar el mensaje según existencia, cooldown o resultado SMTP. |
| El backend o la red fallan durante bootstrap | Diferenciar `unavailable` de `anonymous`, conservar la cookie y ofrecer reintento sin mostrar datos privados. |
| Logout remoto falla y la UI conserva datos | Eliminar cookie, access token y caché local de forma incondicional; la revocación remota es best-effort. |
| `BroadcastChannel` no está disponible | Mantener locks y señales sin secretos; degradar de forma recuperable sin persistir access tokens. |
| La cuenta parece ofrecer reservas aunque no exista contrato | Limitar la vista al perfil y registrar explícitamente la consulta de reservas como futura SPEC 12. |
| Los enlaces añadidos rompen encabezados estrechos | Probar composición, áreas táctiles y ausencia de overflow desde 320 px. |
| Una página privada queda indexada | Aplicar y probar `noindex, nofollow` en las tres rutas nuevas. |

## Lo que **no** está en esta spec

- Listado o detalle de reservas del cliente.
- Historial de pagos.
- Cancelaciones, reprogramaciones, cambios o reembolsos.
- Edición del perfil.
- Registro previo al pago.
- Contraseñas, recuperación de contraseña, OAuth o redes sociales.
- Identidad global entre restaurantes.
- Tokens persistidos en Web Storage.
- Cookies backend de cliente visibles para el navegador.
- Verificación de entrega SMTP.
- Cambios en modelos, endpoints, sesiones o correo del backend.
- CAPTCHA, rate limiting por IP o telemetría con PII.
- Administración staff de clientes.
- Dependencias o componentes visuales nuevos.

La consulta de reservas deberá definirse en la SPEC 12 cuando el backend publique el contrato correspondiente.
