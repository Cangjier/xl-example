// xl:title `this` 形参是类型位（不占形参格）+ `Function.prototype` 上的 `call` / `apply` / `bind`
// xl:judge stdout
// xl:end

function greet(this: any, a: number, b: number) { return this.tag + ":" + (a + b); }
const o = { tag: "T" };
console.log(greet.call(o, 1, 2), greet.apply(o, [3, 4]));
const bound = greet.bind(o, 10);
console.log(bound(5), bound.call({ tag: "X" }, 100));
const f = function (a: number) { return a * 2; };
console.log(f.call(null, 3), f.apply(null, [4]), typeof greet.call, typeof greet.bind);
