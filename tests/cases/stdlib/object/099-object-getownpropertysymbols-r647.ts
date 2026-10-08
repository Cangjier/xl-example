// xl:title Object.getOwnPropertySymbols 与可枚举性
// xl:round 647
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o = { a: 1, [s]: 2 };
console.log(Object.getOwnPropertySymbols(o).length, Object.getOwnPropertySymbols(o)[0] === s);
console.log(Object.keys(o).join(","), JSON.stringify(o));
console.log(Object.getOwnPropertySymbols({}).length);
