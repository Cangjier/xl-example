// xl:title Symbol.toStringTag 改写 Object.prototype.toString 的输出
// xl:round 678
// xl:judge stdout
// xl:end

const o: any = { [Symbol.toStringTag]: "Mine" };
console.log(Object.prototype.toString.call(o));
class C { get [Symbol.toStringTag]() { return "Cee"; } }
console.log(Object.prototype.toString.call(new C()));
