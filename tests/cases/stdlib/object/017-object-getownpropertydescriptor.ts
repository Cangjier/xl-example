// xl:title getOwnPropertyDescriptor 的形状与缺失
// xl:judge stdout
// xl:end

const o = { a: 1 };
const d: any = Object.getOwnPropertyDescriptor(o, "a");
console.log(d.value, d.writable, d.enumerable, d.configurable);
console.log(Object.getOwnPropertyDescriptor(o, "zzz"));
console.log(Object.getOwnPropertyNames(o).join(","));
