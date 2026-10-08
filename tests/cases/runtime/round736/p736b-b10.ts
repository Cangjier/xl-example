// xl:title `Object.create(proto, descriptors)` 与原型链
// xl:round 736
// xl:judge stdout
// xl:end
const proto = { m() { return "p"; } };
const o = Object.create(proto, { a: { value: 1, enumerable: true } });
console.log(o.a, o.m(), Object.getPrototypeOf(o) === proto, Object.keys(o).join(","));
console.log("m" in o, o.hasOwnProperty("m"), Object.getPrototypeOf(Object.create(null)) === null);
