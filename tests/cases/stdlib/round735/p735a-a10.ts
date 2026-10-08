// xl:title `Array.from` 的小数长度要 `ToLength` 截断，不是当 0
// xl:round 735
// xl:judge stdout
// xl:end
// **这一条量的是一个静默错值**：`{ length: 2.5 }` 的 `ToLength` 是 **2**，
// 而本仓原来走 `AsInt()`——那个方法对 `Float64` 给 `0` ⇒ 一条都不读（给 `[]`）。
const a: any = { length: 2.5, 0: "a", 1: "b", 2: "c" };
console.log(Array.from(a).join(","));
console.log(Array.from(a).length);
const b: any = { length: 0.9, 0: "a" };
console.log(Array.from(b).length);
const c: any = { length: -1, 0: "a" };
console.log(Array.from(c).length);
console.log(Array.from({ length: -2.5, 0: "a" } as any).length);
console.log(Array.from({ length: "3" } as any).length);
console.log(Array.from({ length: 2 } as any).length);
console.log(Array.from({ length: 3, 2: "c" } as any).join(","));
