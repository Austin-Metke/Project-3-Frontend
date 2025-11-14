## Backend — current connectivity status (what can be connected now)

This document summarizes which backend features are implemented in this repository right now, exactly how the frontend can connect to them immediately (without changing backend code), and which items are still missing for the full frontend contract (tokens, OAuth, response wrappers, etc.).

Use this file to share with frontend developers or to paste into an issue when coordinating next steps.

## Quick summary

- CORS: configured for local frontend development. Origins allowed: `http://localhost:3000`, `http://localhost:5173`. Credentials allowed.
- Auth endpoints exist under the `/auth` path (register, login, CRUD). Current login/register use a `passwordHash` field and the controller encodes the password server-side on register.
- The backend does NOT currently issue JWTs or return an authentication token from `/auth/login` or `/auth/register`.
- OAuth server-side exchange endpoints (e.g., `POST /auth/oauth/github`) are not implemented.
- Activity logging and leaderboard-related controllers are implemented (e.g., `/activity-logs`).

## Base URL / local run

- By default the app runs on port 8080. If running locally with Gradle (Spring Boot):

```bash
./gradlew bootRun
```

- The frontend repo expects `VITE_API_BASE_URL` to point to the backend. Example local value:

```
http://localhost:8080
```

## CORS

Current `CorsConfig` (already present) allows:

- Origins: `http://localhost:3000`, `http://localhost:5173`
- Methods: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
- Headers: all (`allowedHeaders("*")`)
- Credentials: allowed (`allowCredentials(true)`)

This is sufficient for running the frontend locally without CORS errors.

## Authentication (current behavior — IMPORTANT)

The project currently supports register and login under `/auth`, but it uses a simple controller that:

- Expects `passwordHash` in the request body for register/login requests (frontend must send a field named `passwordHash`);
- On register (`POST /auth/register`) the controller encodes the provided `passwordHash` using the project's `PasswordEncoder` and saves the user.
- On login (`POST /auth/login`) the controller finds a user by `name` (username) and compares the provided `passwordHash` (plaintext) with the stored `passwordHash` via `passwordEncoder.matches(...)`. If valid, the controller returns the user object.

Crucial implications for the frontend (if you want to connect immediately without backend changes):

- For register: send JSON with fields exactly matching the `User` entity: `name`, `email`, `passwordHash`.
- For login: send JSON with `name` and `passwordHash` (plaintext). The controller authenticates by `name`, not by `email`.
- No token is returned. The backend currently returns the `User` object on login/register (no `{ success, data }` wrapper and no `token`).

Example request/response (working with current code):

# Register

Request

```json
POST /auth/register
Content-Type: application/json

{
  "name": "alice",
  "email": "alice@example.com",
  "passwordHash": "Password123!"
}
```

Successful response (HTTP 201)

```json
{ "id": 10, "name": "alice", "email": "alice@example.com", "googleID": null }
```

# Login

Request

```json
POST /auth/login
Content-Type: application/json

{ "name": "alice", "passwordHash": "Password123!" }
```

Successful response (HTTP 200)

```json
{ "id": 10, "name": "alice", "email": "alice@example.com", "googleID": null }
```

Failure response (HTTP 401):

```json
{ "message": "Invalid username or password" }
```

Notes:

- The JSON above reflects what the current controllers return. If the frontend requires a token (recommended), the backend must be changed to issue one.
- If you prefer to keep the frontend unchanged (sending `password` instead of `passwordHash`), the backend must be updated to accept `password` and then hash it server-side. Currently the controller specifically checks `getPasswordHash()` and expects that field name.

## Endpoints currently available (high level)

These are the controllers and the routes implemented in the codebase as of now.

- UserController — `/auth`
  - GET `/auth` — list users
  - GET `/auth/{id}` — get user by id
  - POST `/auth/register` — register a new user (expects `passwordHash` field; returns created user)
  - POST `/auth/login` — login by name and passwordHash (returns user on success)
  - PUT `/auth/update/{id}` — update or create user
  - DELETE `/auth/delete/{id}` — delete user

- TypeLogsController — `/activity-logs`
  - GET `/activity-logs` — list logs
  - GET `/activity-logs/{id}` — get log by id
  - GET `/activity-logs/user/{userId}` — logs for a user
  - GET `/activity-logs/activity/{activityTypeId}` — logs for an activity type
  - POST `/activity-logs` — create an activity log
    - Required JSON body (from tests): `{ "userId": <int>, "activityTypeId": <int>, "occurredAt": "<ISO-8601>" }`
  - DELETE `/activity-logs/{id}` — delete log

- Leaderboard and activity type related services/controllers exist (look in `LeaderboardController`, `TypeActivityController`, `TypeLogsServiceImpl`, etc.) — these provide endpoints for activity types and leaderboards. The controllers return domain entities (TypeActivity, TypeLogs, etc.).

## Exact request shapes the frontend must send now (to connect immediately)

- Register: POST `/auth/register`
  - Body: { name: string, email: string, passwordHash: string }

- Login: POST `/auth/login`
  - Body: { name: string, passwordHash: string }

- Create activity log: POST `/activity-logs`
  - Body: { userId: number, activityTypeId: number, occurredAt?: string (ISO 8601) }

These shapes are taken from the controllers and tests present in the repo and will work without modifying the backend code.

## What is missing (items the frontend expects but are not implemented)

1. Token-based authentication (JWT):
   - The frontend expects to receive a JWT (or other token) on login/register and then send `Authorization: Bearer <token>` on subsequent requests. The backend currently does not issue tokens. There are test property keys for `jwt.secret` and TTL in `src/test/resources/application.properties`, but no token generation/validation code is wired into the controllers/security yet.

2. Login by email and `password` field:
   - Frontend typical expectation: login with `{ email, password }`. Current backend: login by `name` and expects `passwordHash` field. Aligning these will avoid frontend changes.

3. OAuth server exchange endpoints:
   - Frontend uses PKCE for GitHub and expects a server endpoint such as `POST /auth/oauth/github` to exchange the authorization code. This is not present.

4. Consistent response wrapper:
   - Frontend prefers responses wrapped like `{ success: true, data: ... }` (and errors with `{ success: false, error: {...} }`). Current controllers return raw entities or maps with `message` errors.

5. Token validation for protected endpoints:
   - Even if tokens are issued, the security filter needs to validate them and protect endpoints by returning 401 when missing. Currently the `SecurityConfig` permits all requests.

## Recommendations (to connect now vs. future)

- To connect immediately (no backend edits):
  - Update the frontend's API calls to use the existing shapes: use `POST /auth/login` with `{ name, passwordHash }` and `POST /auth/register` with `{ name, email, passwordHash }`.
  - Use `VITE_API_BASE_URL=http://localhost:8080` during local dev and call the endpoints above.

- To avoid changing frontend client behavior long-term (recommended backend changes):
  - Modify backend to accept `{ email, password }` for login/register and return `{ success: true, data: { user, token } }` with a JWT. Implement token issuance and add a filter to validate tokens on protected endpoints.
  - Implement `POST /auth/oauth/github` server-side exchange.

If you want me to implement any of the recommended backend changes (JWT issuance, email login, OAuth endpoint), I can do a focused PR. You said you don't want to add anything now, so to stay consistent I will not modify code unless you ask.

## Quick example curl commands that work with current code (replace <BASE>)

Register:

```bash
curl -X POST <BASE>/auth/register -H "Content-Type: application/json" -d '{"name":"alice","email":"alice@example.com","passwordHash":"Password123!"}'
```

Login:

```bash
curl -X POST <BASE>/auth/login -H "Content-Type: application/json" -d '{"name":"alice","passwordHash":"Password123!"}'
```

Create activity log:

```bash
curl -X POST <BASE>/activity-logs -H "Content-Type: application/json" -d '{"userId":2,"activityTypeId":2,"occurredAt":"2025-01-01T00:00:00Z"}'
```

## Where to find relevant code

- CORS: `src/main/java/project3/com/example/rest_service/CorsConfig.java`
- Security config (password encoder, currently permissive): `src/main/java/project3/com/example/rest_service/SecurityConfig.java`
- User controller (register/login): `src/main/java/project3/com/example/rest_service/UserController.java`
- User entity: `src/main/java/project3/com/example/rest_service/entities/User.java`
- Activity logs controller: `src/main/java/project3/com/example/rest_service/TypeLogsController.java`

## Final notes

You can connect the frontend now to the backend endpoints described above by adapting the frontend requests to use `name` and `passwordHash` for auth, and by setting `VITE_API_BASE_URL` to the backend URL (for local dev: `http://localhost:8080`).

If you'd like, I can also:

- Draft a short one-paragraph email or GitHub issue to the backend team requesting the minimal changes to support the frontend's token flow (JWT + email/password) so you can pass that along; or
- Generate a Postman collection / OpenAPI skeleton documenting the current (exact) endpoints and payloads so the frontend can import them and begin testing.

Tell me which of the two extras you want, if any. Otherwise this README captures what is implemented and what the frontend must send to connect now.
