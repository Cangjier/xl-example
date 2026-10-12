// xl:title 冻结 / 密封之后下标那一格：`freeze` 后 define 该抛、`seal` 后 delete 给假而写还成
// xl:round 797
// xl:judge stdout
// xl:end
// **按判定点并组（第 797 轮）**：把 stdlib/round721 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 原 `001-seal-after-delete-index-gives-false-write-still-ok`（它本身并过 `p721a-b07` 与
// `stdlib/round723/p723a-a03`，那两条正文与它逐字节相同）在这一轮并进本条。

// ===== 吸收 stdlib/round721/p721a-a13.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
run(() => { Object.defineProperty(a, "1", { value: 9 }); console.log("ok:" + a[1]); });
})();

// ===== 吸收 stdlib/round721/001-seal-after-delete-index-gives-false-write-still-ok.ts =====
(() => {
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · stdlib/round721/p721a-b07.ts
//   · stdlib/round723/p723a-a03.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.seal(a);
a[1] = 9;
console.log(show(delete a[1]) + "," + show(a[1]) + "," + show(a.length));
})();
