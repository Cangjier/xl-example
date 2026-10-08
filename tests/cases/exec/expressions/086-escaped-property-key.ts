// xl:title 对象字面量里**转义的键**（`{ \u0061: 1 }`）
// xl:round 381
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// 转义的名字在**对象字面量的键**那一格也要解（第 382 轮修好 ✓）。
// **为什么它值得单独一条** ✗：这一支是投影**自己拿文本合一个节点**的（`nameOf`）✓，
// 不经过 `Identifier.PrintAst` ✓、也不经过读属性那三处 ✓——第 381 轮那两处都改了 ✓，
// 这一格却漏着 ✗ ⇒ `Object.keys` 给 ["\u0061"] ✓、`x.a` 给 `undefined` ✓（**静默错值** ✗）。
const x = { \u0061: 1, b: 2 };
console.log("A", x.a, x.b, Object.keys(x).join(","));
const y = { caf\u00e9: 3 };
console.log("B", y.café, Object.keys(y).join(","));
const deep = { outer: { \u0069nner: 4 } };
console.log("C", deep.outer.inner);
function f(): number { return { \u0076: 5 }.v; }
console.log("D", f());
