// xl:title `in` 查的是整条原型链
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = Object.create({ p: 1 });
o.a = 2;
console.log("a" in o, "p" in o, "z" in o, "toString" in o);
console.log("toString" in Object.create(null));
try { "a" in (1 as any); } catch (e: any) { console.log("prim", e.constructor.name); }
