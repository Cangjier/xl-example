// xl:title 自定义错误类：字段 / name / message / String(e) / 两格 instanceof
// xl:round 323
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的一条并了进来**：033（`AppError` 的 instanceof 链、
// message / code / name 的次序、`String(e)`、以及 `cause === e` 那两格）。
// 判定点只有一个：**自己写的错误子类那几格**（基类 Error 的形状在 005 里）。
class ValidationError extends Error {
  field: string;
  constructor(field: string, msg: string) {
    super(msg);
    this.name = "ValidationError";
    this.field = field;
  }
}
const e = new ValidationError("age", "too young");
console.log(e.message, e.field, e.name);
console.log(String(e));
console.log(e instanceof ValidationError, e instanceof Error);
try { throw e; } catch (x) { console.log((x as ValidationError).field, (x as Error).message); }
class AppError extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.name = "AppError"; this.code = code; }
}
const a = new AppError("bad", 42);
console.log(a instanceof AppError, a instanceof Error, a.message, a.code, a.name);
console.log(String(a));
const wrapped = new Error("outer", { cause: a });
console.log(wrapped.message, (wrapped as any).cause === a);
