// xl:title 模板字面量：内插 / 嵌套 / 多行 / 标签函数与 `String.raw`；标签模板的被调者形状
// xl:round 749
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round749 里同判定点的
// 2 条原子探针并成这一条：p749a-a07 · p749a-a08
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round749/p749a-a07.ts · 模板字面量：内插、嵌套、标签函数、`String.raw` =====
await (async () => {
const name = "world";
console.log(`hello ${name}`);
console.log(`a${1 + 1}b${"c"}d`);
console.log(`nested ${[1, 2].map((v) => `<${v}>`).join("")}`);
console.log(`multi
line`);
function tag(strings: any, ...values: any[]) { return strings.raw.join("|") + "//" + values.join(","); }
console.log(tag`a${1}b${2}c`);
console.log(String.raw`a\nb`);
console.log(`${undefined}|${null}|${[1, 2]}|${{ a: 1 }}`);
})();

// ===== 吸收 tests/cases/runtime/round749/p749a-a08.ts · 标签模板：成员与可选调用的被调者 =====
await (async () => {
const obj = { tag(strings: any, ...v: any[]) { return "M:" + strings.join("_") + v.join(","); } };
console.log(obj.tag`x${1}y`);
console.log((obj.tag as any)`z`);
const maybe: any = { tag: (s: any, ...v: any[]) => "O:" + s.length + v.length };
console.log(maybe.tag`p${1}`);
const none: any = {};
try { console.log(none.tag`q`); } catch (e) { console.log("throw", (e as Error).constructor.name); }
})();
}
main();
