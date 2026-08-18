# TypeScript + Express Agent Rules

## Project Context
You are building an Express.js REST API with TypeScript, following a layered architecture (routes → controllers → services → repositories). The codebase enforces strict type safety and separation of concerns throughout.

## Code Style & Structure
- Enable `"strict": true` in `tsconfig.json`. Never use `any`; use `unknown` with type guards.
- Use `interface` for object shapes and `type` for unions, aliases, and mapped types.
- Use named exports everywhere. Group related utilities in barrel `index.ts` files only where it reduces import noise.
- Keep functions under 20 lines. Extract helper functions when logic grows.
- Use descriptive auxiliary-verb names: `isAuthenticated`, `hasRole`, `canEditPost`.

## Project Structure
```
src/
  app.ts            # Express app factory — mounts middleware and routers
  server.ts         # HTTP server bootstrap, graceful shutdown
  config/           # Zod-validated env config, constants
  routes/           # express.Router() instances grouped by resource
  controllers/      # Parse request, call service, format HTTP response
  services/         # Business logic, orchestration, no HTTP concerns
  repositories/     # All database access; one class per aggregate root
  middleware/        # auth, validate, rateLimiter, requestId, errorHandler
  errors/           # AppError base class, domain-specific subclasses
  types/            # Augmented Express types (req.user), shared interfaces
  utils/            # Pure helper functions — no side effects
```

## Middleware
- Register in order: `helmet`, `cors`, body parser, `requestId`, `morgan`/`pino-http`, auth, routes, `errorHandler`.
- Configure `helmet` with explicit CSP directives. Do not rely on defaults for APIs serving sensitive data.
- Whitelist CORS origins explicitly. Never pass `cors()` with no arguments in production.
- Validate every request body, query, and params with a Zod middleware factory before hitting controllers.
- The error handler **must** be the last `app.use()` call and must declare four parameters `(err, req, res, next)`.

## Routes & Controllers
- Mount routes with `app.use('/api/v1', router)`. Version in the URL prefix, not per-route.
- Keep controllers to ~30 lines: `const data = validate(req); const result = await service.do(data); res.json(result)`.
- Use a typed `RequestHandler` wrapper: `type Handler<P, ResB, ReqB, Q> = RequestHandler<P, ResB, ReqB, Q>`.
- Return a consistent envelope: `{ data: T, meta?: PaginationMeta }` for success; `{ error: { code, message, details? } }` for failure.
- Use correct HTTP semantics: `201` for created resources, `204` for successful deletes with no body, `409` for conflicts, `422` for validation failures.
- Implement cursor-based pagination for any list endpoint with potentially unbounded rows.

## Error Handling
- Define `AppError extends Error` with `statusCode: number`, `code: string`, `isOperational: boolean`.
- Create typed subclasses: `NotFoundError(resource)`, `ValidationError(details)`, `UnauthorizedError()`, `ConflictError(field)`.
- Services throw `AppError` subclasses. The error handler middleware catches everything.
- Wrap every async route handler with `catchAsync` to forward rejections: `(fn) => (req, res, next) => fn(req, res, next).catch(next)`.
- Log operational errors at `warn` level, unexpected errors at `error` level with full stack.
- Register `process.on('unhandledRejection', ...)` and `process.on('uncaughtException', ...)` — log and exit with code `1`.

## Validation
- Define one Zod schema per endpoint variant: `createUserSchema`, `updateUserSchema`, `listUsersQuerySchema`.
- Use `.transform()` to coerce types (string `"42"` → number) and `.refine()` for cross-field rules.
- Strip unknown fields with `.strict()` or `.strip()` — never forward raw `req.body` to a repository.
- Return `422 Unprocessable Entity` with a `details` array of `{ field, message }` objects on validation failure.

## Performance
- Use `compression` middleware. Set `threshold: 1024` to skip compressing small responses.
- Add `ETag`/`Cache-Control` headers on read-heavy GET endpoints. Use weak ETags for partial-match semantics.
- Configure database connection pooling (`pg.Pool` or Prisma pool) with `max` sized to `(CPU cores × 2) + 1`.
- Implement graceful shutdown: `server.close()` → drain in-flight requests → close DB pool → `process.exit(0)`.
- Use `pino` for structured JSON logging. Attach `requestId` to every log entry via `pino-http`.


## Security
- Hash passwords with `bcrypt` at cost factor 12. Never log or return password hashes.
- Sign JWTs with RS256 in production. Validate `iss`, `aud`, and `exp` claims on every request.
- Use `hpp` middleware to block HTTP parameter pollution on query strings.
- Set `httpOnly`, `Secure`, `SameSite=Strict` on session cookies.
- Never include internal error messages or stack traces in client-facing responses.
