// xl:title `Reflect` 的取/设/删/有无
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
console.log(Reflect.get(o, "a"), Reflect.has(o, "a"), Reflect.ownKeys(o).join(","));
console.log(Reflect.set(o, "b", 2), o.b, Reflect.deleteProperty(o, "b"), o.b);
console.log(Reflect.getPrototypeOf(o) === Object.prototype);
