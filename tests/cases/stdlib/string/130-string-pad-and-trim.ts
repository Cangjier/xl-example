// xl:title String：padStart / padEnd / trim 家族 / repeat
// xl:round 9
// xl:judge stdout
// xl:end

console.log("5".padStart(3, "0"), "5".padEnd(3, "0"), "abc".padStart(2, "0"));
console.log(JSON.stringify("  x  ".trim()), JSON.stringify("  x  ".trimStart()));
console.log(JSON.stringify("  x  ".trimEnd()), "ab".repeat(3));
console.log("abc".padStart(6, "12"));
