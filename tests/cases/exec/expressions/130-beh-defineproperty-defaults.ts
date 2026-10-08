// xl:title defineProperty 省略标志位时的默认值（全 false）
// xl:round 678
// xl:judge stdout
// xl:end

const o: any = {};
Object.defineProperty(o, "a", { value: 1 });
const d: any = Object.getOwnPropertyDescriptor(o, "a");
console.log(d.value, d.writable, d.enumerable, d.configurable);
console.log(Object.keys(o).length);
