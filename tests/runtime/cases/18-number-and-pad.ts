// 语料 18：`parseInt` · `parseFloat` · `Number.isInteger` · `Number.isNaN` ·
// `String.padStart` / `padEnd`（第 126 轮）——与 `node` 逐字节对拍。
//
// 全部是**确定性**的（没有时钟、没有随机）✓，而且结果都是整数 / 浮点 / 字符串 / 布尔 ✓——
// 浮点现在打得出来（第 124 轮那条），所以 `parseInt("x")` 的 `NaN` 也能直接比 ✓。
// **小数一律用运行时算出来**（`25 / 2`）✗ 不写字面量：线形态的常量只装整数载荷 ✓
//（这是本仓记了多轮的那条：浮点字面量装不进线形态 ✓）。

console.log("parseInt", parseInt("42"), parseInt("  -17 "), parseInt("12px"), parseInt("0x1f"),
  parseInt("1f", 16), parseInt("0x10", 16), parseInt("101", 2), parseInt("zz", 36));
console.log("parseInt-radix", parseInt("10", 10), parseInt("10", 0), parseInt("10", 1),
  parseInt("10", 37), parseInt("0x10", 10), parseInt("", 10), parseInt("x"));
console.log("parseInt-non-string", parseInt(25 / 2), parseInt(true ? "7" : "8"), parseInt("1000000000000"));
console.log("parseFloat", parseFloat("2.5"), parseFloat("1.5px"), parseFloat(".5"), parseFloat("5."),
  parseFloat("1e3"), parseFloat("1e"), parseFloat("-Infinity"), parseFloat("abc"));
console.log("number-statics", Number.isInteger(3), Number.isInteger(5 / 2), Number.isInteger(4 / 2),
  Number.isInteger("3"), Number.isNaN(0 / 0), Number.isNaN("abc"), Number.isNaN(0 / 1));
console.log("pad", "5".padStart(3, "0"), "5".padEnd(3, "0"), "ab".padStart(7, "xy"),
  "ab".padEnd(7, "xy"), "abc".padStart(2, "0"), "x".padStart(4), "x".padEnd(4, ""));
console.log("after", 1 + 1);
