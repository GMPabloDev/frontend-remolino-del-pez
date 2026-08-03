# SPEC 05 — Gestión administrativa de sucursales

> **Estado:** Implementado
> **Depende de:** SPEC 03, SPEC 04
> **Supersedes:** SPEC 03 (ausencia de restricciones frontend por rol para el módulo de sucursales)
> **Fecha:** 2026-08-02
> **Objetivo:** Implementar la gestión staff de sucursales con permisos por rol, formularios recuperables, horarios semanales y control de estado.

## Por qué existe esta spec

El panel staff ya dispone de autenticación, contexto del restaurante y un patrón de formularios React, pero todavía no permite administrar las sucursales que sostienen la operación pública.

Esta spec incorpora el primer módulo con permisos visibles por rol y establece un patrón reutilizable para listados, edición segmentada, borradores locales y cambios de estado administrativos.

## Alcance

**Incluido:**

- Crear `src/features/staff-branches/` para contratos, cliente API, queries, permisos, borradores y componentes del módulo.
- Crear `/staff/branches` como listado protegido de sucursales.
- Crear `/staff/branches/new` para registrar una sucursal.
- Crear `/staff/branches/:branchId` para administrar una sucursal existente.
- Añadir “Sucursales” a la navegación staff para todos los roles autenticados.
- Permitir que `admin` y `manager` consulten y administren todas las sucursales.
- Permitir que `admin` y `manager` creen sucursales.
- Permitir que `branch_admin` consulte y administre únicamente su sucursal asignada.
- Ocultar a `branch_admin` las acciones de creación y mostrar un estado sin permisos si abre directamente la ruta de alta.
- Mantener al backend como frontera definitiva de autorización y tratar `403 FORBIDDEN` sin reintento.
- Listar sucursales en una tabla para escritorio y tarjetas para móvil.
- Mostrar nombre, código, ubicación, estado, resumen del horario y acción para administrar cada sucursal.
- Filtrar por `Todas`, `Activas` e `Inactivas` mediante `?status=active|inactive`.
- Mantener el listado sin búsqueda ni paginación.
- Validar con Zod todas las respuestas y payloads administrativos de sucursales.
- Consumir estados exclusivamente como `active` e `inactive`.
- Consumir y enviar horarios simétricos con `dayOfWeek`, `startTime` y `endTime`.
- Consumir `rules` como un objeto obligatorio con solo los cinco campos contractuales de negocio.
- Ignorar campos adicionales desconocidos en respuestas sin incorporarlos al estado de formulario ni a los borradores.
- Crear una sucursal inactiva mediante un único formulario de datos generales y reglas.
- Precargar la creación con duración de 60 minutos, anticipación mínima de 60 minutos, anticipación máxima de 30 días, tolerancia de 15 minutos y grupo máximo de 12 personas.
- Redirigir una creación exitosa al detalle de la nueva sucursal para configurar su horario.
- Editar datos generales, reglas de reserva y horario mediante tres formularios y guardados independientes.
- Permitir eliminar el email de una sucursal enviando `email: null`.
- Editar los siete días de la semana, marcar días cerrados y añadir varios intervalos por día.
- Reemplazar el horario semanal completo mediante un único `PUT` atómico.
- Validar formato `HH:mm`, orden de cada intervalo y ausencia de solapamientos antes del envío.
- Impedir guardar un horario vacío mientras la sucursal esté activa y exigir desactivarla primero.
- Activar o desactivar una sucursal mediante un control separado y confirmación explícita.
- Deshabilitar la activación sin horarios y explicar el requisito.
- Instalar y usar `AlertDialog` de shadcn para activación, desactivación, descarte y recuperación conflictiva.
- Mostrar errores de código duplicado junto a `code`, conflictos dentro del editor semanal y estados específicos para falta de permisos o sucursal inexistente.
- Conservar los valores ante errores de servidor o red y permitir reintentar.
- Persistir borradores de creación, datos, reglas y horario en `localStorage` durante siete días.
- Separar cada borrador por versión, usuario, sucursal y sección.
- Ofrecer siempre `Recuperar` o `Descartar` sin restaurar un borrador automáticamente.
- Usar `Branch.updatedAt` como versión base para advertir si el servidor cambió desde que se creó el borrador.
- Eliminar el borrador al guardar, descartarlo, caducar o cerrar sesión.
- Advertir por cambios no guardados al navegar, recargar o cerrar la pestaña.
- Usar el diálogo nativo exigido por el navegador para `beforeunload` y `AlertDialog` para navegación interna.
- Añadir pruebas de contratos, permisos, filtros, formularios, horario, cambios de estado, borradores y navegación con cambios pendientes.
- Mantener las páginas privadas con `noindex, nofollow`, navegación por teclado y diseño responsive.

**Fuera de alcance para futuras specs:**

- Eliminar física o lógicamente una sucursal mediante una acción distinta de activar o desactivar.
- Editar el restaurante singleton.
- Gestionar mesas.
- Gestionar usuarios staff.
- Gestionar categorías, platos o configuración comercial por sucursal.
- Gestionar reservas desde el panel staff.
- Configurar feriados, excepciones por fecha o cierres extraordinarios.
- Crear horarios que atraviesen la medianoche.
- Buscar, ordenar manualmente o paginar el listado.
- Persistir tokens, sesión o respuestas completas de la API en almacenamiento web.
- Añadir date-fns, Day.js, Zustand u otro gestor de estado.
- Modificar endpoints, autorización o modelos del backend.
- Rediseñar globalmente el panel administrativo.

## Modelo de datos

Los esquemas Zod son la fuente de verdad del módulo y los tipos TypeScript se infieren desde ellos.

```ts
const branchStatusSchema = z.enum(["active", "inactive"]);

const branchRulesSchema = z.object({
  defaultReservationDurationMinutes: z.number().int().positive(),
  minimumAdvanceMinutes: z.number().int().positive(),
  maximumAdvanceDays: z.number().int().positive(),
  arrivalToleranceMinutes: z.number().int().positive(),
  maxPartySize: z.number().int().positive(),
});

const branchScheduleIntervalSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string(),
  endTime: z.string(),
});
```

```ts
interface StaffBranch {
  id: string;
  restaurantId: string;
  slug: string;
  name: string;
  code: string;
  address: string;
  district: string;
  province: string;
  department: string;
  phone: string;
  email: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  rules: BranchRules;
  intervals: BranchScheduleInterval[];
}
```

`BranchRules` contiene únicamente los cinco campos de `branchRulesSchema`. Los identificadores y timestamps internos de reglas e intervalos no forman parte del contrato frontend.

```ts
interface CreateBranchInput {
  name: string;
  code: string;
  address: string;
  district: string;
  province: string;
  department: string;
  phone: string;
  email?: string;
  rules: BranchRules;
}

interface UpdateBranchDetailsInput {
  name: string;
  code: string;
  address: string;
  district: string;
  province: string;
  department: string;
  phone: string;
  email: string | null;
}

interface ReplaceBranchScheduleInput {
  intervals: BranchScheduleInterval[];
}
```

El email vacío se omite durante la creación y se transforma a `null` durante la edición para eliminar el valor existente.

Constantes de los valores iniciales:

```ts
const DEFAULT_BRANCH_RULES: BranchRules = {
  defaultReservationDurationMinutes: 60,
  minimumAdvanceMinutes: 60,
  maximumAdvanceDays: 30,
  arrivalToleranceMinutes: 15,
  maxPartySize: 12,
};
```

Los borradores usan una envoltura versionada:

```ts
type BranchDraftSection = "new" | "details" | "rules" | "schedule";

interface StoredBranchDraft<TValues> {
  version: 1;
  userId: string;
  branchId: string | null;
  section: BranchDraftSection;
  baseUpdatedAt: string | null;
  savedAt: string;
  expiresAt: string;
  values: TValues;
}
```

Claves de almacenamiento:

```text
staff-branch-draft:v1:{userId}:new
staff-branch-draft:v1:{userId}:{branchId}:details
staff-branch-draft:v1:{userId}:{branchId}:rules
staff-branch-draft:v1:{userId}:{branchId}:schedule
```

Convenciones:

- `dayOfWeek` usa valores ISO de `1` para lunes a `7` para domingo.
- `startTime` y `endTime` usan `HH:mm` en formato de 24 horas.
- Un día cerrado se representa por ausencia de intervalos para ese día.
- Los intervalos se ordenan por día y hora inicial antes de enviarse.
- `minimumAdvanceMinutes` debe ser menor que `maximumAdvanceDays * 24 * 60`.
- `Branch.updatedAt` cambia ante edición general, reglas, horario o estado y actúa como versión de conflicto del borrador.
- Un borrador nuevo usa `baseUpdatedAt: null`.
- `expiresAt` equivale a siete días después de `savedAt`.
- Los borradores contienen solo valores editables; nunca tokens, usuario completo ni respuestas crudas.
- Un fallo o indisponibilidad de `localStorage` no impide utilizar ni guardar los formularios en el backend.

## Plan de implementación

1. Añadir `AlertDialog` mediante el flujo de shadcn del proyecto y mantener el componente generado bajo `src/components/ui/alert-dialog.tsx`, fuera del formateo de Biome según la configuración existente.
2. Crear `src/features/staff-branches/contracts/staff-branch.schemas.ts` con esquemas para sucursal, reglas, intervalos, filtros y payloads; validar reglas cruzadas y horarios sin depender de librerías de fechas.
3. Extender `src/lib/api/api-error.ts` para conservar de forma tipada los detalles contractuales de validación sin cambiar el comportamiento de autenticación de SPEC 03.
4. Crear `src/features/staff-branches/api/staff-branches-client.ts` con operaciones para listar, consultar, crear, editar, reemplazar horario y cambiar estado mediante `StaffApiClient`.
5. Crear `src/features/staff-branches/query/staff-branches-query.ts` con claves de TanStack Query por restaurante, filtro y sucursal; invalidar o actualizar las queries afectadas después de cada mutación.
6. Crear `src/features/staff-branches/lib/branch-status-filter.ts` para leer y escribir únicamente `active` o `inactive` en la URL y usar “Todas” como fallback ante valores ausentes o inválidos.
7. Crear `src/features/staff-branches/lib/staff-branch-permissions.ts` con reglas puras que permitan crear a `admin` y `manager`, y limiten a `branch_admin` a su UUID asignado.
8. Crear `src/features/staff-branches/lib/staff-branch-drafts.ts` para claves versionadas, validación, caducidad de siete días, lectura segura, escritura y eliminación por usuario.
9. Crear `src/features/staff-branches/lib/staff-branch-unsaved-changes.ts` para coordinar estado sucio, `beforeunload` y confirmación de navegación interna sin bloquear formularios ya guardados.
10. Crear los componentes responsive del listado bajo `src/features/staff-branches/components/`, con estados de carga, vacío, red recuperable y filtro reflejado en la URL.
11. Crear `src/features/staff-branches/StaffBranchesApp.tsx` y `src/pages/staff/branches/index.astro`; conectar sesión, permisos, listado y navegación hacia creación o detalle.
12. Crear schemas de formulario para alta, datos y reglas; establecer `DEFAULT_BRANCH_RULES` y mapear email vacío a ausencia en POST o `null` en PATCH.
13. Crear el formulario y `StaffBranchCreateApp.tsx`; recuperar o descartar el borrador `new`, bloquear duplicados, mapear `BRANCH_CODE_ALREADY_EXISTS` a `code` y redirigir al detalle después del `201`.
14. Crear `src/pages/staff/branches/new.astro` y mostrar una vista sin permisos a `branch_admin` sin montar acciones de creación.
15. Crear `StaffBranchDetailApp.tsx` y `src/pages/staff/branches/[branchId].astro`; resolver carga, red, `BRANCH_NOT_FOUND`, `FORBIDDEN` y acceso del `branch_admin` antes de mostrar controles.
16. Crear el formulario de datos generales con guardado `PATCH` independiente, soporte para `email: null`, aviso de éxito y limpieza exclusiva del borrador `details` tras confirmar la respuesta.
17. Crear el formulario de reglas con los cinco valores contractuales, validación de anticipación cruzada, guardado `PATCH` independiente y limpieza exclusiva del borrador `rules`.
18. Crear el editor semanal con siete días, día cerrado, alta y eliminación de intervalos, múltiples franjas, orden estable, validación `HH:mm` y detección local de solapamientos.
19. Conectar el editor a `PUT /schedule`, mostrar `BRANCH_SCHEDULE_CONFLICT` dentro de la sección, limpiar el borrador `schedule` al guardar y bloquear una lista vacía para sucursales activas.
20. Crear el control de estado con `AlertDialog`, impedir activación sin intervalos, ejecutar `PATCH /status` y reflejar inmediatamente el nuevo estado en detalle y listado.
21. Integrar borradores en los cuatro formularios; ofrecer Recuperar/Descartar, comparar `baseUpdatedAt` con la sucursal actual y advertir claramente antes de recuperar un borrador conflictivo.
22. Integrar la guarda de cambios pendientes con enlaces internos, recarga y cierre; usar `AlertDialog` dentro del panel y el diálogo nativo de `beforeunload` fuera de React.
23. Actualizar `src/features/staff-shell/components/StaffLayout.tsx` con “Sucursales”, estado activo accesible y limpieza de todos los borradores del usuario antes de completar el logout explícito.
24. Añadir pruebas unitarias de schemas, filtros, permisos, payloads, detalles de error y cliente API sin solicitudes reales.
25. Añadir pruebas deterministas de borradores para claves, aislamiento por usuario/sección, recuperación explícita, caducidad, conflicto por `updatedAt`, descarte, guardado y fallo de almacenamiento.
26. Añadir pruebas de comportamiento para listado responsive semántico, filtros, alta, formularios independientes, horario, activación/desactivación, permisos, foco de errores y cambios sin guardar.
27. Ejecutar `bun test`, `bun run check` y `bun run build`; verificar manualmente los tres roles, las tres rutas, recuperación tras recarga/cierre, conflicto remoto y navegación completa solo con teclado.

## Criterios de aceptación

- [ ] `/staff/branches` requiere una sesión staff válida y conserva `returnTo` al redirigir al login.
- [ ] La navegación staff muestra un enlace funcional “Sucursales” para `admin`, `manager` y `branch_admin`.
- [ ] `admin` y `manager` reciben el listado completo permitido por el backend.
- [ ] `branch_admin` solo visualiza la sucursal asignada por el backend.
- [ ] `admin` y `manager` visualizan y pueden usar la acción “Nueva sucursal”.
- [ ] `branch_admin` no visualiza ninguna acción de creación.
- [ ] Abrir `/staff/branches/new` como `branch_admin` muestra falta de permisos y no envía `POST`.
- [ ] Abrir como `branch_admin` el detalle de otra sucursal termina en un estado `FORBIDDEN` sin refresh ni reintento automático.
- [ ] El listado usa tabla semántica en escritorio y tarjetas legibles en móvil.
- [ ] Cada elemento muestra nombre, código, ubicación, estado, resumen del horario y una acción “Administrar”.
- [ ] “Todas” usa `/staff/branches` sin query de estado.
- [ ] “Activas” usa `?status=active` y solicita el filtro correspondiente al backend.
- [ ] “Inactivas” usa `?status=inactive` y solicita el filtro correspondiente al backend.
- [ ] Un filtro de URL inválido vuelve a “Todas” sin construir una petición inválida.
- [ ] Recargar la ruta conserva el filtro válido seleccionado.
- [ ] El listado no incluye buscador, paginación ni orden manual.
- [ ] Carga, lista vacía, red fallida y respuesta inválida tienen estados visibles y recuperables.
- [ ] Todas las respuestas de sucursal se validan con Zod antes de entrar en la UI o caché.
- [ ] El schema exige `rules` y sus cinco campos de negocio.
- [ ] Los metadatos internos de reglas e intervalos no aparecen en tipos, formularios ni borradores.
- [ ] Los campos adicionales desconocidos de una respuesta no se copian a payloads ni almacenamiento.
- [ ] Los estados aceptados y mostrados son exclusivamente `active` e `inactive`.
- [ ] Los intervalos recibidos y enviados usan exclusivamente `dayOfWeek`, `startTime` y `endTime`.
- [ ] No existe conversión de minutos ni dependencia de date-fns o Day.js en el frontend.
- [ ] `/staff/branches/new` muestra datos generales y reglas en un único formulario.
- [ ] Una creación nueva precarga exactamente `60`, `60`, `30`, `15` y `12` en los cinco campos de reglas acordados.
- [ ] Un email vacío se omite del payload de creación.
- [ ] Una creación exitosa limpia su borrador y redirige a `/staff/branches/:branchId`.
- [ ] `BRANCH_CODE_ALREADY_EXISTS` muestra un error junto a `code` y enfoca ese control.
- [ ] El detalle muestra datos generales, reglas, horario y estado en secciones distinguibles.
- [ ] Datos generales, reglas y horario se guardan mediante solicitudes independientes.
- [ ] Guardar datos generales no envía reglas ni intervalos.
- [ ] Dejar vacío un email existente envía `email: null`.
- [ ] Guardar reglas envía únicamente los cinco campos contractuales.
- [ ] La anticipación mínima igual o superior al máximo convertido a minutos impide el envío y muestra error de campo.
- [ ] El editor presenta los siete días de lunes a domingo.
- [ ] Cada día puede quedar cerrado o contener varios intervalos.
- [ ] Cada intervalo exige `startTime < endTime` en formato `HH:mm`.
- [ ] Los intervalos solapados de un mismo día impiden el envío local.
- [ ] Guardar el horario envía la lista semanal completa y reemplaza el horario anterior.
- [ ] `BRANCH_SCHEDULE_CONFLICT` conserva el editor y muestra un aviso dentro de su sección.
- [ ] Una sucursal activa no puede guardar una lista vacía de intervalos y recibe la instrucción de desactivarse primero.
- [ ] Una sucursal sin intervalos no puede activar el control y muestra el motivo.
- [ ] Activar y desactivar requieren confirmación mediante `AlertDialog`.
- [ ] Una mutación exitosa actualiza el detalle y cualquier listado cacheado afectado.
- [ ] Un fallo de red conserva todos los valores y ofrece reintentar sin duplicar solicitudes.
- [ ] `BRANCH_NOT_FOUND` muestra una vista de sucursal inexistente con regreso al listado.
- [ ] `FORBIDDEN` muestra una vista sin permisos con regreso al listado.
- [ ] Cada formulario modificado crea un borrador con la clave versionada de su usuario, sucursal y sección.
- [ ] Los borradores no contienen access token, refresh token, usuario completo ni metadatos internos de la API.
- [ ] Un borrador permanece disponible después de recargar o cerrar y volver a abrir el navegador dentro de siete días.
- [ ] Un borrador nunca se aplica automáticamente; siempre ofrece Recuperar o Descartar.
- [ ] Un `baseUpdatedAt` distinto del `updatedAt` actual muestra una advertencia de conflicto antes de recuperar.
- [ ] Recuperar un borrador conflictivo requiere confirmación explícita.
- [ ] Un borrador con más de siete días se elimina y no se ofrece para recuperar.
- [ ] Guardar correctamente o descartar elimina solo el borrador de la sección correspondiente.
- [ ] Cerrar sesión elimina todos los borradores pertenecientes al usuario actual.
- [ ] Un error de acceso, cuota o disponibilidad de `localStorage` no bloquea los formularios ni su envío remoto.
- [ ] Navegar dentro del panel con cambios pendientes exige confirmación mediante `AlertDialog`.
- [ ] Recargar o cerrar con cambios pendientes activa el aviso nativo del navegador.
- [ ] Después de guardar o descartar, la navegación no muestra advertencias obsoletas.
- [ ] Los formularios usan React Hook Form, `zodResolver` y componentes shadcn según el patrón de SPEC 04.
- [ ] Los errores de campo están asociados a sus controles y el primer error relevante recibe foco.
- [ ] Los estados remotos se anuncian mediante regiones accesibles sin depender únicamente del color.
- [ ] Listado, alta y detalle funcionan con teclado, mantienen foco visible y no generan desplazamiento horizontal a 320 px.
- [ ] Las páginas nuevas incluyen `noindex, nofollow`.
- [ ] Las pruebas no realizan solicitudes reales ni dependen de temporizadores de siete días.
- [ ] `bun test` finaliza sin errores.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.
- [ ] No se implementan eliminación, mesas, usuarios, catálogo, reservas, feriados ni horarios que crucen medianoche.

## Decisiones

- **Sí:** implementar el ciclo completo de listado, creación, edición, horario y estado en una sola spec del módulo de sucursales.
- **Sí:** aplicar en frontend los permisos contractuales del backend para evitar acciones destinadas a fallar.
- **No (revertido de SPEC 03):** mantener ausencia total de restricciones frontend por rol dentro del módulo de sucursales.
- **Sí:** mantener el backend como única frontera de seguridad y tratar la ocultación de acciones solo como UX.
- **Sí:** permitir creación a `admin` y `manager`.
- **No:** permitir creación a `branch_admin`.
- **Sí:** permitir que `branch_admin` edite horario, datos, reglas y estado de su sucursal asignada.
- **No:** permitir que `branch_admin` abra o administre otra sucursal.
- **Sí:** usar rutas separadas para listado, creación y detalle.
- **Sí:** mantener el filtro en la URL con `active` e `inactive`.
- **No:** añadir búsqueda o paginación para un volumen esperado cercano a diez sucursales.
- **Sí:** usar tabla en escritorio y tarjetas en móvil.
- **Sí:** crear datos y reglas atómicamente y redirigir después al detalle.
- **Sí:** editar datos, reglas y horario mediante guardados independientes alineados con los endpoints existentes.
- **Sí:** precargar reglas con 60 minutos de duración, 60 minutos de anticipación mínima, 30 días de anticipación máxima, 15 minutos de tolerancia y 12 personas.
- **Sí:** aceptar `email: null` como eliminación contractual durante la edición.
- **Sí:** tipar `rules` como obligatorio y limitado a cinco campos de negocio.
- **No:** consumir metadatos internos de Prisma aunque aparecieran como campos desconocidos en una respuesta futura.
- **Sí:** usar `HH:mm` de forma simétrica para horarios administrativos.
- **No:** convertir horarios a minutos en frontend.
- **No:** instalar date-fns o Day.js para horas semanales sin fecha.
- **Sí:** representar cada día cerrado mediante ausencia de intervalos.
- **Sí:** reemplazar el horario completo de manera atómica.
- **No:** permitir horarios que crucen medianoche ni intervalos solapados.
- **Sí:** bloquear un horario vacío para una sucursal activa aunque el backend continúe siendo la validación definitiva.
- **Sí:** confirmar activación y desactivación con `AlertDialog` de shadcn.
- **Sí:** usar el aviso nativo inevitable del navegador para cierre o recarga.
- **Sí:** persistir borradores no sensibles en `localStorage` para sobrevivir al cierre del navegador.
- **No:** persistir tokens, sesión, respuestas crudas ni información no editable.
- **Sí:** versionar y aislar borradores por usuario, sucursal y sección.
- **Sí:** caducar borradores después de siete días.
- **Sí:** pedir siempre Recuperar o Descartar en lugar de restaurar silenciosamente.
- **Sí:** usar `Branch.updatedAt`, actualizado también por `PUT /schedule`, para detectar cambios remotos posteriores al borrador.
- **Sí:** advertir antes de recuperar un borrador conflictivo.
- **Sí:** eliminar borradores al guardar, descartar o cerrar sesión.
- **Sí:** degradar sin persistencia local si `localStorage` no está disponible.
- **Sí:** usar TanStack Query para estado remoto, React Hook Form para formularios y estado React local para UI acotada.
- **No:** introducir Zustand u otro store global.
- **Sí:** conservar los detalles contractuales de errores API para asociar validaciones con campos cuando corresponda.
- **Sí:** reutilizar Bun, Testing Library, `user-event` y `happy-dom` para pruebas de comportamiento.
- **No:** modificar el backend desde esta spec; su contrato actualizado es una dependencia previa.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un borrador sobrescribe información modificada desde otro dispositivo | Guardar `baseUpdatedAt`, compararlo con la respuesta actual y exigir confirmación explícita antes de recuperar. |
| `localStorage` está bloqueado, lleno o lanza una excepción | Encapsular cada acceso, continuar con estado en memoria y mantener funcional el guardado remoto. |
| Otra persona usa el mismo navegador después del logout | Separar claves por usuario y eliminarlas todas antes de completar el cierre de sesión. |
| Una pestaña se cierra antes de que React procese el último cambio | Persistir el borrador durante los cambios y usar `beforeunload` como advertencia adicional, sin intentar escribir durante la descarga. |
| Un permiso oculto en frontend se interpreta como seguridad suficiente | Ejecutar todas las acciones con el bearer y manejar siempre el `403` definitivo del backend. |
| La ruta de creación se abre directamente por un rol sin permiso | Evaluar el rol dentro de la aplicación protegida y no montar ni ejecutar el formulario de creación. |
| Una sucursal activa queda sin atención semanal | Bloquear el guardado vacío en frontend y exigir desactivación previa. |
| Dos intervalos se solapan por comparación incorrecta de cadenas | Validar `HH:mm`, convertir temporalmente a minutos solo dentro de la función pura de comparación y enviar siempre las cadenas originales. |
| El contrato de sucursal cambia o vuelve a filtrar campos internos | Validar con Zod, conservar solo campos contractuales y fallar de forma controlada ante campos requeridos inválidos. |
| El aviso de salida resulta inconsistente entre navegadores | Usar `AlertDialog` solo para navegación controlada y reservar `beforeunload` para el diálogo nativo soportado. |
| Una mutación actualiza el detalle pero deja obsoleto el listado filtrado | Centralizar claves de query e invalidar o actualizar todas las variantes afectadas después de cada respuesta exitosa. |
| El diálogo de confirmación pierde foco o contexto | Usar `AlertDialog` accesible y probar apertura, cancelación, confirmación y retorno de foco con Testing Library. |

## Lo que **no** está en esta spec

- Eliminación de sucursales.
- Edición del restaurante singleton.
- Mesas.
- Usuarios staff.
- Catálogo global o configuración de platos por sucursal.
- Reservas administrativas.
- Feriados, excepciones por fecha o cierres extraordinarios.
- Horarios que atraviesen medianoche.
- Búsqueda, paginación u orden manual de sucursales.
- Persistencia de sesión o tokens.
- date-fns, Day.js, Zustand u otro gestor global.
- Cambios en endpoints, permisos o modelos del backend.
- Rediseño general del panel staff.

Cada módulo administrativo adicional y las excepciones de calendario deberán definirse en specs independientes.
