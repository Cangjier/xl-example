// xl:title `cause` 那一格：显式传了才有、链、值原样
// xl:round 791
// xl:judge stdout
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 6 条并成这一条
// （保留 008-error-cause-and-family；吸收 009-error-family-and-cause · 012-error-cause-and-chain · 017-error-cause-and-name · 021-error-cause-and-instanceof · 036-error-cause-capture）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `new Error(msg, { cause })`：`cause` 是自有格、没传时读出来是 undefined、内层错误的家族与 name 照样在

// 保留条本身：008-error-cause-and-family.ts
(() => {

  const e = new Error("outer", { cause: new Error("inner") });
  console.log(e.message, (e.cause as Error).message);
  const t = new TypeError("bad type");
  console.log(t.name, t.message, t instanceof TypeError, t instanceof Error, t instanceof RangeError);
  console.log(String(new RangeError("r")), String(new SyntaxError()));
})();

// 吸收 009-error-family-and-cause.ts
(() => {

  const e = new TypeError("t");
  const s = new SyntaxError("s");
  const r = new RangeError("r");
  const c = new Error("outer", { cause: new Error("inner") });
  console.log(e instanceof Error, e instanceof TypeError, s.name, r.name);
  console.log(c.message, c.cause.message, c.cause instanceof Error);
  console.log(Object.prototype.toString.call(e), e.toString(), s.toString());
})();

// 吸收 012-error-cause-and-chain.ts
(() => {

  const inner = new Error("inner");
  const outer = new Error("outer", { cause: inner });
  console.log(outer.message, (outer as any).cause.message, outer.toString());
  console.log(new Error("x").cause);
})();

// 吸收 017-error-cause-and-name.ts（不裹壳：降级层只在模块顶层接得上）

const e = new Error("m", { cause: new RangeError("inner") });
console.log(e.message, e.name, (e.cause as Error).name);
class MyErr extends Error { name = "MyErr"; }
const m = new MyErr("x");
console.log(m.name, m.message, m instanceof Error, String(m));

// 吸收 021-error-cause-and-instanceof.ts
(() => {

  const root = new TypeError("bad type");
  const wrapped = new Error("outer", { cause: root });
  console.log(wrapped.message, wrapped.cause.message);
  console.log(wrapped instanceof Error, root instanceof TypeError, root instanceof Error);
  console.log(wrapped.name, root.name);
})();

// 吸收 036-error-cause-capture.ts
(() => {
  const e: any = new Error("outer", { cause: 42 });
  console.log(e.message, e.cause);
  console.log("cause" in e);
})();
