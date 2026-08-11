# Requerimientos funcionales y casos de uso

## Parte 1: Requerimientos funcionales

### Módulo público

1. **RF-001:** El sistema debe mostrar la información general del restaurante y sus sucursales disponibles.
2. **RF-002:** El sistema debe permitir al cliente seleccionar una sucursal.
3. **RF-003:** El sistema debe mostrar el menú correspondiente a la sucursal seleccionada.
4. **RF-004:** El sistema debe organizar los platos por categorías.
5. **RF-005:** El sistema debe mostrar el nombre, imagen, descripción y precio de cada plato.
6. **RF-006:** El sistema debe permitir agregar platos al carrito.
7. **RF-007:** El sistema debe permitir aumentar o disminuir la cantidad de platos del carrito.
8. **RF-008:** El sistema debe permitir eliminar un plato o vaciar completamente el carrito.
9. **RF-009:** El sistema debe solicitar confirmación antes de vaciar el carrito.
10. **RF-010:** El sistema debe verificar que los platos del carrito continúen disponibles antes de realizar una reserva.

### Módulo de reservas

11. **RF-011:** El sistema debe permitir seleccionar una fecha para la reserva.
12. **RF-012:** El sistema debe permitir ingresar la cantidad de personas.
13. **RF-013:** El sistema debe validar que la fecha y la cantidad de personas sean válidas.
14. **RF-014:** El sistema debe consultar y mostrar los horarios disponibles.
15. **RF-015:** El sistema debe permitir seleccionar un horario disponible.
16. **RF-016:** El sistema debe impedir la selección de horarios ocupados o no disponibles.
17. **RF-017:** El sistema debe permitir ingresar los datos del cliente.
18. **RF-018:** El sistema debe validar los campos obligatorios y el formato de los datos del cliente.
19. **RF-019:** El sistema debe permitir confirmar una reserva temporal.
20. **RF-020:** El sistema debe mostrar un contador del tiempo disponible para continuar con la reserva.
21. **RF-021:** El sistema debe mostrar un resumen con la sucursal, fecha, horario, cantidad de personas y platos seleccionados.

### Módulo de pagos

22. **RF-022:** El sistema debe permitir iniciar el proceso de pago de una reserva.
23. **RF-023:** El sistema debe mostrar el resultado de un pago confirmado.
24. **RF-024:** El sistema debe mostrar el resultado de un pago cancelado.
25. **RF-025:** El sistema debe mostrar los datos de la reserva después de confirmar el pago.

### Módulo de acceso del cliente

26. **RF-026:** El sistema debe permitir al cliente solicitar un enlace de acceso mediante su correo electrónico.
27. **RF-027:** El sistema debe enviar un Magic Link al correo del cliente.
28. **RF-028:** El sistema debe validar el Magic Link recibido.
29. **RF-029:** El sistema debe permitir al cliente acceder a su cuenta sin utilizar una contraseña.
30. **RF-030:** El sistema debe mostrar los datos principales del cliente dentro de su cuenta.
31. **RF-031:** El sistema debe permitir al cliente cerrar sesión.

### Módulo administrativo

32. **RF-032:** El sistema debe permitir al personal administrativo iniciar sesión.
33. **RF-033:** El sistema debe impedir el acceso no autorizado a las rutas administrativas.
34. **RF-034:** El sistema debe mostrar el panel principal del restaurante y la información del usuario administrativo.
35. **RF-035:** El sistema debe permitir crear, consultar y actualizar sucursales.
36. **RF-036:** El sistema debe permitir configurar el horario, las reglas y el estado de una sucursal.
37. **RF-037:** El sistema debe permitir crear, consultar y actualizar mesas.
38. **RF-038:** El sistema debe permitir registrar el código, capacidad y estado de cada mesa.
39. **RF-039:** El sistema debe permitir crear, consultar y actualizar categorías del menú.
40. **RF-040:** El sistema debe permitir definir la posición y el estado de una categoría.
41. **RF-041:** El sistema debe permitir crear, consultar y actualizar platos.
42. **RF-042:** El sistema debe permitir asociar un plato a una categoría.
43. **RF-043:** El sistema debe permitir definir la posición, imagen y estado de un plato.
44. **RF-044:** El sistema debe permitir configurar la disponibilidad de los platos por sucursal.
45. **RF-045:** El sistema debe reflejar en el menú público los cambios realizados por el personal administrativo.
46. **RF-046:** El sistema debe permitir al personal administrativo actualizar su contraseña.

## Parte 2: Casos de uso

| ID | Caso de uso | Actor |
|---|---|---|
| CU-001 | Visualizar sucursales disponibles | Cliente |
| CU-002 | Seleccionar una sucursal | Cliente |
| CU-003 | Consultar el menú público de una sucursal | Cliente |
| CU-004 | Agregar platos al carrito | Cliente |
| CU-005 | Modificar cantidades del carrito | Cliente |
| CU-006 | Eliminar platos o vaciar el carrito | Cliente |
| CU-007 | Consultar disponibilidad de horarios | Cliente |
| CU-008 | Registrar una reserva temporal | Cliente |
| CU-009 | Realizar el pago de la reserva | Cliente |
| CU-010 | Visualizar el resultado del pago | Cliente |
| CU-011 | Solicitar el enlace de acceso por correo | Cliente |
| CU-012 | Ingresar a la cuenta mediante Magic Link | Cliente |
| CU-013 | Visualizar los datos de la cuenta | Cliente |
| CU-014 | Cerrar sesión del cliente | Cliente |
| CU-015 | Iniciar sesión administrativo | Personal administrativo |
| CU-016 | Gestionar sucursales | Personal administrativo |
| CU-017 | Configurar horarios, reglas y estado de una sucursal | Personal administrativo |
| CU-018 | Gestionar mesas de una sucursal | Personal administrativo |
| CU-019 | Gestionar categorías del menú | Personal administrativo |
| CU-020 | Gestionar platos del menú | Personal administrativo |
| CU-021 | Configurar el menú publicado de una sucursal | Personal administrativo |
| CU-022 | Actualizar la contraseña administrativa | Personal administrativo |
| CU-023 | Procesar el pago de la reserva | Sistema de pago |
| CU-024 | Enviar el enlace de acceso al cliente | Sistema de correo |

## Parte 3: Descripción de los casos de uso

### CU-001: Visualizar sucursales disponibles

El cliente ingresa al sistema y visualiza las sucursales disponibles del restaurante.

### CU-002: Seleccionar una sucursal

El cliente selecciona una sucursal para consultar su menú y realizar una reserva.

### CU-003: Consultar el menú público de una sucursal

El sistema muestra las categorías y los platos disponibles de la sucursal seleccionada.

### CU-004: Agregar platos al carrito

El cliente selecciona uno o más platos del menú y los agrega al carrito.

### CU-005: Modificar cantidades del carrito

El cliente aumenta o disminuye la cantidad de los platos seleccionados antes de continuar.

### CU-006: Eliminar platos o vaciar el carrito

El cliente elimina un plato específico o vacía todo el carrito después de confirmar la acción.

### CU-007: Consultar disponibilidad de horarios

El cliente indica una fecha y cantidad de personas para consultar los horarios disponibles.

### CU-008: Registrar una reserva temporal

El cliente selecciona un horario, ingresa sus datos y confirma una reserva temporal.

### CU-009: Realizar el pago de la reserva

El cliente continúa al proceso de pago y completa la operación de su reserva.

### CU-010: Visualizar el resultado del pago

El sistema informa si el pago fue confirmado o cancelado y muestra el estado de la reserva.

### CU-011: Solicitar el enlace de acceso por correo

El cliente ingresa su correo electrónico y solicita un enlace para acceder a su cuenta.

### CU-012: Ingresar a la cuenta mediante Magic Link

El cliente abre el enlace recibido en su correo y accede de forma segura a su cuenta.

### CU-013: Visualizar los datos de la cuenta

El cliente visualiza su nombre, correo, teléfono y restaurante asociado.

### CU-014: Cerrar sesión del cliente

El cliente finaliza su sesión y vuelve a la pantalla de acceso.

### CU-015: Iniciar sesión administrativo

El personal administrativo ingresa sus credenciales válidas para acceder al panel privado.

### CU-016: Gestionar sucursales

El personal administrativo crea, consulta y actualiza la información de las sucursales.

### CU-017: Configurar horarios, reglas y estado de una sucursal

El personal administrativo configura los horarios de atención, las reglas y el estado de una sucursal.

### CU-018: Gestionar mesas de una sucursal

El personal administrativo registra, consulta y actualiza las mesas, su código, capacidad y estado.

### CU-019: Gestionar categorías del menú

El personal administrativo crea, consulta y actualiza las categorías que organizan el menú.

### CU-020: Gestionar platos del menú

El personal administrativo registra y actualiza los datos, categoría, imagen y estado de los platos.

### CU-021: Configurar el menú publicado de una sucursal

El personal administrativo define qué platos están disponibles y en qué orden aparecen en cada sucursal.

### CU-022: Actualizar la contraseña administrativa

El personal administrativo cambia su contraseña desde la sección de cuenta.

### CU-023: Procesar el pago de la reserva

El sistema de pago recibe la información de la operación y devuelve el resultado del pago.

### CU-024: Enviar el enlace de acceso al cliente

El sistema de correo envía al cliente el enlace que le permite ingresar a su cuenta.
