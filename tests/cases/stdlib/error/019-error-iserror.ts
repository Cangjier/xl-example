// xl:title `Error.isError` 的判定面与 `bind` / `super` 两条 `this` 规则
// xl:round 791
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 5 条并成这一条
// （保留 019-error-iserror；吸收 022-error-iserror-and-this-rules · probe704-e-a16 · probe704-e-a17 · probe704-e-a18）。
// 后者带来 `public code: number` 那个**参数属性**，所以 `xl:args` 跟着一起并进来（取并集）。
// 只有真错误对象给 true（字面量对象 / 字符串 / null / undefined 都不算）；另带 `bind` 的部分实参与 `super` 的 `this`

// 保留条本身：019-error-iserror.ts
(() => {

  console.log(Error.isError(new Error("x")), Error.isError(new TypeError("y")));
  console.log(Error.isError({}), Error.isError("Error"), Error.isError(null));
})();

// 吸收 022-error-iserror-and-this-rules.ts
(() => {

  console.log(Error.isError(new Error("x")), Error.isError(new TypeError("y")));
  console.log(Error.isError({}), Error.isError("Error"), Error.isError(null), Error.isError(undefined));
  class MyErr extends Error {
    constructor(m: string, public code: number = 0) { super(m); this.name = "MyErr"; }
  }
  const e = new MyErr("boom", 7);
  console.log(e.message, e.name, e.code, e instanceof Error, Error.isError(e), String(e));
  const plain = Error("without new");
  console.log(plain instanceof Error, Error.isError(plain), String(plain));
  const obj = { tag: "obj", who(this: any) { return this === undefined ? "undef" : this.tag; } };
  const bound = (obj.who as any).bind(obj);
  console.log(bound(), bound.call({ tag: "other" }), obj.who());
  function target(this: any, a: number, b: number) { return (this === undefined ? "u" : this.tag) + ":" + a + "," + b; }
  const b2 = target.bind({ tag: "bound" }, 1);
  console.log(b2(2), b2.call({ tag: "ignored" }, 3));
  console.log(typeof Error.isError, Error.prototype.constructor === Error);
})();

// 吸收 probe704-e-a16.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Error.isError(new Error())));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a17.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Error.isError({})));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a18.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Error.isError("Error")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
