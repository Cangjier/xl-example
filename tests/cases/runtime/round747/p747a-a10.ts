// xl:title 逻辑运算符与可选链的短路范围、返回原值
// xl:round 747
// xl:judge stdout
// xl:end
const log: string[] = [];
const f = (v: any) => { log.push("f" + v); return v; };
console.log(f(0) || f("a"), log.join(","));
console.log(f(1) && f("b"), log.join(","));
console.log((null as any) ?? f("c"), log.join(","));
console.log((0 as any) ?? f("d"), log.join(","));
console.log((undefined as any)?.x, (null as any)?.y);
console.log("" || false || 0 || "last", 1 && 2 && 3);
const o: any = { a: { b: () => 1 }, m: () => ({ c: 2 }) };
console.log(o.a.b(), o.m().c, o?.a?.b(), o?.["a"]?.["b"]?.());
const n: any = null;
console.log(n?.a, n?.a?.b, n?.m?.(), n?.["x"]);
console.log(o.missing?.(), o.a.missing?.());
console.log(o.a?.missing ?? "fallback");
