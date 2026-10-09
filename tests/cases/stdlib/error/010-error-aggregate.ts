// xl:title `AggregateError`：名字 / 消息 / 内层数组
// xl:round 791
// xl:judge stdout
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 2 条并成这一条
// （保留 010-error-aggregate；吸收 probe704-e-a15）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `errors` 是数组、`length` 跟着实参走

// 保留条本身：010-error-aggregate.ts
(() => {

  const e = new AggregateError([new Error("a")], "many");
  console.log(e.name, e.message, e.errors.length, e instanceof Error);
})();

// 吸收 probe704-e-a15.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new AggregateError([1]).errors.length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
