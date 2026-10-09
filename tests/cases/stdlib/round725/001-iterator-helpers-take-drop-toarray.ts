// xl:title 迭代器对象上的 take / drop / toArray：名字、游标语义、产物形状与落点
// xl:round 725
// xl:judge stdout
// xl:end
// **按判定点合并**：把 stdlib/round725 里同判定点的 5 条探针并成这一条，
// 正文逐字搬进各自的 IIFE（打印口径与判据一字未动），
// 输出逐行等于原来那些条 stdout 的顺次相接（第 801 轮用尺子核过）：
//   · stdlib/round725/p725a-a01.ts
//   · stdlib/round725/p725a-a02.ts
//   · stdlib/round725/p725a-a03.ts
//   · stdlib/round725/p725a-a04.ts
//   · stdlib/round725/p725a-a05.ts

// ===== 吸收 stdlib/round725/p725a-a01.ts =====
(() => {
const it: any = [1, 2, 3, 4].values();
console.log(typeof it.take, typeof it.drop, typeof it.toArray);
console.log([...it.take(2)].join(","));
const it2: any = [1, 2, 3, 4].values();
console.log([...it2.drop(2)].join(","));
const it3: any = [1, 2, 3].values();
console.log(it3.toArray().join(","));
})();

// ===== 吸收 stdlib/round725/p725a-a02.ts =====
(() => {
const it: any = [1, 2, 3, 4].values();
console.log(it.next().value);
console.log([...it.take(2)].join(","));
console.log(it.next().value);
const d: any = [1, 2, 3, 4].values();
console.log([...d.drop(1)].join(","), d.next().done);
console.log([...([1, 2, 3].values() as any).take(99)].join(","));
console.log([...([1, 2].values() as any).take(0)].join(",") + "|");
})();

// ===== 吸收 stdlib/round725/p725a-a03.ts =====
(() => {
const it: any = [1, 2, 3].values();
const plain: any = it.toArray();
console.log(Array.isArray(plain), plain.join(","), typeof plain.next, it.next().done);
const t: any = [1, 2, 3].values();
const one: any = t.take(1);
console.log(typeof one.next, one.next().value, JSON.stringify(one.next()));
console.log([...([1, 2, 3].values() as any).take(2)].join(","));
})();

// ===== 吸收 stdlib/round725/p725a-a04.ts =====
(() => {
const s: any = new Set([1, 2, 3]).values();
console.log(typeof s.take, [...s.take(2)].join(","));
const m: any = new Map([[1, "a"], [2, "b"]]).entries();
console.log(typeof m.take, JSON.stringify([...m.take(1)]));
const mk: any = new Map([[1, "a"], [2, "b"]]).keys();
console.log([...mk.drop(1)].join(","));
const se: any = new Set([1, 2]).entries();
console.log(JSON.stringify(se.toArray()));
})();

// ===== 吸收 stdlib/round725/p725a-a05.ts =====
(() => {
const a: any = [1, 2, 3];
console.log(typeof a.take, typeof a.drop, typeof a.toArray);
console.log(typeof a.next, typeof a.values().next);
console.log(typeof a.values().take, typeof a.values().toArray, typeof [].drop);
})();
