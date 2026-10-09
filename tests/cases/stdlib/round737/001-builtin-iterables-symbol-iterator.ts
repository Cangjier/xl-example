// xl:title 内建可迭代物的 `Symbol.iterator` 落点与同一性：数组 / 字符串 / `Map` / `Set`
// xl:round 737
// xl:judge stdout
// xl:end
// **按判定点合并**：把 stdlib/round737 里同判定点的 2 条探针并成这一条
//（`@@iterator` 在不在、挂在谁身上、与 `values` / `entries` 是不是同一格，是同一个语义决定）；
// 正文逐字搬进各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/round737/p737c-c01.ts
//   · stdlib/round737/p737c-c05.ts

// ===== 吸收 stdlib/round737/p737c-c01.ts =====
(() => {
console.log([1, 2].keys ? "keys" : "no", [...[1, 2].keys()].join(","));
console.log(typeof [][Symbol.iterator], typeof "s"[Symbol.iterator], typeof new Map()[Symbol.iterator]);
console.log([...new Set([1, 2])].join(","), [..."ab"].join(","));
console.log([...new Map([[1, 2]])][0].join(":"), [...[1, 2].entries()].length);
})();

// ===== 吸收 stdlib/round737/p737c-c05.ts =====
(() => {
const proto = Object.getPrototypeOf([]);
console.log(typeof (proto as any)[Symbol.iterator], (proto as any)[Symbol.iterator] === ([] as any).values);
const mproto = Object.getPrototypeOf(new Map());
console.log(typeof (mproto as any)[Symbol.iterator], (mproto as any)[Symbol.iterator] === (mproto as any).entries);
const sproto = Object.getPrototypeOf(new Set());
console.log(typeof (sproto as any)[Symbol.iterator], (sproto as any)[Symbol.iterator] === (sproto as any).values);
})();
