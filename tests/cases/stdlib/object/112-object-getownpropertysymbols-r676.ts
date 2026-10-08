// xl:title Object.getOwnPropertySymbols：符号键与不可枚举属性
// xl:round 676
// xl:judge stdout
// xl:end

const k = Symbol("k");
const o: any = { a: 1 };
o[k] = 2;
Object.defineProperty(o, "hidden", { value: 3, enumerable: false });
console.log(Object.getOwnPropertySymbols(o).length, o[k]);
console.log(Object.keys(o).join(","), Object.getOwnPropertyNames(o).join(","));
