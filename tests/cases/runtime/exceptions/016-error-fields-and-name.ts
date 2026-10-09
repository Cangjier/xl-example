// xl:title Error 基类与内置家族的 name / message / toString / instanceof
// xl:judge stdout
// xl:end
// **第 794 轮把 025 并了进来**（另一个 `AppError` 子类的 name / message / code /
// instanceof / `String(e)` 五格）。判定点只有一个：**Error 与它自带的家族**
// （自己写的子类在 013 里）。
const e = new Error("boom");
console.log(e.name, e.message, e.toString());
const t = new TypeError("bad");
console.log(t.name, t instanceof Error, t instanceof TypeError, t.toString());
class MyError extends Error { constructor(m: string) { super(m); this.name = "MyError"; } }
const m = new MyError("mine");
console.log(m.name, m.message, m.toString(), m instanceof Error, m instanceof MyError);
class AppError extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.name = "AppError"; this.code = code; }
}
const a = new AppError("bad", 7);
console.log(a.message, a.name, a.code, a instanceof AppError, a instanceof Error);
console.log(String(a));
