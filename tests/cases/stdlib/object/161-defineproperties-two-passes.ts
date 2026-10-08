// xl:title `defineProperties` 与 `defineProperty` 走同一条路
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.defineProperties(o, { a: { value: 5 }, b: { get() { return 6; }, enumerable: true } });
console.log(o.a, o.b, Object.keys(o).join(","));
console.log(Object.getOwnPropertyDescriptor(o, "a")!.enumerable);
