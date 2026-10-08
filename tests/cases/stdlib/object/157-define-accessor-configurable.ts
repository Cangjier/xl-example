// xl:title **可配置**的格子可以在数据与访问器之间来回换
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.defineProperty(o, "a", { get() { return 7; } });
console.log(o.a, "value" in Object.getOwnPropertyDescriptor(o, "a")!);
Object.defineProperty(o, "a", { value: 8 });
console.log(o.a, typeof Object.getOwnPropertyDescriptor(o, "a")!.get);
