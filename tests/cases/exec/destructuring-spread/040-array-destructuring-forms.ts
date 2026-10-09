// xl:title 数组解构：洞 / 剩余 / 交换 / 默认值 / 从可迭代物取
// xl:round 792
// xl:judge stdout
// xl:end
// **按判定点并组（第 792 轮）**：把 exec/destructuring-spread 里同一个判定点的 14 条并成这一条
// （保留 022-array-destructuring-rest；吸收 024-function-const-a-r-1-2-3-return-a-r-join · 025-function-const-a-b-1-2-return-a-b · 027-function-let-a-b-a-b-1-2-return-a-b · 030-array-destructure-hole-skip · 031-array-destructure-default · probe2-e07 · probe2-e15 · probe693b-d22 · probe693b-d26 · probe693b-d35 · probe698-d04 · probe698-d06 · probe698-d14）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 洞要跳过、剩余收进真数组、`[a, b] = [b, a]` 先取后写；字符串 / `Set` 也按可迭代物解构

// 保留条本身：022-array-destructuring-rest.ts
(() => {
  const [a, ...rest] = [1, 2, 3];
  console.log(a, JSON.stringify(rest));
  const { x, ...others } = { x: 1, y: 2, z: 3 } as any;
  console.log(x, JSON.stringify(others));
  const [p = 9] = [] as any;
  console.log(p);
})();

// 吸收 024-function-const-a-r-1-2-3-return-a-r-join.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · exec/destructuring-spread/probe2-e01.ts
  //   · exec/destructuring-spread/probe693b-d01.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [a, ...r] = [1, 2, 3]; return a + "|" + r.join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 025-function-const-a-b-1-2-return-a-b.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · exec/destructuring-spread/probe2-e04.ts
  //   · exec/destructuring-spread/probe693b-d24.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [[a], [b]] = [[1], [2]]; return a + b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 027-function-let-a-b-a-b-1-2-return-a-b.ts
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · exec/destructuring-spread/probe693b-d10.ts
  //   · exec/destructuring-spread/probe698-d09.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let a, b; [a, b] = [1, 2]; return a + b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 030-array-destructure-hole-skip.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [, b] = [1, 2]; return b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 031-array-destructure-default.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [a = 9] = []; return a; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-e07.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [a = 1, b = a + 1] = []; return a + "," + b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe2-e15.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let a = 1; let b = 2; [a, b] = [b, a]; return a + "," + b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d22.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [x] = "ab"; return x; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d26.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [a = 1, b = a + 1] = []; return a + b; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-d35.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const a = [1, 2, 3]; const [x, ...y] = a; return y.length; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe698-d04.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [x = 1, y = 2] = [undefined, 3]; return x + y; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe698-d06.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [a, ...rest] = [1, 2, 3]; return [a, rest.join(",")].join("|"); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe698-d14.ts
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { const [x] = new Set([4]); return x; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
