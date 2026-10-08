// xl:title Object.entries / values 忽略 symbol 键与不可枚举
// xl:round 647
// xl:judge stdout
// xl:end

const o = { a: 1, b: 2 };
Object.defineProperty(o, "hidden", { value: 3, enumerable: false });
o[Symbol("s")] = 4;
console.log(JSON.stringify(Object.entries(o)), JSON.stringify(Object.values(o)));
console.log(Object.getOwnPropertyNames(o).join(","));
