// xl:title Object.keys / getOwnPropertyNames / 描述符：原型、不可枚举与访问器
// xl:round 653
// xl:judge stdout
// xl:end

const proto = { p: 1 };
const o: any = Object.create(proto);
o.a = 1;
Object.defineProperty(o, "hidden", { value: 2, enumerable: false });
Object.defineProperty(o, "acc", { get: () => 3, enumerable: true });
console.log(Object.keys(o).join(","), Object.getOwnPropertyNames(o).sort().join(","));
console.log("p" in o, Object.prototype.hasOwnProperty.call(o, "p"), o.acc);
console.log(Object.getOwnPropertyDescriptor(o, "acc") !== undefined, Object.getOwnPropertyDescriptor(o, "hidden")!.enumerable);
