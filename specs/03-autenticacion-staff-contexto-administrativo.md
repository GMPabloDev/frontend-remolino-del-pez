# SPEC 03 — Autenticación staff y contexto administrativo

> **Estado:** Implementado
> **Amended by:** SPEC 05
> **Depende de:** SPEC 02
> **Supersedes:** SPEC 02 (Astro completamente estático y ausencia de adaptador server-side)
> **Fecha:** 2026-08-01
> **Objetivo:** Implementar acceso staff seguro con refresh token en cookie HttpOnly, renovación serializada, rutas protegidas, cambio de contraseña y contexto del restaurante singleton configurado.

## Por qué existe esta spec

Las siguientes áreas administrativas requieren un `accessToken` y el UUID del restaurante singleton, pero el contrato de autenticación no entrega `restaurantId`.

El backend también rota cada refresh token y revoca todas las sesiones si detecta su reutilización, por lo que una implementación ingenua con peticiones paralelas podría cerrar involuntariamente todas las sesiones del usuario.

Esta spec establece la frontera de seguridad, el cliente autenticado y una superficie staff mínima antes de implementar los módulos operativos.

## Alcance

**Incluido:**

- Instalar `@astrojs/node` en modo `standalone` para habilitar endpoints server-side de autenticación.
- Mantener las páginas públicas prerenderizadas y limitar la ejecución server-side a los endpoints que necesitan cookies.
- Configurar `PUBLIC_STAFF_RESTAURANT_ID` como UUID del único restaurante administrativo.
- Validar con Zod la configuración staff y todas las respuestas de autenticación y restaurante consumidas.
- Crear un BFF mínimo para login, refresh y logout bajo `/api/staff-auth`.
- Guardar exclusivamente el refresh token en la cookie `staff_refresh_token`.
- Configurar la cookie como `HttpOnly`, `SameSite=Strict`, `Secure` en producción, `Path=/api/staff-auth` y duración de 30 días.
- Mantener el access token y el usuario autenticado solo en memoria.
- Evitar que los endpoints BFF devuelvan o registren el refresh token.
- Validar el header `Origin` en todas las operaciones BFF.
- Marcar las respuestas de autenticación con `Cache-Control: no-store`.
- Serializar el refresh dentro de cada documento con una única promesa compartida.
- Serializar el refresh entre pestañas mediante Web Locks.
- Usar un lease temporal en `localStorage` como fallback cuando Web Locks no esté disponible.
- Usar `BroadcastChannel` y el evento `storage` para propagar logout y liberar esperas entre pestañas.
- No almacenar tokens en `localStorage`, `sessionStorage`, IndexedDB ni estado persistido de TanStack Query.
- Reintentar una petición protegida exactamente una vez después de renovar ante `401 UNAUTHORIZED`.
- Forzar logout ante `401 INVALID_REFRESH_TOKEN`.
- No renovar ni reintentar automáticamente ante `403 FORBIDDEN`.
- Crear `/staff/login` con email, contraseña, estados de envío y mensajes contractuales.
- Crear guardas de sesión para `/staff` y `/staff/account` sin imponer permisos por rol.
- Admitir `returnTo` únicamente para destinos internos y seguros bajo `/staff`.
- Crear un layout staff funcional con navegación a Inicio, Mi cuenta y Cerrar sesión.
- Consultar `GET /restaurants/:restaurantId` desde `/staff` para verificar sesión y contexto singleton.
- Mostrar usuario, rol y restaurante en la página inicial protegida.
- Implementar cambio de contraseña mediante `PATCH /auth/password`.
- Solicitar confirmación local de la nueva contraseña y aplicar las reglas contractuales.
- Forzar logout y nuevo login después de cambiar la contraseña correctamente.
- Completar el logout local aunque el backend no esté disponible.
- Añadir pruebas unitarias con `bun:test` para las reglas de seguridad y coordinación.
- Mantener una interfaz básica, responsive y accesible sin realizar el rediseño definitivo del panel.

**Fuera de alcance para futuras specs:**

- Guards de rutas, acciones o navegación según `admin`, `manager` o `branch_admin`.
- Gestión de usuarios o restablecimiento de contraseñas de terceros.
- Creación o edición del restaurante.
- Gestión de sucursales, horarios, mesas, categorías, platos o reservas.
- Recuperación de contraseña por email.
- Registro público o alta autónoma de usuarios staff.
- Autenticación multifactor, proveedores OAuth o inicio de sesión único.
- Persistencia del access token entre recargas.
- Almacenamiento server-side de sesiones o uso de Redis.
- Proxy genérico de todas las rutas administrativas a través del BFF.
- Fixtures que simulen una autenticación exitosa.
- Rediseño visual definitivo del panel administrativo.

## Modelo de datos

Los esquemas Zod son la fuente de verdad para las respuestas y la configuración en tiempo de ejecución. Los tipos TypeScript se infieren desde ellos.

```ts
type StaffRole = "admin" | "manager" | "branch_admin";
type StaffStatus = "active" | "inactive";

interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  branchId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

```ts
interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: StaffUser;
}

interface StaffSessionResponse {
  accessToken: string;
  user: StaffUser;
}

type StaffSessionState =
  | { status: "checking"; user: null; accessToken: null }
  | { status: "anonymous"; user: null; accessToken: null }
  | { status: "authenticated"; user: StaffUser; accessToken: string }
  | { status: "unavailable"; user: null; accessToken: null };
```

`BackendAuthResponse` existe únicamente en el servidor. El BFF transforma esa respuesta a `StaffSessionResponse` antes de responder al navegador.

```ts
interface StaffRuntimeConfig {
  apiBaseUrl: string;
  restaurantId: string;
}

interface StaffRestaurant {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  taxId: string;
  phone: string | null;
  email: string | null;
  timezone: "America/Lima";
  createdAt: string;
  updatedAt: string;
}
```

```ts
interface LoginInput {
  email: string;
  password: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
```

`confirmNewPassword` solo existe en el formulario y nunca se envía al backend.

Constantes de coordinación:

```ts
const STAFF_REFRESH_COOKIE = "staff_refresh_token";
const STAFF_REFRESH_LOCK = "staff-auth:refresh-lock:v1";
const STAFF_AUTH_CHANNEL = "staff-auth:v1";
```

Convenciones:

- `PUBLIC_STAFF_RESTAURANT_ID` es público, no es un secreto y debe ser un UUID válido sin valor predeterminado.
- `PUBLIC_API_BASE_URL` continúa siendo la única base URL del backend.
- Los tokens nunca se incluyen en logs, mensajes de error, query strings ni eventos de telemetría.
- El lease de `localStorage` contiene únicamente propietario y vencimiento; nunca contiene tokens ni datos del usuario.
- El estado `unavailable` representa una falla de red durante la comprobación y permite reintentar sin asumir que la sesión es inválida.
- Los componentes deciden comportamientos por `error.code`, nunca por el texto de `error.message`.
- Los roles se conservan y muestran, pero no restringen rutas en esta spec.

## Plan de implementación

1. Instalar `@astrojs/node` con Bun y configurarlo en `astro.config.mjs` en modo `standalone`, conservando el output estático predeterminado para las rutas que no opten por renderizado bajo demanda.
2. Añadir `@types/bun` como dependencia de desarrollo, el script `test: "bun test"` y una prueba mínima que confirme que el runner funciona.
3. Añadir `PUBLIC_STAFF_RESTAURANT_ID` a `.env.example` y extender `src/config/runtime.ts` con validación UUID sin alterar `PUBLIC_RESTAURANT_SLUG` ni los escenarios públicos.
4. Extraer el esquema global de error API a `src/lib/api/api-error.ts` y actualizar los imports públicos para reutilizar el formato contractual sin cambiar su comportamiento.
5. Crear `src/features/staff-auth/contracts/staff-auth.schemas.ts` con los esquemas de usuario, login, respuesta backend, respuesta saneada y cambio de contraseña.
6. Crear `src/features/staff-auth/contracts/staff-restaurant.schema.ts` con el esquema del restaurante administrativo singleton.
7. Crear `src/features/staff-auth/server/staff-auth-cookie.ts` con las opciones únicas para establecer y eliminar `staff_refresh_token`, garantizando que la eliminación use el mismo `Path`, `SameSite` y `Secure`.
8. Crear `src/features/staff-auth/server/validate-request-origin.ts` para aceptar solo `POST` cuyo `Origin` coincida exactamente con el origen del request y responder de forma controlada cuando falte o no coincida.
9. Crear `src/features/staff-auth/server/staff-auth-backend.ts` para llamar a `/auth/login`, `/auth/refresh` y `/auth/logout`, validar respuestas y no registrar cuerpos ni tokens.
10. Crear `src/pages/api/staff-auth/login.ts` como endpoint bajo demanda que valide origen y payload, establezca la cookie y devuelva únicamente `accessToken` y `user` con `Cache-Control: no-store`.
11. Crear `src/pages/api/staff-auth/refresh.ts` como endpoint bajo demanda que lea la cookie, rote el token, reemplace siempre la cookie con el último refresh token y limpie la cookie ante `INVALID_REFRESH_TOKEN`.
12. Crear `src/pages/api/staff-auth/logout.ts` como endpoint bajo demanda que intente revocar el refresh token y elimine siempre la cookie antes de devolver `204`, incluso ante errores de red.
13. Añadir pruebas de los helpers y handlers BFF para origen inválido, payload inválido, cookie segura, saneamiento de respuestas, rotación, refresh inválido y logout degradado.
14. Crear `src/features/staff-auth/lib/staff-return-to.ts` para aceptar rutas relativas bajo `/staff`, conservar query y hash, excluir `/staff/login` y usar `/staff` como fallback.
15. Crear `src/features/staff-auth/session/refresh-coordinator.ts` con promesa única por documento y una interfaz inyectable para probar los mecanismos de bloqueo sin depender del navegador real.
16. Implementar Web Locks en el coordinador con exclusión mutua del nombre `staff-auth:refresh-lock:v1` y espera acotada para evitar bloqueos indefinidos.
17. Implementar el fallback mediante lease en `localStorage`, con propietario aleatorio, expiración, liberación solo por el propietario y recuperación automática de locks abandonados.
18. Crear `src/features/staff-auth/session/staff-auth-channel.ts` para propagar logout por `BroadcastChannel` y usar eventos de `storage` como fallback de notificación.
19. Crear `src/features/staff-auth/api/staff-auth-bff-client.ts` para login, refresh y logout, siempre con credenciales same-origin y validación Zod de respuestas.
20. Crear `src/features/staff-auth/session/staff-session.ts` para mantener access token y usuario solo en memoria, ejecutar bootstrap mediante refresh y limpiar inmediatamente el estado al recibir logout local o remoto.
21. Crear `src/features/staff-auth/api/staff-api-client.ts` para adjuntar el bearer actual, renovar una sola vez ante `401 UNAUTHORIZED`, esperar un refresh ya iniciado y reintentar exactamente una vez la petición original.
22. En `staff-api-client.ts`, tratar `401 INVALID_REFRESH_TOKEN` como fin de sesión, propagar `403 FORBIDDEN` sin refresh y validar los errores por código estable.
23. Crear `src/features/staff-auth/query/staff-query-client.tsx` con TanStack Query sin persistencia y sin reintentos propios para errores de autenticación o autorización.
24. Crear `src/features/staff-auth/components/StaffAuthProvider.tsx` para exponer el estado de sesión, bootstrap, login, logout y reintento de comprobación a cada aplicación React staff.
25. Crear `src/features/staff-auth/components/ProtectedStaffRoute.tsx` para mostrar comprobación, estado de red recuperable o contenido autenticado, y redirigir sesiones inválidas a `/staff/login?returnTo=<destino>`.
26. Crear `src/features/staff-auth/components/LoginForm.tsx` con labels, autocompletado correcto, foco de error, mensaje genérico para `INVALID_CREDENTIALS` y bloqueo de envíos duplicados.
27. Crear `src/features/staff-auth/StaffLoginApp.tsx` y `src/pages/staff/login.astro`; al detectar una sesión válida, redirigir al `returnTo` saneado o a `/staff`.
28. Crear `src/features/staff-shell/components/StaffLayout.tsx` con navegación funcional a Inicio, Mi cuenta y Cerrar sesión, identificación del usuario y soporte responsive básico.
29. Crear `src/features/staff-shell/api/staff-restaurant-client.ts` y su query para solicitar exactamente `GET /restaurants/{PUBLIC_STAFF_RESTAURANT_ID}` mediante el cliente autenticado.
30. Crear `src/features/staff-shell/StaffDashboardApp.tsx` y `src/pages/staff/index.astro` para verificar sesión, consultar el restaurante y mostrar usuario, rol, sucursal asignada y contexto singleton.
31. Crear `src/features/staff-auth/components/ChangePasswordForm.tsx` con contraseña actual, nueva y confirmación; mostrar las reglas de 10–128 caracteres, mayúscula, minúscula y número.
32. Crear `src/features/staff-auth/StaffAccountApp.tsx` y `src/pages/staff/account.astro` para ejecutar `PATCH /auth/password` y, tras `204`, limpiar la sesión y redirigir a `/staff/login?reason=password-changed`.
33. Crear `src/layouts/StaffPageLayout.astro` con metadata privada, salto al contenido, foco visible y una base visual funcional separada del layout público.
34. Añadir `noindex, nofollow` a las páginas staff y comprobar que no se generan enlaces a módulos todavía inexistentes.
35. Añadir pruebas con `bun:test` para el saneamiento de `returnTo`, estado en memoria, refresh único concurrente, Web Locks, lease fallback, lock vencido, logout entre pestañas, reintento único de `UNAUTHORIZED` y ausencia de refresh ante `FORBIDDEN`.
36. Ejecutar `bun test`, `bun run check` y `bun run build`; iniciar `dist/server/entry.mjs` con variables válidas y verificar manualmente login, recarga, dos pestañas, dashboard, cambio de contraseña, logout y backend temporalmente inaccesible.

## Criterios de aceptación

- [ ] `@astrojs/node` aparece como dependencia directa y está configurado en modo `standalone`.
- [ ] `bun run build` genera una entrada ejecutable en `dist/server/entry.mjs`.
- [ ] Las páginas públicas de SPEC 02 continúan prerenderizadas y funcionan sin depender de una sesión staff.
- [ ] `bun test` finaliza sin errores usando el runner integrado de Bun.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `PUBLIC_STAFF_RESTAURANT_ID` aparece una sola vez en `.env.example` y no tiene UUID predeterminado en el código.
- [ ] Un `PUBLIC_STAFF_RESTAURANT_ID` ausente o inválido produce un error explícito y no construye requests administrativos parciales.
- [ ] `POST /api/staff-auth/login` rechaza un `Origin` ausente o distinto al origen del frontend.
- [ ] Un login válido establece `staff_refresh_token` con `HttpOnly`, `SameSite=Strict`, `Path=/api/staff-auth`, duración de 30 días y `Secure` en producción.
- [ ] La respuesta del BFF de login contiene `accessToken` y `user`, pero nunca `refreshToken`.
- [ ] `401 INVALID_CREDENTIALS` muestra el mismo mensaje para email inexistente, contraseña incorrecta o usuario inactivo.
- [ ] El formulario de login utiliza `autocomplete="email"` y `autocomplete="current-password"`.
- [ ] Un login exitoso redirige a un `returnTo` interno válido o a `/staff` cuando no existe.
- [ ] Un `returnTo` absoluto, externo, malformado o dirigido a `/staff/login` se reemplaza por `/staff`.
- [ ] Visitar `/staff/login` con sesión válida redirige al destino saneado sin mostrar el formulario autenticado.
- [ ] Entrar a `/staff` o `/staff/account` sin sesión termina en `/staff/login` e incluye el destino original como `returnTo`.
- [ ] Durante la comprobación inicial se muestra un estado de carga y no aparece contenido staff brevemente.
- [ ] Una falla de red durante bootstrap muestra una acción de reintento y no se interpreta como refresh inválido.
- [ ] Recargar una página protegida recupera la sesión mediante `/api/staff-auth/refresh` sin persistir el access token.
- [ ] Cada refresh exitoso reemplaza la cookie con el refresh token nuevo antes de responder al cliente.
- [ ] Dos solicitudes simultáneas en la misma pestaña comparten una sola operación de refresh.
- [ ] Dos pestañas con Web Locks disponible nunca envían el mismo refresh token en paralelo.
- [ ] Sin Web Locks, el lease de `localStorage` serializa el refresh y recupera locks abandonados después de su vencimiento.
- [ ] `localStorage` solo contiene metadatos temporales del lock y nunca access token, refresh token ni usuario.
- [ ] No existe ningún token en `sessionStorage`, IndexedDB, query string ni caché persistida de TanStack Query.
- [ ] Un `401 UNAUTHORIZED` en una petición protegida ejecuta un refresh y reintenta la petición original exactamente una vez.
- [ ] Un `401 INVALID_REFRESH_TOKEN` elimina estado y cookie, notifica a las demás pestañas y redirige al login.
- [ ] Un `403 FORBIDDEN` se presenta como falta de permisos sin refresh ni reintento automático.
- [ ] Todas las respuestas de login, refresh y logout incluyen `Cache-Control: no-store`.
- [ ] Los cuerpos y headers sensibles de autenticación no se escriben en logs.
- [ ] `/staff` solicita exactamente `GET {PUBLIC_API_BASE_URL}/restaurants/{PUBLIC_STAFF_RESTAURANT_ID}` con bearer token.
- [ ] La respuesta del restaurante se valida con Zod antes de renderizarse.
- [ ] `/staff` muestra nombre y rol del usuario, sucursal asignada cuando exista y nombre del restaurante configurado.
- [ ] `admin`, `manager` y `branch_admin` pueden entrar a las mismas rutas incluidas en esta spec.
- [ ] La navegación staff contiene únicamente Inicio, Mi cuenta y Cerrar sesión, sin enlaces inactivos a módulos futuros.
- [ ] Cerrar sesión intenta `POST /auth/logout`, elimina siempre la cookie y limpia todas las queries staff aunque falle la red.
- [ ] El logout de una pestaña invalida inmediatamente el estado visible de las demás pestañas abiertas.
- [ ] El cambio de contraseña exige contraseña actual, nueva y confirmación coincidente.
- [ ] La nueva contraseña se valida con 10–128 caracteres, al menos una mayúscula, una minúscula y un número.
- [ ] `confirmNewPassword` nunca se envía en `PATCH /auth/password`.
- [ ] `401 INVALID_CREDENTIALS` al cambiar contraseña se asocia a la contraseña actual sin revelar información adicional.
- [ ] Tras un `204` de `PATCH /auth/password`, la sesión se limpia y el usuario vuelve al login con un mensaje que exige autenticarse otra vez.
- [ ] Las respuestas inválidas del backend generan un error controlado y no dejan una sesión parcial.
- [ ] Login, dashboard y cuenta se pueden recorrer con teclado, mantienen foco visible y anuncian errores o cambios de estado relevantes.
- [ ] Los formularios bloquean envíos duplicados y conservan el email, pero nunca vuelven a mostrar una contraseña enviada.
- [ ] Las páginas staff incluyen `noindex, nofollow` y no producen desplazamiento horizontal a 320 px.
- [ ] No se implementa ninguna restricción de frontend basada en rol.
- [ ] No se añaden fixtures de autenticación ni fallback automático cuando falla el backend.

## Decisiones

- **Sí:** usar `@astrojs/node` en modo `standalone` para ejecutar los endpoints BFF.
- **Sí:** mantener el output estático predeterminado y marcar únicamente los endpoints de autenticación como rutas bajo demanda.
- **No (revertido de SPEC 02):** mantener Astro completamente estático y sin adaptador server-side.
- **Sí:** mantener prerenderizadas las rutas públicas existentes.
- **Sí:** usar `PUBLIC_STAFF_RESTAURANT_ID` como UUID del restaurante singleton.
- **No:** modificar el backend para incluir `restaurantId` en login o refresh.
- **No:** derivar el UUID administrativo desde el slug público.
- **Sí:** guardar únicamente el refresh token en una cookie `HttpOnly` restringida a `/api/staff-auth`.
- **Sí:** mantener el access token y el usuario solo en memoria.
- **No:** guardar tokens en almacenamiento web persistente.
- **No:** usar la API de sesiones de Astro, una base de datos de sesiones o Redis en esta etapa.
- **Sí:** limitar el BFF a login, refresh y logout.
- **No:** crear un proxy genérico para las futuras rutas administrativas.
- **Sí:** enviar las peticiones administrativas desde el navegador con el access token en `Authorization: Bearer`.
- **Sí:** validar `Origin`, usar `SameSite=Strict` y evitar caché en todas las operaciones de autenticación.
- **Sí:** serializar refresh en el documento y entre pestañas antes de enviarlo.
- **Sí:** usar Web Locks como mecanismo principal.
- **Sí:** usar un lease de `localStorage` como fallback, sin guardar credenciales.
- **Sí:** propagar logout con `BroadcastChannel` y eventos de almacenamiento.
- **Sí:** renovar solo ante `401 UNAUTHORIZED` y reintentar una vez la petición original.
- **No:** renovar ante `403 FORBIDDEN`.
- **Sí:** distinguir refresh inválido de una falla temporal de red.
- **Sí:** finalizar el logout local incluso si no se puede revocar remotamente la sesión.
- **Sí:** usar React Context y TanStack Query ya instalado, sin añadir Zustand ni otro store global.
- **Sí:** proteger las vistas en el cliente mediante bootstrap porque la cookie restringida a `/api/staff-auth` no se envía al solicitar `/staff`.
- **No:** renderizar información sensible en el HTML inicial de las páginas staff.
- **Sí:** sanear `returnTo` con una lista de rutas internas bajo `/staff` y fallback `/staff`.
- **Sí:** mostrar los roles contractuales sin convertirlos todavía en guards.
- **Sí:** incluir cambio de contraseña propia y logout obligatorio posterior.
- **No:** incluir gestión de cuenta de otros usuarios ni recuperación de contraseña.
- **Sí:** usar `bun:test` y dependencias inyectables para verificar concurrencia sin depender de condiciones de carrera reales.
- **No:** diseñar todavía el panel definitivo; esta spec entrega una interfaz funcional y accesible.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Dos pestañas intentan rotar el mismo refresh token | Usar Web Locks, fallback con lease temporal y una única promesa por documento antes de llamar al BFF. |
| Una pestaña se cierra mientras posee el fallback lock | Incluir propietario y expiración; otro cliente recupera el lock vencido sin reutilizar datos sensibles. |
| Un error provoca un segundo reintento con el mismo token | Limitar cada request protegido a un solo ciclo refresh-reintento y convertir el segundo `401` en logout. |
| La cookie restringida a `/api/staff-auth` no está disponible al renderizar `/staff` | Renderizar solo una carcasa no sensible y comprobar la sesión desde la isla React antes de mostrar contenido. |
| Un XSS roba el access token en memoria | Mantener su vida limitada a la sesión en memoria, no persistirlo y evitar renderizado HTML no confiable; el refresh token permanece inaccesible a JavaScript. |
| El reverse proxy altera el origen observado por Astro | Exigir que preserve correctamente host y protocolo; rechazar `Origin` ausente o diferente en vez de degradar la validación. |
| El backend no permite CORS con `Authorization` desde el origen staff | Verificar CORS durante integración; mostrar error de red y no ocultarlo con fixtures ni proxy genérico. |
| El backend cae durante logout | Borrar cookie y memoria de todas formas; la revocación remota pendiente expira con el refresh token y no bloquea la salida local. |
| El UUID configurado apunta a otro restaurante o deja de existir | Validarlo como UUID y tratar `RESTAURANT_NOT_FOUND` como configuración inválida visible para staff. |
| El adapter convierte accidentalmente todo el sitio público en SSR | Mantener el output estático predeterminado y optar por renderizado bajo demanda solo en los endpoints BFF. |
| Un mensaje del backend cambia | Decidir comportamientos exclusivamente por `error.code` y usar textos propios del frontend. |
| La prueba de concurrencia resulta intermitente | Inyectar reloj, almacenamiento, locks y transporte; probar estados deterministas en lugar de temporizadores reales. |

## Lo que **no** está en esta spec

- Permisos o navegación específica por rol.
- Administración de usuarios.
- Creación o edición del restaurante singleton.
- Gestión de sucursales, horarios, mesas o catálogo.
- Reservas y operaciones staff.
- Recuperación de contraseña, MFA, OAuth o SSO.
- Sesiones persistidas en servidor.
- Proxy BFF para endpoints administrativos distintos de auth.
- Fixtures de autenticación.
- Diseño visual definitivo del panel.

Cada módulo administrativo y el rediseño del panel deberán definirse en specs independientes.
