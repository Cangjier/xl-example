// xl:title 内建构造自己的 `length`（与 `name` 同一个位置的那一格）
// xl:round 687
// xl:judge stdout
// xl:end

// 数字是构造函数的形参数（Node 实测）：Object/Function/Array/Number/String/Boolean/Error/Promise 是 1、
// Symbol/Map/Set/WeakMap/WeakSet 是 0、Date 是 7
const names = ["Object", "Function", "Array", "Number", "String", "Boolean", "Symbol",
  "Map", "Set", "WeakMap", "WeakSet", "Date", "Error", "Promise"];
const out: string[] = [];
for (const n of names) {
  const c: any = (globalThis as any)[n];
  out.push(n + "=" + c.length);
}
console.log(out.join(" "));

// `length` 是**不可写 + 可配置**（`name` 那一格是可写）
const d: any = Object.getOwnPropertyDescriptor(Array, "length");
console.log("desc", d.value, d.writable, d.enumerable, d.configurable);

// 它们照样是可调用的内建构造
console.log("call", typeof (globalThis as any).Array, (globalThis as any).Date.name);
