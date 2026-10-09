// xl:title `Error` 自己那一格的名表：静态成员 / `prototype` 的成员
// xl:round 791
// xl:judge stdout
// xl:end
// **按判定点并组（第 791 轮）**：把 stdlib/error 里同一个判定点的 6 条并成这一条
// （保留 031-names-error；吸收 032-names-error-proto · 087-typeof-error-capturestacktrace · probe-e10 · probe704-e-a23 · probe704-e-a24）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// `captureStackTrace` / `prepareStackTrace` / `stackTraceLimit` / `length` 四格缺不缺、自有名表里有没有它们

// 保留条本身：031-names-error.ts
(() => {
  const b: any = Error;
  let v = "";
  v = "no";
  try {
    v = String(typeof b["captureStackTrace"]);
  } catch (err) {
  }
  console.log(typeof b, "captureStackTrace", v);
  v = "no";
  try {
    v = String(typeof b["length"]);
  } catch (err) {
  }
  console.log(typeof b, "length", v);
  v = "no";
  try {
    v = String(typeof b["prepareStackTrace"]);
  } catch (err) {
  }
  console.log(typeof b, "prepareStackTrace", v);
  v = "no";
  try {
    v = String(typeof b["stackTraceLimit"]);
  } catch (err) {
  }
  console.log(typeof b, "stackTraceLimit", v);
  console.log("缺", 4, "个名字");
})();

// 吸收 032-names-error-proto.ts
(() => {
  const b: any = Error.prototype;
  let v = "";
  console.log("缺", 0, "个名字");
})();

// 吸收 087-typeof-error-capturestacktrace.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/error/probe-e09.ts
  //   · stdlib/error/probe704-e-a19.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof Error.captureStackTrace));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe-e10.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Error.length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a23.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.keys(Error).length));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-e-a24.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Object.getOwnPropertyNames(Error).includes("captureStackTrace")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
