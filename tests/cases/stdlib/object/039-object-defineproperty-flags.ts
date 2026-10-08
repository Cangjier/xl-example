// xl:title defineProperty 的可枚举标志与描述符读出
// xl:round 291
// xl:judge stdout
// xl:end

const o: any = {};
Object.defineProperty(o, "hidden", { value: 1, enumerable: false });
Object.defineProperty(o, "shown", { value: 2, enumerable: true });
console.log(o.hidden, Object.keys(o).join(","));
console.log(Object.getOwnPropertyDescriptor(o, "shown")!.enumerable);
