// xl:title 泛型参数、约束、默认值都被擦掉
// xl:round 371
// xl:judge stdout
// xl:end
function id<T>(x: T): T { return x; }
function pick<T, K extends keyof T>(o: T, k: K): T[K] { return o[k]; }
function withDefault<T = string>(x: T): T { return x; }
class Box<T> { v: T; constructor(v: T) { this.v = v; } get(): T { return this.v; } }
const map = new Map<string, number>();
map.set("a", 1);
const arr = new Array<number>(1, 2);
console.log(id(1), id("s"), pick({ a: 1 }, "a"), withDefault(2), new Box("b").get(), map.get("a"), arr.length);
