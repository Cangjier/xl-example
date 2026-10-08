// xl:title repeat / padStart / padEnd 的边界实参
// xl:round 291
// xl:judge stdout
// xl:end

console.log("ab".repeat(0).length, "ab".repeat(1), "ab".repeat(3));
console.log("x".padStart(3, "ab"), "x".padEnd(3, "ab"));
console.log("abc".padStart(2), "abc".padEnd(2, "z"));
