# SPEC 07 — Catálogo administrativo

> **Estado:** Aprobado
> **Depende de:** SPEC 03, SPEC 04, SPEC 05, SPEC 06
> **Fecha:** 2026-08-03
> **Objetivo:** Implementar la gestión staff de categorías, platos y su configuración comercial por sucursal con permisos por rol, ordenamiento accesible y borradores recuperables.

## Por qué existe esta spec

El menú público ya presenta categorías y platos, pero el panel staff no permite mantener esos datos ni definir su precio y disponibilidad en cada sucursal.

Las reservas necesitan un catálogo operativo antes de permitir que el cliente elija platos. Esta spec cubre esa administración sin incorporar todavía el flujo de reserva.

## Alcance

**Incluido:**

- Crear `src/features/staff-catalog/` para contratos, formularios, cliente API, queries, permisos, filtros, ordenamiento, borradores y componentes del catálogo.
- Añadir “Catálogo” a la navegación principal staff con destino `/staff/catalog/categories`.
- Crear `/staff/catalog/categories` como listado protegido de categorías globales del restaurante.
- Crear `/staff/catalog/categories/new` para registrar una categoría.
- Crear `/staff/catalog/categories/:categoryId` para consultar o administrar una categoría existente.
- Crear `/staff/catalog/dishes` como listado protegido de platos globales agrupados por categoría.
- Crear `/staff/catalog/dishes/new` para registrar un plato.
- Crear `/staff/catalog/dishes/:dishId` para consultar o administrar un plato existente.
- Crear `/staff/branches/:branchId/menu` para configurar precio y disponibilidad de los platos en una sucursal.
- Añadir “Configurar menú” al listado y al detalle de sucursales.
- Permitir que `admin` y `manager` creen, editen, ordenen, activen y desactiven categorías y platos.
- Permitir que `admin` y `manager` configuren platos en cualquier sucursal autorizada por el backend.
- Permitir que `branch_admin` consulte categorías y platos globales en modo de solo lectura.
- Permitir que `branch_admin` configure platos únicamente en su sucursal asignada.
- Ocultar las acciones globales no permitidas a `branch_admin` y mostrar una vista sin permisos al abrir directamente rutas de creación.
- Mantener al backend como frontera definitiva de autorización y no reintentar `403 FORBIDDEN`.
- Validar con Zod todas las respuestas y payloads administrativos del catálogo.
- Listar categorías y platos con filtros `Todas`, `Activas` e `Inactivas` mediante `?status=active|inactive`.
- Mantener los listados globales sin búsqueda ni paginación.
- Crear categorías con nombre y posición positiva; recibirlas inicialmente como `inactive`.
- Precargar la posición de una categoría nueva con la posición máxima global más uno.
- Editar nombre y posición de una categoría mediante un único formulario.
- Activar y desactivar categorías mediante un control separado y `AlertDialog` para ambos cambios.
- Explicar que desactivar una categoría conserva sus platos y configuraciones, pero deja de publicarlos.
- Crear platos con nombre, descripción, URL de imagen opcional, ingredientes, alérgenos, categoría y posición positiva.
- Precargar la posición de un plato nuevo con la posición máxima de su categoría más uno.
- Mostrar categorías activas e inactivas en el selector de plato e identificar visual y textualmente su estado.
- Editar ingredientes y alérgenos como listas dinámicas con alta, eliminación y prevención de duplicados sin distinguir mayúsculas y minúsculas.
- Permitir eliminar la imagen de un plato enviando `imageUrl: null` durante la edición.
- Mostrar vista previa para una URL de imagen válida y fallback con advertencia cuando el recurso no cargue.
- Permitir guardar una URL `http/https` contractualmente válida aunque el recurso remoto no pueda cargarse en ese momento.
- Editar los datos de un plato mediante un único formulario y mantener el estado en un control independiente.
- Confirmar mediante `AlertDialog` tanto la activación como la desactivación de platos.
- Explicar que desactivar un plato conserva sus configuraciones por sucursal, pero deja de publicarlo.
- Instalar y usar `@dnd-kit/react` para ordenar categorías entre sí y platos únicamente dentro de su categoría.
- Mantener el cambio de categoría de un plato dentro de su formulario y no mediante arrastre entre grupos.
- Ofrecer acciones “Subir” y “Bajar” como alternativa de puntero único al arrastre.
- Permitir operar el ordenamiento con teclado, anunciar el resultado y respetar `prefers-reduced-motion`.
- Habilitar el ordenamiento solo en la vista `Todas`; las vistas filtradas serán de solo lectura respecto al orden.
- Marcar el orden modificado como cambio pendiente y conservarlo como borrador durante siete días.
- Guardar explícitamente el orden mediante `PATCH` secuenciales solo para elementos cuya posición cambió.
- Reconsultar el orden definitivo del servidor y mostrar un error claro cuando un guardado de orden falle parcialmente.
- Mostrar en la configuración de sucursal todos los platos globales agrupados por categoría.
- Identificar cada plato como `Sin configurar` o mostrar su precio y estado comercial actual.
- Filtrar localmente la configuración por `Todos`, `Disponibles`, `Agotados`, `Inactivos` y `Sin configurar`.
- Editar individualmente cada configuración de sucursal con precio, estado y botón “Guardar”.
- Inicializar un plato sin configuración con precio vacío y estado `inactive`.
- Exigir precio y estado válidos antes de enviar la primera configuración.
- Permitir configurar un plato aunque su categoría, el plato o la sucursal estén inactivos, mostrando advertencias sin bloquear.
- Conservar valores y permitir reintentar ante errores remotos o de red.
- Mapear `MENU_CATEGORY_NAME_ALREADY_EXISTS` a `name` en formularios de categoría.
- Mapear `DISH_NAME_ALREADY_EXISTS` a `name` en formularios de plato.
- Resolver de forma específica `MENU_CATEGORY_NOT_FOUND`, `DISH_NOT_FOUND`, `BRANCH_NOT_FOUND`, `RESTAURANT_NOT_FOUND`, `FORBIDDEN`, respuestas inválidas y fallos de red.
- Persistir borradores de categorías, platos, órdenes y configuraciones por sucursal en `localStorage` durante siete días.
- Separar cada borrador por versión, usuario, recurso, sucursal y sección.
- Ofrecer siempre `Recuperar` o `Descartar` sin restaurar automáticamente.
- Detectar conflictos de categoría y plato mediante `updatedAt`.
- Detectar conflictos de configuración por sucursal comparando el precio y estado originales con los valores actuales.
- Detectar conflictos de orden comparando los identificadores y posiciones base con el orden actual del servidor.
- Eliminar cada borrador al guardar, descartarlo o caducar, y eliminar todos los borradores del usuario al cerrar sesión.
- Reutilizar el proveedor compartido de cambios pendientes para navegación interna, recarga y cierre de pestaña.
- Usar Sonner para éxitos y errores remotos generales, sin reemplazar errores de campo ni estados persistentes de carga fallida.
- Usar `Table` de shadcn en escritorio y tarjetas en móvil para los listados administrativos.
- Mantener todas las páginas privadas con `noindex, nofollow`, navegación por teclado y diseño responsive.
- Añadir pruebas de contratos, cliente API, permisos, filtros, formularios, estados, ordenamiento, borradores, configuración por sucursal y navegación.

**Fuera de alcance para futuras specs:**

- Eliminar categorías o platos física o lógicamente mediante una acción distinta de activar o desactivar.
- Crear, editar, configurar o cambiar estados de forma masiva.
- Subir, transformar, recortar o almacenar archivos de imagen.
- Arrastrar un plato entre categorías.
- Reordenar elementos desde una vista filtrada.
- Añadir búsqueda o paginación a los listados.
- Incorporar un endpoint transaccional o masivo de ordenamiento.
- Modificar el menú público existente.
- Implementar selección de platos, carrito, reservas, disponibilidad de mesas, pagos o pedidos.
- Modificar endpoints, roles, autorización, normalización o modelos del backend.
- Rediseñar globalmente el panel staff.

## Modelo de datos

Los esquemas Zod son la fuente de verdad del módulo y los tipos TypeScript se infieren desde ellos.

```ts
const catalogStatusSchema = z.enum(["active", "inactive"]);

const menuCategorySchema = z.object({
  id: z.uuid(),
  restaurantId: z.uuid(),
  name: z.string().min(1).max(80),
  position: z.number().int().positive(),
  status: catalogStatusSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
```

```ts
const dishSchema = z.object({
  id: z.uuid(),
  restaurantId: z.uuid(),
  categoryId: z.uuid(),
  categoryName: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  imageUrl: z.url().nullable(),
  ingredients: z.array(z.string().min(1).max(100)).max(50),
  allergens: z.array(z.string().min(1).max(100)).max(30),
  position: z.number().int().positive(),
  status: catalogStatusSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
```

`imageUrl` acepta únicamente URLs `http` o `https` de hasta 2048 caracteres. El schema de formulario transforma un campo vacío en ausencia durante la creación y en `null` durante la edición cuando se elimina una referencia existente.

```ts
interface CreateMenuCategoryRequest {
  name: string;
  position: number;
}

interface UpdateMenuCategoryRequest {
  name: string;
  position: number;
}

interface CreateDishRequest {
  name: string;
  description: string;
  imageUrl?: string;
  ingredients: string[];
  allergens: string[];
  categoryId: string;
  position: number;
}

interface UpdateDishRequest {
  name: string;
  description: string;
  imageUrl: string | null;
  ingredients: string[];
  allergens: string[];
  categoryId: string;
  position: number;
}
```

Los formularios envían todos los campos editables de su sección, aunque los endpoints `PATCH` admitan propiedades opcionales. El estado se envía exclusivamente a `/status`.

La configuración comercial usa estructuras separadas del estado global del plato:

```ts
const branchDishStatusSchema = z.enum(["available", "sold_out", "inactive"]);

const branchDishConfigurationSchema = z.object({
  price: z.string().regex(/^\d{1,8}\.\d{2}$/),
  status: branchDishStatusSchema,
});

const branchDishSchema = dishSchema.extend({
  branchConfiguration: branchDishConfigurationSchema.nullable(),
});

interface ReplaceBranchDishConfigurationRequest {
  price: string;
  status: "available" | "sold_out" | "inactive";
}
```

El precio permanece como cadena decimal, exige exactamente dos decimales, debe ser mayor que `0.00` y no puede superar `99999999.99`. Se formatea como PEN solo para presentación.

Los filtros usan valores contractuales y valores locales diferenciados:

```ts
type CatalogStatusFilter = "active" | "inactive" | undefined;

type BranchDishFilter =
  | "all"
  | "available"
  | "sold_out"
  | "inactive"
  | "unconfigured";
```

`CatalogStatusFilter` se refleja en `?status=active|inactive` y se envía al backend. `BranchDishFilter` se aplica solo en memoria sobre la colección completa de la sucursal.

El orden editable se representa sin copiar objetos completos del API:

```ts
interface CatalogOrderItem {
  id: string;
  position: number;
}

interface CatalogOrderDraft {
  baseOrder: CatalogOrderItem[];
  orderedIds: string[];
}
```

Convenciones de orden:

- Las categorías guardadas se normalizan a posiciones consecutivas desde `1`.
- Los platos se normalizan a posiciones consecutivas desde `1` dentro de cada categoría.
- Un plato nunca cambia de categoría mediante arrastre.
- Solo los elementos con una posición distinta de la recibida generan un `PATCH`.
- Los `PATCH` se ejecutan secuencialmente para conocer con precisión el primer fallo.
- Un fallo parcial no intenta simular una transacción ni revertir respuestas ya confirmadas.
- Después de cualquier fallo se invalidan las queries afectadas y se presenta el orden definitivo devuelto por el servidor.

Los borradores usan una envoltura versionada y discriminada por sección:

```ts
type CatalogDraftSection =
  | "category-new"
  | "category-details"
  | "category-order"
  | "dish-new"
  | "dish-details"
  | "dish-order"
  | "branch-configuration";

interface StoredCatalogDraft<TValues, TBase> {
  version: 1;
  userId: string;
  section: CatalogDraftSection;
  resourceId: string | null;
  branchId: string | null;
  base: TBase;
  savedAt: string;
  expiresAt: string;
  values: TValues;
}
```

Claves de almacenamiento:

```text
staff-catalog-draft:v1:{userId}:category:new
staff-catalog-draft:v1:{userId}:category:{categoryId}:details
staff-catalog-draft:v1:{userId}:category:order
staff-catalog-draft:v1:{userId}:dish:new
staff-catalog-draft:v1:{userId}:dish:{dishId}:details
staff-catalog-draft:v1:{userId}:dish:{categoryId}:order
staff-catalog-draft:v1:{userId}:branch:{branchId}:dish:{dishId}:configuration
```

Convenciones de borradores:

- Categorías y platos existentes guardan `updatedAt` como base de conflicto.
- Una configuración por sucursal guarda como base su configuración completa o `null`.
- Un orden guarda como base únicamente pares de `id` y `position`.
- Un borrador nuevo no tiene versión remota base.
- `expiresAt` equivale a siete días después de `savedAt`.
- Los borradores contienen solo valores editables y metadatos mínimos de conflicto.
- Los borradores nunca contienen tokens, usuario completo ni respuestas crudas.
- Un fallo o indisponibilidad de `localStorage` no impide utilizar ni guardar el catálogo en el backend.

## Plan de implementación

1. Ejecutar `bun add @dnd-kit/react` y conservar la versión resuelta en `package.json` y `bun.lock` sin añadir otra librería de drag-and-drop.
2. Crear `src/features/staff-catalog/contracts/staff-catalog.schemas.ts` con esquemas de categoría, plato, configuración por sucursal, colecciones, estados, filtros y payloads remotos.
3. Crear `src/features/staff-catalog/contracts/staff-catalog-form.schemas.ts` con validaciones de formularios, precio decimal, URL `http/https`, listas dinámicas y normalización case-insensitive.
4. Crear `src/features/staff-catalog/api/staff-catalog-client.ts` con operaciones para listar, consultar, crear, editar y cambiar el estado de categorías y platos mediante `StaffApiClient`.
5. Añadir al cliente las operaciones para listar platos de una sucursal y reemplazar individualmente su configuración comercial mediante `PUT`.
6. Crear `src/features/staff-catalog/query/staff-catalog-query.ts` con claves separadas para categorías, platos, detalles y menús de sucursal; no reintentar errores y actualizar o invalidar todas las variantes afectadas.
7. Crear `src/features/staff-catalog/lib/catalog-status-filter.ts` para aceptar solo `active` o `inactive` en la URL y usar `Todas` ante ausencia o valor inválido.
8. Crear `src/features/staff-catalog/lib/branch-dish-filter.ts` para aplicar en memoria los cinco filtros comerciales sin modificar la URL ni solicitar endpoints inexistentes.
9. Crear `src/features/staff-catalog/lib/staff-catalog-permissions.ts` con reglas puras para gestión global de `admin` y `manager`, lectura global de todos los roles y configuración de `branch_admin` limitada a su sucursal.
10. Crear `src/features/staff-catalog/lib/catalog-order.ts` para agrupar platos, calcular posiciones iniciales, mover elementos, normalizar posiciones y obtener solo los cambios que requieren `PATCH`.
11. Crear `src/features/staff-catalog/lib/staff-catalog-drafts.ts` para claves versionadas, schemas por sección, caducidad de siete días, lectura segura, escritura, conflicto, descarte y eliminación por usuario.
12. Extender `StaffLayout.tsx` para eliminar todos los borradores del catálogo antes de completar el logout explícito.
13. Crear componentes compartidos de catálogo para filtros, estados remotos, etiquetas de estado y navegación local entre “Categorías” y “Platos”.
14. Crear `StaffCategoryList.tsx` con `Table` en escritorio, tarjetas en móvil, filtros URL, estados de carga y acciones según permisos.
15. Crear un listado ordenable de categorías con `@dnd-kit/react`, asa de arrastre, teclado, anuncios accesibles, acciones Subir/Bajar y movimiento reducido.
16. Integrar el borrador de orden de categorías, recuperación explícita y botón “Guardar orden” disponible únicamente para `admin` y `manager` en `Todas`.
17. Guardar secuencialmente las posiciones modificadas de categorías; detenerse ante el primer error, invalidar la colección y explicar que el servidor puede haber confirmado cambios anteriores.
18. Crear `StaffCatalogCategoriesApp.tsx` y `src/pages/staff/catalog/categories/index.astro` con sesión, permisos, filtros, ordenamiento y estados recuperables.
19. Crear `StaffCategoryCreateForm.tsx` con posición máxima más uno, borrador recuperable, bloqueo de envíos duplicados y mapeo de nombre duplicado.
20. Crear `StaffCategoryCreateApp.tsx` y `src/pages/staff/catalog/categories/new.astro`; no montar el formulario cuando el rol carezca de permiso.
21. Crear `StaffCategoryDetailsForm.tsx` y `StaffCategoryStatusControl.tsx` con guardados independientes, conflictos por `updatedAt`, Sonner y confirmación de ambos estados.
22. Crear `StaffCategoryDetailApp.tsx` y `src/pages/staff/catalog/categories/[categoryId].astro`; presentar a `branch_admin` la información en modo de solo lectura.
23. Crear `DynamicStringListField.tsx` para añadir y eliminar ingredientes o alérgenos, anunciar cambios y rechazar vacíos, duplicados y límites contractuales.
24. Crear `DishImageUrlField.tsx` con URL opcional, vista previa, fallback y advertencia no bloqueante cuando una URL válida no cargue.
25. Crear `StaffDishList.tsx` agrupado por categoría, con `Table` o estructura semántica equivalente en escritorio, tarjetas en móvil, filtros URL y acciones según permisos.
26. Crear listas ordenables de platos por categoría con `@dnd-kit/react`, sin movimiento entre grupos y con las mismas alternativas accesibles del orden de categorías.
27. Integrar un borrador de orden por categoría y guardar secuencialmente solo los platos modificados; recargar el estado remoto ante cualquier fallo parcial.
28. Crear `StaffCatalogDishesApp.tsx` y `src/pages/staff/catalog/dishes/index.astro` con carga coordinada de categorías y platos, agrupación, filtros y ordenamiento solo en `Todas`.
29. Crear `StaffDishCreateForm.tsx` con todas las categorías identificadas por estado, posición máxima de la categoría seleccionada más uno, listas dinámicas, imagen y borrador recuperable.
30. Crear `StaffDishCreateApp.tsx` y `src/pages/staff/catalog/dishes/new.astro`; no montar el formulario cuando el rol carezca de permiso.
31. Crear `StaffDishDetailsForm.tsx` y `StaffDishStatusControl.tsx` con edición completa, `imageUrl: null`, conflicto por `updatedAt`, mapeo de errores y confirmación de ambos estados.
32. Crear `StaffDishDetailApp.tsx` y `src/pages/staff/catalog/dishes/[dishId].astro`; mostrar a `branch_admin` una ficha de solo lectura sin controles mutables.
33. Crear `StaffBranchDishConfigurationForm.tsx` con precio textual, estado, valores iniciales para platos sin configuración y un guardado independiente por plato.
34. Integrar borradores de configuración por plato y sucursal; comparar la configuración base con la actual y exigir confirmación antes de recuperar un borrador conflictivo.
35. Crear `StaffBranchDishList.tsx` agrupado por categoría, con filtros locales, estados `Sin configurar`, advertencias por recursos inactivos y presentación responsive.
36. Crear `StaffBranchMenuApp.tsx` y `src/pages/staff/branches/[branchId]/menu.astro`; resolver permisos, sucursal, colección completa, `BRANCH_NOT_FOUND`, `FORBIDDEN`, red y respuestas inválidas.
37. Actualizar `StaffLayout.tsx` con “Catálogo”, estado activo accesible y destino `/staff/catalog/categories` para los tres roles.
38. Actualizar `StaffBranchList.tsx` y `StaffBranchDetailApp.tsx` con enlaces “Configurar menú” que mantengan explícito el `branchId`.
39. Integrar todos los formularios y órdenes con `StaffUnsavedChangesProvider`, usando `AlertDialog` para navegación interna y `beforeunload` para cierre o recarga.
40. Crear pruebas de contratos y cliente API para schemas, normalización, rutas, queries, payloads, errores y ausencia de solicitudes reales.
41. Crear pruebas de permisos y filtros para los tres roles, URLs globales, filtros comerciales locales y accesos directos no permitidos.
42. Crear pruebas de borradores para aislamiento, caducidad, recuperación, conflictos por timestamp, valor base y orden, descarte, guardado, logout y fallo de almacenamiento.
43. Crear pruebas de formularios de categorías y platos para posiciones iniciales, listas dinámicas, imagen, foco de errores, duplicados, conservación de valores y modo de solo lectura.
44. Crear pruebas de ordenamiento para arrastre, teclado, Subir/Bajar, bloqueo en filtros, cambios mínimos, guardado secuencial y recuperación tras fallo parcial.
45. Crear pruebas de configuración por sucursal para agrupación, cinco filtros, primera configuración, estados, advertencias, borradores, permisos y errores recuperables.
46. Ejecutar `bun test`, `bun run check` y `bun run build`; verificar manualmente los tres roles, todas las rutas, ordenamiento por puntero y teclado, recuperación tras recarga y responsive a 320 px.

## Criterios de aceptación

- [ ] Todas las rutas nuevas requieren una sesión staff válida y conservan `returnTo` al redirigir al login.
- [ ] La navegación principal muestra “Catálogo” para `admin`, `manager` y `branch_admin`.
- [ ] “Catálogo” enlaza a `/staff/catalog/categories` y usa `aria-current="page"` en todas las rutas `/staff/catalog/*`.
- [ ] Categorías y platos ofrecen enlaces internos visibles para cambiar entre ambas secciones.
- [ ] El listado y el detalle de sucursales muestran una acción funcional “Configurar menú”.
- [ ] `admin` y `manager` pueden crear, editar, ordenar y cambiar el estado de categorías y platos.
- [ ] `admin` y `manager` pueden configurar platos de cualquier sucursal autorizada por el backend.
- [ ] `branch_admin` puede consultar categorías y platos globales sin controles mutables.
- [ ] `branch_admin` no visualiza acciones de creación, edición, estado ni orden global.
- [ ] Abrir una ruta de creación como `branch_admin` muestra falta de permisos, no monta el formulario y no envía `POST`.
- [ ] `branch_admin` puede configurar platos únicamente en su sucursal asignada.
- [ ] Abrir el menú de otra sucursal como `branch_admin` muestra `FORBIDDEN` sin refresh ni reintento automático.
- [ ] El backend continúa siendo la frontera definitiva de autorización para todas las solicitudes.
- [ ] Categorías y platos usan `Todas`, `Activas` e `Inactivas` con `?status=active|inactive`.
- [ ] `Todas` usa la ruta correspondiente sin query de estado.
- [ ] Un filtro global inválido vuelve a `Todas` sin construir una petición inválida.
- [ ] Recargar conserva un filtro global válido.
- [ ] Los listados no incluyen búsqueda ni paginación.
- [ ] Carga, colección vacía, red fallida y respuesta inválida tienen estados visibles y recuperables.
- [ ] Todas las respuestas se validan con Zod antes de entrar en la UI o caché.
- [ ] Una categoría nueva precarga la posición máxima global más uno.
- [ ] Una categoría nueva exige nombre de 1 a 80 caracteres y posición entera positiva.
- [ ] Una categoría se recibe y muestra inicialmente como `inactive`.
- [ ] `MENU_CATEGORY_NAME_ALREADY_EXISTS` muestra error junto a `name`, enfoca el campo y no genera toast duplicado.
- [ ] Editar una categoría envía conjuntamente nombre y posición, pero nunca su estado.
- [ ] Activar y desactivar una categoría usa un control separado y exige confirmación mediante `AlertDialog`.
- [ ] La confirmación de desactivación explica que los platos y configuraciones se conservan, pero dejan de publicarse.
- [ ] Una categoría inexistente muestra `MENU_CATEGORY_NOT_FOUND` con regreso al listado.
- [ ] El formulario de plato contiene nombre, descripción, URL de imagen, ingredientes, alérgenos, categoría y posición.
- [ ] El selector de categoría incluye categorías activas e inactivas e identifica textualmente cada estado.
- [ ] Elegir o cambiar categoría precarga la posición máxima de ese grupo más uno solo durante la creación y sin sobrescribir una posición que el usuario ya modificó.
- [ ] El nombre exige de 1 a 120 caracteres y la descripción de 1 a 1000.
- [ ] Ingredientes admite como máximo 50 elementos de 1 a 100 caracteres.
- [ ] Alérgenos admite como máximo 30 elementos de 1 a 100 caracteres.
- [ ] Ingredientes y alérgenos rechazan vacíos y duplicados sin distinguir mayúsculas y minúsculas.
- [ ] Cada ingrediente y alérgeno puede añadirse y eliminarse individualmente con teclado.
- [ ] Una URL de imagen vacía se omite durante la creación.
- [ ] Eliminar una imagen existente envía `imageUrl: null` durante la edición.
- [ ] Una URL que no sea `http` o `https`, o que supere 2048 caracteres, impide el envío.
- [ ] Una URL válida que no cargue muestra fallback y advertencia sin impedir el guardado.
- [ ] La posición del plato exige un entero positivo.
- [ ] Un plato nuevo se recibe y muestra inicialmente como `inactive`.
- [ ] `DISH_NAME_ALREADY_EXISTS` muestra error junto a `name`, enfoca el campo y no genera toast duplicado.
- [ ] `MENU_CATEGORY_NOT_FOUND` conserva el formulario de plato y explica que debe seleccionarse otra categoría.
- [ ] Editar un plato envía todos sus datos editables, pero nunca su estado ni configuración comercial.
- [ ] Activar y desactivar un plato usa un control separado y exige confirmación mediante `AlertDialog`.
- [ ] La confirmación de desactivación explica que sus configuraciones por sucursal se conservan, pero deja de publicarse.
- [ ] Un plato inexistente muestra `DISH_NOT_FOUND` con regreso al listado.
- [ ] `@dnd-kit/react` es la única dependencia nueva de drag-and-drop.
- [ ] Las categorías pueden reordenarse entre sí mediante arrastre cuando el filtro es `Todas`.
- [ ] Los platos pueden reordenarse únicamente dentro de su categoría cuando el filtro es `Todas`.
- [ ] Arrastrar un plato sobre otra categoría no cambia su `categoryId` ni lo mueve a ese grupo.
- [ ] Cambiar la categoría de un plato solo es posible desde su formulario.
- [ ] Cada elemento ordenable ofrece acciones “Subir” y “Bajar” además del gesto de arrastre.
- [ ] El ordenamiento puede completarse con teclado y anuncia el elemento y su nueva posición.
- [ ] Las asas y acciones mantienen foco visible y objetivos de al menos 24 por 24 píxeles CSS.
- [ ] Las animaciones de ordenamiento respetan `prefers-reduced-motion`.
- [ ] Las acciones imposibles “Subir” o “Bajar” están deshabilitadas y lo comunican semánticamente.
- [ ] `Activas` e `Inactivas` no permiten arrastrar, subir, bajar ni guardar orden.
- [ ] Modificar el orden no envía solicitudes hasta activar “Guardar orden”.
- [ ] Modificar el orden marca cambios pendientes y crea el borrador correspondiente.
- [ ] Guardar categorías asigna posiciones consecutivas desde `1` y envía solo las que cambiaron.
- [ ] Guardar platos asigna posiciones consecutivas desde `1` dentro de la categoría y envía solo los que cambiaron.
- [ ] Los cambios de posición se envían mediante `PATCH` secuenciales.
- [ ] Si falla un `PATCH`, no se envían los siguientes, se recarga la colección y se muestra el orden confirmado por el servidor.
- [ ] Un fallo parcial explica que algunas posiciones anteriores pudieron guardarse y no anuncia un éxito total.
- [ ] Guardar correctamente elimina solo el borrador del orden correspondiente.
- [ ] `/staff/branches/:branchId/menu` muestra todos los platos globales agrupados por categoría.
- [ ] Cada plato muestra nombre, estado global, estado de categoría y su configuración comercial o `Sin configurar`.
- [ ] El menú de sucursal ofrece `Todos`, `Disponibles`, `Agotados`, `Inactivos` y `Sin configurar`.
- [ ] Los cinco filtros comerciales se aplican localmente sin realizar una nueva solicitud ni alterar la URL.
- [ ] Un plato sin configuración muestra precio vacío y estado `inactive` al abrir su formulario.
- [ ] Guardar una configuración exige un precio decimal con exactamente dos posiciones.
- [ ] `0.00`, valores negativos, más de ocho enteros o decimales distintos de dos posiciones impiden el envío.
- [ ] El estado comercial acepta exclusivamente `available`, `sold_out` o `inactive`.
- [ ] Cada plato se guarda individualmente mediante un único `PUT` con precio y estado.
- [ ] Guardar un plato no envía ni modifica la configuración de otro.
- [ ] Un plato configurado muestra el precio formateado como PEN sin convertir el valor contractual a número para enviarlo.
- [ ] Una categoría, plato o sucursal inactiva produce una advertencia, pero no bloquea guardar la configuración.
- [ ] Una configuración exitosa actualiza la fila o tarjeta y todas las queries cacheadas afectadas.
- [ ] Un error remoto conserva precio y estado y permite reintentar sin duplicar solicitudes.
- [ ] `BRANCH_NOT_FOUND` muestra una sucursal inexistente con regreso al listado general.
- [ ] `RESTAURANT_NOT_FOUND` muestra un estado persistente y no intenta operar con datos parciales.
- [ ] Cada formulario u orden modificado crea una clave versionada y aislada por usuario y recurso.
- [ ] Cada configuración modificada crea una clave aislada además por sucursal y plato.
- [ ] Los borradores contienen solo valores editables y metadatos mínimos, sin tokens, usuario completo ni respuestas crudas.
- [ ] Un borrador permanece disponible después de recargar o reabrir el navegador durante siete días.
- [ ] Ningún borrador se aplica automáticamente; siempre ofrece Recuperar o Descartar.
- [ ] Un `updatedAt` diferente exige confirmación antes de recuperar una categoría o plato existente.
- [ ] Una configuración base distinta de la configuración actual exige confirmación antes de recuperar.
- [ ] Un orden base distinto de las posiciones actuales exige confirmación antes de recuperar.
- [ ] Un borrador de más de siete días se elimina y no se ofrece para recuperar.
- [ ] Guardar correctamente o descartar elimina únicamente el borrador correspondiente.
- [ ] Cerrar sesión elimina todos los borradores de categorías, platos, órdenes y configuraciones del usuario actual.
- [ ] Un error de acceso, cuota o disponibilidad de `localStorage` no bloquea formularios, ordenamiento ni guardado remoto.
- [ ] Navegar dentro del panel con cambios pendientes exige confirmación mediante `AlertDialog`.
- [ ] Recargar o cerrar con cambios pendientes activa el aviso nativo del navegador.
- [ ] Después de guardar o descartar no aparecen advertencias de navegación obsoletas.
- [ ] Los formularios usan React Hook Form, `zodResolver` y componentes shadcn según SPEC 04.
- [ ] Los éxitos y errores remotos generales se anuncian mediante el único `Toaster` de `StaffLayout`.
- [ ] Los errores de campo permanecen asociados a sus controles y el primer error relevante recibe foco.
- [ ] Los estados de carga fallida permanecen visibles con reintento y no dependen de un toast transitorio.
- [ ] Los listados usan estructura semántica en escritorio y tarjetas legibles en móvil.
- [ ] Todas las rutas nuevas incluyen `noindex, nofollow`.
- [ ] Listados, formularios, diálogos y ordenamiento funcionan con teclado y no generan desplazamiento horizontal a 320 px.
- [ ] Las pruebas no realizan solicitudes reales ni esperan siete días reales.
- [ ] `bun test` finaliza sin errores.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.
- [ ] No se implementan eliminación, acciones masivas, subida de archivos, búsqueda, paginación, reservas, carrito, pagos ni cambios de backend.

## Decisiones

- **Sí:** incluir categorías, platos y configuración comercial por sucursal en una sola spec para entregar un catálogo operativo completo antes de reservas.
- **Sí:** mantener las categorías y platos como recursos globales del restaurante.
- **Sí:** mantener precio y disponibilidad como configuración específica de cada sucursal.
- **Sí:** añadir “Catálogo” como entrada global y “Configurar menú” dentro del contexto de cada sucursal.
- **Sí:** usar rutas separadas para listado, creación y detalle de categorías y platos.
- **Sí:** usar una ruta anidada por sucursal para su configuración comercial.
- **Sí:** permitir gestión global a `admin` y `manager`.
- **Sí:** permitir a `branch_admin` lectura global del catálogo y configuración exclusiva de su sucursal.
- **No:** permitir a `branch_admin` crear, editar, ordenar o cambiar el estado global de categorías y platos.
- **Sí:** ocultar acciones no permitidas como mejora de UX y mantener el backend como frontera de seguridad.
- **Sí:** usar `Todas`, `Activas` e `Inactivas` como filtros contractuales de categorías y platos.
- **No:** añadir búsqueda o paginación sin soporte del contrato backend.
- **Sí:** crear categorías y platos como `inactive` según la respuesta contractual del servidor.
- **Sí:** precargar la posición máxima más uno para reducir entrada repetitiva.
- **Sí:** conservar `position` como campo numérico entero y positivo además del ordenamiento visual.
- **Sí:** instalar únicamente `@dnd-kit/react` para el drag-and-drop del catálogo.
- **No:** implementar drag-and-drop directamente con eventos HTML nativos por su complejidad táctil y accesible.
- **Sí:** ordenar categorías entre sí y platos solo dentro de su categoría.
- **No:** mover platos entre categorías mediante arrastre; ese cambio pertenece al formulario del plato.
- **Sí:** ofrecer Subir/Bajar y teclado como alternativas completas al gesto de arrastre.
- **Sí:** habilitar cambios de orden solo en `Todas` para no calcular posiciones sobre elementos ocultos.
- **Sí:** exigir “Guardar orden” antes de enviar cambios remotos.
- **Sí:** enviar `PATCH` secuenciales únicamente para posiciones modificadas.
- **No:** simular atomicidad o rollback cuando el backend no ofrece una operación masiva transaccional.
- **Sí:** recargar el orden definitivo del servidor después de un fallo parcial y explicar el resultado.
- **Sí:** editar ingredientes y alérgenos mediante listas dinámicas.
- **No:** usar texto separado por comas porque dificulta límites, duplicados y edición individual.
- **Sí:** mostrar categorías activas e inactivas al asignar un plato.
- **Sí:** usar solo `imageUrl` con vista previa y fallback.
- **No:** incorporar subida o almacenamiento de archivos hasta que exista contrato backend.
- **Sí:** permitir guardar una URL válida aunque la imagen no cargue, porque su disponibilidad remota no puede garantizarse desde el formulario.
- **Sí:** mantener el estado global separado de los formularios de datos y confirmar activación y desactivación.
- **Sí:** permitir configurar comercialmente recursos inactivos con una advertencia, según el contrato backend.
- **Sí:** editar cada configuración por sucursal de forma individual.
- **No:** incorporar guardado o edición masiva de precios y estados.
- **Sí:** mostrar `Todos`, `Disponibles`, `Agotados`, `Inactivos` y `Sin configurar` como filtros locales del menú de sucursal.
- **No:** inventar parámetros remotos para filtros que el endpoint no admite.
- **Sí:** iniciar una configuración ausente con precio vacío y estado `inactive`.
- **Sí:** mantener el precio como cadena decimal y formatearlo como PEN solo al mostrarlo.
- **Sí:** persistir durante siete días borradores no sensibles de formularios, órdenes y configuraciones.
- **Sí:** pedir siempre Recuperar o Descartar en vez de restaurar silenciosamente.
- **Sí:** detectar conflictos con `updatedAt` para categorías y platos.
- **Sí:** comparar valores base para configuraciones por sucursal porque el contrato no entrega un timestamp de esa configuración.
- **Sí:** comparar identificadores y posiciones base para detectar conflictos de orden.
- **Sí:** degradar sin persistencia local cuando `localStorage` no esté disponible.
- **Sí:** reutilizar TanStack Query, React Hook Form, Zod, shadcn Table, AlertDialog, Sonner y el proveedor compartido de cambios pendientes.
- **No:** introducir un store global, otra librería de formularios o un segundo sistema de notificaciones.
- **No:** modificar el menú público, las reservas o el backend desde esta spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un guardado de orden falla después de confirmar posiciones anteriores | Ejecutar secuencialmente, detenerse en el primer fallo, no prometer rollback e invalidar la colección para mostrar el estado real del servidor. |
| Dos sesiones reordenan el mismo catálogo | Guardar el orden base en el borrador, compararlo al recuperar y exigir confirmación cuando cambien posiciones remotas. |
| El orden en una vista filtrada omite elementos y genera posiciones incorrectas | Deshabilitar arrastre, Subir/Bajar y guardado fuera de la vista `Todas`. |
| El drag-and-drop excluye teclado, táctil o tecnologías de asistencia | Usar `@dnd-kit/react`, asas con nombre accesible, anuncios, teclado y acciones Subir/Bajar equivalentes. |
| Las animaciones del ordenamiento causan molestias | Respetar `prefers-reduced-motion` y mantener funcionales las alternativas sin animación. |
| Una URL válida apunta a una imagen rota, lenta o bloqueada | Mostrar fallback y advertencia sin tratar la carga visual como validación contractual del campo. |
| Ingredientes o alérgenos duplicados difieren solo en mayúsculas | Normalizar para comparación, conservar texto limpio y bloquear duplicados antes del envío. |
| Un plato cambia de categoría mientras existe un borrador de orden | Aislar el borrador por categoría, comparar el orden base y advertir antes de recuperarlo. |
| Una configuración por sucursal cambia sin disponer de `updatedAt` | Guardar como base precio y estado, compararlos con la consulta actual y exigir confirmación ante diferencias. |
| Una configuración inactiva parece equivalente a un plato global inactivo | Mostrar ambos estados con etiquetas y explicaciones distintas en cada fila o tarjeta. |
| Configurar un recurso inactivo se interpreta como publicación inmediata | Mostrar una advertencia que explique que la configuración queda preparada, pero la publicación depende de los estados globales y de sucursal. |
| `branch_admin` intenta mutar el catálogo global mediante una URL directa | No montar formularios mutables, ocultar acciones y manejar siempre el `403` definitivo del backend. |
| Muchos formularios de configuración generan borradores cruzados | Aislar cada clave por usuario, sucursal y plato, y eliminar solo la sección confirmada. |
| `localStorage` está bloqueado, lleno o lanza una excepción | Encapsular cada acceso y mantener funcional el estado en memoria y el guardado remoto. |
| Una mutación deja obsoletos listados agrupados o filtrados | Centralizar claves de TanStack Query e invalidar todas las variantes globales y de sucursal afectadas. |
| Los filtros comerciales locales ocultan el plato recién guardado | Reaplicar el filtro sobre la respuesta actualizada y anunciar que el elemento ya no coincide con la vista actual. |

## Lo que **no** está en esta spec

- Eliminación de categorías o platos.
- Acciones masivas sobre categorías, platos o configuraciones.
- Subida, procesamiento o almacenamiento de imágenes.
- Arrastre de platos entre categorías.
- Ordenamiento desde vistas filtradas.
- Endpoint masivo o transaccional de ordenamiento.
- Búsqueda y paginación.
- Cambios visuales o funcionales en el menú público.
- Selección de platos, carrito o persistencia de una selección pública.
- Reservas, disponibilidad de mesas, pagos o pedidos.
- Cambios en endpoints, permisos, normalización o modelos del backend.
- Rediseño general del panel staff.

Cada flujo público u operación masiva deberá definirse en una spec independiente.
