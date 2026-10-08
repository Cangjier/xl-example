// xl:title 访问器那一支：没写的 `enumerable` / `configurable` 也保持原样
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = {};
Object.defineProperty(o, "g", { get() { return 1; }, enumerable: true, configurable: true });
Object.defineProperty(o, "g", { get() { return 2; } });
const d: any = Object.getOwnPropertyDescriptor(o, "g");
console.log(o.g, d.enumerable, d.configurable, o.propertyIsEnumerable("g"));
console.log(Object.keys(o).join(","));
