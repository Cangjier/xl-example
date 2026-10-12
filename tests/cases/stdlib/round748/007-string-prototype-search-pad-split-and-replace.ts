// xl:title `String.prototype` 的查找 / 填充 / 裁剪 / 切分 / 替换落点
// xl:round 748
// xl:judge stdout
// xl:end
console.log("abc".includes("b"), "abc".indexOf("b"), "abc".startsWith("a"), "abc".endsWith("c"));
console.log("abc".includes("" as any), "abc".indexOf(""), "abc".lastIndexOf(""));
console.log("abc".padStart(5, "*"), "abc".padEnd(5), "abc".repeat(0), "".repeat(3));
console.log("  a  ".trim(), " a ".trimStart().length, " a ".trimEnd().length);
console.log(JSON.stringify("a,b,,c".split(",")), JSON.stringify("abc".split("")));
console.log("a-b".replace("-", "+"), "a-b".replaceAll("-", "+"), "abc".slice(1));
