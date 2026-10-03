// 语料 11：标准库第二批（第 120 轮）——`Error` / `Math` 补全 / `Object.values`·`entries` /
// `String.split`·`toUpperCase`·`toLowerCase`·`trim`·`includes`。
//
// 每一行都同时交给 `node <本文件>` 与 `tsrun <本文件>`，比 stdout 逐字节 + 退出码
// （判据 `tests/runtime/run-cli.mjs`），所以这里的形状必须**两边都合法**：
//   - `Math.sqrt` / `Math.pow` 现在**写得出来**了 ✓：浮点的文本形态（第 124 轮 ✓）
//     与浮点字面量（第 129 轮 ✓）都到位了 ✓，这一份保留原来的形状（不为了改而改 ✓）；
//   - **第 129 轮起浮点字面量装得进线形态** ✓（载荷是十进制文本 ✓，见语料 21 ✓）——
//     下面那些 `3 / 2` 是**运行时算出来**的浮点 ✓，量的是另一条路 ✓，留着是有意的 ✓；
//   - `toUpperCase` / `trim` 只用 **ASCII**：本层没有大小写/空白映射表，
//     非 ASCII 会**抛**（写在这里，免得读者以为是漏测）。

try {
  throw new Error("boom");
} catch (error) {
  console.log("error", error.message, error.name, typeof error);
}
console.log("error-called-without-new", Error("no-new").message, Error().message === "");

console.log("math-round", Math.round(3 / 2), Math.round(5 / 2), Math.round(0 - 3 / 2), Math.round(7 / 2));
console.log("math-ceil-trunc", Math.ceil(11 / 10), Math.ceil(0 - 11 / 10), Math.trunc(19 / 10), Math.trunc(0 - 19 / 10));
console.log("math-sign", Math.sign(0 - 3), Math.sign(0), Math.sign(7), Math.sign(1 - 1));
console.log("math-old", Math.floor(7 / 2), Math.abs(0 - 5), Math.max(1, 9), Math.min(1, 9));

const record = { a: 1, b: "two", c: true };
console.log("values", Object.values(record).join(","));
console.log("entries", Object.entries(record).map((pair) => pair[0] + "=" + pair[1]).join(";"));
console.log("keys-still", Object.keys(record).join("+"));

console.log("split-basic", "a,b,,c".split(",").join("|"));
console.log("split-empty-sep", "abc".split("").join("-"));
console.log("split-none", "abc".split().length, "".split(",").length, "".split("").length);
console.log("split-roundtrip", "x;y;z".split(";").join("/"));

console.log("case", "aBc-XyZ".toUpperCase(), "aBc-XyZ".toLowerCase(), "123!".toUpperCase());
console.log("trim", "[" + "  hi \t\n".trim() + "]", "[" + "   ".trim() + "]", "[" + "mid dle".trim() + "]");
console.log("includes", "hello".includes("ell"), "hello".includes("z"), "hello".includes(""));
