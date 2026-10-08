// xl:title 不用 Reflect / Proxy 的反射：描述符与原型
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.defineProperty(o, "b", { value: 2, enumerable: false, writable: false });
console.log(Object.keys(o).join(","), Object.getOwnPropertyNames(o).join(","));
const d = Object.getOwnPropertyDescriptors(o);
console.log(Object.keys(d).join(","), d.b.writable, d.a.enumerable);
const copy = Object.defineProperties({}, d);
console.log(copy.a, copy.b, Object.keys(copy).join(","));
const clone = Object.create(Object.getPrototypeOf(o), d);
console.log(clone.a, Object.getPrototypeOf(clone) === Object.prototype);
