# 02 — API de administración (frontend de staff)

> Todas las rutas requieren `Authorization: Bearer <accessToken>`. Los roles por ruta están indicados en cada tabla. Ver convenciones globales en [00-convenciones.md](./00-convenciones.md).

Roles:

| Rol | Alcance |
|-----|---------|
| `admin` | Todo |
| `manager` | Todo excepto usuarios |
| `branch_admin` | Solo su sucursal asignada |

Contenido:

- [Auth interno](#auth-interno)
- [Usuarios](#usuarios)
- [Restaurante](#restaurante)
- [Sucursales](#sucursales)
- [Mesas](#mesas)
- [Catálogo — Categorías](#catálogo--categorías)
- [Catálogo — Platos](#catálogo--platos)
- [Catálogo — Configuración por sucursal](#catálogo--configuración-por-sucursal)

---

## Auth interno

### POST /auth/login

**Request:**
```json
{ "email": "string", "password": "string" }
```

**Response 200:**
```json
{
  "accessToken": "string (JWT, 25 min)",
  "refreshToken": "string (opaco, 30 días)",
  "user": {
    "id": "uuid",
    "fullName": "string",
    "email": "string",
    "phone": "string | null",
    "role": "admin | manager | branch_admin",
    "status": "active | inactive",
    "branchId": "uuid | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

**Errores:** `401 INVALID_CREDENTIALS` (mismo mensaje si el email no existe, contraseña incorrecta o usuario inactivo).

### POST /auth/refresh

Rota el refresh token: **el anterior se invalida**. La reutilización de un token rotado revoca todas las sesiones del usuario. Ver reglas en [00-convenciones.md](./00-convenciones.md).

**Request:** `{ "refreshToken": "string" }`
**Response 200:** mismo formato que login.
**Errores:** `401 INVALID_REFRESH_TOKEN`

### POST /auth/logout

Revoca la sesión del refresh token. Idempotente.

**Request:** `{ "refreshToken": "string" }`
**Response 204:** sin contenido.

### PATCH /auth/password

Requiere `Authorization: Bearer <accessToken>`. **Revoca todas las sesiones, incluida la actual** → tras un 204, el frontend debe forzar logout y re-login.

**Request:**
```json
{ "currentPassword": "string", "newPassword": "string (10-128, mayúscula, minúscula, número)" }
```

**Response 204:** sin contenido.
**Errores:** `401 INVALID_CREDENTIALS` si la contraseña actual es incorrecta.

---

## Usuarios

Solo `admin`. `branchId` es obligatorio para `branch_admin` y prohibido para `admin`/`manager`.

| Método | Ruta | Response |
|--------|------|----------|
| `POST` | `/users` | 201 `User` |
| `GET` | `/users` | 200 `User[]` |
| `GET` | `/users/:userId` | 200 `User` |
| `PATCH` | `/users/:userId` | 200 `User` |
| `PATCH` | `/users/:userId/status` | 200 `User` |
| `PUT` | `/users/:userId/password` | 200 `User` |

`User` = `{ id, fullName, email, phone, role, status, branchId, createdAt, updatedAt }` (sin `passwordHash`). `role` y `status` en minúsculas.

### POST /users

**Request:**
```json
{
  "fullName": "string (1-150)",
  "email": "string (email, único)",
  "phone?": "string",
  "password": "string (10-128, mayúscula, minúscula, número)",
  "role": "admin | manager | branch_admin",
  "branchId?": "uuid (requerido si role=branch_admin, prohibido si admin o manager)"
}
```

**Errores:**
- `409 USER_EMAIL_ALREADY_EXISTS`
- `422 INVALID_ROLE_BRANCH` (rol-sucursal incompatible o sucursal inexistente)

### GET /users

**Query:** `?role=admin|manager|branch_admin&status=active|inactive&branchId=uuid` (todos opcionales, combinables).

**Response 200:** `User[]`. Sin paginación.

### GET /users/:userId

**Errores:** `404 USER_NOT_FOUND`

### PATCH /users/:userId

Todos los campos opcionales (mismo formato que POST). A diferencia de POST, **`branchId` acepta `null` para desasignar la sucursal**.

**Errores:**
- `404 USER_NOT_FOUND`
- `409 USER_EMAIL_ALREADY_EXISTS`
- `422 INVALID_ROLE_BRANCH`
- `422 LAST_ADMIN_REQUIRED` si se degrada al último admin activo

### PATCH /users/:userId/status

**Request:** `{ "status": "active | inactive" }`

- `inactive` → revoca todas sus sesiones (el usuario pierde acceso en el siguiente request).
- No se puede desactivar al último `admin` activo.

**Errores:** `404 USER_NOT_FOUND`, `422 LAST_ADMIN_REQUIRED`

### PUT /users/:userId/password

Restablece la contraseña de otro usuario. Revoca todas sus sesiones.

**Request:** `{ "password": "string (10-128, mayúscula, minúscula, número)" }`

**Errores:** `404 USER_NOT_FOUND`

---

## Restaurante

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants` | `admin` |
| `GET` | `/restaurants/:restaurantId` | Todos |
| `PATCH` | `/restaurants/:restaurantId` | `admin` |

### POST /restaurants

Crea el restaurante (**singleton**: solo puede existir uno).

**Request:**
```json
{
  "name": "string",
  "legalName": "string",
  "taxId": "string (11 dígitos numéricos)",
  "phone?": "string",
  "email?": "string"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "slug": "central",
  "name": "string",
  "legalName": "string",
  "taxId": "string",
  "phone": "string | null",
  "email": "string | null",
  "timezone": "America/Lima",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 RESTAURANT_ALREADY_EXISTS`

### GET /restaurants/:restaurantId

**Response 200:** igual que `POST 201`.
**Errores:** `404 RESTAURANT_NOT_FOUND`

### PATCH /restaurants/:restaurantId

**Request:** todos los campos opcionales (mismo formato que POST).
**Errores:** `404 RESTAURANT_NOT_FOUND`

---

## Sucursales

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/branches` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/branches` | Todos (filtrado) |
| `GET` | `/restaurants/:rid/branches/:bid` | Todos (restringido) |
| `PATCH` | `/restaurants/:rid/branches/:bid` | `admin`, `manager`, `branch_admin`* |
| `PUT` | `/restaurants/:rid/branches/:bid/schedule` | `admin`, `manager`, `branch_admin`* |
| `PATCH` | `/restaurants/:rid/branches/:bid/status` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre su sucursal; otra → `403 FORBIDDEN`.

`Branch` = `{ id, restaurantId, slug, name, code, address, district, province, department, phone, email, status: "active"|"inactive", createdAt, updatedAt, rules: BranchRules | null, intervals: BranchScheduleInterval[] }`. **`status` siempre en minúsculas.**

`BranchRules` = `{ defaultReservationDurationMinutes, minimumAdvanceMinutes, maximumAdvanceDays, arrivalToleranceMinutes, maxPartySize }`.

### POST /restaurants/:restaurantId/branches

**Request:**
```json
{
  "name": "string",
  "code": "string (se normaliza a mayúsculas)",
  "address": "string",
  "district": "string",
  "province": "string",
  "department": "string",
  "phone": "string",
  "email?": "string",
  "rules": {
    "defaultReservationDurationMinutes": "int > 0",
    "minimumAdvanceMinutes": "int > 0",
    "maximumAdvanceDays": "int > 0",
    "arrivalToleranceMinutes": "int > 0",
    "maxPartySize": "int > 0"
  }
}
```

**Constraint:** `minimumAdvanceMinutes < maximumAdvanceDays * 24 * 60`.

**Response 201:** `Branch` con `status: "inactive"` e `intervals: []`.

**Errores:** `404 RESTAURANT_NOT_FOUND`, `409 BRANCH_CODE_ALREADY_EXISTS`

### GET /restaurants/:restaurantId/branches

**Query:** `?status=active|inactive` (opcional).

- `admin` y `manager`: todas las sucursales.
- `branch_admin`: solo su sucursal asignada (filtrado servidor).

**Response 200:** `Branch[]`.

**Errores:** `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/branches/:branchId

**Response 200:** `Branch`.
**Errores:** `404 BRANCH_NOT_FOUND`, `403 FORBIDDEN` (branch_admin sobre otra sucursal)

### PATCH /restaurants/:restaurantId/branches/:branchId

Todos los campos opcionales; `rules` también parcial (solo los campos enviados).

**Errores:** `404 BRANCH_NOT_FOUND`, `409 BRANCH_CODE_ALREADY_EXISTS`, `403 FORBIDDEN`

### PUT /restaurants/:restaurantId/branches/:branchId/schedule

Reemplaza todos los intervalos atómicamente.

**Request:**
```json
{
  "intervals": [
    { "dayOfWeek": "1-7 (1=lunes)", "startTime": "HH:mm", "endTime": "HH:mm" }
  ]
}
```

**Constraints:** `startTime < endTime`, sin solapamientos en un mismo día.

**Response 200:** `Branch`.
**Errores:** `404 BRANCH_NOT_FOUND`, `409 BRANCH_SCHEDULE_CONFLICT`, `403 FORBIDDEN`

### PATCH /restaurants/:restaurantId/branches/:branchId/status

**Request:** `{ "status": "active | inactive" }`

- `active` requiere al menos un intervalo (`422` si no).
- `inactive` siempre se permite.

**Response 200:** `Branch`.
**Errores:** `404 BRANCH_NOT_FOUND`, `422 BRANCH_SCHEDULE_REQUIRED`, `403 FORBIDDEN`

---

## Mesas

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/branches/:bid/tables` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/branches/:bid/tables` | Todos (restringido) |
| `GET` | `/restaurants/:rid/branches/:bid/tables/:tid` | Todos (restringido) |
| `PATCH` | `/restaurants/:rid/branches/:bid/tables/:tid` | `admin`, `manager`, `branch_admin`* |
| `PATCH` | `/restaurants/:rid/branches/:bid/tables/:tid/status` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre mesas de su sucursal asignada; otra sucursal → `403 FORBIDDEN`.

### POST /restaurants/:restaurantId/branches/:branchId/tables

**Request:**
```json
{
  "code": "string (1-30, letras, números, guiones y guiones bajos)",
  "capacity": "int > 0"
}
```

- `code` se recorta y normaliza a mayúsculas.
- La mesa se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "branchId": "uuid",
  "code": "TERRAZA-02",
  "capacity": 4,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 TABLE_CODE_ALREADY_EXISTS`, `404 BRANCH_NOT_FOUND`

### GET /restaurants/:restaurantId/branches/:branchId/tables

**Query:** `?status=active|inactive` (opcional).

- `admin` y `manager`: todas las mesas de la sucursal.
- `branch_admin`: solo las mesas de su sucursal.

**Response 200:** `DiningTable[]`.

### GET /restaurants/:restaurantId/branches/:branchId/tables/:tableId

**Response 200:** `DiningTable`.
**Errores:** `404 TABLE_NOT_FOUND`, `404 BRANCH_NOT_FOUND`, `403 FORBIDDEN`

### PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId

Todos los campos opcionales:
```json
{ "code": "string", "capacity": "int > 0" }
```

- Si se cambia el código, se normaliza y valida unicidad dentro de la sucursal.

**Errores:** `404 TABLE_NOT_FOUND`, `409 TABLE_CODE_ALREADY_EXISTS`, `403 FORBIDDEN`

### PATCH /restaurants/:restaurantId/branches/:branchId/tables/:tableId/status

**Request:** `{ "status": "active | inactive" }`

- Se permite activar mesas incluso si la sucursal está inactiva.

**Errores:** `404 TABLE_NOT_FOUND`, `403 FORBIDDEN`

---

## Catálogo — Categorías

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/menu/categories` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/menu/categories` | Todos |
| `GET` | `/restaurants/:rid/menu/categories/:cid` | Todos |
| `PATCH` | `/restaurants/:rid/menu/categories/:cid` | `admin`, `manager` |
| `PATCH` | `/restaurants/:rid/menu/categories/:cid/status` | `admin`, `manager` |

### POST /restaurants/:restaurantId/menu/categories

```json
{ "name": "Fondos", "position": 2 }
```

- `name`: 1-80 caracteres, único por restaurante (sin distinguir mayúsculas/minúsculas).
- `position`: entero positivo.
- La categoría se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "name": "Fondos",
  "position": 2,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 MENU_CATEGORY_NAME_ALREADY_EXISTS`, `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/menu/categories

**Query:** `?status=active|inactive` (opcional).

**Response 200:** `MenuCategory[]`, ordenado por `position ASC` y `name ASC`.

**Errores:** `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/menu/categories/:categoryId

**Errores:** `404 MENU_CATEGORY_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/categories/:categoryId

```json
{ "name": "Nuevo nombre", "position": 3 }
```

Todos los campos opcionales.

**Errores:** `404 MENU_CATEGORY_NOT_FOUND`, `409 MENU_CATEGORY_NAME_ALREADY_EXISTS`

### PATCH /restaurants/:restaurantId/menu/categories/:categoryId/status

```json
{ "status": "active" }
```

- Desactivar una categoría conserva sus platos y configuraciones por sucursal (los platos dejan de publicarse, pero no se borran).

---

## Catálogo — Platos

| Método | Ruta | Roles |
|--------|------|-------|
| `POST` | `/restaurants/:rid/menu/dishes` | `admin`, `manager` |
| `GET` | `/restaurants/:rid/menu/dishes` | Todos |
| `GET` | `/restaurants/:rid/menu/dishes/:did` | Todos |
| `PATCH` | `/restaurants/:rid/menu/dishes/:did` | `admin`, `manager` |
| `PATCH` | `/restaurants/:rid/menu/dishes/:did/status` | `admin`, `manager` |

### POST /restaurants/:restaurantId/menu/dishes

```json
{
  "name": "Lomo saltado",
  "description": "Lomo de res con papas y arroz",
  "imageUrl": "https://example.com/lomo.jpg",
  "ingredients": ["Lomo de res", "Papa", "Arroz"],
  "allergens": ["Soya"],
  "categoryId": "uuid",
  "position": 1
}
```

- `name`: 1-120 caracteres, único por restaurante.
- `description`: 1-1000 caracteres.
- `imageUrl`: nulo o URL `http/https` de hasta 2048 caracteres.
- `ingredients`: máx. 50 elementos de 1-100 caracteres.
- `allergens`: máx. 30 elementos de 1-100 caracteres.
- Ingredientes y alérgenos se normalizan: recorte, sin vacíos, sin duplicados case-insensitive.
- `categoryId`: UUID de una categoría del mismo restaurante.
- `position`: entero positivo.
- El plato se crea con estado `inactive`.

**Response 201:**
```json
{
  "id": "uuid",
  "restaurantId": "uuid",
  "categoryId": "uuid",
  "categoryName": "Fondos",
  "name": "Lomo saltado",
  "description": "Lomo de res con papas y arroz",
  "imageUrl": "https://example.com/lomo.jpg",
  "ingredients": ["Lomo de res", "Papa", "Arroz"],
  "allergens": ["Soya"],
  "position": 1,
  "status": "inactive",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errores:** `409 DISH_NAME_ALREADY_EXISTS`, `404 MENU_CATEGORY_NOT_FOUND`, `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/menu/dishes

**Query:** `?status=active|inactive` (opcional).

**Response 200:** `DishDto[]`, ordenado por `position ASC` y `name ASC`.

**Errores:** `404 RESTAURANT_NOT_FOUND`

### GET /restaurants/:restaurantId/menu/dishes/:dishId

**Errores:** `404 DISH_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/dishes/:dishId

Todos los campos opcionales. `imageUrl` acepta `null` para eliminar la referencia.

```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "imageUrl": null,
  "ingredients": ["Nuevo ingrediente"],
  "allergens": [],
  "categoryId": "uuid",
  "position": 3
}
```

- Actualizar `ingredients` o `allergens` reemplaza la lista completa.

**Errores:** `404 DISH_NOT_FOUND`, `409 DISH_NAME_ALREADY_EXISTS`, `404 MENU_CATEGORY_NOT_FOUND`

### PATCH /restaurants/:restaurantId/menu/dishes/:dishId/status

```json
{ "status": "active" }
```

- Desactivar un plato conserva sus configuraciones por sucursal.

---

## Catálogo — Configuración por sucursal

| Método | Ruta | Roles |
|--------|------|-------|
| `GET` | `/restaurants/:rid/branches/:bid/dishes` | Todos (restringido) |
| `PUT` | `/restaurants/:rid/branches/:bid/dishes/:did` | `admin`, `manager`, `branch_admin`* |

> \* `branch_admin` solo sobre su sucursal asignada; otra sucursal → `403 FORBIDDEN`.

### GET /restaurants/:restaurantId/branches/:branchId/dishes

Devuelve todos los platos globales con su configuración local o `null`.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "restaurantId": "uuid",
    "categoryId": "uuid",
    "categoryName": "Fondos",
    "name": "Lomo saltado",
    "description": "Lomo de res con papas y arroz",
    "imageUrl": "https://example.com/lomo.jpg",
    "ingredients": ["Lomo de res", "Papa", "Arroz"],
    "allergens": ["Soya"],
    "position": 1,
    "status": "active",
    "branchConfiguration": {
      "price": "35.90",
      "status": "available"
    },
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

- `branchConfiguration` es `null` si el plato aún no tiene precio/estado configurado en la sucursal.

**Errores:** `404 BRANCH_NOT_FOUND`, `403 FORBIDDEN`

### PUT /restaurants/:restaurantId/branches/:branchId/dishes/:dishId

Crea o reemplaza la configuración comercial de un plato en una sucursal. Idempotente.

```json
{
  "price": "35.90",
  "status": "available"
}
```

- `price`: cadena decimal con exactamente dos posiciones (ej. `"35.90"`). Mayor que `0.00` y máximo `99999999.99`.
- `status`: `available`, `sold_out` o `inactive`.

**Response 200:**
```json
{
  "price": "35.90",
  "status": "available"
}
```

- Configurar un plato no requiere que la categoría, el plato o la sucursal estén activos.

**Errores:** `404 BRANCH_NOT_FOUND`, `404 DISH_NOT_FOUND`, `403 FORBIDDEN`
