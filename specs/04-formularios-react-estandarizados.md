# SPEC 04 — Formularios React estandarizados y pruebas de comportamiento

> **Estado:** Implementado
> **Depende de:** SPEC 03
> **Fecha:** 2026-08-01
> **Objetivo:** Estandarizar los formularios React con React Hook Form, Zod, resolvers y componentes shadcn, migrando los flujos staff existentes y cubriéndolos con pruebas de comportamiento accesibles.

## Por qué existe esta spec

Los formularios de login y cambio de contraseña mantienen valores, validación, envío y foco mediante estado manual de React.

El crecimiento del panel staff añadirá más formularios, por lo que conviene establecer ahora un patrón único que reutilice los esquemas Zod, los componentes shadcn y pruebas centradas en el comportamiento del usuario.

## Alcance

**Incluido:**

- Consolidar `react-hook-form` y `@hookform/resolvers` como dependencias directas.
- Usar `zodResolver` con los esquemas Zod existentes como fuente de verdad de la validación local.
- Migrar `src/features/staff-auth/components/LoginForm.tsx` a React Hook Form.
- Migrar `src/features/staff-auth/components/ChangePasswordForm.tsx` a React Hook Form.
- Componer ambos formularios con `FieldGroup`, `Field`, `FieldLabel`, `FieldError`, `Input` y `Button` de shadcn.
- Mostrar los errores de validación junto al campo correspondiente.
- Reservar el aviso general para errores procedentes del servidor o de red.
- Enfocar el primer campo inválido cuando falle la validación local.
- Enfocar el aviso general cuando falle una solicitud enviada al servidor.
- Conservar el email y limpiar los campos de contraseña después de cada solicitud enviada, tanto si termina correctamente como si falla.
- Mantener bloqueados los envíos duplicados mientras una solicitud está pendiente.
- Desacoplar los formularios de sesión y transporte mediante funciones asíncronas recibidas por props.
- Conectar el login con la sesión desde `src/features/staff-auth/StaffLoginApp.tsx`.
- Conectar el cambio de contraseña con el cliente autenticado desde `src/features/staff-auth/StaffAccountApp.tsx`.
- Añadir `@testing-library/react`, `@testing-library/user-event` y `happy-dom` como dependencias de desarrollo.
- Configurar el entorno DOM de Bun mediante `bunfig.toml` y `tests/setup-dom.ts`.
- Añadir pruebas de comportamiento en `tests/staff-auth-forms.test.tsx`.
- Establecer React Hook Form como patrón para futuros formularios interactivos dentro de islas React.
- Permitir la incorporación futura de componentes shadcn únicamente cuando exista una necesidad concreta.

**Fuera de alcance para futuras specs:**

- Migrar componentes que no sean formularios.
- Crear ahora formularios administrativos adicionales.
- Convertir formularios Astro simples en islas React solo para usar React Hook Form.
- Compartir el estado de formularios entre islas React independientes.
- Persistir borradores o valores de formularios entre recargas.
- Instalar Zustand u otro store global.
- Rediseñar las páginas de login o cuenta.
- Cambiar el contrato HTTP, la gestión de tokens o la coordinación de refresh de SPEC 03.
- Añadir componentes shadcn que no sean necesarios para los dos formularios incluidos.
- Introducir pruebas end-to-end en navegador real.

## Modelo de datos

Esta funcionalidad no introduce nuevas estructuras de negocio. Reutiliza `loginRequestSchema`, `changePasswordFormSchema` y `changePasswordRequestSchema` de `src/features/staff-auth/contracts/staff-auth.schemas.ts`.

Los valores de cada formulario se infieren desde sus esquemas Zod y no se mantienen como interfaces TypeScript duplicadas.

`confirmNewPassword` continúa siendo un valor exclusivo del formulario y nunca forma parte del payload enviado a `PATCH /auth/password`.

## Plan de implementación

1. Añadir `@testing-library/react`, `@testing-library/user-event` y `happy-dom` como dependencias de desarrollo en `package.json` y actualizar `bun.lock` con Bun.
2. Crear `bunfig.toml` para cargar un único preload de pruebas sin cambiar el comando existente `bun test`.
3. Crear `tests/setup-dom.ts` para registrar y limpiar el entorno `happy-dom` utilizado por Testing Library.
4. Ajustar los mensajes de `loginRequestSchema` y `changePasswordFormSchema` en `src/features/staff-auth/contracts/staff-auth.schemas.ts` para que cada restricción produzca un error de campo concreto en español, sin modificar los contratos de respuesta ni las reglas de contraseña.
5. Cambiar la API de `LoginForm` para recibir una función asíncrona de envío y dejar la integración con `session.login` en `src/features/staff-auth/StaffLoginApp.tsx`.
6. Migrar `src/features/staff-auth/components/LoginForm.tsx` a `useForm` con `zodResolver(loginRequestSchema)`, registro de controles y estado de envío provisto por React Hook Form.
7. Reemplazar el marcado manual del login por los componentes shadcn ya instalados, asociando cada `FieldError` con su control y manteniendo autocompletado, foco visible y mensajes contractuales del servidor.
8. Cambiar la API de `ChangePasswordForm` para recibir una función asíncrona de envío y mover la conexión con `createStaffApiClient` a `src/features/staff-auth/StaffAccountApp.tsx`.
9. Migrar `src/features/staff-auth/components/ChangePasswordForm.tsx` a `useForm` con `zodResolver(changePasswordFormSchema)` y construir explícitamente el payload sin `confirmNewPassword` antes de delegar el envío.
10. Reemplazar los campos manuales de contraseña por los componentes shadcn ya instalados, conservando las reglas visibles, autocompletado, estados deshabilitados y mensajes contractuales del servidor.
11. Implementar el reinicio selectivo del login para conservar el email y limpiar la contraseña después de toda solicitud enviada, sin borrar valores cuando la validación local impide el envío.
12. Implementar el reinicio de los tres campos de contraseña después de toda solicitud enviada desde cambio de contraseña, sin borrar valores cuando la validación local impide el envío.
13. Crear `tests/staff-auth-forms.test.tsx` con pruebas del login para validación por campo, foco, bloqueo de envío duplicado, payload normalizado, error del servidor, conservación del email y limpieza de contraseña.
14. Completar `tests/staff-auth-forms.test.tsx` con pruebas del cambio de contraseña para reglas individuales, confirmación distinta, foco, payload sin confirmación, error del servidor y limpieza de todos los campos sensibles.
15. Ejecutar `bun test`, `bun run check` y `bun run build`, y comprobar manualmente ambos formularios con teclado en las rutas staff existentes.

## Criterios de aceptación

- [ ] `react-hook-form` y `@hookform/resolvers` aparecen como dependencias directas de `package.json`.
- [ ] `@testing-library/react`, `@testing-library/user-event` y `happy-dom` aparecen únicamente como dependencias de desarrollo.
- [ ] `bunfig.toml` carga `tests/setup-dom.ts` para las pruebas ejecutadas con Bun.
- [ ] `bun test` descubre y ejecuta `tests/staff-auth-forms.test.tsx` sin requerir otro runner.
- [ ] `LoginForm.tsx` y `ChangePasswordForm.tsx` usan `useForm` y `zodResolver`.
- [ ] Ninguno de los dos formularios mantiene cada campo mediante un `useState` independiente.
- [ ] Los tipos de los valores de formulario se derivan de los esquemas Zod existentes.
- [ ] El login utiliza `FieldGroup`, `Field`, `FieldLabel`, `FieldError`, `Input` y `Button` de shadcn.
- [ ] El cambio de contraseña utiliza `FieldGroup`, `Field`, `FieldLabel`, `FieldError`, `Input` y `Button` de shadcn.
- [ ] Un campo inválido establece `aria-invalid` en su control y `data-invalid` en su `Field`.
- [ ] Cada mensaje de validación queda asociado al campo que lo produjo.
- [ ] Enviar el login vacío no llama a la función asíncrona y enfoca el campo de email.
- [ ] Un email inválido muestra un error específico junto al email.
- [ ] Una contraseña ausente muestra un error específico junto a la contraseña.
- [ ] Un email válido se entrega normalizado según `loginRequestSchema`.
- [ ] Mientras el login está pendiente, el botón de envío está deshabilitado y una segunda interacción no genera otra solicitud.
- [ ] Un error de credenciales inválidas muestra el mensaje contractual general y mueve el foco a ese aviso.
- [ ] Un error de red en login muestra el mensaje contractual general y mueve el foco a ese aviso.
- [ ] Después de una solicitud de login, el email permanece visible y la contraseña queda vacía tanto ante éxito como ante error.
- [ ] Una validación local fallida no borra los valores introducidos porque no se envió ninguna solicitud.
- [ ] Un login exitoso conserva la redirección segura definida en SPEC 03.
- [ ] El cambio de contraseña valida por separado contraseña actual, nueva y confirmación.
- [ ] La nueva contraseña exige entre 10 y 128 caracteres, mayúscula, minúscula y número.
- [ ] Una confirmación diferente muestra el error junto a `confirmNewPassword` y enfoca ese campo cuando sea el primer error pendiente.
- [ ] El payload entregado por `ChangePasswordForm` contiene únicamente `currentPassword` y `newPassword`.
- [ ] `confirmNewPassword` nunca llega al cliente HTTP ni se registra fuera del estado efímero del formulario.
- [ ] Mientras el cambio de contraseña está pendiente, el botón está deshabilitado y no se generan envíos duplicados.
- [ ] Un error de contraseña actual muestra el mensaje contractual general y mueve el foco a ese aviso.
- [ ] Después de una solicitud de cambio de contraseña, los tres campos quedan vacíos tanto ante éxito como ante error.
- [ ] Un cambio de contraseña exitoso conserva el logout y la redirección definidos en SPEC 03.
- [ ] Las pruebas interactúan mediante labels, roles y texto visible, no mediante selectores ligados a la implementación.
- [ ] Las pruebas verifican foco, payload, bloqueo de duplicados y limpieza de datos sensibles sin realizar solicitudes reales.
- [ ] No se añade Zustand a `package.json` ni a `bun.lock`.
- [ ] No se instala ningún componente shadcn adicional para esta migración porque los componentes actuales cubren la necesidad.
- [ ] Los formularios Astro que no requieren una isla React permanecen fuera del patrón React Hook Form.
- [ ] `bun test` finaliza sin errores.
- [ ] `bun run check` finaliza sin errores ni cambios pendientes.
- [ ] `bun run build` finaliza sin errores.
- [ ] Login y cambio de contraseña se pueden completar solo con teclado y mantienen foco visible.

## Decisiones

- **Sí:** adoptar React Hook Form como estándar para formularios interactivos dentro de islas React.
- **Sí:** integrar Zod mediante `zodResolver` para no duplicar reglas entre schemas y componentes.
- **Sí:** conservar separados el schema del formulario de cambio de contraseña y el schema de su payload HTTP.
- **Sí:** usar `register` para los controles nativos compatibles con `Input` y reservar `Controller` para futuros componentes controlados que realmente lo necesiten.
- **Sí:** usar los componentes shadcn ya instalados para estructura, controles, errores y acciones de los formularios.
- **No:** crear una abstracción genérica propia de formulario antes de que existan casos diferentes que demuestren su necesidad.
- **Sí:** mostrar errores Zod junto a cada campo.
- **Sí:** reservar el aviso general para errores del servidor o de red.
- **Sí:** enfocar el primer campo inválido y enfocar el aviso general ante fallos remotos.
- **Sí:** conservar únicamente el email después de enviar el login y limpiar todos los valores de contraseña.
- **Sí:** limpiar las tres contraseñas después de cualquier solicitud de cambio enviada.
- **No:** borrar campos cuando la validación local evita que se realice la solicitud.
- **Sí:** desacoplar los formularios de sesión y transporte mediante callbacks asíncronos recibidos por props.
- **Sí:** mantener la sesión, el cliente autenticado y las redirecciones en las aplicaciones que componen cada formulario.
- **Sí:** usar Testing Library y `user-event` para probar comportamiento observable por el usuario.
- **Sí:** usar `happy-dom` como entorno DOM ligero del runner Bun existente.
- **No:** incorporar otro runner de pruebas ni pruebas basadas principalmente en snapshots.
- **No:** instalar Zustand en esta etapa.
- **Sí:** seguir usando TanStack Query para estado remoto, React Context para autenticación y estado local para UI acotada.
- **Sí:** reconsiderar Zustand únicamente ante estado cliente complejo y compartido dentro de una misma aplicación React, como flujos multietapa, borradores o editores.
- **No:** asumir que un store cliente se comparte automáticamente entre islas React independientes de Astro.
- **No:** convertir formularios Astro simples en islas solo para aplicar este patrón.
- **Sí:** permitir componentes shadcn futuros cuando resuelvan una necesidad concreta o reemplacen una implementación manual.
- **No:** instalar componentes shadcn de forma preventiva.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Las transformaciones del schema, como normalizar el email, provocan diferencias entre valores de entrada y salida | Tipar `useForm` de acuerdo con la entrada y salida del resolver y comprobar el payload normalizado en pruebas. |
| Un componente shadcn no transmite correctamente el ref que React Hook Form necesita para enfocar | Verificar el foco real con Testing Library y mantener controles compatibles con refs nativos. |
| Los errores generales y de campo se anuncian simultáneamente | Limpiar el error remoto al iniciar un nuevo envío y reservarlo exclusivamente para fallos de servidor o red. |
| La limpieza de contraseñas se ejecuta antes de construir o enviar el payload | Reiniciar los campos únicamente en la finalización de la promesa y verificar el payload recibido por el callback. |
| `happy-dom` no reproduce exactamente un comportamiento del navegador real | Limitar las pruebas a interacción DOM estándar y completar la aceptación con una comprobación manual por teclado. |
| Una abstracción prematura dificulta integrar futuros controles shadcn complejos | Componer directamente `Field` y `Input` en estos dos formularios y extraer patrones solo cuando exista repetición estable. |
| Zustand se añade por anticipación y duplica responsabilidades existentes | Mantener documentados los límites entre TanStack Query, Context y estado local, y exigir un caso de uso concreto antes de reevaluarlo. |

## Lo que **no** está en esta spec

- Zustand u otro store global.
- Persistencia de formularios o borradores.
- Formularios administrativos nuevos.
- Migración de componentes ajenos a login y cambio de contraseña.
- Conversión automática de formularios Astro en islas React.
- Componentes shadcn adicionales sin una necesidad concreta.
- Una abstracción universal de formularios.
- Cambios en autenticación, cookies, refresh, endpoints o permisos.
- Rediseño visual del panel staff.
- Pruebas end-to-end en navegador real.

Cada formulario futuro aplicará este patrón dentro de su propia spec cuando corresponda.
