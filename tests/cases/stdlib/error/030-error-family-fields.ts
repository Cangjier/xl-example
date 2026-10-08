// xl:title 错误家族的类型与字段
// xl:round 7
// xl:judge stdout
// xl:end

const errors = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("f")];
for (const e of errors) console.log(e instanceof Error, e.name, e.message);
class AppError extends Error {
  code: number;
  constructor(code: number) { super("app " + code); this.name = "AppError"; this.code = code; }
}
try {
  throw new AppError(42);
} catch (e) {
  const err = e as AppError;
  console.log(err instanceof AppError, err instanceof Error, err.code, err.message);
}
