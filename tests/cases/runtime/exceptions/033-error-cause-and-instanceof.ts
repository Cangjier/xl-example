// xl:title Error 家族：子类、cause、instanceof 链
// xl:round 9
// xl:judge stdout
// xl:end

class AppError extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.name = "AppError"; this.code = code; }
}
const e = new AppError("bad", 42);
console.log(e instanceof AppError, e instanceof Error, e.message, e.code, e.name);
console.log(String(e));
const wrapped = new Error("outer", { cause: e });
console.log(wrapped.message, (wrapped as any).cause === e);
