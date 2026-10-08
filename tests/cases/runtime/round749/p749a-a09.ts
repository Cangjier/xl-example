// xl:title 对象：符号键 / 不可枚举键 / 整数键的次序
// xl:round 749
// xl:judge stdout
// xl:end
const s = Symbol("s");
const o: any = { b: 1, 2: "two", a: 2, 1: "one", [s]: "sym" };
console.log(Object.keys(o).join(","));
console.log(Object.getOwnPropertyNames(o).join(","));
console.log(Object.getOwnPropertySymbols(o).length, o[s]);
console.log(JSON.stringify(o));
console.log(Object.values(o).join(","));
o.c = 3;
console.log(Object.keys(o).join(","));
