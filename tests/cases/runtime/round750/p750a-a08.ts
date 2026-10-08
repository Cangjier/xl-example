// xl:title `Reflect` 与 `Object` 同名的两套口径
// xl:round 750
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
console.log(Reflect.has(o, "a"), Reflect.get(o, "a"), Reflect.set(o, "b", 2), o.b);
console.log(Reflect.deleteProperty(o, "b"), "b" in o, Reflect.ownKeys(o).join(","));
console.log(Reflect.isExtensible(o), Reflect.preventExtensions(o), Reflect.isExtensible(o));
console.log(Reflect.getPrototypeOf(o) === Object.prototype, Reflect.setPrototypeOf(o, null), Reflect.getPrototypeOf(o));
console.log(Reflect.apply(Math.max, null, [1, 3, 2]), Reflect.construct(Array, [3]).length);
