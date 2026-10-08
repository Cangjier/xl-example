// xl:title 描述符里**没写的字段**不改（原来看不出「没写」与「写成 undefined」）
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.defineProperty(o, "a", { value: 2 });
console.log(o.a, Object.keys(o).join(","), Object.getOwnPropertyDescriptor(o, "a")!.writable);
Object.defineProperty(o, "a", { enumerable: false });
console.log(Object.keys(o).length, Object.getOwnPropertyDescriptor(o, "a")!.configurable, o.a);
