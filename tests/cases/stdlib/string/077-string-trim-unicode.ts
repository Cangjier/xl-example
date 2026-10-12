// xl:title trim 的空白表：非 ASCII 空格与零宽不换行空格
// xl:round 323
// xl:judge stdout
// xl:end

console.log("\u00a0 x \u00a0".trim().length, "\u3000y\u3000".trim() === "y");
console.log("\ufeffz".trim() === "z", "a\u2028".trimEnd() === "a", "\u2009q".trimStart() === "q");
