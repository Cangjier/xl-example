// xl:title `Error` 家族的形状：名字 / 消息 / 原型链 / `cause` / `AggregateError`
// xl:round 749
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的两条**：
//   `round749/p749b-b06`（形状与 `instanceof` 链）· `round781/r781a-01`（`cause` 那一族）
//
// 判定点只有一个：**错误家族在运行期的形状**——
//  ① 每个子类自带 `name`（`TypeError` / `RangeError` / `SyntaxError` / `ReferenceError`）；
//  ② `instanceof` 沿家族链走（子类实例也是 `Error`，反过来不是）；
//  ③ `message` / `name` 是**自有**格（与 `stack` 一样，见 `084-error-stack-type`）；
//  ④ `cause` 只有显式传了才有；`AggregateError` 的 `errors` 是数组；
//  ⑤ `String(err)` 给 `"Name: message"`；`Object.prototype.toString.call(err)` 给 `[object Error]`。
//
// **修改记录（第 783 轮合并时）**：这两条原来**都没写 `// xl:end`**，正文一个字都没跑
// （覆盖度里是恒 pass 的空跑）。补上终止行之后判据才真的生效。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return String(f()); } catch (e) { return "!" + (e && (e as any).constructor ? (e as any).constructor.name : "?"); }
};

try {
  // ① 名字与消息
  const e: any = new Error("m");
  console.log(show([e.message, e.name, e instanceof Error, e instanceof TypeError].join(",")));
  console.log(show(Object.prototype.toString.call(e)));
  const t: any = new TypeError("tm");
  console.log(show([t.message, t.name, t instanceof Error, t instanceof TypeError].join(",")));
  console.log(show([new RangeError("r").name, new SyntaxError("s").name, new ReferenceError("x").name].join(",")));
  // ② 原型链
  console.log(show(Object.getPrototypeOf(TypeError) === Error));
  console.log(show(Object.getPrototypeOf(RangeError) === Error));
  console.log(show(TypeError.prototype instanceof Error));
  // ③ 自有格与 `String()`
  console.log(show(typeof e.stack));
  console.log(show(e.constructor === Error));
  console.log(show(Object.prototype.hasOwnProperty.call(new Error("x"), "message")));
  console.log(show(String(new TypeError("t"))));
  console.log(show(String(new TypeError())));
  const renamed: any = new Error("x");
  renamed.name = "Custom";
  console.log(show(String(renamed)));
  // ④ 子类
  class MyErr extends Error {}
  const me: any = new MyErr("mine");
  console.log(show([me.message, me.name, me instanceof MyErr, me instanceof Error, Object.keys(me).join(",")].join(",")));
  // ⑤ `cause` / `AggregateError`
  console.log(show(err(() => String(new Error("a", { cause: 5 }).cause))));
  console.log(show(err(() => String(new Error("a").cause))));
  const inner: any = new Error("i");
  console.log(show(err(() => String(new Error("o", { cause: inner }).cause))))
  console.log(show(err(() => { const ag: any = new AggregateError([1, 2], "m"); return ag.errors.join(",") + ":" + ag.message + ":" + ag.name; })));
  console.log(show(AggregateError.length));
  // ⑥ 抛出非 Error 与重抛
  console.log(show(err(() => { try { throw "s"; } catch (x: any) { return typeof x; } })));
  console.log(show(err(() => { try { try { throw new RangeError("r"); } catch (x: any) { throw x; } } catch (x: any) { return x.constructor.name; } })));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
