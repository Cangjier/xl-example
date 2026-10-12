// xl:title `in` 查的是整条原型链
// xl:round 691
// xl:judge stdout
// xl:end
// 第 787 轮把同判定点的三条并进来（正文逐句搬入）：
//   · exec/expressions/218-a-in-a-1 · p-op-in-operator · probe698-g04 · g05 · g09 · g10
const o: any = Object.create({ p: 1 });
o.a = 2;
console.log("a" in o, "p" in o, "z" in o, "toString" in o);
console.log("toString" in Object.create(null));
console.log("a" in { a: 1 }, 0 in [1], 1 in [1], "length" in []);
try { "a" in (1 as any); } catch (e: any) { console.log("prim", e.constructor.name); }

// 第 787 轮并进来的落点：原型链、数组的洞、字符串的装箱
console.log((function () { const o = { a: 1 }; const p = Object.create(o); return ["a" in p, p.hasOwnProperty("a")].join("|"); })());
console.log((function () { const xs = [1]; return [0 in xs, 1 in xs, "length" in xs].join("|"); })());
console.log((function () { const s = "ab"; return ["0" in Object(s), 2 in Object(s)].join("|"); })());
console.log((function () { return ["toString" in {}, "x" in {}].join("|"); })());
