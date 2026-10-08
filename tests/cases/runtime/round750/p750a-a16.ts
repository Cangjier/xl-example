// xl:title `length` / 大小写 / 正规化的边界
// xl:round 750
// xl:judge stdout
// xl:end
console.log("ABC".toLowerCase(), "abc".toUpperCase(), "ß".toUpperCase().length);
console.log("İ".toLowerCase().length, "ǅ".toLowerCase(), "ǅ".toUpperCase());
console.log("\u00e9", "e\u0301", ("\u00e9" === "e\u0301"), ("\u00e9".normalize() === "e\u0301".normalize()));
console.log("\u00e9".normalize("NFD").length, "e\u0301".normalize("NFC").length);
console.log("abc".length, "".length, "  ".trim().length, "\u00a0x\u00a0".trim().length);
console.log("abc".padStart(5, "0"), "abc".padStart(3), "abc".repeat(2));
