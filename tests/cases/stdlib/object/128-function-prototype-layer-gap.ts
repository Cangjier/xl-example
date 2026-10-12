// xl:title 函数自己的名字表：`length,name,arguments,caller,prototype`（第 709 轮收掉那两格）
// xl:round 687
// xl:judge stdout
// xl:end

const ks = Object.getOwnPropertyNames(function f(): void {});
ks.sort();
console.log("fn-own-names", ks.join(","));

const names = ["Object", "Map", "Set", "Date", "Promise", "Error"];
const kinds: string[] = [];
for (const n of names) {
  const c: any = (globalThis as any)[n];
  kinds.push(n + "=" + typeof c.prototype);
}
console.log("prototype-kind", kinds.join(" "));

const o: any = {};
console.log("obj-proto-methods", typeof o.hasOwnProperty, typeof o.isPrototypeOf,
  typeof o.propertyIsEnumerable, typeof o.toLocaleString, typeof o.valueOf);
