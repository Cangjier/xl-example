// xl:title Object.prototype.propertyIsEnumerable 与 in：自有可枚举 vs 原型链
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
Object.defineProperty(o, "h", { value: 2 });
console.log(o.propertyIsEnumerable("a"), o.propertyIsEnumerable("h"), o.propertyIsEnumerable("toString"));
console.log("a" in o, "h" in o, "toString" in o, o.hasOwnProperty("toString"));
