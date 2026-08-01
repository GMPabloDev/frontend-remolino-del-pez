# SPEC 01 — Menú público por sucursal

> **Estado:** Implementado
> **Amended by:** SPEC 02
> **Depende de:** Ninguna
> **Fecha:** 2026-07-31
> **Objetivo:** Crear un menú público responsive por sucursal que consuma el contrato vigente o fixtures de desarrollo y presente la identidad actual de El Molino del Pez.

## Por qué existe esta spec

El backend todavía está en desarrollo, pero el contrato del menú público ya permite construir y validar una experiencia visual independiente de los módulos administrativos.

Esta spec establece una primera superficie usable sin inventar rutas ni capacidades de descubrimiento que el backend no ofrece actualmente.

## Alcance

**Incluido:**

- Reemplazar la página inicial de Astro por el menú público en `/menu`.
- Obtener `restaurantId` y `branchId` desde los parámetros de consulta.
- Validar ambos UUID antes de consultar el backend.
- Consumir `GET /public/restaurants/:restaurantId/branches/:branchId/menu`.
- Centralizar `PUBLIC_API_BASE_URL` en un único módulo de configuración.
- Proporcionar fixtures de desarrollo para los escenarios `populated`, `empty` y `error`.
- Mostrar categorías, platos, precios en PEN, ingredientes, alérgenos y estado `sold_out`.
- Resolver imágenes ausentes o inválidas con un fallback visual.
- Diseñar estados diferenciados de carga, parámetros inválidos, menú vacío y error del API.
- Permitir reintentar la consulta después de un error del API.
- Usar el logo, nombre y eslogan actuales desde una configuración de marca aislada.
- Aplicar la dirección editorial marina aprobada, con diseño responsive y accesible.
- Retirar de la experiencia visible el contenido inicial del Astro Starter Kit.

**Fuera de alcance para futuras specs:**

- Selección de platos, carrito y persistencia de una orden.
- Consulta de disponibilidad y creación de reservas temporales.
- Stripe Checkout y seguimiento de pagos.
- Login y panel administrativo.
- Descubrimiento o selección pública de restaurantes y sucursales.
- Rutas dinámicas con SSR.
- Obtener el branding desde el backend.
- Cambiar la identidad a “El Olímpico”.

## Modelo de datos

```ts
type DishAvailability = "available" | "sold_out";

interface PublicMenu {
  restaurantId: string;
  branchId: string;
  categories: PublicMenuCategory[];
}

interface PublicMenuCategory {
  id: string;
  name: string;
  position: number;
  dishes: PublicDish[];
}

interface PublicDish {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  ingredients: string[];
  allergens: string[];
  position: number;
  price: string;
  status: DishAvailability;
}
```

```ts
interface RestaurantBrand {
  name: "El Molino del Pez";
  slogan: "Sabor que viene del mar";
  logoPath: "/logo.png";
}

type MenuFixtureScenario = "populated" | "empty" | "error";

interface PublicRuntimeConfig {
  apiBaseUrl: string;
  useMenuFixture: boolean;
  menuFixtureScenario: MenuFixtureScenario;
}
```

```ts
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      code: string;
      message: string;
    }>;
  };
}
```

Convenciones:

- `restaurantId` y `branchId` proceden exclusivamente de la URL.
- `price` permanece como cadena decimal y se formatea como moneda PEN únicamente para presentarlo.
- El frontend conserva el orden entregado por el backend.
- Los fixtures usan exactamente estas mismas estructuras.
- Esta spec no introduce persistencia local.

## Plan de implementación

1. Crear `.env.example` con `PUBLIC_API_BASE_URL`, `PUBLIC_USE_MENU_FIXTURE` y `PUBLIC_MENU_FIXTURE_SCENARIO`, sin crear ni versionar secretos.
2. Crear `src/config/runtime.ts` para leer, normalizar y validar toda la configuración pública en un solo lugar.
3. Crear `src/config/restaurant-brand.ts` con el nombre, eslogan y ruta del logo, sin dispersar textos de marca en componentes.
4. Crear `src/features/public-menu/contracts/public-menu.ts` con los tipos del contrato público y del error común del API.
5. Crear `src/features/public-menu/lib/menu-query.ts` para leer y validar `restaurantId` y `branchId` como UUID desde `window.location.search`.
6. Crear `src/features/public-menu/lib/format-menu-price.ts` para presentar las cadenas decimales mediante `Intl.NumberFormat` con moneda `PEN`.
7. Crear `src/features/public-menu/api/public-menu-client.ts` para construir la URL desde `PUBLIC_API_BASE_URL`, ejecutar el `GET` y normalizar errores HTTP sin ocultarlos con fixtures.
8. Crear `src/features/public-menu/fixtures/public-menu-fixtures.ts` con datos variados y contractuales para `populated`, `empty` y `error`.
9. Crear `src/features/public-menu/data/get-public-menu.ts` como único punto de selección entre API real y fixture explícito.
10. Crear `src/features/public-menu/components/MenuState.tsx` para carga, enlace inválido, menú vacío y error recuperable.
11. Crear `src/features/public-menu/components/DishCard.tsx` para imagen, fallback, descripción, ingredientes, alérgenos, precio y disponibilidad.
12. Crear `src/features/public-menu/components/CategorySection.tsx` para agrupar platos con jerarquía semántica y anclas navegables.
13. Crear `src/features/public-menu/components/PublicMenu.tsx` para coordinar parámetros, consulta, reintento y renderizado de estados.
14. Crear `src/pages/menu.astro` con metadatos, configuración de marca y la isla React cargada en cliente.
15. Actualizar `src/layouts/Layout.astro` y `src/styles/global.css` con la composición editorial marina, tokens derivados del logo y soporte para `prefers-reduced-motion`.
16. Actualizar `src/pages/index.astro` para retirar la pantalla de bienvenida y dirigir a `/menu` sin introducir selección ficticia de restaurante o sucursal.
17. Eliminar los componentes y recursos del starter que dejen de estar referenciados, manteniendo `public/logo.png` como activo de marca.

## Criterios de aceptación

- [ ] `bun run build` finaliza sin errores.
- [ ] `/menu?restaurantId=<uuid>&branchId=<uuid>` carga el escenario configurado cuando `PUBLIC_USE_MENU_FIXTURE=true`.
- [ ] `PUBLIC_MENU_FIXTURE_SCENARIO=populated` muestra todas las categorías y platos definidos por el fixture.
- [ ] `PUBLIC_MENU_FIXTURE_SCENARIO=empty` muestra un estado vacío diseñado y no una cuadrícula sin contenido.
- [ ] `PUBLIC_MENU_FIXTURE_SCENARIO=error` muestra un mensaje recuperable y una acción de reintento.
- [ ] Cambiar `PUBLIC_API_BASE_URL` modifica todos los requests sin editar el cliente ni los componentes.
- [ ] Con fixtures desactivados se solicita exactamente `GET {PUBLIC_API_BASE_URL}/public/restaurants/{restaurantId}/branches/{branchId}/menu`.
- [ ] Un `404 PUBLIC_MENU_NOT_FOUND` se presenta como menú no disponible sin mostrar detalles técnicos al cliente.
- [ ] La ausencia o malformación de cualquiera de los UUID muestra “enlace no válido” y no ejecuta un request.
- [ ] El estado de carga es visible mientras la consulta real permanece pendiente.
- [ ] Los precios se muestran con formato monetario de Perú y conservan el valor decimal recibido.
- [ ] Un plato `sold_out` permanece visible y se identifica mediante texto, no únicamente mediante color.
- [ ] Los ingredientes y alérgenos se distinguen visual y semánticamente.
- [ ] Una imagen nula o que falla al cargar se reemplaza por el fallback sin romper la tarjeta.
- [ ] El logo, “El Molino del Pez” y “Sabor que viene del mar” provienen de `src/config/restaurant-brand.ts`.
- [ ] La página no muestra botones de agregar, carrito, reserva ni pago.
- [ ] La interfaz se puede recorrer con teclado y mantiene foco visible.
- [ ] La jerarquía de encabezados comienza en un único `h1` y continúa sin saltos arbitrarios.
- [ ] Los cambios de estado importantes se anuncian mediante una región accesible apropiada.
- [ ] La composición no produce desplazamiento horizontal a 320 px de ancho.
- [ ] La distribución aprovecha pantallas de escritorio sin ampliar excesivamente las líneas de texto.
- [ ] Las animaciones decorativas se reducen cuando el sistema solicita `prefers-reduced-motion`.
- [ ] `/` ya no muestra contenido ni recursos visibles del Astro Starter Kit.

## Decisiones

- **Sí:** usar `/menu?restaurantId=<uuid>&branchId=<uuid>` para identificar directamente el menú solicitado.
- **No:** guardar `restaurantId` en `.env`, porque obligaría a cambiar el despliegue cuando cambie el restaurante y limitaría la evolución futura.
- **No:** ofrecer un selector público de sucursales, porque el contrato vigente no proporciona descubrimiento público.
- **Sí:** mantener Astro en modo estático y ejecutar la consulta desde una isla React en el cliente.
- **No:** añadir un adaptador SSR solo para obtener parámetros dinámicos en esta primera spec.
- **Sí:** centralizar la URL actual `http://localhost:3000` mediante `PUBLIC_API_BASE_URL` sin prefijo `/api/v1`.
- **Sí:** activar fixtures únicamente con `PUBLIC_USE_MENU_FIXTURE=true`.
- **No:** activar fixtures automáticamente cuando falle el backend, porque ocultaría errores reales de integración.
- **Sí:** permitir los escenarios `populated`, `empty` y `error` mediante `PUBLIC_MENU_FIXTURE_SCENARIO`.
- **Sí:** usar platos ficticios variados para evaluar el diseño sin asumir que representan la carta real.
- **Sí:** mantener temporalmente la marca “El Molino del Pez” y el eslogan “Sabor que viene del mar”.
- **No:** usar todavía “El Olímpico”, porque el cambio de identidad continúa en trámite.
- **Sí:** aislar el branding para reemplazarlo cuando la API entregue información del restaurante o de la sucursal.
- **Sí:** basar la paleta en azul profundo, celeste, marfil y naranja, en coherencia con `public/logo.png`.
- **Sí:** usar una composición editorial marina con tipografía expresiva, textura sutil y movimiento contenido.
- **No:** persistir datos del menú en `localStorage`, IndexedDB ni cookies.
- **No:** reordenar categorías o platos en el cliente; el backend es responsable del orden contractual.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El backend y Astro se ejecutan en orígenes distintos durante desarrollo | Documentar `PUBLIC_API_BASE_URL` y mostrar un error claro; la configuración CORS pertenece al backend y no se simulará desde esta spec. |
| Los fixtures divergen del contrato vivo | Compartir los mismos tipos con el cliente real y actualizar ambos cuando cambie `api-contract.md`. |
| El modo fixture llega activado a producción | Exigir la variable explícita, documentar su valor predeterminado como `false` y no usar fallback automático. |
| Las imágenes remotas fallan o son lentas | Reservar espacio estable y sustituir cualquier error por un fallback local sin salto de layout. |
| El branding estático queda desactualizado después del cambio a “El Olímpico” | Mantener toda la identidad en `src/config/restaurant-brand.ts` y el logo en una ruta única. |
| El logo contiene texto integrado que puede perder legibilidad en tamaños pequeños | Definir un tamaño mínimo, acompañarlo con texto accesible y evitar depender solo de la imagen para comunicar la marca. |
| Cambiar variables públicas requiere reconstruir el frontend | Documentarlo en `.env.example`; son valores de compilación de Vite y no configuración secreta en tiempo de ejecución. |
| El contrato futuro cambia la forma del menú público | Mantener contratos, cliente y fixtures dentro de `src/features/public-menu` para limitar el área afectada. |

## Lo que **no** está en esta spec

- Carrito, selección de cantidades o persistencia de platos.
- Disponibilidad, datos del cliente o reserva temporal.
- Checkout, redirección a Stripe o consulta de pagos.
- Autenticación y administración del restaurante.
- Selector público de sucursales.
- SSR o rutas dinámicas por UUID.
- Branding obtenido desde el backend.
- Cambio visual o textual a “El Olímpico”.

Cada uno de estos flujos deberá definirse en una spec independiente cuando corresponda.
