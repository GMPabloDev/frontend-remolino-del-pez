# Casos de prueba

## TC-0001

| Identificador del caso de prueba | TC-0001_Visualizar sucursales |
|---|---|
| Nombre | Visualización de sucursales disponibles |
| Objetivo | Validar que el sistema muestre correctamente las sucursales disponibles para realizar una reserva. |
| Precondiciones | 1. Tener acceso a internet.<br>2. Tener el sistema disponible. |
| Postcondiciones | Se muestran las sucursales disponibles para el usuario. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar a la página principal del sistema mediante la ruta `http://localhost:4321/`. | Se debe mostrar la pantalla principal del sistema. | OK |
| 2. Revisar la sección de sucursales disponibles. | Se debe mostrar la lista de sucursales registradas. | OK |
| 3. Verificar la información mostrada de cada sucursal. | Se debe mostrar la información correspondiente de cada sucursal. | OK |

## TC-0002

| Identificador del caso de prueba | TC-0002_Consultar menú |
|---|---|
| Nombre | Consulta del menú de una sucursal |
| Objetivo | Validar que el usuario pueda seleccionar una sucursal y consultar su menú disponible. |
| Precondiciones | 1. Tener acceso a la página principal.<br>2. Tener al menos una sucursal disponible. |
| Postcondiciones | El menú de la sucursal seleccionada se muestra correctamente. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Seleccionar una sucursal de la lista. | Se debe mostrar la página correspondiente a la sucursal seleccionada. | OK |
| 2. Ingresar a la opción “Ver menú”. | Se debe mostrar el menú de la sucursal. | OK |
| 3. Revisar las categorías y platos disponibles. | Se deben mostrar las categorías y los platos habilitados para la venta. | OK |

## TC-0003

| Identificador del caso de prueba | TC-0003_Agregar productos al carrito |
|---|---|
| Nombre | Agregar productos al carrito de compra |
| Objetivo | Validar que el usuario pueda seleccionar platos del menú y agregarlos correctamente al carrito. |
| Precondiciones | 1. Tener el menú de una sucursal disponible.<br>2. Tener al menos un plato habilitado. |
| Postcondiciones | El plato seleccionado queda registrado en el carrito. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Seleccionar un plato del menú. | Se debe mostrar la información del plato seleccionado. | OK |
| 2. Indicar la cantidad del plato. | El sistema debe permitir seleccionar la cantidad deseada. | OK |
| 3. Hacer clic en “Agregar al carrito”. | El plato debe agregarse correctamente al carrito. | OK |
| 4. Abrir el carrito de compra. | Se debe mostrar el plato agregado, su cantidad y su precio. | OK |

## TC-0004

| Identificador del caso de prueba | TC-0004_Modificar carrito |
|---|---|
| Nombre | Modificación y eliminación de productos del carrito |
| Objetivo | Validar que el usuario pueda modificar la cantidad de productos y eliminarlos del carrito. |
| Precondiciones | 1. Tener al menos un plato agregado al carrito. |
| Postcondiciones | El carrito se actualiza con la cantidad y los productos seleccionados por el usuario. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Abrir el carrito de compra. | Se debe mostrar la lista de productos agregados. | OK |
| 2. Aumentar la cantidad de un producto. | La cantidad y el subtotal deben actualizarse correctamente. | OK |
| 3. Disminuir la cantidad de un producto. | La cantidad y el subtotal deben actualizarse correctamente. | OK |
| 4. Eliminar un producto del carrito. | El producto debe desaparecer y el total debe actualizarse. | OK |

## TC-0005

| Identificador del caso de prueba | TC-0005_Registrar reserva válida |
|---|---|
| Nombre | Registro de una reserva con datos válidos |
| Objetivo | Validar que el usuario pueda registrar una reserva ingresando datos válidos de fecha, horario, cantidad de personas y cliente. |
| Precondiciones | 1. Tener una sucursal disponible.<br>2. Tener un horario disponible.<br>3. Tener al menos un producto seleccionado. |
| Postcondiciones | La reserva temporal se registra satisfactoriamente y el usuario puede continuar con el proceso de pago. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Seleccionar la opción para realizar una reserva. | Se debe mostrar el formulario de reserva. | OK |
| 2. Seleccionar una fecha válida. | El sistema debe permitir seleccionar la fecha. | OK |
| 3. Ingresar la cantidad de personas. | El sistema debe aceptar la cantidad ingresada dentro del límite permitido. | OK |
| 4. Hacer clic en “Buscar disponibilidad”. | Se deben mostrar los horarios disponibles. | OK |
| 5. Seleccionar un horario disponible. | El horario seleccionado debe quedar registrado en el formulario. | OK |
| 6. Ingresar los datos del cliente. | El sistema debe permitir ingresar los datos solicitados. | OK |
| 7. Hacer clic en “Confirmar reserva”. | Se debe mostrar la confirmación de la reserva y la opción para continuar con el pago. | OK |

## TC-0006

| Identificador del caso de prueba | TC-0006_Registrar reserva inválida |
|---|---|
| Nombre | Registro de una reserva con datos inválidos |
| Objetivo | Validar que el sistema identifique los campos obligatorios o incorrectos al intentar registrar una reserva. |
| Precondiciones | 1. Tener una sucursal disponible.<br>2. Encontrarse en el formulario de reserva. |
| Postcondiciones | La reserva no se registra hasta que se corrijan los datos ingresados. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Seleccionar una fecha válida. | El sistema debe permitir seleccionar la fecha. | OK |
| 2. Dejar vacío el campo de cantidad de personas o ingresar un valor inválido. | El sistema debe identificar que la cantidad no es válida. | OK |
| 3. Hacer clic en “Buscar disponibilidad”. | Se debe mostrar un mensaje indicando que se deben revisar los datos ingresados. | OK |
| 4. Ingresar datos incompletos del cliente. | El sistema debe mostrar los campos obligatorios que deben completarse. | OK |
| 5. Intentar confirmar la reserva. | La reserva no debe registrarse mientras existan datos inválidos. | OK |

## TC-0007

| Identificador del caso de prueba | TC-0007_Consultar horario no disponible |
|---|---|
| Nombre | Consulta de fecha u horario no disponible |
| Objetivo | Validar que el sistema informe al usuario cuando no existan horarios disponibles para la fecha o cantidad de personas seleccionada. |
| Precondiciones | 1. Tener una sucursal disponible.<br>2. Tener configurada una fecha u horario sin disponibilidad. |
| Postcondiciones | El usuario es informado de que no existe disponibilidad y no puede seleccionar un horario ocupado. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar al formulario de reserva. | Se debe mostrar el formulario de reserva. | OK |
| 2. Seleccionar una fecha sin disponibilidad. | El sistema debe permitir consultar la fecha seleccionada. | OK |
| 3. Ingresar la cantidad de personas. | El sistema debe aceptar la cantidad válida. | OK |
| 4. Hacer clic en “Buscar disponibilidad”. | Se debe mostrar un mensaje indicando que no existen horarios disponibles. | OK |

## TC-0008

| Identificador del caso de prueba | TC-0008_Iniciar proceso de pago |
|---|---|
| Nombre | Inicio del proceso de pago de una reserva |
| Objetivo | Validar que el usuario pueda iniciar el proceso de pago después de registrar una reserva. |
| Precondiciones | 1. Tener una reserva registrada.<br>2. Encontrarse en la pantalla de confirmación de la reserva. |
| Postcondiciones | El usuario es redirigido a la pantalla o formulario de pago. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Revisar el resumen de la reserva. | Se deben mostrar los datos de la reserva y el importe correspondiente. | OK |
| 2. Hacer clic en “Pagar” o “Continuar al pago”. | El sistema debe iniciar el proceso de pago. | OK |
| 3. Esperar la carga del servicio de pago. | Se debe mostrar la pantalla de pago correspondiente. | OK |

## TC-0009

| Identificador del caso de prueba | TC-0009_Realizar pago exitoso |
|---|---|
| Nombre | Realización exitosa del pago |
| Objetivo | Validar que un pago realizado correctamente muestre la confirmación correspondiente al usuario. |
| Precondiciones | 1. Tener una reserva registrada.<br>2. Haber iniciado el proceso de pago.<br>3. Contar con datos de prueba válidos para el pago. |
| Postcondiciones | El pago queda confirmado y el sistema muestra el resultado exitoso de la operación. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar los datos de pago válidos. | El sistema debe permitir ingresar los datos de pago. | OK |
| 2. Confirmar el pago. | El servicio de pago debe procesar la operación. | OK |
| 3. Esperar la respuesta del servicio de pago. | Se debe mostrar la pantalla de pago realizado correctamente. | OK |
| 4. Revisar el resultado de la operación. | Se deben mostrar los datos principales de la reserva o confirmación. | OK |

## TC-0010

| Identificador del caso de prueba | TC-0010_Cancelar proceso de pago |
|---|---|
| Nombre | Cancelación del proceso de pago |
| Objetivo | Validar que el usuario pueda cancelar el proceso de pago y que el sistema muestre el resultado correspondiente. |
| Precondiciones | 1. Tener una reserva registrada.<br>2. Haber iniciado el proceso de pago. |
| Postcondiciones | El pago no se confirma y el usuario retorna al sistema con el estado de pago cancelado. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar a la pantalla de pago. | Se debe mostrar la información del pago pendiente. | OK |
| 2. Cancelar la operación de pago. | El servicio de pago debe cancelar la operación. | OK |
| 3. Regresar al sistema. | Se debe mostrar el resultado de pago cancelado. | OK |

## TC-0011

| Identificador del caso de prueba | TC-0011_Login administrativo válido |
|---|---|
| Nombre | Inicio de sesión administrativo con datos válidos |
| Objetivo | Validar que el personal autorizado pueda iniciar sesión en el panel administrativo con credenciales válidas. |
| Precondiciones | 1. Tener un usuario administrativo registrado.<br>2. Tener una contraseña válida.<br>3. Tener acceso a la pantalla de inicio de sesión. |
| Postcondiciones | El usuario inicia sesión y accede al panel administrativo. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar al módulo de inicio de sesión administrativo. | Se debe mostrar el formulario de inicio de sesión. | OK |
| 2. Ingresar el correo electrónico registrado. | El sistema debe permitir ingresar el correo electrónico. | OK |
| 3. Ingresar la contraseña válida. | El sistema debe permitir ingresar la contraseña. | OK |
| 4. Hacer clic en “Iniciar sesión”. | El sistema debe validar las credenciales. | OK |
| 5. Revisar la pantalla principal del panel. | Se debe mostrar el panel administrativo. | OK |

## TC-0012

| Identificador del caso de prueba | TC-0012_Login administrativo inválido |
|---|---|
| Nombre | Inicio de sesión administrativo con datos inválidos |
| Objetivo | Validar que el sistema rechace las credenciales incorrectas al intentar ingresar al panel administrativo. |
| Precondiciones | 1. Tener acceso a la pantalla de inicio de sesión administrativo. |
| Postcondiciones | El usuario no accede al panel administrativo y permanece en la pantalla de inicio de sesión. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar un correo electrónico incorrecto o no registrado. | El sistema debe permitir ingresar el correo electrónico. | OK |
| 2. Ingresar una contraseña incorrecta. | El sistema debe permitir ingresar la contraseña. | OK |
| 3. Hacer clic en “Iniciar sesión”. | El sistema debe rechazar las credenciales ingresadas. | OK |
| 4. Revisar el mensaje mostrado. | Se debe mostrar un mensaje indicando que los datos no son válidos. | OK |

## TC-0013

| Identificador del caso de prueba | TC-0013_Proteger rutas administrativas |
|---|---|
| Nombre | Control de acceso y cierre de sesión administrativo |
| Objetivo | Validar que las rutas administrativas estén protegidas y que el usuario pueda cerrar su sesión correctamente. |
| Precondiciones | 1. No tener una sesión administrativa iniciada.<br>2. Tener disponible una ruta del panel administrativo. |
| Postcondiciones | El usuario no autenticado no accede a las rutas protegidas y, al cerrar sesión, vuelve a la pantalla de inicio de sesión. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Intentar ingresar directamente a una ruta administrativa. | El sistema debe impedir el acceso y redirigir al inicio de sesión. | OK |
| 2. Iniciar sesión con credenciales válidas. | El sistema debe permitir el acceso al panel administrativo. | OK |
| 3. Hacer clic en “Cerrar sesión”. | El sistema debe finalizar la sesión del usuario. | OK |
| 4. Intentar regresar a una ruta administrativa. | El sistema debe volver a impedir el acceso y solicitar el inicio de sesión. | OK |

## TC-0014

| Identificador del caso de prueba | TC-0014_Gestionar sucursal |
|---|---|
| Nombre | Creación y actualización de una sucursal |
| Objetivo | Validar que el personal administrativo pueda registrar una nueva sucursal y actualizar sus datos. |
| Precondiciones | 1. Tener una sesión administrativa iniciada.<br>2. Tener permisos para administrar sucursales. |
| Postcondiciones | La sucursal queda registrada y sus datos actualizados se muestran correctamente. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar al módulo de sucursales. | Se debe mostrar la lista de sucursales registradas. | OK |
| 2. Hacer clic en “Nueva sucursal”. | Se debe mostrar el formulario de registro. | OK |
| 3. Ingresar los datos de la sucursal. | El sistema debe permitir ingresar nombre, código, dirección y datos de contacto. | OK |
| 4. Hacer clic en “Guardar” o “Crear sucursal”. | La sucursal debe registrarse correctamente. | OK |
| 5. Ingresar a la sucursal creada y modificar un dato. | El sistema debe permitir editar la información de la sucursal. | OK |
| 6. Guardar los cambios realizados. | Los datos actualizados deben mostrarse correctamente. | OK |

## TC-0015

| Identificador del caso de prueba | TC-0015_Gestionar mesa |
|---|---|
| Nombre | Creación y modificación de una mesa |
| Objetivo | Validar que el personal administrativo pueda registrar y modificar una mesa asociada a una sucursal. |
| Precondiciones | 1. Tener una sesión administrativa iniciada.<br>2. Tener al menos una sucursal registrada. |
| Postcondiciones | La mesa queda registrada en la sucursal y sus datos se actualizan correctamente. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar a una sucursal registrada. | Se debe mostrar la información de la sucursal. | OK |
| 2. Ingresar al módulo de mesas. | Se debe mostrar la lista de mesas de la sucursal. | OK |
| 3. Hacer clic en “Nueva mesa”. | Se debe mostrar el formulario de creación de mesa. | OK |
| 4. Ingresar el código y la capacidad de la mesa. | El sistema debe permitir ingresar los datos solicitados. | OK |
| 5. Hacer clic en “Guardar” o “Crear mesa”. | La mesa debe registrarse correctamente. | OK |
| 6. Modificar los datos o el estado de la mesa. | El sistema debe permitir actualizar la mesa. | OK |

## TC-0016

| Identificador del caso de prueba | TC-0016_Gestionar categoría |
|---|---|
| Nombre | Creación y actualización de una categoría del menú |
| Objetivo | Validar que el personal administrativo pueda crear y actualizar una categoría del menú. |
| Precondiciones | 1. Tener una sesión administrativa iniciada.<br>2. Tener permisos para administrar el catálogo. |
| Postcondiciones | La categoría queda registrada y disponible para organizar los platos del menú. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar al módulo de categorías del catálogo. | Se debe mostrar la lista de categorías registradas. | OK |
| 2. Hacer clic en “Nueva categoría”. | Se debe mostrar el formulario de creación. | OK |
| 3. Ingresar el nombre y la posición de la categoría. | El sistema debe permitir ingresar los datos solicitados. | OK |
| 4. Hacer clic en “Guardar” o “Crear categoría”. | La categoría debe registrarse correctamente. | OK |
| 5. Ingresar a la categoría y modificar sus datos. | El sistema debe permitir actualizar la información. | OK |
| 6. Guardar los cambios. | La categoría debe mostrar la información actualizada. | OK |

## TC-0017

| Identificador del caso de prueba | TC-0017_Gestionar plato |
|---|---|
| Nombre | Creación y actualización de un plato del menú |
| Objetivo | Validar que el personal administrativo pueda registrar un plato, asociarlo a una categoría y actualizar su información. |
| Precondiciones | 1. Tener una sesión administrativa iniciada.<br>2. Tener al menos una categoría registrada. |
| Postcondiciones | El plato queda registrado en la categoría seleccionada y sus datos actualizados se muestran correctamente. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar al módulo de platos del catálogo. | Se debe mostrar la lista de platos registrados. | OK |
| 2. Hacer clic en “Nuevo plato”. | Se debe mostrar el formulario de creación de plato. | OK |
| 3. Ingresar el nombre, descripción, precio y categoría del plato. | El sistema debe permitir ingresar los datos solicitados. | OK |
| 4. Agregar la imagen u otros datos disponibles del plato. | El sistema debe permitir completar la información del plato. | OK |
| 5. Hacer clic en “Guardar” o “Crear plato”. | El plato debe registrarse correctamente. | OK |
| 6. Ingresar al plato creado y modificar un dato. | El sistema debe permitir actualizar la información del plato. | OK |
| 7. Guardar los cambios realizados. | Los datos actualizados deben mostrarse correctamente. | OK |

## TC-0018

| Identificador del caso de prueba | TC-0018_Publicar menú de sucursal |
|---|---|
| Nombre | Configuración y publicación del menú de una sucursal |
| Objetivo | Validar que el personal administrativo pueda configurar la disponibilidad de los platos y publicar el menú de una sucursal. |
| Precondiciones | 1. Tener una sesión administrativa iniciada.<br>2. Tener una sucursal registrada.<br>3. Tener categorías y platos registrados. |
| Postcondiciones | El menú queda configurado y los platos habilitados se muestran en el menú público de la sucursal. |

| Paso | Resultado esperado | Resultado real |
|---|---|---|
| 1. Ingresar al módulo de menú de una sucursal. | Se debe mostrar la configuración del menú de la sucursal. | OK |
| 2. Revisar las categorías y platos disponibles. | Se deben mostrar los elementos asociados a la sucursal. | OK |
| 3. Habilitar o deshabilitar un plato del menú. | El sistema debe permitir cambiar la disponibilidad del plato. | OK |
| 4. Guardar la configuración realizada. | Los cambios deben guardarse correctamente. | OK |
| 5. Ingresar al menú público de la sucursal. | Se deben mostrar los platos habilitados y no se deben mostrar los platos deshabilitados. | OK |
