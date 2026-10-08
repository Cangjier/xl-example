// xl:title `f.call(o, …)` / `f.apply(o, xs)` / `f.bind(o)`
// xl:judge stdout
// xl:end

function greet(this: any, a: number, b: number) { return this.tag + ":" + (a + b); }
const o = { tag: "T" };
console.log(greet.call(o, 1, 2), greet.apply(o, [3, 4]));
const bound = greet.bind(o, 10);
console.log(bound(5));
