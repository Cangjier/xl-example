// xl:title 符号作属性键：`keys` / `JSON` / `for..in` 看不见，`getOwnPropertySymbols` / `assign` 看得见
// xl:round 736
// xl:judge stdout
// xl:end
// **按判定点合并**：把 stdlib/round736 里同判定点的 2 条探针并成这一条
//（符号键在**枚举面**与 **`Object.assign` 复制面**是同一个语义决定：符号键是属性键）；
// 正文逐字搬进各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/round736/p736a-a09.ts
//   · stdlib/round736/p736a-a16.ts

// ===== 吸收 stdlib/round736/p736a-a09.ts =====
(() => {
const k = Symbol("kk");
const o: any = { a: 1 };
o[k] = 2;
console.log(Object.keys(o).join(","), JSON.stringify(o), Object.getOwnPropertySymbols(o).length);
let seen = "";
for (const key in o) seen += key;
console.log("forin:" + seen, Reflect.ownKeys(o).length);
console.log(o[k], Object.getOwnPropertyNames(o).join(","));
})();

// ===== 吸收 stdlib/round736/p736a-a16.ts =====
(() => {
const k = Symbol("a");
const src: any = { [k]: 1, b: 2 };
const dst: any = {};
Object.assign(dst, src);
console.log(dst[k], Object.keys(dst).join(","), Object.getOwnPropertySymbols(dst).length);
console.log(JSON.stringify(dst));
})();
