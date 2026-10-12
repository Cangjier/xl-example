// xl:title 数组 / 字符串 / `Map` 三族迭代器的产物：`next()` 走到底之后的形状、码点迭代（代理对算一格）、`for..of` 一个 `Map` 给两个元素的新数组
// xl:round 737
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round737 里同判定点的
// 3 条原子探针并成这一条：p737a-a01 · p737a-a02 · p737a-a03
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round737/p737a-a01.ts · 数组迭代器的 `next()` 走到底之后的形状 =====
await (async () => {
const it = [1, 2].values();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()));
const kt = ["a"].keys();
console.log(JSON.stringify(kt.next()), JSON.stringify(kt.next()));
})();

// ===== 吸收 tests/cases/runtime/round737/p737a-a02.ts · 字符串的**码点迭代**（代理对算一格） =====
await (async () => {
const s = "a\u{1F600}b";
console.log(s.length, [...s].length, [...s].join("|"));
const out: string[] = [];
for (const ch of s) out.push(ch.length + "");
console.log(out.join(","));
console.log(s.charAt(1), s.codePointAt(1), s.charCodeAt(1));
})();

// ===== 吸收 tests/cases/runtime/round737/p737a-a03.ts · `for..of` 一个 `Map`：条目是**两个元素的新数组** =====
await (async () => {
const m = new Map([["a", 1], ["b", 2]]);
for (const [k, v] of m) console.log(k, v);
for (const e of m) console.log(Array.isArray(e), e.length, e[0]);
console.log([...m].length, [...m.keys()].join(","), [...m.values()].join(","));
})();
}
main();
