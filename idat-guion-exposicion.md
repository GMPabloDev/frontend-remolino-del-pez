# Guion de exposición del sistema

**Duración estimada:** entre 5 minutos y 30 segundos y 5 minutos y 50 segundos.

**Modalidad:** demostración funcional del sistema, sin mostrar código.

**Objetivo del video:** presentar el sistema como una solución para que un restaurante pueda mostrar sus sucursales y menú, recibir reservas, gestionar pagos y administrar su operación desde un panel privado.

## Preparación antes de grabar

1. Iniciar el sistema y comprobar que cargue correctamente la página principal.
2. Tener disponible una sucursal con categorías, platos, horarios y mesas de prueba.
3. Tener preparadas las credenciales del usuario administrativo.
4. Tener abierta una cuenta de correo de prueba para demostrar el Magic Link.
5. Tener preparados los datos de prueba del servicio de pago.
6. Mantener abiertas únicamente las pestañas que se mostrarán en el video.
7. No mostrar el editor de código, la terminal, errores técnicos, contraseñas ni información sensible.

## Guion

### 0:00 - 0:15 | Presentación

**Acción en pantalla:** Mostrar la página principal en `http://localhost:4321/`.

**Texto para decir:**

> Buenos días. En este video presentaré nuestro sistema de reservas para restaurantes. El cliente puede encontrar una sucursal, consultar el menú, elegir sus platos, reservar y pagar. Además, el personal administra el restaurante desde un panel privado.

### 0:15 - 0:55 | Página principal y sucursales

**Acción en pantalla:** Mostrar la página principal completa y mover brevemente la vista hacia la sección de sucursales.

**Texto para decir:**

> Esta es la página principal. En la parte superior se encuentra la identidad del restaurante, el acceso para clientes y la opción de reserva. La distribución permite encontrar rápidamente las acciones principales.

> En esta sección el cliente visualiza las sucursales disponibles y elige dónde desea realizar su reserva. Cada tarjeta presenta la información necesaria para tomar esa decisión.

**Acción en pantalla:** Seleccionar una sucursal.

**Texto para decir:**

> Al seleccionar una sucursal, el sistema muestra la carta correspondiente a esa ubicación.

### 0:55 - 1:45 | Menú público

**Acción en pantalla:** Mostrar el menú, sus categorías y algunos platos.

**Texto para decir:**

> En el menú se observan las categorías y los platos publicados. Las categorías aparecen organizadas en la parte superior y permiten desplazarse directamente a cada sección.

> Cada plato muestra su nombre, imagen, descripción y precio, para que el cliente pueda decidir antes de agregarlo.

> El menú solo muestra los productos habilitados. Si un plato deja de estar disponible, el personal puede desactivarlo y evitar reservas incorrectas.

**Acción en pantalla:** Reducir brevemente el ancho de la ventana o mostrar la vista móvil.

**Texto para decir:**

> La distribución también se adapta a pantallas pequeñas, manteniendo los elementos y botones accesibles desde una computadora o un celular.

### 1:45 - 2:25 | Carrito de compra

**Acción en pantalla:** Agregar uno o dos platos y abrir el carrito.

**Texto para decir:**

> Desde la carta, el cliente agrega sus platos al carrito. Allí se muestra la imagen, el nombre, el precio, la cantidad y el subtotal.

**Acción en pantalla:** Aumentar y disminuir una cantidad.

**Texto para decir:**

> La cantidad se modifica con los controles de aumentar y disminuir. Si una acción no corresponde, como disminuir una cantidad que ya es uno, el botón se deshabilita para evitar valores incorrectos.

**Acción en pantalla:** Mostrar el botón “Eliminar” y luego “Vaciar carrito”, sin confirmar el vaciado si no se desea perder la selección.

**Texto para decir:**

> También se puede eliminar un producto. Para borrar toda la selección, el sistema solicita una confirmación y evita pérdidas accidentales.

### 2:25 - 3:35 | Reserva de mesa y validaciones

**Acción en pantalla:** Hacer clic en “Continuar con la reserva”.

**Texto para decir:**

> Cuando la selección está lista, el cliente continúa con la reserva e indica la fecha y la cantidad de personas.

**Acción en pantalla:** Abrir el selector de fecha y elegir una fecha válida.

**Texto para decir:**

> El calendario permite elegir únicamente fechas dentro del periodo permitido, evitando fechas pasadas o no habilitadas.

**Acción en pantalla:** Ingresar la cantidad de personas y hacer clic en “Ver horarios”.

**Texto para decir:**

> La cantidad de personas también se valida con un mínimo y un máximo. No se permite continuar con el campo vacío o fuera del límite.

**Acción en pantalla:** Mostrar los horarios disponibles y seleccionar uno.

**Texto para decir:**

> Después de consultar, se muestran los horarios disponibles para esa fecha y cantidad de personas. El horario seleccionado queda resaltado visualmente.

> Así el cliente no selecciona un horario ocupado o que ya no esté disponible.

**Acción en pantalla:** Completar los datos del cliente y avanzar.

**Texto para decir:**

> Luego se ingresan los datos del cliente. Los campos obligatorios se revisan antes de confirmar. Si falta información o el formato es incorrecto, aparece una indicación y el proceso se mantiene en la misma pantalla.

**Acción en pantalla:** Confirmar la reserva con datos válidos.

**Texto para decir:**

> Finalmente se confirma la reserva y se muestra un resumen con la sucursal, fecha, hora, personas y platos antes de pasar al pago.

### 3:35 - 4:15 | Pago y confirmación

**Acción en pantalla:** Continuar al pago y utilizar los datos de prueba.

**Texto para decir:**

> Desde el resumen, el cliente continúa al pago utilizando los datos de prueba preparados para esta demostración.

**Acción en pantalla:** Confirmar el pago y mostrar la pantalla de resultado exitoso.

**Texto para decir:**

> Una vez aprobado, se muestra que la reserva está confirmada y se presenta el detalle de la operación.

> Si el cliente cancela, el sistema no muestra la reserva como confirmada y presenta el estado de pago cancelado.

### 4:15 - 5:00 | Acceso del cliente mediante Magic Link

**Acción en pantalla:** Ir a `http://localhost:4321/customer/access`.

**Texto para decir:**

> El sistema también ofrece acceso mediante Magic Link, por lo que el cliente no necesita recordar una contraseña.

**Acción en pantalla:** Ingresar el correo de prueba y hacer clic en “Solicitar enlace de acceso”.

**Texto para decir:**

> El cliente ingresa el correo con el que confirmó su reserva y solicita el enlace. El sistema muestra una respuesta clara sin exponer información innecesaria. Después, el cliente abre el enlace recibido.

**Acción en pantalla:** Abrir el enlace y mostrar la cuenta del cliente.

**Texto para decir:**

> El enlace valida el acceso y lleva al cliente a su cuenta, donde puede visualizar nombre, correo, teléfono y restaurante asociado.

**Acción en pantalla:** Mostrar el botón “Cerrar sesión”.

**Texto para decir:**

> Finalmente puede cerrar sesión. El acceso del cliente se mantiene separado del acceso administrativo, y cada usuario ve el área que le corresponde.

### 5:00 - 5:35 | Panel administrativo y orden del menú

**Acción en pantalla:** Ir a `http://localhost:4321/staff/login` e iniciar sesión con credenciales válidas.

**Texto para decir:**

> Desde el lado administrativo, el personal ingresa mediante una pantalla privada y accede al panel del restaurante.

**Acción en pantalla:** Mostrar brevemente sucursales, mesas y catálogo.

**Texto para decir:**

> Allí se administran sucursales, mesas con su código y capacidad, categorías y platos.

**Acción en pantalla:** Abrir una categoría o plato y mostrar el campo de posición.

**Texto para decir:**

> Un detalle importante es la posición. Las categorías y los platos pueden ordenarse para decidir qué sección aparece primero y cómo se presenta la carta pública.

**Acción en pantalla:** Mostrar la disponibilidad o estado de un plato y volver al menú público.

**Texto para decir:**

> También puede habilitar o deshabilitar platos. Al volver al menú público, el cliente verá la oferta actualizada.

### 5:35 - 5:50 | Cierre

**Acción en pantalla:** Volver al menú o mostrar la confirmación de reserva.

**Texto para decir:**

> En conclusión, este sistema reúne la atención al cliente y la gestión del restaurante en una sola plataforma. Facilita consultar, reservar, pagar y administrar la operación. Gracias por su atención.

## Recomendaciones para la grabación

1. Ensayar el recorrido completo antes de grabar para que cada acción sea natural.
2. Hablar mientras se realiza la acción, sin dejar largos silencios entre una pantalla y otra.
3. Mostrar solo una validación breve, por ejemplo la cantidad de personas o un campo obligatorio, y luego corregirla.
4. No entrar en todos los formularios administrativos; mostrar las funciones principales y explicar su beneficio.
5. Si el pago o el correo tardan, tener los datos preparados y continuar con la pantalla siguiente sin mostrar esperas o errores.
6. Mantener el video entre 5:30 y 5:50 minutos para no superar el límite de 6 minutos.
