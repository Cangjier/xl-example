// 语料 01：值与运算符、字符串方法、Math。
//
// 这份语料的**用途**是「直接执行 .ts」那条判据（`tests/runtime/run-cli.mjs`）：
// 每一份都同时交给 `node <本文件>`（真 Node，判据的裁判）与
// `node build/ts/tsrun.js <本文件>`（真解析器 → 降级 → IR → VM），比 **stdout 逐字节** + 退出码。
//
// 两条写语料的规矩：
//   1. **只写这个运行器已经收下的构造**（清单见 typescript-exec/README.md）——
//      收到哪儿判据就到哪儿，够不着的留给台账，不在这里假装；
//   2. **每一份都要打印**：什么都不打印的用例「通过」等于什么都没验。
//
// 这一份避开的两处**已记差异**（写在 README / 台账里，不是这里的漏项）：
//   - **非整数**没有文本形态（`TextUnitsOf` 对 `Float64` 抛，因为 `1.0` 该写成什么
//     是规范级决定）——所以这里只出现整数与 `Math.floor` 这类**给整数**的运算；
//   - `console.log(对象)` 要 `ToPrimitive`（语言层建库的事，这一层抛）——所以日志的实参
//     一律是原始值或已经拼好的字符串。

const n: number = 7;
const s: string = "hello";
const yes: boolean = true;

console.log("arith", n + 3, n - 3, n * 3, Math.floor(n / 3), n % 4);
console.log("compare", n > 3, n === 7, n !== 7, n <= 6);
console.log("logic", yes && !false, yes || false, null === undefined, null == undefined);
console.log("typeof", typeof n, typeof s, typeof yes, typeof undefined, typeof null);
console.log("ternary", n > 5 ? "big" : "small");
console.log("string", s.length, s.charAt(1), s.indexOf("l"), s.slice(1, 3), "a" + "b");
console.log("template", `n=${n} s=${s}`);
console.log("math", Math.max(1, 9, 4), Math.min(1, 9, 4), Math.abs(0 - 5));
console.log("primitives", null, undefined, true, 0 - 12);
