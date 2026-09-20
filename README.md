# Work Item Tracker

ASP.NET Core 8 API and Angular 22 UI for work items that move `Todo → InProgress → Done`.

```
Backend/   API, EF Core, SQLite, xUnit
Frontend/  Angular app (proxies /api to the API)
```

Commands below assume the **repository root**.

## Prerequisites

- .NET 8 SDK
- Node.js 20+ and npm

## Run the API

Stop anything already using port 5209.

```bash
dotnet run --project Backend/src/WorkItemTracker.Api --launch-profile http
```

- `http://localhost:5209`
- Swagger (Development): `http://localhost:5209/swagger`
- SQLite file: `Backend/src/WorkItemTracker.Api/workitems.db`
- Migrations run on startup in Development

## Run Angular

Stop anything already using port 4200.

```bash
cd Frontend
npm install
npm start
```

- `http://localhost:4200`
- `/api` is proxied to `http://localhost:5209`

## Tests

```bash
dotnet build Backend/WorkItemTracker.sln
dotnet test Backend/WorkItemTracker.sln
```

```bash
cd Frontend
npm install
npm run build
npx ng test --watch=false
```

## API summary

Base: `/api/work-items`. Status values are strings: `Todo`, `InProgress`, `Done`.

### POST `/api/work-items`

Creates an item in `Todo`. Status cannot be set by the client.

```http
POST /api/work-items
Content-Type: application/json

{ "title": "  Ship README  ", "description": "Finalize submission" }
```

`201` + `Location: /api/work-items/{id}`:

```json
{
  "id": 1,
  "title": "Ship README",
  "description": "Finalize submission",
  "status": "Todo",
  "createdAt": "2026-09-20T12:00:00.0000000Z"
}
```

`400` ProblemDetails (empty title, title > 120, bad body), example:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Title is required and cannot be empty or whitespace.",
  "instance": "/api/work-items"
}
```

Model binding failures may return `ValidationProblemDetails` with an `errors` map (still 400 / problem+json).

### GET `/api/work-items/{id}`

Returns a single item. `404` ProblemDetails if missing.

```http
GET /api/work-items/1
```

### GET `/api/work-items`

Query: `search`, `status`, `page` (default 1), `pageSize` (default 10, max 100).

```http
GET /api/work-items?search=readme&status=Todo&page=1&pageSize=10
```

```json
{
  "items": [ { "id": 1, "title": "Ship README", "description": "Finalize submission", "status": "Todo", "createdAt": "2026-09-20T12:00:00.0000000Z" } ],
  "page": 1,
  "pageSize": 10,
  "totalCount": 1,
  "totalPages": 1
}
```

`400` if `page < 1` or `pageSize` not in 1–100.

### PATCH `/api/work-items/{id}/status`

Allowed: `Todo → InProgress → Done` only.

```http
PATCH /api/work-items/1/status
Content-Type: application/json

{ "status": "InProgress" }
```

`200` returns the updated item.

`404`:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "Not Found",
  "status": 404,
  "detail": "Work item with id '999' was not found.",
  "instance": "/api/work-items/999/status"
}
```

`409` for invalid transitions (same status, skip, or backwards), or when another request already changed the status (conditional update matched no row):

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10",
  "title": "Conflict",
  "status": 409,
  "detail": "Cannot transition work item status from 'InProgress' to 'Todo'.",
  "instance": "/api/work-items/1/status"
}
```

`400` for unknown status values (`"abc"`, `99`), missing body, or malformed JSON.

## Assumptions

| Topic | Behavior |
| --- | --- |
| Id | `int`, DB-generated; clients do not supply it |
| Sort | `CreatedAt` desc, then `Id` desc |
| Pagination | Default page 1, pageSize 10; max pageSize 100; empty list → totalPages 0 |
| Search | Optional case-insensitive contains on title (trimmed) |
| Status filter | Optional exact match; omitted / UI "All" = no filter |
| Title | Required, trimmed, max 120 after trim; whitespace-only rejected |
| Description | Optional, trimmed; whitespace-only stored as null |
| Create status | Always Todo |
| Same-status PATCH | 409 |
| Edit / delete | Not implemented |
| Timestamps | `CreatedAt` is UTC at create |
| Migrations | Applied on startup in Development only |
| SQLite path | `Data Source=workitems.db` under the API content root |
| CORS | `http://localhost:4200` |
| Enums in JSON | Strings only |

## Design decisions

**Transition rule on the entity.** `WorkItem.ChangeStatus` owns the graph and throws `InvalidStatusTransitionException`, so the rule stays in one place and is unit-testable without HTTP or EF.

**switchMap for list queries.** Search, status, page, and refresh feed one stream. `switchMap` cancels the previous HTTP call so a slow older response cannot overwrite a newer result.

**Real SQLite in tests.** EF InMemory is not a faithful stand-in. Tests use a unique temp `.db` per fixture, including a host-restart persistence check on the same file.

**PATCH concurrency.** After `ChangeStatus` validates the transition against the status that was read, the write is a conditional `UPDATE … WHERE Id = @id AND Status = @expected`. If another request already changed the row, zero rows are updated and the API returns `409` with a clear conflict message (reload and retry). Invalid transitions still return `409` from the entity rule.

## Test coverage

| Area | What’s covered |
| --- | --- |
| Domain | Valid and invalid `ChangeStatus` transitions (unit) |
| API | Create (201 + Location), validation 400s, list filters/pagination, GET by id via Location, PATCH success / invalid / missing / concurrent stale update |
| Persistence | Real SQLite; data survives host restart on the same file |

## What I would do next

- Auth
- Docker and an explicit migrate step outside Development
- CI for `dotnet test` and `ng test` / `ng build`
- Browser e2e (create → filter → advance → 409)
- SQL Server for deployed environments

## Known limitations

- No edit/delete APIs or UI
- No auth, Docker, or CI in the repo
- No browser e2e (unit/integration only)
- Auto-migrate only in Development
