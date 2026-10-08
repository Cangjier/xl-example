// xl:title padStart / padEnd / repeat 的边界
// xl:judge stdout
// xl:end

console.log("5".padStart(3, "0"), "5".padEnd(3, "-"), "abc".padStart(2, "0"));
console.log("ab".repeat(3), "ab".repeat(0).length, "x".padStart(5).length);
console.log("7".padStart(3, "ab"));
