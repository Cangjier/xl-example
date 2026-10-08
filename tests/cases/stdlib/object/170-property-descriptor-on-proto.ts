// xl:title `defineProperty` 不看原型链（同名的原型格不该被动）
// xl:round 691
// xl:judge stdout
// xl:end
const proto: any = { a: 1 };
const o: any = Object.create(proto);
Object.defineProperty(o, "a", { value: 2 });
console.log(o.a, proto.a, Object.keys(o).join(","));
console.log(o.hasOwnProperty("a"), proto.hasOwnProperty("a"));
