// xl:title `cause` 的两格：显式传了才有、链、以及 `AggregateError.errors`
// xl:round 651
// xl:judge stdout
// xl:end
// **第 794 轮把 033 的 `cause` 那一格也收了进来**（`cause === e` 的同一性）。
// 这里量的已经不是「包一层」（那在 020 里），而是 **`cause` 自己那一格**：
// 传了才有、传什么挂什么、`AggregateError` 的 `errors` 数组。
const inner = new Error("inner");
const outer = new Error("outer", { cause: inner });
console.log(outer.message, (outer as any).cause === inner, (outer as any).cause.message);
const agg = new AggregateError([new Error("a"), new Error("b")], "many");
console.log(agg.errors.length, agg.errors.map((e: any) => e.message).join(","), agg.message);
const AppError = class extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.name = "AppError"; this.code = code; }
};
const base = new AppError("bad", 42);
const wrapped = new Error("outer", { cause: base });
console.log(wrapped.message, (wrapped as any).cause === base);
