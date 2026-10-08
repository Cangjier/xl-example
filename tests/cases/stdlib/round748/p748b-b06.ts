// xl:title `Object.freeze` / `seal`：写 / 删 / 加三格与浅一层
// xl:round 748
// xl:judge stdout
// xl:end
const o: any = { a: 1, nested: { b: 2 } };
Object.freeze(o);
o.a = 9; o.c = 3;
console.log(o.a, "c" in o, delete o.a, Object.isFrozen(o), Object.isSealed(o));
o.nested.b = 5;
console.log(o.nested.b, Object.isFrozen(o.nested));
const s: any = Object.seal({ x: 1 });
s.x = 2; s.y = 3; delete s.x;
console.log(s.x, "y" in s, Object.isSealed(s), Object.isFrozen(s));
console.log(Object.isFrozen(1), Object.isSealed("a"), Object.isFrozen({}));
