// xl:title `in` 查的是整条原型链
// xl:round 691
// xl:judge stdout
// xl:end
// 第 787 轮把同判定点的两条并进来（正文逐句搬入）：
//   · exec/expressions/218-a-in-a-1 · exec/expressions/p-op-in-operator
const o: any = Object.create({ p: 1 });
o.a = 2;
console.log("a" in o, "p" in o, "z" in o, "toString" in o);
console.log("toString" in Object.create(null));
console.log("a" in { a: 1 }, 0 in [1], 1 in [1], "length" in []);
try { "a" in (1 as any); } catch (e: any) { console.log("prim", e.constructor.name); }
