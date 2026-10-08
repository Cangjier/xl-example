// xl:title 数字 ↔ 文本的转换边界：`Number` / `parseInt` / `toString`
// xl:round 766
// xl:judge stdout
// xl:note `Number` 的每一档：空串与纯空白给 `0`、`0x` 前缀按十六进制、`Infinity` 认得，
// xl:note 而 `Number(null)` 是 `0`、`Number(undefined)` 是 `NaN`（**这两格不一样**）、
// xl:note 数组走 `ToPrimitive`（`[]` 给 `0`、`[1]` 给 `1`、`[1, 2]` 给 `NaN`）。
// xl:note `parseInt` 的**前缀解析**（`"12px"` 给 `12`、`"08"` 给 `8`——不是八进制）、
// xl:note 浮点的文本往返（`0.1 + 0.2` 的完整小数位）、以及两个指数的渲染分界。
// xl:end
console.log("01", Number(""), Number("  "), Number("0x10"), Number("1e3"), Number("Infinity"));
console.log("02", Number(null), Number(undefined), Number(true), Number([]), Number([1]), Number([1, 2]));
console.log("03", parseInt("08"), parseInt("0x10"), parseFloat("1.5e2"), parseInt("12px"));
console.log("04", (0.1 + 0.2).toFixed(20));
console.log("05", (1e21).toString(), (1e-7).toString());
console.log("06", (255).toString(16), (255).toString(2), (255).toString(36));
console.log("07", Number(" 12 "), Number("1_000"), Number(""), Number("\n"));
console.log("done");
