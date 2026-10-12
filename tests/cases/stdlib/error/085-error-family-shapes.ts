// xl:title `Error` 家族的形状：名字 / 消息 / 原型链 / `cause` / `AggregateError`
// xl:round 791
// xl:judge stdout
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 20 条并成这一条
// （保留 085-error-family-shapes；吸收 002-error-families-root · 011-error-families-and-messages · 016-error-families-forms · 023-error-families-and-fields · 026-error-families-seven · 028-error-families-r623 · 029-error-instanceof-forms · 030-error-family-fields · 089-new-rangeerror-m-name · 090-object-prototype-tostring-call-new-error-m · probe-e02 · probe-e04 · probe-e11 · probe697-e04 · probe704-e-a13 · probe704-e-a14 · probe704-e-a34 · probe704-e-a39 · probe704-e-a40）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 七个族的 name / message / instanceof / 原型 / 自有格；`Error("x")` 不带 new 也算；`Error.prototype` 自己那一格

// 保留条本身：085-error-family-shapes.ts
(() => {
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
})();

// 吸收 002-error-families-root.ts
(() => {

  console.log(new Error("e").name, new Error("e").message);
  console.log(new TypeError("t").name, new RangeError("r").name);
  console.log(Error("no-new").message, TypeError("t2").name);
})();

// 吸收 011-error-families-and-messages.ts
(() => {

  const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("f")];
  console.log(errs.map((e) => e.name + ":" + e.message).join(" "));
  console.log(errs.every((e) => e instanceof Error), errs[0] instanceof TypeError);
})();

// 吸收 016-error-families-forms.ts
(() => {

  const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("f")];
  console.log(errs.map((e) => e.name).join(","));
  console.log(errs.map((e) => e instanceof Error).join(","));
  console.log(String(errs[2]), errs[3].message);
})();

// 吸收 023-error-families-and-fields.ts
(() => {
  const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("ref"), new EvalError("ev"), new URIError("u")];
  console.log(errs.map((e) => e.name).join(","));
  console.log(errs.map((e) => e instanceof Error).join(","));
  console.log(new TypeError("t") instanceof TypeError, new TypeError("t") instanceof RangeError);
  const withCause = new Error("outer", { cause: new Error("inner") });
  console.log((withCause as any).cause.message, String(new Error("x")));
  console.log(new Error().message === "", new Error("m").toString());
})();

// 吸收 026-error-families-seven.ts
(() => {
  const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"),
    new ReferenceError("ref"), new EvalError("ev"), new URIError("u")];
  console.log("A", errs.map((e) => e.name).join(","));
  console.log("B", errs.map((e) => e instanceof Error).join(","));
  console.log("C", new TypeError("t") instanceof TypeError, new TypeError("t") instanceof RangeError);
  console.log("D", new URIError("u") instanceof URIError, new EvalError("e") instanceof EvalError);
  console.log("E", new URIError("x").message, String(new EvalError("boom")), new URIError("u").constructor === URIError);
  try { decodeURIComponent("%"); } catch (e) { console.log("F", (e as Error).name, (e as Error).message); }
  try { decodeURIComponent("%zz"); } catch (e) { console.log("G", (e as Error).name); }
  try { decodeURI("%"); } catch (e) { console.log("H", (e as Error).name); }
  try { decodeURI("%E4%B8"); } catch (e) { console.log("I", (e as Error).name); }
  console.log("J", decodeURIComponent("%E4%B8%AD"), decodeURIComponent("a%20b"), encodeURIComponent("\u00e9\u4e2d"));
})();

// 吸收 028-error-families-r623.ts
(() => {

  const list: any[] = [TypeError, RangeError, ReferenceError, SyntaxError, URIError, EvalError, AggregateError];
  console.log(list.map((C) => C.name).join(","));
  console.log(new TypeError("t").message, new RangeError().message === "", new TypeError("t") instanceof Error);
})();

// 吸收 029-error-instanceof-forms.ts
(() => {

  const kinds = [new Error("e"), new TypeError("t"), new RangeError("r"), { name: "Error" }, "x"];
  for (const k of kinds) console.log(k instanceof Error);
  console.log(new TypeError("t") instanceof Error, new Error("e") instanceof TypeError);
})();

// 吸收 030-error-family-fields.ts
(() => {

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
})();

// 吸收 089-new-rangeerror-m-name.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/error/probe697-e03.ts
  //   · stdlib/error/probe704-e-a10.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new RangeError("m").name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 090-object-prototype-tostring-call-new-error-m.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/error/probe697-e15.ts
  //   · stdlib/error/probe704-e-a06.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.prototype.toString.call(new Error("m"))));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-e02.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new TypeError("y").name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-e04.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Error("z") instanceof Error));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-e11.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Error("x") instanceof Object));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe697-e04.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Error("m").constructor.name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a13.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new URIError("m").name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a14.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new EvalError("m").name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a34.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.getPrototypeOf(new TypeError("m")) === TypeError.prototype));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a39.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Error.prototype.name));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a40.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Error.prototype.message));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
