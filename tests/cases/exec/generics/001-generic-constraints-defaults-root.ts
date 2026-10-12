// xl:title 泛型约束 + 默认类型参数 + 多参数
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

function pick<T, K extends keyof T = keyof T>(o: T, k: K): T[K] { return o[k]; }
class Pair<A, B = A> { constructor(public first: A, public second: B) {} }
console.log(pick({ a: 1, b: "s" }, "a"), new Pair(1, "x").second, new Pair(2, 3).first);
