// xl:title 服务层错误体系：分类、重试判定、用户消息
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class AppError extends Error {
  constructor(message: string, public code: string, public retryable = false) { super(message); this.name = "AppError"; }
}
class NetworkError extends AppError { constructor(m: string) { super(m, "E_NET", true); this.name = "NetworkError"; } }
class ValidationError extends AppError { constructor(m: string, public field: string) { super(m, "E_VALID", false); this.name = "ValidationError"; } }
class NotFoundError extends AppError { constructor(what: string) { super("missing " + what, "E_404", false); this.name = "NotFoundError"; } }
function call(kind: string): string {
  if (kind === "ok") return "data";
  if (kind === "net") throw new NetworkError("connection reset");
  if (kind === "valid") throw new ValidationError("too short", "name");
  throw new NotFoundError(kind);
}
function attempt(kind: string, maxRetries: number): string {
  let tries = 0;
  for (;;) {
    tries += 1;
    try { return call(kind) + " after " + tries; }
    catch (e) {
      const err = e as AppError;
      console.log("try", tries, err.name, err.code, err.retryable);
      if (!err.retryable || tries >= maxRetries) {
        if (err instanceof ValidationError) return "user: fix field " + err.field;
        if (err instanceof NotFoundError) return "user: not found";
        return "user: try later";
      }
    }
  }
}
for (const kind of ["ok", "net", "valid", "thing"]) console.log("->", attempt(kind, 3));
const errs: Error[] = [new NetworkError("a"), new ValidationError("b", "f"), new NotFoundError("c")];
console.log(errs.map((e) => e instanceof AppError).join(","), errs.filter((e) => (e as AppError).retryable).length);
