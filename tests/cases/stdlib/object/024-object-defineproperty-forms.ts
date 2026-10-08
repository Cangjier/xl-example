// xl:title defineProperty：getter / 不可枚举 / 不可写 / 只读现值
// xl:judge stdout
// xl:end

const o: any = {};
let store = 1;
Object.defineProperty(o, "g", { get: () => store, enumerable: true });
Object.defineProperty(o, "hidden", { value: 2 });
Object.defineProperty(o, "locked", { value: 3, writable: false, enumerable: true });
store = 7;
console.log(o.g, Object.keys(o).join(","), "hidden" in o);
console.log(JSON.stringify(o.locked), Object.getOwnPropertyNames(o).sort().join(","));
