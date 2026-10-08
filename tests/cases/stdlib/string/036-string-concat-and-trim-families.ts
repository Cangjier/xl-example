// xl:title concat 的多参 · trim / trimStart / trimEnd 的空白集
// xl:judge stdout
// xl:end

console.log("a".concat("b", "c"), "a".concat(1 as any, true as any));
console.log(JSON.stringify(" \t\n x \r\n ".trim()));
console.log(JSON.stringify("  x  ".trimStart()), JSON.stringify("  x  ".trimEnd()));
console.log("\u00a0x\u00a0".trim().length);
