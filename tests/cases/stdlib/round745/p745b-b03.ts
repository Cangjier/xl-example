// xl:title 第 745 轮普查收编（其三）：Object / Map / Set / JSON / 迭代
// xl:round 745
// xl:judge stdout
// xl:end
const o1 = Object.assign({}, { a: 1 }, null as any, undefined as any, { b: 2 });
console.log(JSON.stringify(o1), Object.getPrototypeOf(Object.create(null)) === null);
const t1 = Object.create({ p: 1 });
console.log(t1.p, Object.keys(t1).length, Object.getPrototypeOf(t1).p);
console.log(Object.getPrototypeOf("a").constructor.name);
console.log(JSON.stringify(Object.entries({ b: 1, 2: 2, a: 3 })));
console.log(JSON.stringify(Object.values({ b: 1, 2: 2, a: 3 })));
console.log(JSON.stringify(Object.fromEntries([["a", 1], [2, 3]])));
console.log(JSON.stringify(Object.fromEntries(new Map([["x", 1]]))));
console.log(JSON.stringify(Object.entries("ab")), JSON.stringify(Object.entries(1 as any)));

const a2 = [1, 2];
Object.freeze(a2);
console.log(Object.isFrozen(a2), Object.isFrozen([1]), Object.isSealed([1]));
const o2 = { x: { y: 1 } };
Object.freeze(o2);
console.log(Object.isFrozen(o2.x), Object.isFrozen(o2));
const s2 = { a: 1 };
Object.seal(s2);
console.log(Object.isSealed(s2), Object.isFrozen(s2));
const sym2 = Symbol("s");
const o3: any = { a: 1, [sym2]: 2 };
o3.b = 3;
console.log(JSON.stringify(Object.getOwnPropertyNames(o3)), Object.getOwnPropertySymbols(o3).length);
const d2 = Object.getOwnPropertyDescriptor([1, 2], "length") as any;
console.log(d2.writable, d2.enumerable, d2.configurable, Object.getOwnPropertyDescriptor({}, "x") === undefined);
console.log(JSON.stringify(Object.getOwnPropertyNames([1, 2])), JSON.stringify(Object.getOwnPropertyNames("ab")));

const o4: any = {};
Object.defineProperty(o4, "a", { value: 1, writable: true, enumerable: true, configurable: true });
Object.defineProperty(o4, "a", { value: 2 });
const d4 = Object.getOwnPropertyDescriptor(o4, "a") as any;
console.log(o4.a, d4.writable, d4.enumerable, d4.configurable);
Object.defineProperty(o4, "b", { get() { return 7; } });
console.log(o4.b, (Object.getOwnPropertyDescriptor(o4, "b") as any).set === undefined);

const o5 = Object.create({ p: 1 });
o5.a = 2;
console.log(Object.hasOwn(o5, "a"), Object.hasOwn(o5, "p"), "p" in o5, "toString" in o5);
console.log(Object.hasOwn(Object.create(null), "x"), 0 in [1]);
console.log(Object.hasOwn("ab", 0 as any), Object.hasOwn("ab", "length" as any));

const r6 = Object.groupBy([1, 2, 3, 4], (x) => (x % 2 ? "odd" : "even"));
console.log(Object.getPrototypeOf(r6) === null, JSON.stringify(r6.odd), JSON.stringify(Object.keys(r6)));
const m6 = Map.groupBy([1, 2, 3], (x) => x % 2);
console.log(m6 instanceof Map, JSON.stringify([...m6.keys()]), JSON.stringify(m6.get(1)));
console.log(JSON.stringify(Object.groupBy([1.5, 2.5], Math.floor)));

const m7 = new Map();
m7.set(NaN, "n").set(-0, "z");
console.log(m7.get(NaN), m7.get(0), m7.get(-0), m7.size);
m7.set("x", 1);
console.log(m7.has("x"), m7.delete("x"), m7.delete("x"), m7.size);
console.log(m7.get("missing"), m7.has(undefined));
const m8 = new Map([["a", 1], ["b", 2], ["a", 3]]);
console.log(JSON.stringify([...m8.entries()]), m8.size, m8.get("a"));
const seen8: string[] = [];
m8.forEach((v, k) => seen8.push(k + "=" + v));
console.log(seen8.join(","), JSON.stringify([...m8.keys()]), JSON.stringify([...m8.values()]));
console.log(JSON.stringify([...m8]), JSON.stringify([...new Map()]));

const s9 = new Set([1, 2, 2, NaN, NaN, -0, 0]);
console.log(s9.size, s9.has(NaN), s9.has(0), s9.has(-0));
console.log(JSON.stringify([...s9]), JSON.stringify([...s9.keys()]), JSON.stringify([...s9.entries()]));
s9.add(3).add(1);
console.log(JSON.stringify([...s9]), s9.delete(1), s9.size);
console.log(JSON.stringify([...new Set("aab")]));

const k10: any = {};
const wm10 = new WeakMap();
wm10.set(k10, 1);
console.log(wm10.get(k10), wm10.has(k10), wm10.delete(k10), wm10.has(k10));
const ws10 = new WeakSet([k10]);
console.log(ws10.has(k10), ws10.delete(k10), ws10.has(k10));

const s11 = Symbol("d");
console.log(s11.description, Symbol().description === undefined, String(s11));
console.log(Symbol.for("k") === Symbol.for("k"), Symbol.keyFor(Symbol.for("k")));
console.log(Symbol.keyFor(Symbol("k")) === undefined, typeof Symbol.iterator);

console.log(JSON.stringify({ a: 1, b: undefined, c: () => 1, d: Symbol("s") }));
console.log(JSON.stringify([1, undefined, () => 1]));
console.log(JSON.stringify({ d: new Date(0) }), JSON.stringify({ x: { toJSON: () => "T" } }));
console.log(JSON.stringify({ a: 1 }, null, 2));
console.log(JSON.stringify(-0), JSON.stringify(NaN), JSON.stringify(Infinity));
console.log(JSON.parse('{"a":1,"b":2}', (k, v) => (k === "b" ? undefined : v)).a);
console.log(JSON.parse("[1,2]", (k, v) => (typeof v === "number" ? v * 10 : v)).join(","));
try { JSON.parse("{oops}"); } catch (e) { console.log((e as Error).constructor.name); }
console.log(JSON.parse("\"\\u0041\""), JSON.parse("-0"), Object.is(JSON.parse("-0"), -0));

console.log(encodeURIComponent("a b"), decodeURIComponent("a%20b"));
console.log(encodeURI("a b/c?d=1"), decodeURI("a%20b/c"));
console.log(encodeURIComponent("中"), decodeURIComponent("%E4%B8%AD"));
try { decodeURIComponent("%"); } catch (e) { console.log((e as Error).constructor.name); }

const a12 = [1, 2];
const it12 = a12.values();
console.log(it12.next().value, it12.next().value, JSON.stringify(it12.next()), JSON.stringify(it12.next()));
console.log(JSON.stringify([...a12.entries()]));
const o13 = { length: 2, 0: "a", 1: "b" };
console.log(Array.prototype.map.call(o13, (v: string) => v.toUpperCase()).join(","));
console.log(Array.prototype.join.call(o13, "-"), Array.prototype.slice.call(o13).length);
console.log(Array.prototype.indexOf.call(o13, "b"));
