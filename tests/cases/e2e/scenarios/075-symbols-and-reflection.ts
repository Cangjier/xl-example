// xl:title 符号键、`Object` 反射与属性序
// xl:round 338
// xl:judge stdout
// xl:end

const sym = Symbol("k");
const obj: any = { b: 2, 2: "two", 1: "one", a: 1, [sym]: "hidden" };
console.log(Object.keys(obj).join(","));
console.log(Object.getOwnPropertyNames(obj).join(","));
console.log(Object.getOwnPropertySymbols(obj).length, obj[sym]);
console.log(Object.entries({ x: 1, y: 2 }).map((e: any[]) => e.join("=")).join(" "));
console.log(JSON.stringify({ ...obj }), JSON.stringify(obj[sym]));
console.log(Object.assign({}, { a: 1 }, { b: 2 }).b);
console.log(Object.fromEntries([["k", 9]]).k, Object.is(1, 1), Object.is(NaN, NaN));
const proto = { greet() { return "hi"; } };
const made = Object.create(proto);
made.own = 1;
console.log(made.greet(), Object.getPrototypeOf(made) === proto, "own" in made, "greet" in made);
