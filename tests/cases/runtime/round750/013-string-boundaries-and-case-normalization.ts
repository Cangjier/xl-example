// xl:title 字符串的越界与代理对（`charAt` / `at` / `codePointAt` / 下标）与大小写 / 正规化的边界
// xl:round 750
// xl:judge stdout
// xl:end
// **按判定点并组（第 805 轮）**：把 round750 里同判定点的
// 2 条原子探针并成这一条：p750a-a15 · p750a-a16
// 正文逐字搬进各自的块里——**块只为隔离同名声明，不改作用域语义**；
// 块本身是一个**被 await 的 async IIFE**，所以「这一条先在微任务里跑干净、再跑下一条」，
// 每块的 stdout 与原来那条一一对应，顺次相接即本条的输出（`main()` 这一个宏任务里收尾）。
// 块本身是一个**被 await 的 async IIFE**，块里顶层的效果调用（`main();` 这种）
// 一律写成 `await …`——来源是「一条一进程、进程退出前把微任务跑干净」，
// 并进一个文件之后只有当场等干净，才还是原来那条的输出。
async function main() {

// ===== 吸收 tests/cases/runtime/round750/p750a-a15.ts · 字符串的越界与代理对：`charAt` / `at` / `codePointAt` / 下标 =====
await (async () => {
const s = "a😀b";
console.log(s.length, s[1], s[2], s.charAt(1).length, s.charCodeAt(1));
console.log(s.at(1)!.length, s.codePointAt(1), s.codePointAt(0));
console.log(s.slice(1, 3).length, s.slice(1, 3) === s[1] + s[2]);
console.log([...s].length, Array.from(s).length);
console.log(s.indexOf("b"), s.lastIndexOf("b"), s.includes("😀"));
console.log("abc".charAt(10), "abc"[10], "abc".at(-1), "abc".at(10));
})();

// ===== 吸收 tests/cases/runtime/round750/p750a-a16.ts · `length` / 大小写 / 正规化的边界 =====
await (async () => {
console.log("ABC".toLowerCase(), "abc".toUpperCase(), "ß".toUpperCase().length);
console.log("İ".toLowerCase().length, "ǅ".toLowerCase(), "ǅ".toUpperCase());
console.log("\u00e9", "e\u0301", ("\u00e9" === "e\u0301"), ("\u00e9".normalize() === "e\u0301".normalize()));
console.log("\u00e9".normalize("NFD").length, "e\u0301".normalize("NFC").length);
console.log("abc".length, "".length, "  ".trim().length, "\u00a0x\u00a0".trim().length);
console.log("abc".padStart(5, "0"), "abc".padStart(3), "abc".repeat(2));
})();
}
main();
