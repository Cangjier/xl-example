// xl:title 函数自己那两格的**描述符**：`length` / `name`（值 / 不可写 / 不可枚举 / 可配置）
// xl:round 687
// xl:judge stdout
// xl:end

// 声明函数：`length` 是形参数（默认值 / 剩余参数之后的都不算）
function f(a: number, b: number): number {
  return a + b;
}
const fl: any = Object.getOwnPropertyDescriptor(f, "length");
console.log("fn-length", fl.value, fl.writable, fl.enumerable, fl.configurable);
const fn: any = Object.getOwnPropertyDescriptor(f, "name");
console.log("fn-name", fn.value, fn.writable, fn.enumerable, fn.configurable);

// 箭头函数：同样两格
const arrow = (x: number) => x;
const al: any = Object.getOwnPropertyDescriptor(arrow, "length");
console.log("arrow-length", al.value, al.writable, al.enumerable, al.configurable);

// 找不到的键给 `undefined`（**不抛**：原来这一支对函数是「响亮地抛」，
// 于是 `getOwnPropertyDescriptor(f, "nope")` 把整份文件带走）
console.log("missing", String(Object.getOwnPropertyDescriptor(f, "nope")));

// `getOwnPropertyNames` 要把那两格算进自有属性（`prototype` 那一格本来就在属性表里）
const ks = Object.getOwnPropertyNames(f);
console.log("has", ks.indexOf("length") >= 0, ks.indexOf("name") >= 0, ks.indexOf("prototype") >= 0);
