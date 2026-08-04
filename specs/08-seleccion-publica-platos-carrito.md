# SPEC 08 — Selección pública de platos y carrito

> **Estado:** Aprobado
> **Depende de:** SPEC 02, SPEC 07
> **Fecha:** 2026-08-03
> **Objetivo:** Permitir que el cliente seleccione platos disponibles y gestione un carrito persistente e independiente por sucursal desde el menú público, sin iniciar todavía la reserva.

## Por qué existe esta spec

El menú público permite consultar los platos de una sucursal, pero todavía no ofrece selección de cantidades ni conserva una intención de compra.

El endpoint de reserva temporal exige al menos un plato y cantidades válidas. Esta spec prepara esa entrada sin mezclar todavía disponibilidad de horarios, datos del cliente, idempotencia, reserva temporal o pagos.

## Alcance

**Incluido:**

- Crear `src/features/public-cart/` para contratos, estado, persistencia, reconciliación, cálculos y componentes del carrito público.
- Integrar el carrito dentro de la isla React existente de `/menu?branch=<branchSlug>`.
- Instalar mediante el CLI de shadcn los componentes `Sheet`, `ScrollArea`, `Badge`, `Empty` y `Alert`.
- Reutilizar los componentes instalados `Button`, `Separator` y `AlertDialog`.
- Usar un único `Sheet` lateral responsive en escritorio y móvil, sin incorporar `Drawer`.
- Mostrar “Añadir” únicamente como acción habilitada para platos `available`.
- Impedir añadir platos `sold_out` y comunicar el motivo de forma textual y semántica.
- Sustituir “Añadir” por controles sincronizados `− / cantidad / +` cuando el plato ya forme parte del carrito.
- Mostrar los mismos controles de cantidad dentro del `Sheet`.
- Admitir cantidades enteras entre `1` y `99` por plato.
- Deshabilitar `−` cuando la cantidad sea `1` y `+` cuando sea `99`.
- Eliminar un plato únicamente mediante una acción separada dentro del carrito.
- Admitir como máximo cincuenta platos distintos, según el contrato de reserva temporal.
- Mostrar un botón flotante que abra el carrito e informe la cantidad total de unidades seleccionadas y el subtotal disponible.
- Mantener el botón flotante visible sin ocultar contenido ni controles del menú.
- No abrir automáticamente el `Sheet` al añadir un plato.
- Anunciar mediante una región `aria-live` las altas, cambios de cantidad, eliminaciones y reconciliaciones relevantes.
- Mostrar dentro del `Sheet` nombre, imagen o fallback, precio unitario, cantidad, subtotal por línea y disponibilidad de cada plato.
- Mostrar el subtotal estimado exclusivamente con platos actualmente disponibles.
- Calcular importes en céntimos enteros y formatearlos como PEN solo para presentación.
- No incorporar impuestos, descuentos, propinas ni cargos adicionales.
- Ofrecer “Vaciar carrito” y confirmar la acción mediante el `AlertDialog` existente.
- Mostrar el estado vacío mediante el componente shadcn `Empty`.
- Persistir automáticamente un carrito independiente por restaurante y sucursal en `localStorage`.
- Usar la clave `public-cart:v1:{restaurantSlug}:{branchSlug}`.
- Conservar cada carrito durante siete días desde su última modificación.
- Renovar `savedAt` y `expiresAt` después de añadir, modificar, eliminar, vaciar o actualizar un precio reconciliado.
- Restaurar automáticamente un carrito vigente al abrir de nuevo el menú de su sucursal.
- Eliminar un carrito caducado y no restaurarlo.
- Validar con Zod todo contenido leído desde `localStorage` antes de usarlo.
- Mantener el carrito funcional en memoria cuando `localStorage` no esté disponible, esté lleno o lance una excepción.
- Mostrar mediante `Alert` un aviso persistente dentro del panel cuando los cambios no puedan conservarse entre sesiones.
- Sincronizar cambios del mismo carrito entre pestañas mediante el evento `storage`.
- Ignorar eventos de otras claves, restaurantes o sucursales.
- Mantener aislados los carritos de sucursales distintas y no mezclar sus platos.
- Reconciliar el carrito con cada respuesta válida del menú de la sucursal actual.
- Actualizar nombre, imagen y precio al valor vigente cuando el plato continúe disponible.
- Mostrar un aviso y `Badge` cuando la reconciliación cambie un precio guardado.
- Conservar un plato seleccionado cuando pase a `sold_out`, marcarlo como no disponible y excluirlo del subtotal estimado.
- Conservar un plato seleccionado cuando desaparezca del menú, marcarlo como retirado y excluirlo del subtotal estimado.
- Tratar todos los platos guardados como “No verificados” mientras el menú no pueda validarse por carga o error remoto.
- Mantener accesible el carrito guardado cuando falle la consulta del menú, siempre que el parámetro `branch` sea válido.
- No modificar silenciosamente la cantidad elegida durante una reconciliación.
- Mostrar “Continuar con la reserva” en el carrito completo, pero mantenerlo deshabilitado con una explicación accesible de que estará disponible en el siguiente paso.
- Añadir pruebas de contratos, cálculos, estado, persistencia, sincronización, reconciliación, interacción, accesibilidad básica y aislamiento por sucursal.
- Mantener el diseño responsive del menú y las páginas públicas prerenderizadas.

**Fuera de alcance para futuras specs:**

- Consultar disponibilidad de mesas u horarios.
- Elegir fecha, hora o cantidad de personas.
- Recopilar nombre, email o teléfono del cliente.
- Crear una reserva temporal o generar `Idempotency-Key`.
- Crear `/reserve`, `/cart` u otra ruta pública nueva.
- Navegar desde “Continuar con la reserva”.
- Crear checkout, integrar Stripe, mostrar countdown o consultar estados de pago.
- Persistir el carrito en el backend o asociarlo a una cuenta.
- Combinar carritos de sucursales distintas o mover platos entre ellos.
- Permitir seleccionar platos `sold_out`.
- Aplicar impuestos, descuentos, promociones, propinas o cargos por servicio.
- Modificar endpoints, modelos, reglas o autorización del backend.
- Rediseñar globalmente el menú público.

## Modelo de datos

Los esquemas Zod son la fuente de verdad para la persistencia local y los tipos TypeScript se infieren desde ellos.

```ts
const cartPriceSchema = z.string().regex(/^\d{1,8}\.\d{2}$/);

const storedPublicCartItemSchema = z.object({
  dishId: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.url().nullable(),
  unitPrice: cartPriceSchema,
  quantity: z.number().int().min(1).max(99),
});

const storedPublicCartSchema = z.object({
  version: z.literal(1),
  restaurantSlug: publicSlugSchema,
  branchSlug: publicSlugSchema,
  savedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  items: z.array(storedPublicCartItemSchema).max(50),
});
```

Cada `dishId` aparece una sola vez. Una lectura con identificadores duplicados, forma inválida, versión desconocida o más de cincuenta platos se descarta completa.

Clave de almacenamiento:

```text
public-cart:v1:{restaurantSlug}:{branchSlug}
```

Ejemplo:

```text
public-cart:v1:restaurante-olimpico:miraflores
```

El estado de disponibilidad se deriva en memoria y no amplía el contenido persistido confirmado:

```ts
type CartItemAvailability =
  | "available"
  | "sold_out"
  | "removed"
  | "unverified";

interface PublicCartItem extends StoredPublicCartItem {
  availability: CartItemAvailability;
  priceChanged: boolean;
}
```

Convenciones de persistencia:

- `restaurantSlug` procede de la configuración pública validada.
- `branchSlug` procede exclusivamente del parámetro `branch` validado.
- `savedAt` usa la hora de la última modificación persistible.
- `expiresAt` equivale a siete días después de `savedAt`.
- Los carritos se restauran automáticamente; no usan el flujo Recuperar/Descartar de los borradores staff.
- Una clave de otra versión no se migra ni se elimina globalmente; simplemente no se usa.
- Un carrito caducado se elimina de su clave cuando sea posible.
- El contenido persistido no incluye tokens, datos personales, objetos completos del API ni metadatos internos.
- Un fallo de persistencia cambia el modo a memoria y no impide seleccionar, editar o vaciar platos durante la sesión actual.

La reconciliación recibe el carrito guardado y el menú vigente de la misma sucursal:

```ts
interface CartReconciliationResult {
  items: PublicCartItem[];
  changedPriceDishIds: string[];
  soldOutDishIds: string[];
  removedDishIds: string[];
}
```

Reglas de reconciliación:

- Un plato `available` conserva su cantidad y actualiza nombre, imagen y precio desde el menú vigente.
- Un precio distinto sustituye el snapshot local, marca `priceChanged` durante la sesión y renueva la caducidad.
- Un plato `sold_out` conserva su snapshot y cantidad, pero deja de contribuir al subtotal.
- Un identificador ausente conserva su snapshot y cantidad como `removed`, pero deja de contribuir al subtotal.
- Cuando la consulta del menú no puede validarse, todos los elementos quedan `unverified` y ninguno contribuye al subtotal.
- Una reconciliación nunca añade platos ni cambia cantidades por sí sola.
- Un plato no disponible vuelve a `available` si una respuesta posterior válida vuelve a publicarlo como disponible.

Los importes se calculan sin aritmética decimal binaria:

```ts
interface PublicCartTotals {
  selectedUnits: number;
  availableUnits: number;
  availableSubtotalCents: number;
  unavailableItemCount: number;
}
```

Convenciones monetarias:

- `selectedUnits` suma todas las cantidades, incluidas las no disponibles, para que ningún elemento quede oculto en el contador.
- `availableUnits` suma únicamente cantidades actualmente disponibles.
- `availableSubtotalCents` suma `unitPrice × quantity` únicamente para platos disponibles.
- Cada precio contractual se convierte primero a céntimos enteros.
- PEN se aplica únicamente al formatear la presentación.
- El subtotal es estimado; el backend continuará siendo la autoridad del precio al crear la futura reserva temporal.

## Plan de implementación

1. Ejecutar `bunx --bun shadcn@latest add sheet scroll-area badge empty alert` y revisar los archivos generados sin reinstalar ni sobrescribir `button.tsx`, `separator.tsx` o `alert-dialog.tsx`.
2. Ajustar `src/features/public-menu/contracts/public-menu.ts` para validar `price` como cadena decimal con dos posiciones y reutilizar el schema en el carrito.
3. Crear `src/features/public-cart/contracts/public-cart.schemas.ts` con schemas de ítem, carrito versionado, unicidad de `dishId`, límite de cincuenta elementos y tipos inferidos.
4. Crear `src/features/public-cart/lib/public-cart-money.ts` para convertir precios a céntimos, calcular totales disponibles y formatear PEN sin usar importes de punto flotante.
5. Crear `src/features/public-cart/lib/public-cart-state.ts` con operaciones puras para añadir, incrementar, decrementar, eliminar, vaciar y aplicar límites de cantidad y elementos distintos.
6. Crear `src/features/public-cart/lib/public-cart-storage.ts` con construcción de claves, lectura Zod, caducidad de siete días, escritura segura, eliminación y resultado degradado a memoria.
7. Crear `src/features/public-cart/lib/public-cart-reconciliation.ts` para comparar el carrito con el menú actual y clasificar platos disponibles, agotados, retirados o no verificados.
8. Crear `src/features/public-cart/PublicCartProvider.tsx` con estado por sucursal, restauración automática, persistencia inmediata, renovación de caducidad y API de contexto limitada a operaciones del carrito.
9. Integrar en el proveedor el evento `storage`, filtrando por la clave exacta y aplicando únicamente carritos válidos y vigentes de la sucursal actual.
10. Evitar bucles de sincronización distinguiendo cambios locales de actualizaciones recibidas desde otra pestaña y conservar el último valor válido emitido por `localStorage`.
11. Crear `src/features/public-cart/components/PublicCartQuantityControl.tsx` con botones accesibles, cantidad anunciada y límites `1–99` reutilizable en tarjetas y panel.
12. Crear `src/features/public-cart/components/PublicCartTrigger.tsx` como botón flotante con cantidad total de unidades, subtotal disponible, nombre accesible y foco visible.
13. Crear `src/features/public-cart/components/PublicCartItem.tsx` con imagen o fallback, precio, cantidad, subtotal de línea, eliminación y `Badge` para precio actualizado o falta de disponibilidad.
14. Crear `src/features/public-cart/components/PublicCartSheet.tsx` con `SheetTitle`, descripción, `ScrollArea`, `Separator`, estado `Empty`, subtotal, avisos persistentes y retorno de foco al cerrar.
15. Integrar “Vaciar carrito” dentro del panel mediante el `AlertDialog` existente y devolver el foco a una acción predecible después de confirmar o cancelar.
16. Añadir al panel el botón deshabilitado “Continuar con la reserva” y asociarlo a un texto que explique que la navegación se habilitará en SPEC 09.
17. Actualizar `DishCard.tsx` para mostrar “Añadir” en platos disponibles, bloquear agotados y renderizar el control sincronizado cuando el plato ya esté seleccionado.
18. Actualizar `CategorySection.tsx` para mantener la composición actual y consumir el carrito sin propagar manualmente su estado por toda la jerarquía.
19. Refactorizar `PublicMenu.tsx` para montar el proveedor cuando `branch` sea válido, mantener accesible el carrito durante carga o error del menú y reconciliar solo respuestas validadas de la misma sucursal.
20. Actualizar `PublicMenuApp.tsx` y la composición visual de `/menu` para incluir el `Sheet`, el botón flotante y espacio inferior suficiente sin crear una ruta nueva.
21. Crear `tests/public-cart-contracts.test.ts` para schemas, duplicados, límites, versiones, caducidad y claves aisladas.
22. Crear `tests/public-cart-state.test.ts` para cantidades, máximo de platos, céntimos, subtotal disponible y reconciliación de precio o disponibilidad.
23. Crear `tests/public-cart-storage.test.ts` para restauración automática, renovación de siete días, descarte seguro, fallo de almacenamiento y eventos entre pestañas.
24. Crear `tests/public-cart-ui.test.tsx` para añadir, modificar, eliminar, vaciar, abrir y cerrar el `Sheet`, estados shadcn, anuncios, foco y botón de continuación deshabilitado.
25. Completar la integración responsive del menú y retirar cualquier implementación duplicada de estado o persistencia que quede fuera de `public-cart`.

## Criterios de aceptación

- [ ] `Sheet`, `ScrollArea`, `Badge`, `Empty` y `Alert` se añaden mediante el CLI de shadcn.
- [ ] `Button`, `Separator` y `AlertDialog` se reutilizan sin reinstalarlos ni sobrescribirlos.
- [ ] No se instala ni implementa `Drawer`.
- [ ] El carrito funciona dentro de `/menu?branch=<branchSlug>` sin crear una página independiente.
- [ ] `/menu` sin `branch` válido no crea una clave ni restaura un carrito parcial.
- [ ] Cada plato `available` muestra una acción “Añadir” operable con teclado.
- [ ] Un plato `sold_out` no puede añadirse y el motivo no depende únicamente del color.
- [ ] Añadir un plato nuevo lo incorpora con cantidad `1`.
- [ ] Añadir el plato número cincuenta funciona.
- [ ] Intentar añadir un plato distinto número cincuenta y uno no cambia el carrito y anuncia el límite.
- [ ] Un mismo `dishId` nunca aparece dos veces en el carrito.
- [ ] Después de añadir, la tarjeta muestra controles `− / cantidad / +` sincronizados con el panel.
- [ ] Incrementar o reducir desde la tarjeta actualiza inmediatamente el `Sheet`.
- [ ] Incrementar o reducir desde el `Sheet` actualiza inmediatamente la tarjeta.
- [ ] La cantidad mínima es `1` y el botón `−` queda deshabilitado en ese valor.
- [ ] La cantidad máxima es `99` y el botón `+` queda deshabilitado en ese valor.
- [ ] Reducir desde `1` no elimina silenciosamente el plato.
- [ ] Cada plato ofrece una acción separada para eliminarlo dentro del carrito.
- [ ] Eliminar un plato no modifica las cantidades de los demás.
- [ ] “Vaciar carrito” abre un `AlertDialog` con confirmación y cancelación.
- [ ] Cancelar el diálogo conserva todos los elementos.
- [ ] Confirmar el diálogo elimina únicamente el carrito de la sucursal actual.
- [ ] Un carrito vacío usa el componente shadcn `Empty`.
- [ ] Añadir un plato actualiza el contador sin abrir automáticamente el `Sheet`.
- [ ] El botón flotante muestra todas las unidades seleccionadas, incluidas las temporalmente no disponibles.
- [ ] El botón flotante muestra el subtotal correspondiente solo a unidades disponibles.
- [ ] El botón flotante tiene un nombre accesible que comunica cantidad y subtotal.
- [ ] El botón flotante no oculta contenido ni acciones a 320 px de ancho.
- [ ] Activar el botón abre un único `Sheet` lateral.
- [ ] El `Sheet` incluye título accesible, puede cerrarse con teclado y devuelve el foco al disparador.
- [ ] El `Sheet` permite recorrer una lista extensa mediante `ScrollArea` sin desplazar horizontalmente la página.
- [ ] Cada línea muestra nombre, imagen o fallback, precio unitario, cantidad y subtotal.
- [ ] Cada subtotal de línea disponible equivale exactamente a precio unitario por cantidad.
- [ ] El subtotal general equivale a la suma de las líneas actualmente disponibles.
- [ ] Todos los cálculos monetarios usan céntimos enteros y no producen errores visibles de punto flotante.
- [ ] Los importes se presentan como PEN con dos decimales.
- [ ] No aparecen impuestos, descuentos, promociones, propinas ni cargos adicionales.
- [ ] Añadir, incrementar, reducir, eliminar, vaciar y reconciliar cambios relevantes produce un anuncio `aria-live` no duplicado.
- [ ] Cada sucursal usa `public-cart:v1:{restaurantSlug}:{branchSlug}` como clave independiente.
- [ ] Dos sucursales del mismo restaurante pueden conservar carritos distintos sin mezclar elementos.
- [ ] Dos restaurantes con el mismo `branchSlug` no comparten carrito.
- [ ] El valor persistido contiene únicamente versión, slugs, timestamps e identificador, nombre, imagen, precio y cantidad de cada plato.
- [ ] El valor persistido no contiene tokens, datos del cliente ni respuestas completas del API.
- [ ] Recargar restaura automáticamente un carrito válido y vigente de la sucursal actual.
- [ ] La restauración no muestra ni exige una confirmación Recuperar/Descartar.
- [ ] Cada modificación renueva `savedAt` y `expiresAt` por siete días.
- [ ] Un carrito caducado se elimina cuando es posible y no se restaura.
- [ ] JSON corrupto, versión desconocida, elementos duplicados o forma inválida se descartan sin romper el menú.
- [ ] Un error de lectura, escritura, cuota o disponibilidad de `localStorage` mantiene el carrito funcional en memoria.
- [ ] El modo sin persistencia muestra un `Alert` visible mientras dure la degradación.
- [ ] Un cambio válido realizado en otra pestaña se refleja en la pestaña abierta para la misma sucursal.
- [ ] Los eventos `storage` de otras claves o sucursales no modifican el carrito actual.
- [ ] La sincronización entre pestañas no entra en un bucle de escrituras.
- [ ] Una respuesta vigente del menú reconcilia únicamente el carrito de sus mismos slugs.
- [ ] Si cambia el precio, el carrito usa el nuevo precio, conserva la cantidad y muestra “Precio actualizado”.
- [ ] Una actualización de precio renueva la persistencia y recalcula los subtotales.
- [ ] Si un plato pasa a `sold_out`, permanece visible con su cantidad y un `Badge` de no disponible.
- [ ] Un plato `sold_out` deja de contribuir al subtotal estimado.
- [ ] Si un plato desaparece del menú, permanece visible como retirado y deja de contribuir al subtotal.
- [ ] Ninguna reconciliación elimina platos ni altera cantidades silenciosamente.
- [ ] Si un plato vuelve a estar disponible, recupera su precio vigente y vuelve a contribuir al subtotal.
- [ ] Durante la carga o error del menú, los elementos guardados aparecen como “No verificados”.
- [ ] Un elemento no verificado no contribuye al subtotal disponible.
- [ ] Un error remoto del menú mantiene accesible el carrito y su aviso de estado, además del reintento existente.
- [ ] “Continuar con la reserva” permanece visible y deshabilitado en esta spec.
- [ ] El botón deshabilitado está asociado a una explicación de que la navegación se habilitará en el siguiente paso.
- [ ] Ninguna interacción intenta consultar disponibilidad, crear reservas o iniciar pagos.
- [ ] No existe una ruta `/reserve`, `/cart` ni otro destino nuevo para continuar.
- [ ] Las pruebas no realizan solicitudes reales ni esperan siete días reales.
- [ ] `bun test` finaliza sin errores.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.
- [ ] El menú y el carrito funcionan con teclado, mantienen foco visible y no generan desplazamiento horizontal a 320 px.
- [ ] No se modifica el backend ni se implementan disponibilidad, datos del cliente, reserva temporal, checkout o pagos.

## Decisiones

- **Sí:** separar selección y carrito de disponibilidad y reserva temporal para evitar una spec con demasiados dominios y estados remotos.
- **Sí:** integrar el carrito en el menú público existente.
- **No:** crear una página `/cart`; obligaría a abandonar el contexto del menú sin aportar valor antes de SPEC 09.
- **Sí:** usar shadcn `Sheet` como panel lateral responsive.
- **No:** instalar `Drawer`; su patrón inferior no corresponde al panel lateral elegido y duplicaría comportamiento responsive.
- **Sí:** instalar `ScrollArea`, `Badge`, `Empty` y `Alert` para lista extensa, estados, vacío y degradación persistente.
- **Sí:** reutilizar `Button`, `Separator` y `AlertDialog` ya instalados.
- **Sí:** mostrar controles de cantidad sincronizados en tarjeta y carrito para evitar abrir el panel en cada ajuste.
- **Sí:** mantener cantidades entre `1` y `99` y un máximo de cincuenta platos distintos según el contrato backend posterior.
- **No:** convertir el decremento desde `1` en una eliminación implícita; eliminar requiere una acción explícita.
- **No:** permitir añadir platos `sold_out`.
- **Sí:** mantener un botón flotante con unidades seleccionadas y subtotal disponible.
- **No:** abrir el panel automáticamente después de añadir; interrumpe la exploración repetida del menú.
- **Sí:** anunciar los cambios mediante `aria-live` y no depender solo de cambios visuales.
- **Sí:** confirmar “Vaciar carrito” mediante `AlertDialog` porque elimina toda la selección de la sucursal actual.
- **Sí:** mantener un carrito independiente por restaurante y sucursal.
- **No:** combinar o trasladar automáticamente platos entre sucursales; precio y disponibilidad pertenecen a cada menú local.
- **Sí:** usar `localStorage` porque el carrito es pequeño, no sensible y no requiere consultas complejas.
- **Sí:** usar una clave versionada con ambos slugs para aislar contexto y permitir cambios futuros de schema.
- **Sí:** restaurar automáticamente; un carrito no es un borrador administrativo que pueda sobrescribir datos remotos.
- **Sí:** caducar después de siete días desde la última modificación para limitar snapshots obsoletos.
- **Sí:** sincronizar el mismo carrito entre pestañas mediante `storage`.
- **Sí:** degradar a memoria cuando la persistencia falle y mantener un aviso persistente dentro del panel.
- **No:** añadir un `Toaster` público; los fallos de persistencia y disponibilidad requieren información duradera y contextual.
- **Sí:** reconciliar contra cada menú válido y conservar la cantidad elegida.
- **Sí:** actualizar al precio vigente y comunicar el cambio; el precio local es una estimación y no debe ocultar diferencias conocidas.
- **Sí:** conservar agotados o retirados marcados en vez de eliminarlos silenciosamente.
- **Sí:** excluir agotados, retirados y no verificados del subtotal estimado.
- **Sí:** contar todas las unidades seleccionadas en el disparador para que los elementos problemáticos sigan siendo visibles.
- **Sí:** calcular importes en céntimos enteros y formatear PEN solo al mostrar.
- **No:** incorporar una librería monetaria para las operaciones limitadas y el rango contractual actual.
- **Sí:** mantener accesible el carrito durante un fallo del menú, pero tratar sus elementos como no verificados.
- **Sí:** mostrar el botón de continuación para anticipar el flujo completo.
- **No:** darle navegación o efecto antes de SPEC 09; un botón deshabilitado y explicado evita una ruta falsa o incompleta.
- **No:** persistir el carrito en backend ni vincularlo a autenticación de cliente.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un precio cambia después de guardarse el carrito | Reconciliar con el menú vigente, actualizar el snapshot, recalcular y mostrar un aviso explícito. |
| Un plato queda agotado o se retira sin que el cliente lo vea | Conservarlo marcado, excluirlo del subtotal y mantenerlo visible hasta que el cliente lo elimine. |
| El menú falla y el carrito parece todavía reservable | Marcar todos los elementos como no verificados, excluirlos del subtotal y mantener el botón de continuación deshabilitado. |
| Dos sucursales mezclan platos o precios | Aislar estado y clave por `restaurantSlug` y `branchSlug`, y reconciliar solo slugs coincidentes. |
| Dos pestañas sobrescriben cantidades | Escuchar `storage`, validar cada valor recibido y aplicar el último carrito válido de la misma clave. |
| La sincronización entre pestañas genera escrituras recursivas | Distinguir actualizaciones remotas y no volver a persistir un valor aplicado desde `storage`. |
| `localStorage` está bloqueado, lleno o corrupto | Encapsular accesos, validar con Zod, degradar a memoria y mostrar un `Alert` persistente. |
| Un carrito antiguo conserva datos obsoletos indefinidamente | Renovar una caducidad de siete días por modificación y descartar valores vencidos. |
| La aritmética con `number` produce subtotales como `0.30000000004` | Convertir cada precio a céntimos enteros antes de multiplicar o sumar. |
| El botón flotante tapa platos o navegación en móvil | Reservar espacio inferior, respetar áreas seguras y verificar a 320 px y con zoom. |
| Un `Sheet` largo pierde acceso al resumen o acciones | Usar `ScrollArea` para las líneas y mantener resumen y acciones fuera de la región desplazable. |
| El cliente interpreta el subtotal como precio definitivo | Etiquetarlo como estimado y mantener al backend como autoridad durante la futura reserva. |
| El botón de continuación parece roto | Mantenerlo deshabilitado y asociarlo a una explicación visible y accesible sobre SPEC 09. |

## Lo que **no** está en esta spec

- Disponibilidad de mesas u horarios.
- Fecha, hora o cantidad de personas.
- Datos personales del cliente.
- Reserva temporal, expiración o idempotencia.
- Ruta pública de carrito o reserva.
- Navegación efectiva desde “Continuar con la reserva”.
- Checkout, Stripe, countdown, polling o confirmación de pago.
- Cuentas de cliente o persistencia remota.
- Carritos combinados entre sucursales.
- Selección de platos agotados.
- Impuestos, descuentos, promociones, propinas o cargos adicionales.
- Cambios en endpoints, modelos o reglas del backend.
- Rediseño general del menú público.

Cada paso posterior del flujo de reserva y pago deberá definirse en su propia spec.
