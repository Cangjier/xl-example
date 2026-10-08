// xl:title getPrototypeOf / setPrototypeOf / isPrototypeOf / instanceof
// xl:round 371
// xl:judge stdout
// xl:end
const base = { kind: "base" };
const o: any = Object.create(base);
console.log(Object.getPrototypeOf(o) === base, base.isPrototypeOf(o), o instanceof Object);
const other = {};
Object.setPrototypeOf(other, base);
console.log(other.kind, Object.getPrototypeOf(other) === base);
console.log(Object.prototype.toString.call(o), Object.prototype.isPrototypeOf([]));
