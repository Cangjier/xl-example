// xl:title 自定义迭代器（`Symbol.iterator` 的写法与 `next` 的形状）与 `for..of` 里的解构（数组模式 / 嵌套 / 默认值）
// xl:round 749
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round749 里同判定点的
// 2 条原子探针并成这一条：p749a-a03 · p749a-a04
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round749/p749a-a03.ts · 自定义迭代器：`Symbol.iterator` 的三条写法与 `next` 的返回形状 =====
await (async () => {
const obj: any = {
  from: 1, to: 3,
  [Symbol.iterator]() {
    let cur = this.from;
    const last = this.to;
    return { next: () => (cur <= last ? { value: cur++, done: false } : { value: undefined, done: true }), };
  },
};
console.log([...obj].join(","), Array.from(obj).join(","));
const [a, b] = obj as any;
console.log(a, b);
const iterator = (obj as any)[Symbol.iterator]();
console.log(JSON.stringify(iterator.next()), JSON.stringify(iterator.next()), JSON.stringify(iterator.next()), JSON.stringify(iterator.next()));
})();

// ===== 吸收 tests/cases/runtime/round749/p749a-a04.ts · `for…of` 与解构：数组模式、嵌套模式、默认值 =====
await (async () => {
for (const [k, v] of [["a", 1], ["b", 2]] as any) console.log(k, v);
for (const { x, y = 9 } of [{ x: 1 }, { x: 2, y: 3 }] as any) console.log(x, y);
const pairs: Array<[number, number]> = [[1, 2], [3, 4]];
for (const [p, q] of pairs) console.log(p + q);
const [[m, n], [o]] = [[1, 2], [3]] as any;
console.log(m, n, o);
for (const [, second] of [[1, 2], [3, 4]]) console.log(second);
})();
}
main();
