// xl:title 自定义错误子类：instanceof 两条链都对
// xl:round 304
// xl:judge stdout
// xl:end

class AppError extends Error {
  code: number;
  constructor(msg: string, code = 500) { super(msg); this.name = "AppError"; this.code = code; }
}
const e = new AppError("bad");
console.log(e instanceof AppError, e instanceof Error, e.message, e.code, e.name);
try {
  throw new AppError("thrown", 404);
} catch (err: any) {
  console.log(err instanceof AppError, err.code);
}
