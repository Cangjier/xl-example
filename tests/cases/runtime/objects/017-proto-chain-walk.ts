// xl:title 顺着原型链往上找，直到没有
// xl:round 304
// xl:judge stdout
// xl:end

class A { a() { return "a"; } }
class B extends A { b() { return "b"; } }
const inst = new B() as any;
const names: string[] = [];
let p = inst;
while (p) {
  names.push(Object.getOwnPropertyNames(p).join("+"));
  p = Object.getPrototypeOf(p);
}
console.log(names.length > 2, names[0].includes("b") || names[1].includes("b"));
console.log(typeof inst.a, typeof inst.b, typeof inst.zzz);
