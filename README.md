# Work Item Tracker

Lean full-stack take-home: ASP.NET Core 8 API + Angular 22 UI for creating, listing, filtering, and advancing work items through `Todo → InProgress → Done`.

```
Backend/     ASP.NET Core API, EF Core, SQLite, xUnit tests
Frontend/    Angular standalone app (proxies /api → the API)
```

---

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (ASP.NET Core 8 runtime included with the SDK)
- [Node.js](https://nodejs.org/) 20+ (22/24 also fine) and npm
- A modern browser for the UI

All commands below are run from the **repository root** unless noted.

---

## Run the API

> From the **repository root**. Stop any existing process on port `5209` first if the port is busy.

```bash
dotnet run --project Backend/src/WorkItemTracker.Api --launch-profile http
```

- URL: `http://localhost:5209`
- Swagger UI (Development): `http://localhost:5209/swagger`
- SQLite file is created at `Backend/src/WorkItemTracker.Api/workitems.db` (content root)
- EF migrations are applied automatically on startup in **Development**

---

## Run Angular

In a second terminal (from the repository root). Stop any existing process on port `4200` first if the port is busy.

```bash
cd Frontend
npm install
npm start
```

- URL: `http://localhost:4200`
- `proxy.conf.json` forwards `/api` → `http://localhost:5209`

---

## Run all tests

### Backend

```bash
dotnet test Backend/WorkItemTracker.sln
```

### Frontend

```bash
cd Frontend
npm install
npx ng test --watch=false
```

### Frontend production build

```bash
cd Frontend
npm run build
```

### Backend build only

```bash
dotnet build Backend/WorkItemTracker.sln
```

---

## API summary

Base path: `/api/work-items`  
Enums serialize as strings: `"Todo" | "InProgress" | "Done"`.

### POST `/api/work-items`

Creates an item in `Todo`. Clients cannot set status.

**Request**

```http
POST /api/work-items
Content-Type: application/json

{
  "title": "  Ship README  ",
  "description": "Finalize submission"
}
```

**Response `201 Created`**

```http
Location: /api/work-items/1
```

```json
{
  "id": 1,
  "title": "Ship README",
  "description": "Finalize submission",
  "status": "Todo",
  "createdAt": "2026-09-20T12:00:00.0000000Z"
}
```

**Response `400` (ProblemDetails)** — empty/whitespace title, title longer than 120, malformed body:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Title is required and cannot be empty or whitespace.",
  "instance": "/api/work-items"
}
```

Model-validation failures may instead return `ValidationProblemDetails` with an `errors` object (still `application/problem+json`, status 400).

### GET `/api/work-items`

Query: `search`, `status`, `page` (default `1`), `pageSize` (default `10`, max `100`).

```http
GET /api/work-items?search=readme&status=Todo&page=1&pageSize=10
```

**Response `200`**

```json
{
  "items": [
    {
      "id": 1,
      "title": "Ship README",
      "description": "Finalize submission",
      "status": "Todo",
      "createdAt": "2026-09-20T12:00:00.0000000Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalCount": 1,
  "totalPages": 1
}
```

**Response `400`** — `page < 1` or `pageSize` outside 1–100.

### PATCH `/api/work-items/{id}/status`

Allowed transitions only: `Todo → InProgress → Done`.

```http
PATCH /api/work-items/1/status
Content-Type: application/json

{ "status": "InProgress" }
```

**Response `200`** — updated item.

**Response `404`**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "Not Found",
  "status": 404,
  "detail": "Work item with id '999' was not found.",
  "instance": "/api/work-items/999/status"
}
```

**Response `409`** — invalid transition (same status, skip, or backwards), including PATCH to the current status:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10",
  "title": "Conflict",
  "status": 409,
  "detail": "Cannot transition work item status from 'InProgress' to 'Todo'.",
  "instance": "/api/work-items/1/status"
}
```

**Response `400`** — unknown status string/number (e.g. `"abc"`, `99`), missing body, malformed JSON.

---

## Assumptions

Derived from the implemented code:

| Topic | Behavior |
| --- | --- |
| **Id** | `int` surrogate key, DB-generated; clients never supply it |
| **Sort** | `CreatedAt` descending, then `Id` descending |
| **Pagination** | Default `page=1`, `pageSize=10`; max `pageSize=100`; empty list → `totalPages=0` |
| **Search** | Optional; case-insensitive **contains** on **title** only (trimmed) |
| **Status filter** | Optional exact match; omit / UI “All” means no status filter |
| **Title** | Required; trimmed; max 120 after trim; whitespace-only rejected |
| **Description** | Optional; trimmed; whitespace-only stored as `null` |
| **Create status** | Always `Todo`; not accepted from the client |
| **Same-status PATCH** | Returns **409** (not 200 / no-op) |
| **Edit / delete** | Not implemented (no endpoints) |
| **Timestamps** | `CreatedAt` is UTC (`DateTime.UtcNow` at create) |
| **Migrations** | `Database.MigrateAsync()` on startup in **Development** only |
| **SQLite path** | `ConnectionStrings:Default` = `Data Source=workitems.db` → file under the API content root (`Backend/src/WorkItemTracker.Api/`) |
| **CORS** | Allows `http://localhost:4200` |
| **Enums in JSON** | Strings only (`allowIntegerValues: false`) |

---

## Design decisions

### Transition rule on the domain entity

`WorkItem.ChangeStatus` owns the allowed graph and throws `InvalidStatusTransitionException`. Keeping the rule on the entity prevents controllers/services from drifting into inconsistent checks and makes the rule easy to unit-test without HTTP or EF.

### `switchMap` for stale-response protection

The Angular list is driven by one stream of `(search, status, page, refresh)`. `switchMap` cancels the previous in-flight HTTP call when a newer query arrives, so a slow older response cannot overwrite a newer UI state.

### Real SQLite in API tests (not EF InMemory)

InMemory does not behave like a relational store (constraints, SQL translation, persistence). Tests use a unique temp `.db` per fixture/class, including a restart/persistence test on the same file, which matches production SQLite usage.

### PATCH concurrency (current approach)

Each PATCH loads the entity, applies `ChangeStatus`, and saves. There is **no** concurrency token (`RowVersion` / ETag). Under concurrent requests:

- Each request sees whatever is committed when it reads.
- Invalid transitions still fail with 409 based on that fresh read.
- Valid concurrent updates are last-write-wins; two overlapping valid transitions are not detected as conflicts beyond the domain rule.

This is honest and adequate for the take-home scope; a concurrency token would be the next hardening step.

---

## What I would do next

- Optimistic concurrency (`RowVersion` + `DbUpdateConcurrencyException` → 409)
- Authentication / authorization
- Docker Compose (API + optionally SQL Server) and a non-Development migration story
- CI pipeline (`dotnet test` + `ng test` / `ng build` on PR)
- Playwright/Cypress e2e covering create → filter → advance → 409
- Swap SQLite for SQL Server in deployed environments while keeping SQLite for local/dev if desired

---

## Known limitations / unfinished work

- No update-title/description or delete APIs/UI
- No auth, rate limiting, or HTTPS-only deployment setup
- No Docker/CI config in the repo
- No browser e2e suite (unit/integration only)
- Frontend folder is `Frontend/` (not `/client`); test runner is the Angular 22 default (**Vitest**), not Karma/ChromeHeadless
- Migrations auto-apply only in Development; other environments need an explicit migrate step
- List “advancing” state uses an in-memory `Set` (fine under Zone.js; not a signal-driven UI)
- No dedicated GET-by-id endpoint (create `Location` still points at `/api/work-items/{id}`)

---

## License

Take-home assessment sample; no license file included.
