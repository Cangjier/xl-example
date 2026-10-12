// xl:title `JSON.parse("-0")` 要留成负零
// xl:round 735
// xl:judge stdout
// xl:end
// `Number("-0")` 是 `-0`，而 `Number.isInteger(-0)` **为真** ⇒ 原来落进
// `Value.FromInt`，而 `Int32` 没有负零 ⇒ 给 `0`。
// **印出来一模一样**（`String(0)` 与 `String(-0)` 都是 `"0"`）——
// 只有 `Object.is` / `1 / x` 这几处看得出，所以这两格必须显式问。
console.log(JSON.parse("-0"), 1 / JSON.parse("-0"));
console.log(Object.is(JSON.parse("-0"), -0), Object.is(JSON.parse("0"), -0));
console.log(Object.is(JSON.parse("-0.0"), -0), Object.is(JSON.parse("-0e5"), -0));
console.log(Object.is(JSON.parse("0.0"), -0), 1 / JSON.parse("0"));
console.log(Object.is(JSON.parse("[-0]")[0], -0), 1 / JSON.parse("[-0]")[0]);
console.log(Object.is(JSON.parse('{"a":-0}').a, -0));
