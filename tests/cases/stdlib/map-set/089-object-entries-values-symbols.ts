// xl:title Object.entries / values / fromEntries 与不可枚举、符号键
// xl:round 8
// xl:judge stdout
// xl:end

const o = { a: 1, b: 2 };
Object.defineProperty(o, "hidden", { value: 3, enumerable: false });
const sym = Symbol("s");
o[sym] = 4;
console.log(JSON.stringify(Object.entries(o)), JSON.stringify(Object.values(o)));
console.log(JSON.stringify(Object.fromEntries([["x", 1], ["y", 2]])));
console.log(Object.keys(o).length, Object.getOwnPropertySymbols(o).length);
