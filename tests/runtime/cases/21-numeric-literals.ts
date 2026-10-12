// 语料 21：数字字面量的全形态（第 129 轮）——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：`3.14` 这种字面量以前在**降级期**就抛 ✗
//（`unimplemented: only integer literals (the wire form has no float payload)`）——
// 线形态的常量只装整数载荷，而浮点字面量是「一份普通 `.ts` 直接跑」的**第一个拦路虎** ✓。
// 第 129 轮把浮点常量放进线形态（载荷是**十进制文本**）之后，这一份才写得出来 ✓。
//
// 覆盖：小数 · 指数 · 十六 / 八 / 二进制 · 数字分隔符 · 负零 · 极大极小 ·
// 以及「往返的判据」——`0.1 + 0.2` 必须**逐位**等于字面量 `0.30000000000000004` ✓。

console.log("float", 3.14, 0.1, 1.5, 2.5, 0.30000000000000004);
console.log("float-computed", 0.1 + 0.2, 1 / 3, 2 / 3, 10 / 4);
console.log("float-roundtrip", 0.1 + 0.2 === 0.30000000000000004, 3.14 === 314 / 100);
console.log("float-ulp", 43.695449, 74.455959, 123456.789, 0.000001);
console.log("exponent", 1e3, 1e-3, 1.5e3, 2e+2, 1.5E-3);
console.log("exponent-big", 1e21, 1e-7, 1e300, 1e-300);
console.log("radix", 0x1f, 0XFF, 0o17, 0O777, 0b1010, 0B11111111);
console.log("radix-big", 0xdeadbeef, 0x1FFFFFFFFFFFFF, 0b1111);
console.log("separators", 1_000_000, 1_0.5, 0xFF_FF, 0b1010_1010);
console.log("negative", -2.5, -0.5, 0 - 3.14, -1e3);
console.log("neg-zero", 1 / -0, -0 === 0, 0 === -0);
console.log("precision", 9007199254740991, 1.7976931348623157e308, 5e-324);
console.log("infinity", 1e999, -1e999);
// **`(1e3).toString()` 不写** ✗：原始值的原型链（数字 / 布尔上的方法）还没做 ✓，
// 那是本仓已记的下一条缺口 ✓，不是这一份要验的东西 ✓。
console.log("mixed", 3.14 * 2, 3.14 + 0.86, 1e3 + 0, typeof 1.5);
console.log("after", 1 + 1);
