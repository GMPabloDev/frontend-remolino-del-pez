# Frontend BFF API contract

## Staff authentication

### POST /api/staff-auth/login

Validates the same-origin `Origin` header and forwards credentials to
`POST /auth/login`. The refresh token is stored server-side in an
`HttpOnly` cookie and is never returned to the browser.

**Request:**

```json
{ "email": "string", "password": "string" }
```

**Response 200:**

```json
{ "accessToken": "string", "user": "StaffUser" }
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`,
`403 FORBIDDEN`, `502 INVALID_API_RESPONSE`, `503 NETWORK_ERROR`.

### POST /api/staff-auth/refresh

Rotates the refresh token from the `staff_refresh_token` `HttpOnly` cookie.
The previous token becomes invalid immediately.

**Request:** No body. Requires the `staff_refresh_token` cookie.

**Response 200:**

```json
{ "accessToken": "string", "user": "StaffUser" }
```

**Errors:** `401 INVALID_REFRESH_TOKEN`, `403 FORBIDDEN`,
`502 INVALID_API_RESPONSE`, `503 NETWORK_ERROR`.

### POST /api/staff-auth/logout

Attempts to revoke the refresh token and always clears the local cookie,
including when the backend is unavailable.

**Request:** No body. Requires a valid same-origin `Origin`.

**Response 204:** No content.

**Errors:** `403 FORBIDDEN`.
