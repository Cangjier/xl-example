// xl:title `freeze` / `seal` / `preventExtensions` 的写与删
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.freeze(o);
o.a = 2;
console.log(o.a, Object.isFrozen(o), delete o.a, o.a);
const s: any = { a: 1 };
Object.seal(s);
s.a = 2; s.b = 3;
console.log(s.a, s.b, Object.isSealed(s), delete s.a);
