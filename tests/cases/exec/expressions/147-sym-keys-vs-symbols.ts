// xl:title keys 只看字符串键，getOwnPropertySymbols 只看 symbol 键
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = { a: 1, [s]: 2 };
console.log(Object.keys(o).join(","));
console.log(Object.getOwnPropertySymbols(o).length);
console.log(Object.getOwnPropertyNames(o).join(","));
