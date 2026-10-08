// xl:title 自定义错误类：name/message/instanceof 三格
// xl:round 323
// xl:judge stdout
// xl:end

class AppError extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.name = "AppError"; this.code = code; }
}
const e = new AppError("bad", 7);
console.log(e.message, e.name, e.code, e instanceof AppError, e instanceof Error);
console.log(String(e));
