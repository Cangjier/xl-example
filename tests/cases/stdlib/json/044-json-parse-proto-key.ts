// xl:title JSON.parse 的 __proto__ 键是普通自有属性
// xl:round 647
// xl:judge stdout
// xl:end

const o = JSON.parse('{"__proto__": {"x": 1}, "a": 2}');
console.log(Object.keys(o).join(","), JSON.stringify(o.a));
console.log(Object.getPrototypeOf(o) === Object.prototype);
// **第 786 轮并入**：stdlib/json/probe703-j-f14（`__proto__` 那一格不进原型链，`o.x` 该是
// `undefined`）与 probe703-j-f15（`Object.getPrototypeOf` 仍是 `Object.prototype`——上面那一行
// 已经钉着同一句，f15 因此没有独有的断言）。原探针的 `show(...)` 壳只是把这一格印成
// `typeof:值`，并进本条后按普通 `console.log` 印，判据（值本身）一字未改。
console.log((o as any).x);
