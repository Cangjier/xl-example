// xl:title 自定义错误子类：字段与两条 instanceof
// xl:round 291
// xl:judge stdout
// xl:end

class AppError extends Error {
  code: number;
  constructor(msg: string, code: number) { super(msg); this.code = code; this.name = "AppError"; }
}
const e = new AppError("bad", 42);
console.log(e.message, e.code, e.name, e instanceof AppError, e instanceof Error);
console.log(String(e));
