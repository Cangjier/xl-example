// xl:title freeze / seal / preventExtensions 之后的可写与可加
// xl:round 371
// xl:judge stdout
// xl:end
const f: any = { a: 1 };
Object.freeze(f);
f.a = 2;
console.log(f.a, Object.isFrozen(f), Object.isSealed(f), Object.isExtensible(f));
const s: any = { a: 1 };
Object.seal(s);
s.a = 2;
s.b = 3;
console.log(s.a, s.b, Object.isSealed(s), Object.isFrozen(s));
const p: any = { a: 1 };
Object.preventExtensions(p);
p.b = 2;
console.log(p.b, Object.isExtensible(p), Object.isSealed(p));
