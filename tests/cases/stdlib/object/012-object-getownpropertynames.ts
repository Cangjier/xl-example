// xl:title Object.getOwnPropertyNames（含不可枚举）
// xl:judge stdout
// xl:end

const o: any = {};
Object.defineProperty(o, "hidden", { value: 1, enumerable: false });
console.log(Object.getOwnPropertyNames(o).join(","), Object.keys(o).length);
