// xl:title `console` 那一族的**流**：`error` / `warn` 走 stderr
// xl:round 735
// xl:judge stdout
// xl:end
// 原来只有 `log` 一格挂着：`console.error("x")` 报
// **`cannot call a non-closure value`**——**那句话听起来像「调用写错了」**，
// 其实是**那一格没人挂**（与第 308 轮 `Array.prototype[Symbol.iterator]`
// 是同一副面孔）。这一轮把「脚本顺手就会用的那九个」一起挂上。
console.log("log-out");
console.info("info-out");
console.debug("debug-out");
console.error("error-err");
console.warn("warn-err");
console.log("order-a");
console.error("order-b");
console.log("order-c");
