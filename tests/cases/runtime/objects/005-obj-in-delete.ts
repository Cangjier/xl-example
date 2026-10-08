// xl:title `in` 走原型链、`delete` 只删自己那一格
// xl:judge stdout
// xl:end

class A { m() { return 1; } }
const a: any = new A();
a.own = 2;
console.log("own" in a, "m" in a, "nope" in a);
delete a.own;
console.log("own" in a, Object.keys(a).length);
delete a.m;
console.log(a.m());
