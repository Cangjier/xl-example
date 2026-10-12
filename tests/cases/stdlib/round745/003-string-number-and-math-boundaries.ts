// xl:title 字符串 / 数字 / Math 的边界口径：`repeat` / `pad*` 的长度与巨值、取值与分割替换、转换表、舍入与 `-0`
// xl:round 745
// xl:judge stdout
// xl:want pass
// xl:end

// **按判定点合并**：这一片原先散在 2 条文件里，现在并成这一条；
// 每一条的正文**逐字**搬进下面各自的 IIFE（不缩进，打印口径与判据一字未动）：
//   · stdlib/round745/p745b-b02.ts
//   · stdlib/round745/p745a-a03.ts
//
// 这个域里的块都是**同步**的，所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：
// 合并后的 stdout 就是各条 stdout 的**顺次相接**（第 801 轮用尺子逐字节核过）。

// —— 并入自 stdlib/round745/p745b-b02.ts（原题：第 745 轮普查收编（其二）：字符串 / 数字 / Math 的边界口径）——
(() => {
console.log("ab".repeat(0) === "", "ab".repeat(1), "ab".repeat(2.9).length);
try { "ab".repeat(-1); } catch (e) { console.log((e as Error).constructor.name); }
console.log("5".padStart(3, "0"), "5".padEnd(3, "ab"), "5".padStart(3) === "  5");
console.log("abc".padStart(2, "0"), "abc".padStart(6, "").length);

console.log("abc".at(-1), "abc".at(3) === undefined, "abc".charAt(3) === "");
console.log("abc".charCodeAt(3), Number.isNaN("abc".charCodeAt(3)));
console.log("abc".codePointAt(3) === undefined, "\u{1F600}".codePointAt(0));
console.log("abc"[3] === undefined, "abc".slice(-2), "abc".substring(2, 0));
console.log("abc".split(","), "a,b,,c".split(","));
console.log(JSON.stringify("a,b,,c".split(",")), JSON.stringify("a,b,c".split(",", 2)));
console.log(JSON.stringify("abc".split("")), JSON.stringify("".split(",")), JSON.stringify("abc".split("", 2)));
console.log(JSON.stringify("  a  b  ".trim()), JSON.stringify("a|b".split("|")));
console.log("abc".replace("b", "[$&]"), "abc".replace("b", "$$"));
console.log("abc".replace("b", (m) => m.toUpperCase()));
console.log("a-b-c".replace("-", "+"), "a-b-c".split("-").join("+"));
console.log("abc".replace("", "X"), "abc".replace("z", "X"));
console.log("abc".startsWith("b", 1), "abc".startsWith("b", 2), "abc".endsWith("b", 2));
console.log("abc".includes("", 9), "abc".includes("c", 2), "abc".includes("a", -1));
console.log("abc".indexOf("", 9), "abc".lastIndexOf("", 0), "abc".indexOf("c", -1));
console.log("\u00e9".normalize("NFD").length, "\u00e9".normalize("NFC").length);
console.log("\u00e9".normalize("NFKC") === "\u00e9", "\u0041\u030a".normalize("NFC"));
console.log(JSON.stringify("\t x \n".trim()), JSON.stringify("\t x \n".trimStart()));
console.log("abc".localeCompare("abd") < 0, "abc".localeCompare("abc"));
console.log("a-b-c".replaceAll("-", "+"), "aaa".replaceAll("a", "b"));
console.log("a.b".replaceAll(".", "!"), "aaa".replace("a", "b"));
console.log("abc".replaceAll("", "-"));

console.log((1.005).toFixed(2), (0).toFixed(2), (1e21).toFixed(2));
console.log((123.456).toPrecision(4), (0.000123).toExponential(2));
console.log((-0).toFixed(1), (0.5).toFixed(0), (1.5).toFixed(0));
console.log(Number.isInteger(1.0), Number.isInteger(1.5), Number.isSafeInteger(2 ** 53));
console.log(Number.isFinite("1" as any), isFinite("1" as any), Number.isNaN("x" as any), isNaN("x" as any));
console.log(parseInt("08"), parseInt("0x10"), parseInt("10", 2), parseInt(" 12px"));
console.log(parseFloat("1.5e2x"), Number(" 1 "), Number(""), Number("1px"));
console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
console.log(Number.MAX_VALUE > 1e308, Number.MIN_VALUE > 0, Number.EPSILON);
console.log(Number.POSITIVE_INFINITY === Infinity, Number.NEGATIVE_INFINITY === -Infinity);
console.log(Number.NaN !== Number.NaN, typeof Number.NaN);

console.log(Math.round(-0.5), Object.is(Math.round(-0.5), -0), Math.round(0.5));
console.log(Math.trunc(-0.9), Object.is(Math.trunc(-0.4), -0), Math.sign(-0));
console.log(Math.fround(1.5), Math.fround(0.1), Math.clz32(1), Math.imul(3, 4));
console.log(Math.hypot(3, 4), Math.cbrt(-8), Math.expm1(0));
console.log(Math.max(), Math.min());
console.log(Math.max(1, NaN), Math.min(1, NaN));
console.log(Object.is(Math.max(0, -0), 0), Object.is(Math.min(0, -0), -0));
console.log(Math.max(-Infinity, 0), Math.min(Infinity, 0));
})();

// —— 并入自 stdlib/round745/p745a-a03.ts（原题：巨值 `repeat` / `padStart`：码元总数越过 `int` 那一格该抛 `RangeError`）——
(() => {
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok len=" + v.length;
  } catch (e) {
    return "throw " + (e as Error).constructor.name;
  }
};
console.log(show(() => "abcd".repeat(2 ** 29)));
console.log(show(() => "a".repeat(2 ** 30)));
console.log(show(() => "ab".padStart(2 ** 31 + 2, "0")));
console.log(show(() => "ab".padEnd(2 ** 32 - 1, "x")));
console.log(show(() => "ab".repeat(3)), show(() => "ab".padStart(4, "0")));
})();
