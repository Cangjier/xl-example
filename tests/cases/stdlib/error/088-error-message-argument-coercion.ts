// xl:title `message` 从实参来：缺省 / 字符串 / 非字符串
// xl:round 791
// xl:judge stdout
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 5 条并成这一条
// （保留 088-new-error-m-message；吸收 086-new-error-message · probe704-e-a35 · probe704-e-a36 · probe704-e-a37）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 没给实参时 message 是空串；给了 1 / null / undefined 时按 `ToString` 走（undefined 不给 message）

// 保留条本身：088-new-error-m-message.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/error/probe697-e01.ts
  //   · stdlib/error/probe704-e-a01.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Error("m").message));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 086-new-error-message.ts
(() => {
  // **合并了原先逐字节相同的 3 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/error/probe-e03.ts
  //   · stdlib/error/probe697-e13.ts
  //   · stdlib/error/probe704-e-a09.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Error().message));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a35.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Error(1).message));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a36.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Error(null).message));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a37.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(new Error(undefined).message));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
