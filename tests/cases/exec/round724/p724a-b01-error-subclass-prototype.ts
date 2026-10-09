// xl:title `Error` 子类自己的原型链：`TypeError` 那一格接在 `Error` 上
// xl:round 724
// xl:judge stdout
// xl:end
// 判定点只有一个：**家族两层的链**——
// `Object.getPrototypeOf(TypeError) === Error`（构造器之间的那一格），
// 于是 `TypeError.prototype` 是 `Error` 的实例、子类实例同时是 `Error`。
//
// **修改记录（第 783 轮合并时）**：本条原来**没写 `// xl:end`**，正文一个字都没跑
// （覆盖度里是恒 pass 的空跑）。补上终止行之后判据才真的生效。
const e: any = new TypeError("x");

try {
  console.log(Object.getPrototypeOf(TypeError) === Error);
  console.log(Object.getPrototypeOf(RangeError) === Error);
  console.log(TypeError.prototype instanceof Error);
  console.log(e instanceof TypeError, e instanceof Error);
  console.log("stack" in e, typeof e.stack);
} catch (e2) {
  console.log("throw:" + (e2 && (e2 as any).constructor ? (e2 as any).constructor.name : "?"));
}
