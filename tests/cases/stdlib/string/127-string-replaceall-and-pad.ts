// xl:title replaceAll（字符串与正则）/ padStart / padEnd / trim 家族
// xl:round 8
// xl:judge stdout
// xl:end

console.log("a-b-c".replaceAll("-", "+"), "aaa".replaceAll("a", "b"));
console.log("Abc".padStart(6, "0"), "Abc".padEnd(6, "-"), "A".padStart(3));
console.log("  x  ".trim(), "|" + "  x".trimStart() + "|", "|" + "x  ".trimEnd() + "|");
