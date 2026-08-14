# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

El usuario principal es el cliente de un restaurante que, normalmente desde un navegador móvil, necesita elegir una sucursal, consultar el menú, seleccionar platos, encontrar disponibilidad, reservar una mesa y confirmar el pago con la menor fricción posible.

Como usuarios secundarios, el personal administrativo —administradores, managers y administradores de sucursal— mantiene sucursales, horarios, reglas, mesas, categorías, platos y disponibilidad publicada. Los propietarios y responsables del restaurante evalúan el producto como una herramienta operativa y comercial.

## Product Purpose

Centralizar la experiencia de descubrimiento, reserva y seguimiento del cliente junto con la operación necesaria para mantenerla actualizada. El producto debe permitir que un cliente complete el recorrido desde la elección de sucursal hasta la reserva pagada y, posteriormente, consulte su historial y comprobantes.

El proyecto comienza como una entrega académica, pero debe conservar calidad suficiente para evolucionar hacia un producto comercial utilizado por restaurantes reales. La prioridad de producto es la experiencia del cliente; la administración existe para sostener una experiencia pública correcta, disponible y confiable.

## Positioning

La propuesta es una plataforma configurable para restaurantes que conecta en un mismo flujo el menú por sucursal, la selección anticipada de platos, la disponibilidad real de mesas, la reserva temporal, el pago y el acceso posterior del cliente sin contraseña.

El Molino del Pez es el caso piloto con el que se valida la solución. La configuración y el lenguaje del producto deberán poder evolucionar para atender otros restaurantes sin asumir que la identidad, reglas o catálogo del piloto son universales.

## Operating Context

La experiencia pública sigue este recorrido: elegir una sucursal, consultar su menú, gestionar un carrito, seleccionar fecha, cantidad de personas y horario, registrar datos del cliente, revisar la reserva temporal, pagar mediante Stripe y consultar el resultado. La reserva temporal expira después de 15 minutos.

Después de un pago confirmado, el cliente puede acceder mediante un magic link, consultar sus reservas confirmadas y solicitar enlaces temporales para descargar comprobantes PDF disponibles.

El personal utiliza un panel protegido para gestionar sucursales, horarios, reglas, mesas, categorías, platos y la disponibilidad del menú por sucursal. Los permisos distinguen los roles `admin`, `manager` y `branch_admin`.

La implementación piloto opera en español, utiliza soles peruanos (`PEN`) y la zona horaria `America/Lima`. El frontend consume un backend mediante contratos documentados y separa las sesiones de clientes de las sesiones administrativas.

## Capabilities and Constraints

- Aplicación web construida con Astro, React, TypeScript, Tailwind CSS y componentes shadcn.
- Descubrimiento público de restaurante y sucursales mediante slugs.
- Menú por sucursal, categorías, platos, carrito persistente y reconciliación de disponibilidad.
- Flujo de disponibilidad, reserva temporal, pago y confirmación asíncrona mediante Stripe.
- Acceso de clientes sin contraseña mediante magic links, historial de reservas y comprobantes PDF temporales.
- Panel administrativo para sucursales, horarios, reglas, mesas y catálogo.
- Los estados y errores se interpretan por códigos contractuales, no por mensajes variables.
- Los importes llegan como cadenas decimales y no deben calcularse con punto flotante.
- Las fechas de negocio se interpretan en `America/Lima`; los instantes remotos conservan ISO 8601.
- Las credenciales, tokens, enlaces firmados y datos personales no deben exponerse en rutas, almacenamiento, registros ni mensajes de error.
- La implementación actual está orientada al caso piloto. La arquitectura comercial multi-restaurante y el modelo de configuración definitivo permanecen como decisiones futuras; no deben inventarse durante mejoras de interfaz.

## Brand Commitments

El caso piloto usa el nombre **El Molino del Pez**, el lema **“Sabor que viene del mar”** y el logotipo disponible en `public/logo.png`. Estas referencias deben preservarse mientras se trabaje sobre el piloto, pero no deben convertirse en supuestos fijos de la futura plataforma configurable.

La interfaz y los mensajes orientados al usuario se presentan en español. El tono debe ser claro, cercano y confiable, sin fabricar promesas comerciales, premios, testimonios ni características no implementadas.

## Evidence on Hand

- Identidad del piloto: `src/config/restaurant-brand.ts` y `public/logo.png`.
- Requerimientos y casos de uso: `idat-casos-de-uso.md`.
- Casos de prueba académicos: `idat-casos-de-prueba.md`.
- Contratos vigentes del backend: `api-contract/`.
- Especificaciones y decisiones de implementación: `specs/`.
- Se conversó con cuatro restaurantes y dos manifestaron interés en comprar el software. Este dato representa validación inicial de interés, no ventas, contratos, testimonios ni validación estadística.
- No hay evidencia confirmada de clientes activos, despliegues comerciales, métricas de conversión, acuerdos de compra o testimonios publicables; el producto no debe presentarlos como existentes.

## Product Principles

1. **El recorrido del cliente es la prioridad:** reducir incertidumbre y fricción desde la sucursal hasta la confirmación y el seguimiento de la reserva.
2. **La operación sostiene la promesa pública:** menú, horarios, mesas y disponibilidad deben reflejar datos administrables y estados reales.
3. **La confianza no se negocia:** pagos, expiraciones, sesiones, datos personales y errores deben comunicarse con precisión y tratarse de forma segura.
4. **Validar con el piloto, diseñar para configurar:** preservar la verdad de El Molino del Pez sin acoplar la futura plataforma a una sola marca o restaurante.
5. **Rigor académico con criterio de producto real:** documentación, contratos, pruebas y accesibilidad deben facilitar una evolución comercial, no limitarse a una demostración visual.

## Accessibility & Inclusion

La meta es accesibilidad general, sin compromiso formal actual con un nivel específico de WCAG. La interfaz debe mantener navegación por teclado, foco visible, estructura semántica, etiquetas comprensibles, estados que no dependan solo del color, mensajes de error accionables, soporte para reducción de movimiento y adaptación móvil sin desplazamiento horizontal evitable.
