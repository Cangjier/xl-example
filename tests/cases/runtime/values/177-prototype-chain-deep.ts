// xl:title 深原型链上的读 / 写 / instanceof / isPrototypeOf
// xl:round 371
// xl:judge stdout
// xl:end
const a = { level: "a" };
const b = Object.create(a);
const c = Object.create(b);
const d = Object.create(c);
console.log(d.level, a.isPrototypeOf(d), b.isPrototypeOf(d), d.isPrototypeOf(a));
console.log(Object.getPrototypeOf(d) === c, Object.getPrototypeOf(Object.getPrototypeOf(c)) === b);
d.level = "d";
console.log(d.level, a.level);
let depth = 0;
let walk: any = d;
while (walk !== null) { depth += 1; walk = Object.getPrototypeOf(walk); }
console.log(depth);
