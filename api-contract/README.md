# API Contract — Reservas de Restaurante

> Documento vivo. Refleja el estado actual del backend. Copiar manualmente al proyecto frontend.

Este contrato está dividido por consumidor para que cada frontend solo copie su parte:

| Documento | Contenido | Consumidor |
|-----------|-----------|------------|
| [00-convenciones.md](./00-convenciones.md) | Errores globales, autenticación interna y de clientes, tokens, casing, fechas/zona horaria, moneda, idempotencia | Todos |
| [01-publico.md](./01-publico.md) | Descubrimiento, menú, disponibilidad, reserva temporal, checkout, customer-auth, estado de pago, webhook + flujo recomendado | App de clientes |
| [02-administracion.md](./02-administracion.md) | Auth interno, usuarios, restaurante, sucursales, mesas, catálogo | App de staff |

## Mapa de endpoints

| Endpoint | Archivo |
|----------|---------|
| `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `PATCH /auth/password` | [02-administracion.md](./02-administracion.md#auth-interno) |
| `/users/**` | [02-administracion.md](./02-administracion.md#usuarios) |
| `/restaurants/**` | [02-administracion.md](./02-administracion.md#restaurante) |
| `/restaurants/:rid/branches/**` | [02-administracion.md](./02-administracion.md#sucursales) |
| `/restaurants/:rid/branches/:bid/tables/**` | [02-administracion.md](./02-administracion.md#mesas) |
| `/restaurants/:rid/menu/categories/**` | [02-administracion.md](./02-administracion.md#catálogo--categorías) |
| `/restaurants/:rid/menu/dishes/**` | [02-administracion.md](./02-administracion.md#catálogo--platos) |
| `/restaurants/:rid/branches/:bid/dishes/**` | [02-administracion.md](./02-administracion.md#catálogo--configuración-por-sucursal) |
| `GET /public/restaurants/:rslug` · `GET .../branches` | [01-publico.md](./01-publico.md) |
| `GET .../branches/:bslug/menu` | [01-publico.md](./01-publico.md#get-publicrestaurantsrestaurantslugbranchesbranchslugmenu) |
| `GET .../reservations/availability` · `POST .../reservations/temporary` | [01-publico.md](./01-publico.md) |
| `POST .../reservations/:id/checkout` · `GET .../reservations/:id/payment` | [01-publico.md](./01-publico.md) |
| `POST /public/restaurants/:rslug/customer-auth/magic-links` · `POST /public/customer-auth/magic-links/exchange` | [01-publico.md](./01-publico.md) |
| `POST /customer-auth/refresh` · `POST /customer-auth/logout` · `GET /customer-auth/me` | [01-publico.md](./01-publico.md) |
| `POST /webhooks/stripe` | [01-publico.md](./01-publico.md#post-webhooksstripe) |
| `GET /` (health) | [01-publico.md](./01-publico.md#get--health) |

## Notas transversales

- **Errores**: cualquier ruta desconocida responde `404 ROUTE_NOT_FOUND` con el mismo formato `{ error: { code, message, details } }`. Ver tabla de códigos en [00-convenciones.md](./00-convenciones.md#códigos-de-error).
- **CORS**: la API solo acepta orígenes listados en `CORS_ORIGINS`. Ver [00-convenciones.md](./00-convenciones.md#cors).
- **Rutas públicas**: `POST /auth/refresh`, `POST /auth/logout`, `POST /customer-auth/refresh`, `POST /customer-auth/logout` y `POST .../magic-links` no requieren `Authorization`. Ver [00-convenciones.md](./00-convenciones.md#base-url).

## Cómo leer este contrato

1. Empieza por [00-convenciones.md](./00-convenciones.md): formato de errores, flujo de tokens internos y de clientes (rotación, single-flight) y convenciones (casing, fechas, moneda).
2. Si es la app de clientes, sigue el [flujo recomendado](./01-publico.md#flujo-recomendado-de-extremo-a-extremo) de [01-publico.md](./01-publico.md).
3. Si es la app de staff, consulta [02-administracion.md](./02-administracion.md) por módulo.
