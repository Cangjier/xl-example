// xl:title Object.getOwnPropertySymbols 与 keys 的分工
// xl:judge stdout
// xl:end

const s = Symbol("s");
const o = { a: 1, [s]: 2 };
console.log(Object.keys(o).join(","), Object.getOwnPropertySymbols(o).length, Object.getOwnPropertyNames(o).join(","));
