# SPEC 02 — Descubrimiento público y menú por slug

> **Estado:** Borrador
> **Depende de:** SPEC 01
> **Supersedes:** SPEC 01 (identificación por UUID, endpoint del menú y ausencia de selector de sucursal)
> **Fecha:** 2026-08-01
> **Objetivo:** Adaptar el frontend público al contrato por slugs para cargar el restaurante singleton configurado, seleccionar una sucursal activa y consultar su menú con TanStack Query y Zod.

## Por qué existe esta spec

SPEC 01 se implementó contra un contrato que exigía `restaurantId` y `branchId` en la URL y no permitía descubrir sucursales públicamente.

El contrato vigente reemplaza esos UUID por slugs y añade rutas públicas para consultar el restaurante singleton y sus sucursales activas.

Esta spec adapta la implementación existente sin reescribir el historial de SPEC 01.

## Alcance

**Incluido:**

- Añadir `@tanstack/react-query` y `zod` como dependencias directas.
- Configurar `PUBLIC_RESTAURANT_SLUG=restaurante-olimpico` en un único lugar reemplazable.
- Validar con Zod las variables públicas, el parámetro `branch` y todas las respuestas consumidas en esta spec.
- Consumir `GET /public/restaurants/:restaurantSlug`.
- Consumir `GET /public/restaurants/:restaurantSlug/branches`.
- Consumir `GET /public/restaurants/:restaurantSlug/branches/:branchSlug/menu`.
- Convertir `/` en la entrada pública para descubrir las sucursales activas.
- Mostrar un estado informativo cuando no existan sucursales activas.
- Abrir automáticamente el menú cuando exista exactamente una sucursal activa.
- Mostrar un selector accesible cuando existan dos o más sucursales activas.
- Generar los enlaces del menú como `/menu?branch=<branchSlug>` sin pedir al cliente que escriba la URL.
- Permitir abrir directamente un enlace compartido `/menu?branch=<branchSlug>`.
- Migrar contratos, cliente, fixtures y menú existentes de UUID a `restaurantSlug` y `branchSlug`.
- Incorporar TanStack Query para caché, estados, reintentos y deduplicación de consultas.
- Mantener Astro en modo estático y las consultas dentro de islas React.
- Mantener el nombre, logo y eslogan estáticos mientras la identidad comercial permanezca pendiente.
- Conservar el diseño visual de SPEC 01 y extenderlo únicamente para el selector y sus estados.
- Añadir fixtures de descubrimiento para cero, una, varias sucursales y error.

**Fuera de alcance para futuras specs:**

- Rutas frontend dinámicas como `/menu/:branchSlug`.
- SSR o incorporación de un adaptador de despliegue.
- Códigos QR y herramientas administrativas para compartir enlaces.
- Descubrimiento de varios restaurantes.
- Cambio visual o textual a “El Olímpico”.
- Branding completo obtenido desde el backend.
- Rediseño general del menú.
- Carrito, selección de cantidades y persistencia de platos.
- Disponibilidad, reservas temporales, Stripe Checkout y pagos.
- Login y panel administrativo.
- Compatibilidad con los enlaces antiguos que contienen UUID.

## Modelo de datos

Los esquemas Zod son la fuente de verdad para los datos recibidos en tiempo de ejecución. Los tipos TypeScript se infieren desde ellos.

```ts
import { z } from "zod";

const slugSchema = z.string().trim().min(1);

const publicRestaurantSchema = z.object({
  slug: slugSchema,
  name: z.string(),
  phone: z.string().nullable(),
  email: z.email().nullable(),
  timezone: z.literal("America/Lima"),
});

type PublicRestaurant = z.infer<typeof publicRestaurantSchema>;
```

```ts
const branchRulesSchema = z.object({
  defaultReservationDurationMinutes: z.number().int().positive(),
  minimumAdvanceMinutes: z.number().int().positive(),
  maximumAdvanceDays: z.number().int().positive(),
  arrivalToleranceMinutes: z.number().int().positive(),
  maxPartySize: z.number().int().positive(),
});

const branchIntervalSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string(),
  endTime: z.string(),
});

const publicBranchSchema = z.object({
  restaurantSlug: slugSchema,
  branchSlug: slugSchema,
  name: z.string(),
  address: z.string(),
  district: z.string(),
  province: z.string(),
  department: z.string(),
  phone: z.string(),
  email: z.email().nullable(),
  rules: branchRulesSchema,
  intervals: z.array(branchIntervalSchema),
});

const publicBranchesSchema = z.array(publicBranchSchema);

type PublicBranch = z.infer<typeof publicBranchSchema>;
```

El esquema del menú conserva categorías y platos de SPEC 01, pero reemplaza los identificadores superiores:

```ts
const publicMenuSchema = z.object({
  restaurantSlug: slugSchema,
  branchSlug: slugSchema,
  categories: z.array(publicMenuCategorySchema),
});

type PublicMenu = z.infer<typeof publicMenuSchema>;
```

La configuración pública queda extendida así:

```ts
type DiscoveryFixtureScenario = "empty" | "single" | "multiple" | "error";

interface PublicRuntimeConfig {
  apiBaseUrl: string;
  restaurantSlug: string;
  useMenuFixture: boolean;
  menuFixtureScenario: "populated" | "empty" | "error";
  discoveryFixtureScenario: DiscoveryFixtureScenario;
}
```

Claves de TanStack Query:

```ts
const publicQueryKeys = {
  restaurant: (restaurantSlug: string) => ["public", "restaurant", restaurantSlug] as const,
  branches: (restaurantSlug: string) => ["public", "branches", restaurantSlug] as const,
  menu: (restaurantSlug: string, branchSlug: string) =>
    ["public", "menu", restaurantSlug, branchSlug] as const,
};
```

Convenciones:

- `restaurantSlug` procede exclusivamente de `PUBLIC_RESTAURANT_SLUG`.
- `branchSlug` procede de una respuesta validada del backend o del parámetro `branch` validado con Zod.
- Los slugs se codifican con `encodeURIComponent` al construir endpoints.
- El nombre, logo y eslogan visibles continúan en `src/config/restaurant-brand.ts`.
- Los datos públicos del restaurante no reemplazan todavía la identidad visual configurada.
- No se introducen `localStorage`, IndexedDB ni cookies.

## Plan de implementación

1. Instalar `@tanstack/react-query` y `zod` como dependencias directas mediante Bun.
2. Añadir `PUBLIC_RESTAURANT_SLUG=restaurante-olimpico` y `PUBLIC_DISCOVERY_FIXTURE_SCENARIO=multiple` a `.env.example`.
3. Reemplazar el parseo manual de `src/config/runtime.ts` por un esquema Zod que normalice la URL, booleanos, slug y escenarios.
4. Crear `src/features/public-discovery/contracts/public-discovery.schemas.ts` con los esquemas del restaurante, sucursales, reglas e intervalos.
5. Migrar `src/features/public-menu/contracts/public-menu.ts` a esquemas Zod e inferir sus tipos TypeScript.
6. Extender el esquema común de errores y convertir errores de respuesta inválida en `PublicApiClientError` con código estable `INVALID_API_RESPONSE`.
7. Crear `src/features/public-discovery/api/public-discovery-client.ts` para las consultas públicas de restaurante y sucursales.
8. Migrar `src/features/public-menu/api/public-menu-client.ts` al endpoint por slugs y validar su respuesta con `publicMenuSchema`.
9. Crear fixtures contractuales de restaurante y descubrimiento para `empty`, `single`, `multiple` y `error`.
10. Migrar los fixtures del menú para responder `restaurantSlug` y `branchSlug`.
11. Crear `src/features/public-api/query/public-query-client.tsx` con `QueryClientProvider` y una política de máximo dos reintentos solo para errores de red o servidor.
12. Crear `src/features/public-api/query/public-query-keys.ts` con claves estables para restaurante, sucursales y menú.
13. Crear opciones o hooks de consulta para restaurante, sucursales y menú, conservando los fixtures como fuente explícita de desarrollo.
14. Reemplazar `src/features/public-menu/lib/menu-query.ts` por validación Zod del único parámetro `branch`.
15. Crear los estados visuales del descubrimiento para carga, configuración inválida, error y ausencia de sucursales activas.
16. Crear `src/features/public-discovery/components/BranchCard.tsx` para presentar nombre, ubicación, contacto, reglas principales y enlace generado al menú.
17. Crear `src/features/public-discovery/components/BranchDiscovery.tsx` para consultar restaurante y sucursales en paralelo.
18. En `BranchDiscovery`, redirigir con `window.location.replace` a `/menu?branch=<branchSlug>` cuando exista exactamente una sucursal.
19. En `BranchDiscovery`, renderizar el selector cuando existan dos o más sucursales sin reordenar la respuesta del backend.
20. Crear una isla `PublicDiscoveryApp` que instale su propio `QueryClientProvider` y renderice `BranchDiscovery`.
21. Actualizar `src/pages/index.astro` para reemplazar la redirección actual por la entrada pública de descubrimiento.
22. Crear una isla `PublicMenuApp` que instale su propio `QueryClientProvider` alrededor del menú existente.
23. Migrar `PublicMenu.tsx` desde `useEffect` y estado manual a TanStack Query usando el slug singleton y el `branchSlug` validado.
24. Actualizar `src/pages/menu.astro` para usar `PublicMenuApp` y conservar la composición visual existente.
25. Actualizar los mensajes del menú para un parámetro `branch` ausente o inválido y ofrecer volver al selector de sucursal.
26. Eliminar tipos, funciones y referencias heredadas a `restaurantId`, `branchId` y al endpoint público por UUID.

## Criterios de aceptación

- [ ] `bun run build` finaliza sin errores.
- [ ] `@tanstack/react-query` y `zod` aparecen como dependencias directas de `package.json`.
- [ ] `PUBLIC_RESTAURANT_SLUG` está definido una sola vez en `.env.example` y es leído únicamente desde la configuración runtime.
- [ ] El valor predeterminado documentado de `PUBLIC_RESTAURANT_SLUG` es `restaurante-olimpico`.
- [ ] Una configuración pública inválida falla con un mensaje explícito y no genera requests con valores parciales.
- [ ] Con fixtures desactivados, `/` solicita `GET {PUBLIC_API_BASE_URL}/public/restaurants/restaurante-olimpico`.
- [ ] Con fixtures desactivados, `/` solicita `GET {PUBLIC_API_BASE_URL}/public/restaurants/restaurante-olimpico/branches`.
- [ ] Las respuestas de restaurante, sucursales, menú y errores se validan con Zod antes de llegar a los componentes.
- [ ] Una respuesta 200 con forma inválida se presenta como error controlado y no rompe la isla React.
- [ ] Cero sucursales activas muestran un estado informativo y no intentan abrir un menú.
- [ ] Una sucursal activa redirige automáticamente a `/menu?branch=<branchSlug>`.
- [ ] Dos o más sucursales activas muestran un selector en el orden entregado por el backend.
- [ ] Cada opción del selector muestra como mínimo nombre, dirección, distrito y una acción descriptiva para abrir el menú.
- [ ] El selector se puede recorrer completamente con teclado y mantiene foco visible.
- [ ] La selección de una sucursal no requiere escribir ni copiar manualmente IDs o slugs.
- [ ] `/menu?branch=miraflores` solicita `GET {PUBLIC_API_BASE_URL}/public/restaurants/restaurante-olimpico/branches/miraflores/menu`.
- [ ] `/menu` sin `branch` no ejecuta la consulta de menú, explica el problema y enlaza de vuelta a `/`.
- [ ] Un `branch` vacío o inválido no ejecuta la consulta de menú.
- [ ] `404 RESTAURANT_NOT_FOUND` muestra un estado de restaurante no disponible sin exponer detalles técnicos.
- [ ] `404 PUBLIC_MENU_NOT_FOUND` muestra un estado de menú no disponible y permite volver al selector.
- [ ] TanStack Query no reintenta respuestas 4xx.
- [ ] TanStack Query realiza como máximo dos reintentos para errores de red o respuestas 5xx.
- [ ] Las consultas del restaurante y sucursales se ejecutan en paralelo.
- [ ] Las claves de caché incluyen todos los slugs que determinan cada recurso.
- [ ] Los fixtures permiten revisar descubrimiento `empty`, `single`, `multiple` y `error` sin fallback automático ante fallos reales.
- [ ] El menú conserva los escenarios fixture `populated`, `empty` y `error` con el contrato por slugs.
- [ ] El nombre visible, logo y eslogan siguen procediendo de `src/config/restaurant-brand.ts`.
- [ ] No quedan requests públicos ni tipos superiores que dependan de `restaurantId` o `branchId`.
- [ ] No se añade SSR ni un router de cliente.
- [ ] La interfaz mantiene el diseño responsive y las garantías de accesibilidad de SPEC 01.

## Decisiones

- **Sí:** asumir un único restaurante en el frontend y configurar su slug como `PUBLIC_RESTAURANT_SLUG`.
- **Sí:** usar temporalmente `restaurante-olimpico` como slug del restaurante.
- **Sí:** mantener el slug en un único punto para cambiarlo mediante configuración y nuevo despliegue.
- **No (revertido de SPEC 01):** recibir `restaurantId` y `branchId` por query string.
- **Sí:** usar `branchSlug` como único identificador público variable del menú.
- **Sí:** mantener `/menu?branch=<branchSlug>` para conservar el build estático de Astro.
- **No:** añadir SSR solo para obtener una URL `/menu/:branchSlug`.
- **Sí:** convertir `/` en selector de sucursal y punto de entrada público.
- **Sí:** abrir automáticamente el menú cuando solo exista una sucursal activa.
- **Sí:** mostrar selector cuando existan varias sucursales activas.
- **No:** seleccionar arbitrariamente una sucursal cuando existen varias.
- **Sí:** tratar `branchSlug` como inmutable según la garantía del backend.
- **Sí:** tratar el slug del restaurante como estable ante `PATCH /restaurants/:restaurantId`; un cambio excepcional se resuelve desde configuración.
- **No:** intentar descubrir un restaurante sin slug, porque el contrato y la condición singleton hacen innecesario otro endpoint.
- **Sí:** usar TanStack Query para las consultas públicas y su estado asíncrono.
- **Sí:** crear un `QueryClient` por aplicación/isla React y no asumir contexto compartido entre islas Astro.
- **Sí:** reintentar únicamente red y 5xx, con un máximo de dos reintentos.
- **Sí:** usar Zod en los límites runtime de configuración y respuestas HTTP.
- **No:** usar Zod solo como reemplazo cosmético de la regex de UUID.
- **Sí:** conservar la identidad visual estática de El Molino del Pez mientras el nombre comercial continúe pendiente.
- **No:** reemplazar el nombre visible por `PublicRestaurant.name` en esta spec.
- **No:** mantener compatibilidad con URLs de desarrollo basadas en UUID, porque el backend vigente ya no las acepta.
- **No:** incluir QR, reservas, pagos o rediseño visual en esta spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El slug configurado deja de coincidir con el backend por un cambio excepcional | Centralizar `PUBLIC_RESTAURANT_SLUG`, mostrar un estado específico para `RESTAURANT_NOT_FOUND` y documentar que el cambio exige reconstruir el frontend. |
| El nombre del API contradice temporalmente el logo o nombre comercial actual | Mantener la identidad visible en `restaurant-brand.ts` hasta una spec específica de branding. |
| Una respuesta backend cambia sin actualizar el contrato | Validar con Zod y convertir el fallo en `INVALID_API_RESPONSE` sin renderizar datos parciales. |
| Dos islas React intentan compartir una caché inexistente | Crear un `QueryClientProvider` explícito por isla y compartir únicamente claves y opciones de consulta. |
| La redirección automática de una única sucursal genera un bucle | Ejecutarla solo desde `/` después de validar una respuesta con exactamente una sucursal; `/menu` nunca redirige de vuelta automáticamente. |
| Una sucursal se desactiva después de haber compartido su enlace | Presentar `PUBLIC_MENU_NOT_FOUND` y ofrecer regresar al selector actualizado. |
| La caché conserva temporalmente una lista de sucursales desactualizada | Usar un tiempo de frescura acotado y permitir refetch al volver a enfocar la página. |
| Los fixtures ocultan una integración rota | Activarlos solo mediante configuración explícita y nunca como fallback automático. |
| El selector añade cambios visuales mientras existe un rediseño futuro pendiente | Extender los tokens y componentes actuales sin redefinir la dirección visual general. |

## Lo que **no** está en esta spec

- Varios restaurantes o selección de restaurante.
- Rutas dinámicas con SSR.
- QR o panel para compartir enlaces.
- Cambio de nombre a “El Olímpico”.
- Branding controlado completamente por el backend.
- Rediseño integral del menú.
- Carrito, disponibilidad, reservas y pagos.
- Autenticación o administración.
- Compatibilidad con endpoints o URLs públicas basadas en UUID.

Cada uno de estos flujos deberá definirse en una spec independiente cuando corresponda.
