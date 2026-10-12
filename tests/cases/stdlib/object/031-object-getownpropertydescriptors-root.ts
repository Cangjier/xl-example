// xl:title Object.getOwnPropertyDescriptors（复数）
// xl:judge stdout
// xl:end

const o = { a: 1 };
const d = Object.getOwnPropertyDescriptors(o);
console.log(d.a.value, d.a.writable, d.a.enumerable, d.a.configurable);
