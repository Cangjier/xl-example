// xl:title **新**属性的三个标志仍然默认全假（没写就是假）
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = {};
Object.defineProperty(o, "a", { value: 1 });
Object.defineProperty(o, "b", { value: 2, enumerable: true, writable: true, configurable: true });
const d: any = Object.getOwnPropertyDescriptor(o, "a");
console.log(d.enumerable, d.writable, d.configurable, Object.keys(o).join(","));
console.log(Object.getOwnPropertyNames(o).join(","));
