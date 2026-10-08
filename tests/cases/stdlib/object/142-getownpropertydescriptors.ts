// xl:title `getOwnPropertyDescriptors` 的形状
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.defineProperty(o, "b", { get() { return 2; }, enumerable: true });
const d: any = Object.getOwnPropertyDescriptors(o);
console.log(Object.keys(d).join(","));
console.log(d.a.writable, d.a.enumerable, d.a.configurable, d.a.value);
console.log(typeof d.b.get, d.b.set === undefined);
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(o, "b") === undefined));
