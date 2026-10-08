// xl:title 错误：自定义类、分类接住与资源清理
// xl:round 338
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class AppError extends Error {
  constructor(message: string, public code: number) {
    super(message);
    this.name = "AppError";
  }
}
class NotFound extends AppError {
  constructor(what: string) { super("missing " + what, 404); }
}
const log: string[] = [];
function run(kind: string): string {
  try {
    if (kind === "missing") throw new NotFound("user");
    if (kind === "bad") throw new AppError("bad input", 400);
    throw new TypeError("plain");
  } catch (e) {
    if (e instanceof NotFound) return "notfound:" + e.code;
    if (e instanceof AppError) return "app:" + e.code + ":" + e.message;
    if (e instanceof TypeError) return "type:" + (e as Error).message;
    return "unknown";
  } finally {
    log.push("fin:" + kind);
  }
}
console.log(run("missing"), run("bad"), run("weird"));
console.log(log.join(","));
console.log(new NotFound("x") instanceof Error, new NotFound("x").name, String(new AppError("m", 1)));
console.log(Object.prototype.toString.call(new AppError("m", 1)));
