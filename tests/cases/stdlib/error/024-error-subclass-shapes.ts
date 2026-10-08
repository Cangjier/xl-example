// xl:title 自定义错误子类：name / instanceof / 捕获
// xl:round 371
// xl:judge stdout
// xl:end
class AppError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}
class NotFound extends AppError {
  constructor(what: string) { super("missing " + what, 404); this.name = "NotFound"; }
}
try { throw new NotFound("file"); } catch (e) {
  const err = e as NotFound;
  console.log(err.name, err.message, err.code, err instanceof NotFound, err instanceof AppError, err instanceof Error);
}
console.log(String(new AppError("m", 1)));
