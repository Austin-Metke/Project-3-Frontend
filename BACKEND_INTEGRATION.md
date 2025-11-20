# Backend integration checklist for Frontend (Project-3-Frontend)

This document lists the backend changes/endpoints and behaviors the frontend currently expects so the app works end-to-end as implemented in the `connectingFrontEndtoBack` branch.

Share this with your backend team. It includes endpoint contracts, example payloads/responses, CORS/security notes, DB seed SQL, and quick troubleshooting steps.

---

## High-level expectations

- Frontend base URL (dev): http://localhost:5173 (Vite). Frontend calls the backend at http://localhost:8080 in dev (proxy or direct). The frontend accepts either a token-based or user-object-only auth response.
- For cookie-based sessions the frontend sends credentials (axios withCredentials). For token-based auth the frontend stores `authToken` in localStorage.
- Frontend tolerates many JSON wrapper shapes (e.g. { data: [...] }, HAL `_embedded`, plain arrays) but the most convenient shapes are shown below.

---

## Required endpoints (must implement)

1) POST /auth/login
   - Purpose: authenticate user
   - Request (JSON): { "name": "alice", "passwordHash": "..." }
   - Response (one of):
     - Preferred (simple): 200 OK with user object
       {
         "id": 12,
         "name": "alice",
         "email": "alice@example.com"
       }
     - Or: wrapped + token
       {
         "user": { ... },
         "token": "<jwt>"
       }
   - Notes: frontend accepts either a top-level user object or a wrapper containing `user` and `token`.

2) POST /auth/register
   - Purpose: create a new user
   - Request: { "name": "bob", "email": "bob@example.com", "passwordHash": "..." }
   - Response: 201 Created with created user object (or wrapper with token).

3) GET /auth
   - Purpose: unauthenticated probe used by the BackendStatusBanner. Returning a HAL-style user list is fine (frontend tolerates HAL). Example:
     {
       "_embedded": { "userList": [ { "id":1, "name":"Alberto", ... } ] },
       "_links": { ... }
     }

4) GET /auth/{id}  and GET /auth/me or GET /user/profile
   - Purpose: fetch profile for the current or specified user
   - Response: user object or wrapper { data: user } is acceptable.

5) Activities (power /log-activity and optionally challenges)
   - GET /activities
     - Purpose: list activity types shown on `/log-activity`
     - Response: JSON array of activity types
       [
         { "id": 1, "name": "Ride Bike", "points": 50, "co2gSaved": "123.45" },
         { "id": 2, "name": "Take Transit", "points": 30, "co2gSaved": "45.20" }
       ]
   - POST /activities
     - Purpose: create activity type (dev/admin). Frontend includes a dev-only form to POST to this endpoint.
     - Request: { "name": "Ride Bike", "points": 50, "co2gSaved": "123.45" }
     - Response: 201 Created with created item.

6) Activity logging
   - POST /activity-logs
     - Purpose: record a user claim of an activity
     - Request: { "activityTypeId": 1, "description": "optional text" }
     - Response: created activity log object (frontend does not require a particular shape but will use id, points, createdAt when present)
   - GET /activity-logs and GET /activity-logs/user/{id}
     - Purpose: return activity logs (used to build dashboard stats if /user/stats is missing)

7) Optional but recommended
   - GET /user/stats
     - Purpose: return aggregated stats for the current user (totalPoints, weeklyPoints, monthlyPoints, weeklyProgress, recentActivities, rank). If missing the frontend will synthesize simple stats from activity logs.

8) Challenges (optional)
   - The frontend currently expects `/challenges` but your backend returned 404 during probes. If you want the `Challenges` page to work, either:
     - Implement GET /challenges returning an array of challenge objects, or
     - Reuse activity types as lightweight challenges and document the mapping.

9) Admin delete user (NOT present)
   - The backend we probed did not expose public DELETE endpoints for users. If you need automated test-account cleanup consider adding a protected admin endpoint or provide DB access to run cleanup scripts.

---

## CORS and cookie/session notes (important)

The frontend may run on a different origin (e.g. http://localhost:5173) than the backend (http://localhost:8080). To allow browser requests you must either:

Option A — Use Vite proxy (frontend-side)
- Configure the frontend dev server to proxy `/api` to the backend so requests are same-origin. No backend CORS changes required.

Option B — Configure backend CORS (recommended when calling backend directly)
- For Spring Boot, either global WebMvcConfigurer or CorsConfigurationSource are fine.

Example (WebMvcConfigurer):

```java
@Configuration
public class WebConfig {
  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
          .allowedOriginPatterns("http://localhost:*") // allows any localhost port (Spring 5.3+)
          .allowedMethods("GET","POST","PUT","DELETE","OPTIONS")
          .allowedHeaders("*")
          .allowCredentials(true);
      }
    };
  }
}
```

If using Spring Security make sure to enable CORS in your security config and provide a CorsConfigurationSource:

```java
@Bean
CorsConfigurationSource corsConfigurationSource() {
  CorsConfiguration config = new CorsConfiguration();
  config.setAllowedOriginPatterns(List.of("http://localhost:*"));
  config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
  config.setAllowedHeaders(List.of("*"));
  config.setAllowCredentials(true);
  UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/**", config);
  return source;
}
```

Notes:
- Do NOT use `allowedOrigins("*")` together with credentials (cookies); browsers will reject that. Use `allowedOriginPatterns` or explicit origins when `allowCredentials(true)`.
- Ensure the server responds to OPTIONS preflight requests and returns appropriate headers.

## Cookie vs Token

- If you use HTTP-only cookies for sessions: enable `allowCredentials(true)` on the server and the frontend must send requests with credentials.
  - Frontend axios example (already supported in `src/services/api.ts` if you enable):
    ```ts
    axios.create({ baseURL: API_BASE_URL, withCredentials: true })
    ```
- If you return a token (JWT), frontend saves it to localStorage under `authToken` (apiService checks for that) and sends `Authorization: Bearer <token>` automatically.
- The current frontend tolerates both models: it stores `user` in localStorage when a user object is returned and will accept `token` if provided.

## DB schema & seed examples (Postgres)

Example `activities` table minimal schema and seed SQL:

```sql
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  co2g_saved NUMERIC(12,2)
);

INSERT INTO activities (name, points, co2g_saved) VALUES
('Ride Bike', 50, 123.45),
('Take Transit', 30, 45.20);
```

Example `activity_logs` table:

```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  activity_type_id INTEGER REFERENCES activities(id),
  description TEXT,
  points INTEGER,
  created_at TIMESTAMP DEFAULT now()
);
```

When POST /activity-logs is called, the server should create a row linking the user -> activity_type and record points (either copy points from activity type or compute on server).

## Quick curl commands to test endpoints (dev)

- List activities:
  curl -sS http://localhost:8080/activities | jq .

- Create activity:
  curl -sS -X POST http://localhost:8080/activities \
    -H 'Content-Type: application/json' \
    -d '{"name":"Ride Bike","points":50,"co2gSaved":"123.45"}' | jq .

- Claim activity (log):
  curl -sS -X POST http://localhost:8080/activity-logs \
    -H 'Content-Type: application/json' \
    -d '{"activityTypeId":1,"description":"Claimed via UI"}' | jq .

- Login (example):
  curl -sS -X POST http://localhost:8080/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"name":"alice","passwordHash":"..."}' | jq .

## Troubleshooting checklist

- 404 static resource errors (observed while probing) can mean the controller mapping isn't registered or static resource handling is taking precedence. Ensure your controller `@RequestMapping` paths do not overlap with static resource paths and that component scanning registers your controllers.
- If the frontend sees CORS errors in the browser console, verify preflight OPTIONS responses include Access-Control-Allow-Origin and Access-Control-Allow-Credentials headers.
- If sessions are used but requests appear unauthenticated, ensure the frontend sets `withCredentials: true` and the backend sets `Access-Control-Allow-Credentials: true` and a specific allowed origin.
- If multiple localhost ports are used during dev, consider `allowedOriginPatterns("http://localhost:*")` in Spring rather than maintaining a long explicit list.

## Recommendations & next steps

- Implement GET /challenges (if you want a dedicated challenges API) or document that the frontend treats `/activities` as the source-of-truth for lightweight challenge-like items.
- Provide (or enable) an admin endpoint or seed script to populate activities in non-dev environments.
- If you want to support OAuth flows (GitHub callback), ensure endpoints under `/auth/oauth/{provider}` exist and return the same auth shape the frontend expects.

---

If you want I can also:
- Prepare a minimal Spring Boot PR that adds the CORS configuration and example controllers for `activities` and `activity-logs` (skeleton only), or
- Generate a short email-ready version of this document (plain text) you can paste into a ticket for your backend team.

Paste here which option you prefer.
