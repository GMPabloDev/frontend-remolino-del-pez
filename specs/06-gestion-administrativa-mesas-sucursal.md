# SPEC 06 — Gestión administrativa de mesas por sucursal

> **Estado:** Aprobado
> **Depende de:** SPEC 03, SPEC 04, SPEC 05
> **Fecha:** 2026-08-03
> **Objetivo:** Implementar la gestión staff de mesas por sucursal con permisos por rol, formularios recuperables, filtrado y control de estado.

## Por qué existe esta spec

El panel staff ya permite administrar sucursales, pero no ofrece una interfaz para configurar las mesas que determinan la disponibilidad de reservas.

Esta spec incorpora el primer recurso administrativo anidado bajo una sucursal y aprovecha su implementación para estandarizar tablas de datos y avisos transitorios con componentes shadcn.

## Alcance

**Incluido:**

- Crear `src/features/staff-tables/` para contratos, cliente API, queries, permisos, filtros, borradores y componentes del módulo.
- Crear `/staff/branches/:branchId/tables` como listado protegido de mesas de una sucursal.
- Crear `/staff/branches/:branchId/tables/new` para registrar una mesa.
- Crear `/staff/branches/:branchId/tables/:tableId` para administrar una mesa existente.
- Añadir acciones “Gestionar mesas” en el listado y el detalle de sucursales.
- Mantener “Sucursales” como entrada global del panel sin añadir “Mesas” a la navegación principal.
- Permitir que `admin` y `manager` consulten y administren mesas de cualquier sucursal.
- Permitir únicamente que `admin` y `manager` creen mesas.
- Permitir que `branch_admin` consulte, edite y cambie el estado de las mesas de su sucursal asignada.
- Ocultar a `branch_admin` la acción de creación y mostrar una vista sin permisos ante acceso directo a la ruta de alta.
- No montar el formulario ni enviar un `POST` cuando el usuario no tenga permiso de creación.
- Mantener al backend como frontera definitiva de autorización y no reintentar `403 FORBIDDEN`.
- Listar mesas con código, capacidad, estado y acción “Administrar”.
- Usar una tabla semántica en escritorio y tarjetas en móvil.
- Filtrar por `Todas`, `Activas` e `Inactivas` mediante `?status=active|inactive`.
- Mantener el listado sin búsqueda, paginación ni orden manual.
- Validar con Zod todas las respuestas y payloads administrativos de mesas.
- Consumir y enviar estados exclusivamente como `active` e `inactive`.
- Crear mesas mediante un formulario único de código y capacidad.
- Crear cada mesa con el estado `inactive` asignado por el backend.
- Normalizar el código con las mismas reglas contractuales del backend.
- Aceptar cualquier capacidad entera positiva sin imponer un máximo artificial.
- Redirigir una creación exitosa al detalle de la mesa nueva.
- Editar código y capacidad mediante un único formulario y guardado.
- Mantener el cambio de estado en un control independiente del formulario de datos.
- Confirmar activación y desactivación mediante el `AlertDialog` ya instalado.
- Permitir activar mesas aunque su sucursal esté inactiva y mostrar un aviso informativo sin bloquear la acción.
- Informar al desactivar que la mesa deja de participar en disponibilidad futura y que las reservas existentes no se modifican.
- Mostrar `TABLE_CODE_ALREADY_EXISTS` junto al campo `code`.
- Mostrar estados recuperables para `TABLE_NOT_FOUND`, `BRANCH_NOT_FOUND`, `FORBIDDEN`, respuestas inválidas y fallos de red.
- Conservar los valores ante errores del servidor o de red y permitir reintentar.
- Persistir borradores de creación y edición en `localStorage` durante siete días.
- Separar cada borrador por versión, usuario, sucursal, mesa y sección.
- Ofrecer siempre `Recuperar` o `Descartar` sin restaurar automáticamente.
- Usar `DiningTable.updatedAt` como versión base para advertir si la mesa cambió desde que se creó el borrador.
- Eliminar el borrador al guardar, descartarlo, caducar o cerrar sesión.
- Advertir por cambios no guardados al navegar, recargar o cerrar la pestaña.
- Reubicar la coordinación genérica de cambios pendientes desde `staff-branches` hacia `staff-shell` para que sucursales y mesas compartan el patrón sin dependencias entre módulos de negocio.
- Instalar `Table` de shadcn y usarlo en las tablas de escritorio de sucursales y mesas.
- Conservar las tarjetas móviles existentes de sucursales y crear tarjetas equivalentes para mesas.
- Instalar `Sonner`, montar un único `Toaster` dentro de `StaffLayout` y usarlo para éxitos y errores remotos de mutaciones.
- Migrar a Sonner los éxitos y errores remotos de los formularios y el control de estado de sucursales.
- Mantener errores de validación junto a sus campos, errores de carga como estados recuperables y `TABLE_CODE_ALREADY_EXISTS` exclusivamente junto a `code` para evitar avisos duplicados.
- Mostrar después de una creación el toast correspondiente mediante `?created=1` y retirar inmediatamente ese parámetro de la URL.
- Añadir pruebas de contratos, permisos, filtros, cliente API, borradores, formularios, estado, feedback, navegación y responsive semántico.
- Mantener las páginas privadas con `noindex, nofollow`, navegación por teclado y comportamiento responsive.

**Fuera de alcance para futuras specs:**

- Eliminar física o lógicamente una mesa mediante una acción distinta de activar o desactivar.
- Gestionar reservas o mostrar reservas asociadas a una mesa.
- Crear, editar, activar o desactivar mesas de forma masiva.
- Combinar mesas o permitir que el cliente seleccione una mesa.
- Dibujar un plano del salón o asignar coordenadas, zonas, formas o posiciones a las mesas.
- Añadir búsqueda, paginación u orden manual al listado.
- Establecer un máximo de capacidad que no exista en el contrato backend.
- Añadir “Mesas” como entrada global independiente de la sucursal.
- Rediseñar visualmente las tablas, tarjetas, formularios o el panel staff.
- Migrar a Sonner módulos distintos de sucursales y mesas.
- Modificar endpoints, permisos, disponibilidad o modelos del backend.

## Modelo de datos

Los esquemas Zod son la fuente de verdad del módulo y los tipos TypeScript se infieren desde ellos.

```ts
const tableStatusSchema = z.enum(["active", "inactive"]);

const tableCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z0-9_-]+$/.test(value));

const staffTableSchema = z.object({
  id: z.uuid(),
  branchId: z.uuid(),
  code: tableCodeSchema,
  capacity: z.number().int().positive(),
  status: tableStatusSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
```

```ts
interface CreateTableRequest {
  code: string;
  capacity: number;
}

interface UpdateTableRequest {
  code: string;
  capacity: number;
}

interface UpdateTableStatusRequest {
  status: "active" | "inactive";
}
```

El formulario de edición envía conjuntamente `code` y `capacity`, aunque el endpoint `PATCH` admita campos opcionales.

El estado nunca forma parte del formulario de datos y se envía únicamente al endpoint `/status`.

Los borradores usan una envoltura versionada independiente de los borradores de sucursales:

```ts
type TableDraftSection = "new" | "details";

interface StoredTableDraft<TValues> {
  version: 1;
  userId: string;
  branchId: string;
  tableId: string | null;
  section: TableDraftSection;
  baseUpdatedAt: string | null;
  savedAt: string;
  expiresAt: string;
  values: TValues;
}
```

Claves de almacenamiento:

```text
staff-table-draft:v1:{userId}:{branchId}:new
staff-table-draft:v1:{userId}:{branchId}:{tableId}:details
```

Convenciones:

- `code` contiene entre 1 y 30 caracteres después de recortar espacios.
- `code` se normaliza a mayúsculas y admite letras, números, guiones y guiones bajos.
- `capacity` es cualquier entero mayor que cero.
- Una mesa nueva se recibe siempre con estado `inactive`.
- Una mesa activa puede pertenecer a una sucursal inactiva.
- Una mesa inactiva no participa en disponibilidad futura.
- Editar o desactivar una mesa no modifica reservas ya creadas.
- `baseUpdatedAt` es `null` para creación y contiene el `updatedAt` recibido al iniciar la edición.
- `expiresAt` equivale a siete días después de `savedAt`.
- Los borradores contienen solo `code` y `capacity`; nunca tokens, usuario completo ni respuestas crudas.
- Un fallo o indisponibilidad de `localStorage` no impide usar ni guardar los formularios en el backend.

## Plan de implementación

1. Ejecutar `bunx --bun shadcn@latest add table sonner` y revisar los archivos generados `src/components/ui/table.tsx` y `src/components/ui/sonner.tsx`; no reinstalar ni sobrescribir `alert-dialog.tsx`.
2. Montar un único `Toaster` en `src/features/staff-shell/components/StaffLayout.tsx` con anuncios accesibles para la aplicación staff activa.
3. Reemplazar la tabla HTML de escritorio de `src/features/staff-branches/components/StaffBranchList.tsx` por los componentes shadcn de `Table`, conservando caption, encabezados, acciones y tarjetas móviles.
4. Migrar `StaffBranchDetailsForm.tsx` y `StaffBranchRulesForm.tsx` a toast de éxito y error remoto; conservar validaciones de campo y borradores dentro de cada formulario.
5. Migrar `StaffBranchScheduleForm.tsx` y `StaffBranchStatusControl.tsx` a toast de éxito y error remoto; conservar conflictos de horario y restricciones accionables dentro de su sección.
6. Ajustar `StaffBranchCreateForm.tsx` y `StaffBranchDetailApp.tsx` para mostrar una sola confirmación de creación mediante `?created=1` y limpiar el parámetro con `history.replaceState`.
7. Mover `StaffUnsavedChangesProvider.tsx` y `staff-branch-unsaved-changes.ts` a nombres genéricos bajo `src/features/staff-shell/`; actualizar los consumidores y pruebas de sucursales sin cambiar su comportamiento.
8. Crear `src/features/staff-tables/contracts/staff-table.schemas.ts` con esquemas para mesa, colección, estado, filtros y payloads; reflejar exactamente código, capacidad, timestamps y normalización del backend.
9. Crear `src/features/staff-tables/contracts/staff-table-form.schemas.ts` con los valores de creación y edición compatibles con React Hook Form y `zodResolver`.
10. Crear `src/features/staff-tables/api/staff-tables-client.ts` con operaciones para listar, consultar, crear, editar y cambiar estado mediante `StaffApiClient` y las rutas anidadas contractuales.
11. Crear `src/features/staff-tables/query/staff-tables-query.ts` con claves por restaurante, sucursal, filtro y mesa; actualizar el detalle e invalidar todos los listados afectados después de cada mutación.
12. Crear `src/features/staff-tables/lib/table-status-filter.ts` para leer y escribir únicamente `active` o `inactive` en la URL y usar “Todas” ante valores ausentes o inválidos.
13. Crear `src/features/staff-tables/lib/staff-table-permissions.ts` con reglas puras para creación exclusiva de `admin` y `manager`, y acceso de `branch_admin` limitado a su sucursal.
14. Crear `src/features/staff-tables/lib/staff-table-drafts.ts` para claves versionadas, validación Zod, caducidad de siete días, lectura segura, escritura y eliminación por usuario.
15. Extender el cierre de sesión en `StaffLayout.tsx` para eliminar borradores de sucursales y mesas antes de completar el logout explícito.
16. Crear los componentes del listado bajo `src/features/staff-tables/components/` con `Table` en escritorio, tarjetas en móvil, filtros URL y estados de carga, vacío, error y reintento.
17. Crear `src/features/staff-tables/StaffTablesApp.tsx` y `src/pages/staff/branches/[branchId]/tables/index.astro`; cargar primero el contexto de sucursal y después sus mesas con la sesión y permisos existentes.
18. Crear `StaffTableCreateForm.tsx` con `code`, `capacity`, React Hook Form, componentes shadcn, recuperación explícita del borrador y bloqueo de envíos duplicados.
19. Mapear `TABLE_CODE_ALREADY_EXISTS` a `code`, enfocar ese campo, conservar valores ante otros fallos y redirigir el éxito a `/staff/branches/:branchId/tables/:tableId?created=1`.
20. Crear `StaffTableCreateApp.tsx` y `src/pages/staff/branches/[branchId]/tables/new.astro`; no montar el formulario para `branch_admin` ni para un usuario fuera de la sucursal permitida.
21. Crear `StaffTableDetailsForm.tsx` con un único guardado de `code` y `capacity`, detección de borrador conflictivo mediante `updatedAt` y limpieza del borrador solo tras respuesta exitosa.
22. Crear `StaffTableStatusControl.tsx` con confirmación para activar o desactivar, aviso no bloqueante cuando la sucursal esté inactiva y explicación del impacto sobre disponibilidad futura.
23. Crear `StaffTableDetailApp.tsx` y `src/pages/staff/branches/[branchId]/tables/[tableId].astro`; resolver creación recién completada, carga, red, `TABLE_NOT_FOUND`, `BRANCH_NOT_FOUND` y `FORBIDDEN`.
24. Integrar los formularios de mesas con el proveedor compartido de cambios pendientes para navegación interna, recarga y cierre, manteniendo `AlertDialog` y `beforeunload` según SPEC 05.
25. Actualizar `StaffBranchList.tsx` y `StaffBranchDetailApp.tsx` con enlaces “Gestionar mesas” que conserven la sucursal explícita en la ruta.
26. Actualizar las pruebas de sucursales para cubrir `Table`, Sonner, el toast de creación y la ausencia de regresiones en formularios, estado y responsive.
27. Crear `tests/staff-tables-contracts.test.ts` y `tests/staff-tables-client.test.ts` para schemas, normalización, filtros, permisos, rutas, payloads y respuestas sin solicitudes reales.
28. Crear `tests/staff-tables-drafts.test.ts` para aislamiento por usuario, sucursal y mesa, recuperación explícita, caducidad, conflicto por `updatedAt`, descarte, guardado, logout y fallo de almacenamiento.
29. Crear `tests/staff-tables-forms.test.tsx` para validación, foco, bloqueo de duplicados, código duplicado, payloads, conservación de valores, borradores y toast de creación.
30. Crear `tests/staff-tables-ui.test.tsx` y `tests/staff-tables-status.test.tsx` para listado responsive semántico, filtros, permisos, errores recuperables, activación, desactivación, sucursal inactiva y feedback con Sonner.
31. Ejecutar `bun test`, `bun run check` y `bun run build`; verificar manualmente los tres roles, las tres rutas, recuperación tras recarga, cambios pendientes y navegación completa solo con teclado.

## Criterios de aceptación

- [ ] `/staff/branches/:branchId/tables` requiere una sesión staff válida y conserva `returnTo` al redirigir al login.
- [ ] `/staff/branches/:branchId/tables/new` y `/staff/branches/:branchId/tables/:tableId` requieren una sesión staff válida.
- [ ] El listado y el detalle de sucursales muestran una acción funcional “Gestionar mesas”.
- [ ] La navegación principal no añade una entrada global “Mesas”.
- [ ] `admin` y `manager` pueden consultar mesas de cualquier sucursal permitida por el backend.
- [ ] `admin` y `manager` visualizan y pueden usar “Nueva mesa”.
- [ ] `branch_admin` solo consulta y administra mesas de su sucursal asignada.
- [ ] `branch_admin` no visualiza “Nueva mesa”.
- [ ] Abrir directamente la ruta de alta como `branch_admin` muestra falta de permisos, no monta el formulario y no envía `POST`.
- [ ] Abrir como `branch_admin` las mesas de otra sucursal muestra `FORBIDDEN` sin refresh ni reintento automático.
- [ ] El backend continúa siendo la frontera definitiva de autorización para cada solicitud.
- [ ] El listado muestra código, capacidad, estado y acción “Administrar” para cada mesa.
- [ ] El listado usa componentes shadcn `Table` con estructura semántica en escritorio.
- [ ] El listado usa tarjetas legibles sin desplazamiento horizontal en móvil.
- [ ] “Todas” usa la ruta sin query de estado.
- [ ] “Activas” usa `?status=active` y solicita ese filtro al backend.
- [ ] “Inactivas” usa `?status=inactive` y solicita ese filtro al backend.
- [ ] Un filtro inválido vuelve a “Todas” sin construir una petición inválida.
- [ ] Recargar la ruta conserva un filtro válido.
- [ ] El listado no incluye búsqueda, paginación, orden manual ni acciones masivas.
- [ ] Carga, lista vacía, red fallida y respuesta inválida tienen estados visibles y recuperables.
- [ ] Todas las respuestas de mesas se validan con Zod antes de entrar en la UI o caché.
- [ ] Los estados aceptados y mostrados son exclusivamente `active` e `inactive`.
- [ ] El contrato frontend conserva únicamente `id`, `branchId`, `code`, `capacity`, `status`, `createdAt` y `updatedAt`.
- [ ] El formulario de creación contiene únicamente código y capacidad.
- [ ] El código exige de 1 a 30 caracteres y solo admite letras, números, guiones y guiones bajos tras normalizarse.
- [ ] Un código válido se envía recortado y en mayúsculas.
- [ ] La capacidad exige cualquier entero mayor que cero y no impone un máximo artificial.
- [ ] Una capacidad vacía, decimal, cero o negativa impide el envío y muestra un error junto al campo.
- [ ] Una mesa nueva se recibe y muestra con estado `inactive`.
- [ ] Una creación exitosa limpia su borrador y redirige al detalle de la mesa.
- [ ] El detalle muestra una sola notificación Sonner de creación y elimina `?created=1` sin recargar.
- [ ] `TABLE_CODE_ALREADY_EXISTS` muestra un error junto a `code`, enfoca el campo y no genera un toast duplicado.
- [ ] El formulario de edición guarda código y capacidad mediante una única solicitud.
- [ ] Guardar datos no envía el estado ni llama al endpoint `/status`.
- [ ] Un guardado exitoso actualiza el detalle y los listados cacheados afectados.
- [ ] Un fallo remoto conserva código y capacidad y permite reintentar sin duplicar solicitudes.
- [ ] Activar y desactivar usan un control separado del formulario de datos.
- [ ] Activar y desactivar requieren confirmación mediante el `AlertDialog` existente.
- [ ] Una mesa puede activarse aunque su sucursal esté inactiva.
- [ ] Una sucursal inactiva produce un aviso informativo, pero no deshabilita la activación de la mesa.
- [ ] La confirmación de desactivación explica que la mesa deja de participar en disponibilidad futura.
- [ ] La confirmación de desactivación indica que las reservas existentes no se modifican.
- [ ] `TABLE_NOT_FOUND` muestra una vista de mesa inexistente con regreso al listado de la sucursal.
- [ ] `BRANCH_NOT_FOUND` muestra una vista de sucursal inexistente con regreso al listado general.
- [ ] `FORBIDDEN` muestra una vista sin permisos y no reintenta la solicitud.
- [ ] Cada formulario modificado crea un borrador con la clave versionada de su usuario, sucursal, mesa y sección.
- [ ] Los borradores contienen solo código y capacidad, sin tokens, usuario completo ni respuestas crudas.
- [ ] Un borrador permanece disponible después de recargar o reabrir el navegador dentro de siete días.
- [ ] Un borrador nunca se aplica automáticamente y siempre ofrece Recuperar o Descartar.
- [ ] Un `baseUpdatedAt` distinto del `updatedAt` actual exige confirmación antes de recuperar la edición.
- [ ] Un borrador de más de siete días se elimina y no se ofrece para recuperar.
- [ ] Guardar correctamente o descartar elimina solo el borrador correspondiente.
- [ ] Cerrar sesión elimina todos los borradores de sucursales y mesas del usuario actual.
- [ ] Un error de acceso, cuota o disponibilidad de `localStorage` no bloquea el formulario ni su envío remoto.
- [ ] Navegar dentro del panel con cambios pendientes exige confirmación mediante `AlertDialog`.
- [ ] Recargar o cerrar con cambios pendientes activa el aviso nativo del navegador.
- [ ] Después de guardar o descartar, la navegación no muestra advertencias obsoletas.
- [ ] `src/components/ui/table.tsx` y `src/components/ui/sonner.tsx` se añaden mediante el CLI de shadcn.
- [ ] `src/components/ui/alert-dialog.tsx` no se reinstala ni se sobrescribe.
- [ ] La tabla de sucursales existente usa los componentes shadcn `Table` y conserva sus tarjetas móviles.
- [ ] `StaffLayout` monta una sola instancia de `Toaster` por aplicación staff activa.
- [ ] Los éxitos de mutaciones de sucursales y mesas se anuncian mediante Sonner.
- [ ] Los errores remotos generales de mutaciones de sucursales y mesas se anuncian mediante Sonner.
- [ ] Los errores de carga permanecen como estados persistentes con reintento y no dependen solo de un toast transitorio.
- [ ] Las validaciones locales y los errores asociados a campos permanecen junto a sus controles.
- [ ] Los formularios usan React Hook Form, `zodResolver` y componentes shadcn según SPEC 04.
- [ ] Los campos inválidos usan `aria-invalid`, quedan asociados a su mensaje y el primer error relevante recibe foco.
- [ ] Los diálogos y toasts son anunciados por tecnologías de asistencia y no dependen únicamente del color.
- [ ] Listado, alta y detalle funcionan con teclado, conservan foco visible y no generan desplazamiento horizontal a 320 px.
- [ ] Las páginas nuevas incluyen `noindex, nofollow`.
- [ ] Las pruebas no realizan solicitudes reales ni dependen de esperar siete días reales.
- [ ] `bun test` finaliza sin errores.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.
- [ ] No se implementan eliminación, reservas administrativas, operaciones masivas, planos, combinación de mesas ni rediseño visual.

## Decisiones

- **Sí:** usar rutas anidadas separadas para listado, creación y detalle de mesas.
- **Sí:** mantener la sucursal explícita en cada ruta y no crear una navegación global de mesas.
- **Sí:** enlazar el módulo desde el listado y el detalle de sucursales.
- **Sí:** permitir que `admin` y `manager` consulten, creen, editen y cambien el estado de mesas de cualquier sucursal permitida.
- **Sí:** permitir que `branch_admin` consulte, edite y cambie el estado de mesas únicamente en su sucursal.
- **No:** permitir que `branch_admin` cree mesas porque el endpoint `POST` lo restringe a `admin` y `manager`.
- **Sí:** ocultar acciones no permitidas y mostrar una vista explícita ante acceso directo, sin considerar esta ocultación una frontera de seguridad.
- **Sí:** usar tabla en escritorio y tarjetas en móvil.
- **Sí:** instalar `Table` de shadcn y migrar también la tabla de sucursales para establecer un único patrón semántico.
- **No:** definir en esta spec el diseño visual final de tablas o tarjetas.
- **Sí:** mantener el filtro en la URL con `active` e `inactive`.
- **No:** añadir búsqueda, paginación u orden manual para el volumen actual.
- **Sí:** crear y editar código y capacidad mediante un único formulario.
- **No:** separar código y capacidad en guardados distintos porque pertenecen al mismo endpoint y unidad de edición.
- **Sí:** mantener el estado en un control independiente porque usa otro endpoint y requiere confirmación explícita.
- **Sí:** aceptar cualquier capacidad entera positiva según el contrato backend.
- **No:** inventar un máximo de capacidad en frontend.
- **Sí:** normalizar el código en frontend y validar nuevamente la respuesta del backend.
- **Sí:** crear mesas inactivas según el comportamiento contractual del servidor.
- **Sí:** permitir activar una mesa mientras la sucursal está inactiva y explicar que es una configuración preparatoria válida.
- **Sí:** explicar que desactivar retira la mesa de disponibilidad futura y no altera reservas ya creadas.
- **No:** implementar reglas de reservas dentro del módulo de mesas.
- **Sí:** persistir borradores no sensibles de creación y edición durante siete días.
- **Sí:** aislar borradores por usuario, sucursal, mesa y sección.
- **Sí:** pedir siempre Recuperar o Descartar y usar `updatedAt` para detectar conflictos de edición.
- **Sí:** degradar sin persistencia local cuando `localStorage` no esté disponible.
- **Sí:** reutilizar el patrón de cambios pendientes de SPEC 05 mediante una ubicación compartida en `staff-shell`.
- **No:** hacer que `staff-tables` dependa internamente de componentes con nombre específico de `staff-branches`.
- **Sí:** instalar Sonner y montar `Toaster` una sola vez dentro de `StaffLayout`.
- **Sí:** usar Sonner para éxitos y errores remotos generales de mutaciones de sucursales y mesas.
- **No:** usar toast como sustituto de validaciones de campo, conflictos accionables o estados de carga fallida que requieren reintento.
- **Sí:** mantener `TABLE_CODE_ALREADY_EXISTS` junto a `code` sin toast duplicado.
- **Sí:** transportar la confirmación de creación mediante `?created=1`, mostrarla una vez y limpiar la URL inmediatamente.
- **No:** usar `localStorage` o `sessionStorage` para transportar notificaciones transitorias.
- **Sí:** reutilizar TanStack Query, React Hook Form, Zod, Testing Library, `user-event` y `happy-dom`.
- **No:** introducir Zustand, otra librería de formularios o un segundo sistema de notificaciones.
- **No:** reinstalar `AlertDialog`; el componente incorporado por SPEC 05 ya cubre confirmaciones, recuperación y descarte.
- **No:** modificar el backend desde esta spec; su contrato actual es una dependencia previa.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `branch_admin` intenta crear una mesa mediante acceso directo | No montar el formulario, ocultar la acción y manejar siempre el `403` definitivo del backend. |
| Un borrador sobrescribe una edición realizada desde otra sesión | Guardar `baseUpdatedAt`, compararlo con la mesa actual y exigir confirmación explícita antes de recuperar. |
| Dos mesas intentan usar el mismo código simultáneamente | Mapear `TABLE_CODE_ALREADY_EXISTS` a `code`, conservar el formulario y permitir corregir o reintentar. |
| `localStorage` está bloqueado, lleno o lanza una excepción | Encapsular cada acceso y mantener funcional el guardado remoto sin persistencia local. |
| Un toast desaparece antes de que el usuario pueda actuar | Reservar Sonner para feedback transitorio y mantener validaciones, conflictos y errores de carga en el contexto persistente correspondiente. |
| `?created=1` vuelve a mostrar el toast al navegar en el historial | Consumir el parámetro una sola vez y retirarlo inmediatamente con `history.replaceState`. |
| El `Toaster` se monta varias veces por composición de proveedores | Declararlo únicamente en `StaffLayout` y verificar una sola región de notificaciones en pruebas. |
| La migración a `Table` altera semántica o responsive de sucursales | Conservar caption, headers, scopes, acciones y tarjetas móviles, y cubrir la migración con pruebas de regresión. |
| Una mesa activa dentro de una sucursal inactiva parece un error | Mostrar el estado como configuración válida y explicar que no produce disponibilidad mientras la sucursal siga inactiva. |
| Desactivar una mesa se interpreta como cancelación de reservas | Explicar antes de confirmar que solo afecta disponibilidad futura y no modifica reservas ya creadas. |
| Una mutación actualiza el detalle pero deja listados filtrados obsoletos | Centralizar claves de TanStack Query e invalidar todas las variantes de la sucursal afectada. |
| Mover el proveedor de cambios pendientes rompe formularios existentes | Mantener la API pública del proveedor y ejecutar todas las pruebas de navegación y formularios de sucursales. |

## Lo que **no** está en esta spec

- Eliminación de mesas.
- Reservas administrativas o consulta de reservas por mesa.
- Creación, edición o cambios de estado masivos.
- Selección manual, asignación o combinación de mesas.
- Planos de salón, zonas, coordenadas o distribución visual.
- Búsqueda, paginación u orden manual.
- Un límite máximo de capacidad no definido por el backend.
- Una entrada global “Mesas” en la navegación staff.
- Migración a Sonner de módulos ajenos a sucursales y mesas.
- Rediseño visual del panel, tablas, tarjetas o formularios.
- Cambios en endpoints, permisos, disponibilidad o modelos del backend.

Cada ampliación operativa o de diseño deberá definirse en una spec independiente.
